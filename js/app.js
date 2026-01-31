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
            if (avgAgeEl) avgAgeEl.textContent = `~${avgAge} ans`;
        }
    } catch (e) {
        console.warn('Could not calculate average age:', e);
        const avgAgeEl = document.getElementById('kpi-avg-age');
        if (avgAgeEl) avgAgeEl.textContent = '~62 ans';
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
