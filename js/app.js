/**
 * BREF Dashboard - Main Application
 * Entry point and dashboard initialization
 */

import { StatsAPI, ElectedAPI, ExportAPI } from './api.js';
import {
    createGenderChart,
    createAgeChart,
    createNuancesChart,
    createMandatesChart,
    createProfessionsChart,
    animateValue,
    formatNumber
} from './charts.js';
import { initMap, loadFranceGeoJSON, updateMapData, createMapLegend } from './map.js';
import { initFilters, getActiveFilters, populateFilterOptions } from './filters.js';

// Chart instances (for updates)
let charts = {
    gender: null,
    age: null,
    nuances: null,
    mandates: null,
    professions: null
};

// Data cache
let cachedData = {
    overview: null,
    departments: {}
};

/**
 * Initialize the dashboard
 */
async function initDashboard() {
    console.log('🚀 Initializing BREF Dashboard...');

    try {
        // Show loading state
        showLoading(true);

        // Initialize filters
        initFilters(handleFilterChange);
        await populateFilterOptions();

        // Load initial data
        await Promise.all([
            loadOverviewStats(),
            loadCharts(),
            initializeMap()
        ]);

        // Initialize search
        initSearch();

        // Initialize export buttons
        initExportButtons();

        // Initialize tabs
        initTabs();

        // Listen for department selection from map
        document.addEventListener('departmentSelected', handleDepartmentSelection);

        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        showError('Erreur lors du chargement du dashboard');
    } finally {
        showLoading(false);
    }
}

/**
 * Load overview statistics and update KPI cards
 */
async function loadOverviewStats() {
    let overview = null;
    let menCount = 0;
    let womenCount = 0;
    let total = 0;

    // Get overview stats
    try {
        overview = await StatsAPI.getOverview();
        cachedData.overview = overview;
        total = overview.totalIndividuals || overview.total || 0;
    } catch (error) {
        console.warn('Could not load overview stats:', error);
    }

    // Get accurate gender counts from gender endpoint
    try {
        const genderData = await StatsAPI.getGender();

        // Extract counts from gender data
        if (Array.isArray(genderData)) {
            const maleEntry = genderData.find(g => g.code === 'M' || g.gender === 'Homme');
            const femaleEntry = genderData.find(g => g.code === 'F' || g.gender === 'Femme');
            menCount = maleEntry?.individuals || 0;
            womenCount = femaleEntry?.individuals || 0;
        }

        // If we didn't get total from overview, calculate from gender counts
        if (!total) {
            total = menCount + womenCount;
        }
    } catch (error) {
        console.warn('Could not load gender stats:', error);
        // Use fallback values from overview if available
        if (overview) {
            const genderRatio = overview.genderRatio || { male: 59.9, female: 40.1 };
            menCount = Math.round(total * genderRatio.male / 100);
            womenCount = Math.round(total * genderRatio.female / 100);
        }
    }

    const malePercent = total > 0 ? ((menCount / total) * 100).toFixed(1) : 60;
    const femalePercent = total > 0 ? ((womenCount / total) * 100).toFixed(1) : 40;

    // Update KPI cards with animation
    updateKPICard('kpi-total', total);
    updateKPICard('kpi-men', menCount);
    updateKPICard('kpi-women', womenCount);

    // Calculate average age from age distribution data
    try {
        const ageData = await StatsAPI.getAge();
        if (Array.isArray(ageData)) {
            // Midpoints for each age range
            const ageMidpoints = {
                '18-29': 24,
                '30-39': 35,
                '40-49': 45,
                '50-59': 55,
                '60-69': 65,
                '70+': 75
            };

            let totalWeighted = 0;
            let totalCount = 0;

            ageData.forEach(group => {
                const midpoint = ageMidpoints[group.ageRange] || 55;
                totalWeighted += midpoint * group.count;
                totalCount += group.count;
            });

            const avgAge = totalCount > 0 ? Math.round(totalWeighted / totalCount) : 62;
            const avgAgeEl = document.getElementById('kpi-avg-age');
            if (avgAgeEl) avgAgeEl.textContent = `~${avgAge}`;
        }
    } catch (e) {
        console.warn('Could not calculate average age:', e);
        const avgAgeEl = document.getElementById('kpi-avg-age');
        if (avgAgeEl) avgAgeEl.textContent = '~62';
    }

    // Update progress bars with percentages
    const menProgressBar = document.querySelector('#kpi-men-progress .progress__bar');
    const womenProgressBar = document.querySelector('#kpi-women-progress .progress__bar');
    if (menProgressBar) menProgressBar.style.width = `${malePercent}%`;
    if (womenProgressBar) womenProgressBar.style.width = `${femalePercent}%`;
}

/**
 * Update a KPI card with animated value
 */
function updateKPICard(elementId, value, animate = true) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (animate && typeof value === 'number' && value > 0) {
        animateValue(element, 0, value, 1500);
    } else {
        element.textContent = typeof value === 'number' ? formatNumber(value) : value;
    }
}

/**
 * Load all chart data and create charts
 */
async function loadCharts() {
    try {
        // Load data in parallel
        const [genderData, ageData, nuancesData, mandatesData] = await Promise.all([
            StatsAPI.getGender().catch(() => null),
            StatsAPI.getAge().catch(() => null),
            StatsAPI.getPoliticalNuances().catch(() => null),
            StatsAPI.getMandateTypes().catch(() => null)
        ]);

        // Create charts
        if (genderData) {
            createGenderChartWrapper(genderData);
        }

        if (ageData) {
            createAgeChartWrapper(ageData);
        }

        if (nuancesData) {
            createNuancesChartWrapper(nuancesData);
        }

        if (mandatesData) {
            createMandatesChartWrapper(mandatesData);
        }

    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

/**
 * Create gender chart
 */
function createGenderChartWrapper(data) {
    const canvas = document.getElementById('chart-gender');
    if (!canvas) return;

    if (charts.gender) {
        charts.gender.destroy();
    }

    // API returns: [{gender: "Femme", code: "F", individuals, mandates}, {gender: "Homme", ...}]
    // Transform to format expected by chart: {male: X, female: Y}
    let chartData = { male: 0, female: 0 };

    if (Array.isArray(data)) {
        data.forEach(d => {
            if (d.code === 'M' || d.gender === 'Homme') {
                chartData.male = d.individuals || d.count || 0;
            } else if (d.code === 'F' || d.gender === 'Femme') {
                chartData.female = d.individuals || d.count || 0;
            }
        });
    } else {
        chartData = data;
    }

    charts.gender = createGenderChart(canvas.getContext('2d'), chartData);
}

/**
 * Create age chart
 */
function createAgeChartWrapper(data) {
    const canvas = document.getElementById('chart-age');
    if (!canvas) return;

    if (charts.age) {
        charts.age.destroy();
    }

    // API returns: [{ageRange: "18-29", count: 611}, ...]
    // Transform to format expected by chart: [{tranche: "18-29", count: 611}, ...]
    let chartData = Array.isArray(data) ? data : data.distribution || [];
    chartData = chartData.map(d => ({
        tranche: d.ageRange || d.range || d.tranche,
        count: d.count || d.total || d.value
    }));
    charts.age = createAgeChart(canvas.getContext('2d'), chartData);
}

/**
 * Create nuances chart
 */
function createNuancesChartWrapper(data) {
    const canvas = document.getElementById('chart-nuances');
    if (!canvas) return;

    if (charts.nuances) {
        charts.nuances.destroy();
    }

    // API returns: [{id, name: "DVD", mandates, individuals}, ...]
    // Transform and take top 10 for readability
    let chartData = Array.isArray(data) ? data : data.distribution || [];
    chartData = chartData.slice(0, 10).map(d => ({
        nuance: d.name || d.nuance || d.label,
        count: d.individuals || d.mandates || d.count
    }));
    charts.nuances = createNuancesChart(canvas.getContext('2d'), chartData);
}

/**
 * Create mandates chart
 */
function createMandatesChartWrapper(data) {
    const canvas = document.getElementById('chart-mandates');
    if (!canvas) return;

    if (charts.mandates) {
        charts.mandates.destroy();
    }

    // API returns: [{type: "Municipal Councilor", count, individuals}, ...]
    // Transform and translate
    const translations = {
        'Municipal Councilor': 'Conseiller municipal',
        'Intercommunal Councilor': 'Conseiller intercommunal',
        'Departmental Councilor': 'Conseiller départemental',
        'Regional Councilor': 'Conseiller régional',
        'Senator': 'Sénateur',
        'Member of the National Assembly': 'Député',
        'Member of the European Parliament': 'Député européen',
        'President of the Republic': 'Président de la République'
    };

    let chartData = Array.isArray(data) ? data : data.distribution || [];
    chartData = chartData.map(d => ({
        type: translations[d.type] || d.type || d.label,
        count: d.individuals || d.count || d.total
    }));
    charts.mandates = createMandatesChart(canvas.getContext('2d'), chartData);
}

/**
 * Initialize the map
 */
async function initializeMap() {
    try {
        initMap('map');

        // Load department statistics for the map
        let departmentData = {};

        try {
            // Load heat map data which has complete department stats
            const heatMapData = await StatsAPI.getHeatMapData();

            // Transform data into format expected by map: { code: { total, parity, avgAge } }
            if (Array.isArray(heatMapData)) {
                heatMapData.forEach(dept => {
                    departmentData[dept.departmentCode] = {
                        total: dept.electedCount || 0,
                        parity: dept.femalePercentage || 0,
                        avgAge: dept.averageAge || 55,
                        femaleCount: dept.femaleCount || 0
                    };
                });
            }
            console.log('Loaded heat-map data for map:', Object.keys(departmentData).length, 'departments');
        } catch (e) {
            console.warn('Could not load heat-map stats for map:', e);
        }

        // Load GeoJSON with department data
        await loadFranceGeoJSON(departmentData);

        // Add legend
        const legendContainer = document.getElementById('map-legend');
        if (legendContainer) {
            legendContainer.innerHTML = createMapLegend('density');
        }

        // Listen for metric change
        const metricSelect = document.getElementById('map-metric');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                const metric = e.target.value;
                updateMapData(departmentData, metric);
                if (legendContainer) {
                    legendContainer.innerHTML = createMapLegend(metric);
                }
            });
        }

        // Geolocation button
        const geoBtn = document.getElementById('btn-geolocation');
        if (geoBtn) {
            geoBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    alert('La géolocalisation n\'est pas supportée par votre navigateur.');
                    return;
                }

                geoBtn.disabled = true;
                geoBtn.textContent = 'Recherche...';

                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;

                        // Find department from coordinates using reverse geocoding
                        try {
                            const response = await fetch(
                                `https://api-adresse.data.gouv.fr/reverse/?lat=${latitude}&lon=${longitude}`
                            );
                            const data = await response.json();

                            if (data.features && data.features.length > 0) {
                                const props = data.features[0].properties;
                                const deptCode = props.postcode?.substring(0, 2) || props.citycode?.substring(0, 2);

                                if (deptCode) {
                                    // Zoom to department
                                    const { zoomToDepartment, getMap } = await import('./map.js');
                                    zoomToDepartment(deptCode);

                                    // Also add a marker for user position
                                    const map = getMap();
                                    if (map) {
                                        L.marker([latitude, longitude])
                                            .addTo(map)
                                            .bindPopup('📍 Vous êtes ici')
                                            .openPopup();
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('Reverse geocoding failed:', e);
                        }

                        geoBtn.disabled = false;
                        geoBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                              <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                              <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                            </svg>
                            Ma position`;
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        alert('Impossible de récupérer votre position. Vérifiez les permissions.');
                        geoBtn.disabled = false;
                        geoBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                              <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                              <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                            </svg>
                            Ma position`;
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        }

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

/**
 * Handle filter changes
 */
async function handleFilterChange(filters) {
    console.log('Filters changed:', filters);

    try {
        showLoading(true);

        // If department filter changed, zoom to it
        if (filters.department) {
            try {
                const { zoomToDepartment } = await import('./map.js');
                zoomToDepartment(filters.department);
            } catch (e) {
                console.warn('Could not zoom to department:', e);
            }
        }

        // Build search criteria from filters
        const criteria = {};
        if (filters.gender) criteria.gender = filters.gender;
        if (filters.minAge) criteria.minAge = filters.minAge;
        if (filters.maxAge) criteria.maxAge = filters.maxAge;
        if (filters.nuance) criteria.nuance = filters.nuance;
        if (filters.mandate) criteria.mandate = filters.mandate;
        if (filters.department) criteria.department = filters.department;
        criteria.limit = 50;
        criteria.offset = 0;

        // Load elected officials based on filters
        await loadElectedTable(criteria);

    } catch (error) {
        console.error('Error applying filters:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Current pagination state
 */
let currentPage = 1;
const pageSize = 50;
let totalResults = 0;
let currentFilters = {};

/**
 * Load elected officials into the table
 */
async function loadElectedTable(filters = {}) {
    currentFilters = filters;

    const tableContainer = document.getElementById('table-container');
    const tableEmpty = document.getElementById('table-empty');
    const tableBody = document.getElementById('elected-table-body');
    const pagination = document.getElementById('pagination');

    try {
        // Add limit to filters if not present
        const queryFilters = {
            limit: pageSize,
            offset: (currentPage - 1) * pageSize,
            ...filters
        };

        // Use advanced search with filters
        const results = await ElectedAPI.advancedSearch(queryFilters);

        // Handle different response formats
        const elected = Array.isArray(results) ? results : results.elected || results.data || [];
        // Get total from pagination info
        totalResults = results.pagination?.total || results.total || 500000;

        if (elected.length === 0) {
            tableContainer.style.display = 'none';
            pagination.style.display = 'none';
            tableEmpty.style.display = 'flex';
            return;
        }

        // Show table, hide empty state
        tableEmpty.style.display = 'none';
        tableContainer.style.display = 'block';
        pagination.style.display = 'flex';

        // Populate table rows
        tableBody.innerHTML = elected.map(person => `
            <tr>
                <td>${person.lastName || person.nom || '-'}</td>
                <td>${person.firstName || person.prenom || '-'}</td>
                <td>${person.age || '-'}</td>
                <td><span class="badge badge--primary">${person.mandateType || person.mandat || person.mandate || '-'}</span></td>
                <td><span class="badge badge--secondary">${person.politicalNuance || person.nuance || '-'}</span></td>
                <td>${person.area || person.commune || person.city || '-'}</td>
                <td>
                    <button class="btn btn--primary btn--sm" onclick="viewProfile('${person.id}')" title="Voir le profil">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Voir
                    </button>
                </td>
            </tr>
        `).join('');

        // Update pagination info
        updatePagination();

    } catch (error) {
        console.error('Error loading elected table:', error);
        tableEmpty.style.display = 'flex';
        tableContainer.style.display = 'none';
        pagination.style.display = 'none';
    }
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');

    const totalPages = Math.ceil(totalResults / pageSize) || 1;

    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => changePage(currentPage - 1);
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = () => changePage(currentPage + 1);
    }
}

/**
 * Change to a different page
 */
async function changePage(newPage) {
    currentPage = newPage;
    currentFilters.offset = (currentPage - 1) * pageSize;
    await loadElectedTable(currentFilters);
}

/**
 * View profile - delegated to function at end of file
 */
// Note: window.viewProfile is defined at the end of this file with modal display

/**
 * Handle department selection from map
 */
function handleDepartmentSelection(event) {
    const { code, name, data } = event.detail;
    console.log(`Department selected: ${name} (${code})`, data);

    // Could update filters or show department details
    // setFilters({ department: code });
}

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput) return;

    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(debounceTimer);

        if (query.length < 2) {
            if (searchResults) searchResults.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const results = await ElectedAPI.search(query, 10);
                displaySearchResults(results, searchResults);
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });

    // Close results on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults?.contains(e.target)) {
            if (searchResults) searchResults.innerHTML = '';
        }
    });
}

/**
 * Display search results
 */
function displaySearchResults(results, container) {
    if (!container) return;

    if (!results || results.length === 0) {
        container.innerHTML = '<div class="search-results__empty">Aucun résultat</div>';
        return;
    }

    const items = Array.isArray(results) ? results : results.elected || results.data || [];

    container.innerHTML = `
    <div class="search-results__list">
      ${items.map(person => `
        <div class="search-results__item" data-id="${person.id}">
          <div class="search-results__name">${person.prenom || person.firstName || ''} ${person.nom || person.lastName || ''}</div>
          <div class="search-results__info">${person.mandat || person.mandate || ''} - ${person.commune || person.city || ''}</div>
        </div>
      `).join('')}
    </div>
  `;

    // Bind click events
    container.querySelectorAll('.search-results__item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            // Navigate to profile or show modal
            console.log('Selected person:', id);
        });
    });
}

/**
 * Initialize export buttons
 */
function initExportButtons() {
    const exportCsvBtn = document.getElementById('export-csv');
    const exportJsonBtn = document.getElementById('export-json');

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const filters = getActiveFilters();
            const url = ExportAPI.getElectedCSVUrl(filters);
            window.open(url, '_blank');
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            const url = ExportAPI.getStatsOverviewUrl();
            window.open(url, '_blank');
        });
    }
}

/**
 * Show/hide loading state
 */
function showLoading(isLoading) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = isLoading ? 'flex' : 'none';
    }

    document.body.classList.toggle('loading', isLoading);
}

/**
 * Show error message
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = `
      <div class="error-message">
        <span class="error-message__icon">⚠️</span>
        <span class="error-message__text">${message}</span>
      </div>
    `;
        errorContainer.style.display = 'block';
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initDashboard);

/**
 * View elected profile - fetches details and shows modal
 */
async function viewProfile(id) {
    if (!id) return;

    try {
        const data = await ElectedAPI.getProfile(id);
        const person = data.individual || data;
        const mandates = data.mandates || [];

        // Create modal content
        const modalContent = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                    <h2>${person.firstName || ''} ${person.lastName || ''}</h2>
                    <p><strong>Genre:</strong> ${person.gender === 'M' ? 'Homme' : 'Femme'}</p>
                    ${person.birthDate ? `<p><strong>Date de naissance:</strong> ${new Date(person.birthDate).toLocaleDateString('fr-FR')}</p>` : ''}
                    
                    <h3>Mandats</h3>
                    ${mandates.length > 0 ? mandates.map(m => {
            const isActive = m.isActive || !m.endDate;
            const statusBadge = isActive
                ? '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">En cours</span>'
                : '<span style="background: #94a3b8; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Terminé</span>';
            return `
                        <div class="mandate-item">
                            <p><strong>${m.type || 'Mandat'}</strong> ${statusBadge}</p>
                            <p>Lieu: ${m.area?.name || '-'}</p>
                            <p>Nuance: ${m.politicalNuance || '-'}</p>
                            <p>Début: ${m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : '-'}</p>
                            <p>Fin: ${m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : 'En cours'}</p>
                            ${m.endReason ? `<p>Motif fin: ${m.endReason}</p>` : ''}
                            ${m.profession ? `<p>Profession: ${m.profession}</p>` : ''}
                        </div>
                    `}).join('') : '<p>Aucun mandat trouvé</p>'}
                </div>
            </div>
        `;

        // Add modal to body
        const modalDiv = document.createElement('div');
        modalDiv.id = 'profile-modal';
        modalDiv.innerHTML = modalContent;
        document.body.appendChild(modalDiv);

    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Erreur lors du chargement du profil');
    }
}

/**
 * Close the profile modal
 */
function closeModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.remove();
    }
}

// Export functions to window for onclick access
window.viewProfile = viewProfile;
window.closeModal = closeModal;

// Export for debugging
window.BREFDashboard = {
    charts,
    cachedData,
    refresh: loadOverviewStats
};

/**
 * Initialize tabs logic
 */
function initTabs() {
    const tabs = document.querySelectorAll('.tabs__tab');
    const chartsView = document.querySelector('.charts-grid:not(#rankings-view)');
    const rankingsView = document.getElementById('rankings-view');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/Hide views
            const tabName = tab.dataset.tab;
            if (tabName === 'rankings') {
                if (chartsView) chartsView.style.display = 'none';
                if (rankingsView) {
                    rankingsView.style.display = 'grid';
                    loadRankings(); // Load data when tab is opened
                }
            } else {
                if (chartsView) chartsView.style.display = 'grid';
                if (rankingsView) rankingsView.style.display = 'none';
            }
        });
    });
}

/**
 * Load rankings data
 */
async function loadRankings() {
    const parityContainer = document.getElementById('ranking-parity');
    const ageContainer = document.getElementById('ranking-age');

    if (!parityContainer || !ageContainer) return;

    // Only load if empty or if needed to refresh
    if (!parityContainer.textContent.includes('Chargement') && parityContainer.children.length > 0) {
        return;
    }

    try {
        // Load data in parallel
        const [parityData, ageData] = await Promise.all([
            StatsAPI.getParityRankings(),
            StatsAPI.getAgeRankings()
        ]);

        // Render Parity Table
        renderRankingTable(parityContainer, parityData.slice(0, 10), [
            { label: '#', key: 'rank' },
            { label: 'Département', key: 'name' },
            { label: '% Femmes', key: 'parityPercentage', format: v => `${v}%` },
            { label: 'Total', key: 'totalElected' }
        ]);

        // Render Age Table
        renderRankingTable(ageContainer, ageData.slice(0, 10), [
            { label: '#', key: 'rank' },
            { label: 'Département', key: 'name' },
            { label: 'Âge Moyen', key: 'averageAge', format: v => `${v} ans` },
            { label: 'Total', key: 'totalElected' }
        ]);

    } catch (error) {
        console.warn('Error loading rankings:', error);
        parityContainer.innerHTML = '<p>Impossible de charger les classements.</p>';
        ageContainer.innerHTML = '<p>Impossible de charger les classements.</p>';
    }
}

/**
 * Helper to render a simple table
 */
function renderRankingTable(container, data, columns) {
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Aucune donnée disponible.</p>';
        return;
    }

    // Add rank if missing
    data.forEach((item, index) => {
        if (!item.rank) item.rank = index + 1;
    });

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '0.9em';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.textAlign = 'left';
    headerRow.style.background = 'var(--color-bg-secondary)';

    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.style.padding = '8px';
        th.style.borderBottom = '1px solid var(--color-border)';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--color-border)';

        columns.forEach(col => {
            const td = document.createElement('td');
            // Support nested properties if needed, but simple key access here
            const val = row[col.key];
            td.textContent = col.format ? col.format(val) : val;
            td.style.padding = '8px';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}
