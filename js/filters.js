/**
 * BREF Dashboard - Filters Module
 * Filter state management and UI updates
 */

// Current filter state
let filterState = {
    department: '',
    region: '',
    mandateType: '',
    gender: '',
    minAge: '',
    maxAge: '',
    nuance: '',
    search: ''
};

// Callback for filter changes
let onFilterChange = null;

/**
 * Initialize filters
 */
export function initFilters(callback) {
    onFilterChange = callback;

    // Bind filter inputs
    bindFilterInput('filter-department', 'department');
    bindFilterInput('filter-mandate', 'mandateType');
    bindFilterInput('filter-gender', 'gender');
    bindFilterInput('filter-nuance', 'nuance');
    bindFilterInput('filter-min-age', 'minAge');
    bindFilterInput('filter-max-age', 'maxAge');
    bindFilterInput('search-input', 'search');

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

/**
 * Bind a filter input to state
 */
function bindFilterInput(elementId, stateKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.addEventListener('change', (e) => {
        updateFilter(stateKey, e.target.value);
    });

    // Special handling for search with debounce
    if (stateKey === 'search') {
        let debounceTimer;
        element.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateFilter(stateKey, e.target.value);
            }, 300);
        });
    }
}

/**
 * Update a filter value
 */
export function updateFilter(key, value) {
    filterState[key] = value;
    updateActiveFiltersTags();

    if (onFilterChange) {
        onFilterChange(getActiveFilters());
    }
}

/**
 * Get all active filters (non-empty values)
 */
export function getActiveFilters() {
    const active = {};
    Object.entries(filterState).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            active[key] = value;
        }
    });
    return active;
}

/**
 * Set multiple filters at once
 */
export function setFilters(filters) {
    Object.entries(filters).forEach(([key, value]) => {
        if (key in filterState) {
            filterState[key] = value;

            // Update UI
            const input = document.getElementById(`filter-${key}`) ||
                document.getElementById(`filter-${toKebabCase(key)}`);
            if (input) {
                input.value = value;
            }
        }
    });

    updateActiveFiltersTags();

    if (onFilterChange) {
        onFilterChange(getActiveFilters());
    }
}

/**
 * Clear all filters
 */
export function clearAllFilters() {
    Object.keys(filterState).forEach(key => {
        filterState[key] = '';

        const input = document.getElementById(`filter-${key}`) ||
            document.getElementById(`filter-${toKebabCase(key)}`) ||
            document.getElementById('search-input');
        if (input) {
            input.value = '';
        }
    });

    updateActiveFiltersTags();

    if (onFilterChange) {
        onFilterChange({});
    }
}

/**
 * Remove a single filter
 */
export function removeFilter(key) {
    filterState[key] = '';

    const input = document.getElementById(`filter-${key}`) ||
        document.getElementById(`filter-${toKebabCase(key)}`);
    if (input) {
        input.value = '';
    }

    updateActiveFiltersTags();

    if (onFilterChange) {
        onFilterChange(getActiveFilters());
    }
}

/**
 * Update the active filters tags display
 */
function updateActiveFiltersTags() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    const activeFilters = getActiveFilters();
    const entries = Object.entries(activeFilters);

    if (entries.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = entries.map(([key, value]) => `
    <span class="filter-tag">
      ${getFilterLabel(key)}: ${value}
      <span class="filter-tag__remove" data-filter="${key}" title="Supprimer">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </span>
    </span>
  `).join('');

    // Bind remove buttons
    container.querySelectorAll('.filter-tag__remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterKey = e.currentTarget.dataset.filter;
            removeFilter(filterKey);
        });
    });
}

/**
 * Get human-readable label for filter key
 */
function getFilterLabel(key) {
    const labels = {
        department: 'Département',
        region: 'Région',
        mandateType: 'Mandat',
        gender: 'Genre',
        minAge: 'Âge min',
        maxAge: 'Âge max',
        nuance: 'Nuance',
        search: 'Recherche'
    };
    return labels[key] || key;
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Populate filter dropdowns with data
 */
export async function populateFilterOptions(api) {
    try {
        // Populate mandate types
        const mandateTypes = await getMandateTypeOptions();
        populateSelect('filter-mandate', mandateTypes);

        // Populate political nuances
        const nuances = await getNuanceOptions();
        populateSelect('filter-nuance', nuances);

        // Populate departments
        const departments = getDepartmentOptions();
        populateSelect('filter-department', departments);

    } catch (error) {
        console.error('Error populating filter options:', error);
    }
}

/**
 * Populate a select element with options
 */
function populateSelect(elementId, options) {
    const select = document.getElementById(elementId);
    if (!select) return;

    // Keep first option (placeholder)
    const firstOption = select.querySelector('option');
    select.innerHTML = '';
    if (firstOption) {
        select.appendChild(firstOption);
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
}

/**
 * Get mandate type options
 */
function getMandateTypeOptions() {
    return [
        { value: 'maire', label: 'Maire' },
        { value: 'depute', label: 'Député' },
        { value: 'senateur', label: 'Sénateur' },
        { value: 'conseiller_regional', label: 'Conseiller régional' },
        { value: 'conseiller_departemental', label: 'Conseiller départemental' },
        { value: 'conseiller_municipal', label: 'Conseiller municipal' }
    ];
}

/**
 * Get political nuance options
 */
function getNuanceOptions() {
    return [
        { value: 'EXG', label: 'Extrême gauche' },
        { value: 'COM', label: 'Communiste' },
        { value: 'FI', label: 'France Insoumise' },
        { value: 'SOC', label: 'Socialiste' },
        { value: 'ECO', label: 'Écologiste' },
        { value: 'DVG', label: 'Divers gauche' },
        { value: 'RDG', label: 'Radical de gauche' },
        { value: 'MDM', label: 'Modem' },
        { value: 'REN', label: 'Renaissance' },
        { value: 'UDI', label: 'UDI' },
        { value: 'LR', label: 'Les Républicains' },
        { value: 'DVD', label: 'Divers droite' },
        { value: 'RN', label: 'Rassemblement National' },
        { value: 'EXD', label: 'Extrême droite' },
        { value: 'REG', label: 'Régionaliste' },
        { value: 'DIV', label: 'Divers' }
    ];
}

/**
 * Get department options
 */
function getDepartmentOptions() {
    return [
        { value: '01', label: '01 - Ain' },
        { value: '02', label: '02 - Aisne' },
        { value: '03', label: '03 - Allier' },
        { value: '04', label: '04 - Alpes-de-Haute-Provence' },
        { value: '05', label: '05 - Hautes-Alpes' },
        { value: '06', label: '06 - Alpes-Maritimes' },
        { value: '07', label: '07 - Ardèche' },
        { value: '08', label: '08 - Ardennes' },
        { value: '09', label: '09 - Ariège' },
        { value: '10', label: '10 - Aube' },
        { value: '11', label: '11 - Aude' },
        { value: '12', label: '12 - Aveyron' },
        { value: '13', label: '13 - Bouches-du-Rhône' },
        { value: '14', label: '14 - Calvados' },
        { value: '15', label: '15 - Cantal' },
        { value: '16', label: '16 - Charente' },
        { value: '17', label: '17 - Charente-Maritime' },
        { value: '18', label: '18 - Cher' },
        { value: '19', label: '19 - Corrèze' },
        { value: '2A', label: '2A - Corse-du-Sud' },
        { value: '2B', label: '2B - Haute-Corse' },
        { value: '21', label: '21 - Côte-d\'Or' },
        { value: '22', label: '22 - Côtes-d\'Armor' },
        { value: '23', label: '23 - Creuse' },
        { value: '24', label: '24 - Dordogne' },
        { value: '25', label: '25 - Doubs' },
        { value: '26', label: '26 - Drôme' },
        { value: '27', label: '27 - Eure' },
        { value: '28', label: '28 - Eure-et-Loir' },
        { value: '29', label: '29 - Finistère' },
        { value: '30', label: '30 - Gard' },
        { value: '31', label: '31 - Haute-Garonne' },
        { value: '32', label: '32 - Gers' },
        { value: '33', label: '33 - Gironde' },
        { value: '34', label: '34 - Hérault' },
        { value: '35', label: '35 - Ille-et-Vilaine' },
        { value: '36', label: '36 - Indre' },
        { value: '37', label: '37 - Indre-et-Loire' },
        { value: '38', label: '38 - Isère' },
        { value: '39', label: '39 - Jura' },
        { value: '40', label: '40 - Landes' },
        { value: '41', label: '41 - Loir-et-Cher' },
        { value: '42', label: '42 - Loire' },
        { value: '43', label: '43 - Haute-Loire' },
        { value: '44', label: '44 - Loire-Atlantique' },
        { value: '45', label: '45 - Loiret' },
        { value: '46', label: '46 - Lot' },
        { value: '47', label: '47 - Lot-et-Garonne' },
        { value: '48', label: '48 - Lozère' },
        { value: '49', label: '49 - Maine-et-Loire' },
        { value: '50', label: '50 - Manche' },
        { value: '51', label: '51 - Marne' },
        { value: '52', label: '52 - Haute-Marne' },
        { value: '53', label: '53 - Mayenne' },
        { value: '54', label: '54 - Meurthe-et-Moselle' },
        { value: '55', label: '55 - Meuse' },
        { value: '56', label: '56 - Morbihan' },
        { value: '57', label: '57 - Moselle' },
        { value: '58', label: '58 - Nièvre' },
        { value: '59', label: '59 - Nord' },
        { value: '60', label: '60 - Oise' },
        { value: '61', label: '61 - Orne' },
        { value: '62', label: '62 - Pas-de-Calais' },
        { value: '63', label: '63 - Puy-de-Dôme' },
        { value: '64', label: '64 - Pyrénées-Atlantiques' },
        { value: '65', label: '65 - Hautes-Pyrénées' },
        { value: '66', label: '66 - Pyrénées-Orientales' },
        { value: '67', label: '67 - Bas-Rhin' },
        { value: '68', label: '68 - Haut-Rhin' },
        { value: '69', label: '69 - Rhône' },
        { value: '70', label: '70 - Haute-Saône' },
        { value: '71', label: '71 - Saône-et-Loire' },
        { value: '72', label: '72 - Sarthe' },
        { value: '73', label: '73 - Savoie' },
        { value: '74', label: '74 - Haute-Savoie' },
        { value: '75', label: '75 - Paris' },
        { value: '76', label: '76 - Seine-Maritime' },
        { value: '77', label: '77 - Seine-et-Marne' },
        { value: '78', label: '78 - Yvelines' },
        { value: '79', label: '79 - Deux-Sèvres' },
        { value: '80', label: '80 - Somme' },
        { value: '81', label: '81 - Tarn' },
        { value: '82', label: '82 - Tarn-et-Garonne' },
        { value: '83', label: '83 - Var' },
        { value: '84', label: '84 - Vaucluse' },
        { value: '85', label: '85 - Vendée' },
        { value: '86', label: '86 - Vienne' },
        { value: '87', label: '87 - Haute-Vienne' },
        { value: '88', label: '88 - Vosges' },
        { value: '89', label: '89 - Yonne' },
        { value: '90', label: '90 - Territoire de Belfort' },
        { value: '91', label: '91 - Essonne' },
        { value: '92', label: '92 - Hauts-de-Seine' },
        { value: '93', label: '93 - Seine-Saint-Denis' },
        { value: '94', label: '94 - Val-de-Marne' },
        { value: '95', label: '95 - Val-d\'Oise' },
        { value: '971', label: '971 - Guadeloupe' },
        { value: '972', label: '972 - Martinique' },
        { value: '973', label: '973 - Guyane' },
        { value: '974', label: '974 - La Réunion' },
        { value: '976', label: '976 - Mayotte' }
    ];
}

export { filterState };
