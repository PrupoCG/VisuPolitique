/**
 * BREF API Client
 * REST API client for French elected officials data
 */

const API_BASE = 'https://api.bref.chanutgirardi.com';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unknown API error');
    }

    return data.data;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Stats API endpoints
 */
export const StatsAPI = {
  /**
   * Get overall database statistics
   */
  async getOverview() {
    return apiFetch('/api/stats/overview');
  },

  /**
   * Get gender distribution
   */
  async getGender() {
    return apiFetch('/api/stats/gender');
  },

  /**
   * Get age distribution
   */
  async getAge() {
    return apiFetch('/api/stats/age');
  },

  /**
   * Get political nuances distribution
   */
  async getPoliticalNuances() {
    return apiFetch('/api/stats/political-nuances');
  },

  /**
   * Get professions distribution
   * @param {number} limit - Max number of results (default: 20)
   */
  async getProfessions(limit = 20) {
    return apiFetch(`/api/stats/professions?limit=${limit}`);
  },

  /**
   * Get mandate types distribution
   */
  async getMandateTypes() {
    return apiFetch('/api/stats/mandate-types');
  },

  /**
   * Get cumul des mandats statistics
   */
  async getCumul() {
    return apiFetch('/api/stats/cumul');
  },

  /**
   * Get temporal evolution data
   */
  async getEvolution() {
    return apiFetch('/api/stats/evolution');
  },

  /**
   * Get parity rankings by department
   */
  async getParityRankings() {
    return apiFetch('/api/stats/rankings/parity');
  },

  /**
   * Get age rankings by department
   */
  async getAgeRankings() {
    return apiFetch('/api/stats/rankings/age');
  },

  /**
   * Compare two territories
   * @param {string} area1 - First territory code
   * @param {string} area2 - Second territory code
   */
  async compare(area1, area2) {
    return apiFetch(`/api/stats/compare?area1=${area1}&area2=${area2}`);
  },

  /**
   * Get mandate ending statistics
   */
  async getMandateEndings() {
    return apiFetch('/api/stats/mandate-endings');
  },

  /**
   * Get heat map data for geographic visualization
   */
  async getHeatMapData() {
    return apiFetch('/api/stats/heat-map');
  },

  /**
   * Get political map data with dominant nuance per department
   * Returns full response with colorLegend and data
   */
  async getPoliticalMapData() {
    const response = await fetch(`${API_BASE}/api/stats/political-map`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch political map');
    const result = await response.json();
    // Return full object with data and colorLegend
    return { data: result.data, colorLegend: result.colorLegend };
  }
};

/**
 * Location API endpoints
 */
export const LocationAPI = {
  /**
   * Get elected officials for a city
   * @param {string} codeInsee - INSEE code of the city
   */
  async getCity(codeInsee) {
    return apiFetch(`/api/location/city/${codeInsee}`);
  },

  /**
   * Get historical mayors for a city
   * @param {string} codeInsee - INSEE code of the city
   */
  async getCityHistory(codeInsee) {
    return apiFetch(`/api/location/city/${codeInsee}/history`);
  },

  /**
   * Search for a city by name
   * @param {string} name - City name to search
   * @param {number} limit - Max results (default: 10)
   */
  async searchCity(name, limit = 10) {
    return apiFetch(`/api/location/city-search?name=${encodeURIComponent(name)}&limit=${limit}`);
  },

  /**
   * Get officials in a department
   * @param {string} code - Department code
   * @param {Object} options - Pagination options
   */
  async getDepartment(code, { limit = 50, offset = 0 } = {}) {
    return apiFetch(`/api/location/department/${code}?limit=${limit}&offset=${offset}`);
  },

  /**
   * Get deputy for a constituency
   * @param {string} code - Constituency code
   */
  async getConstituency(code) {
    return apiFetch(`/api/location/constituency/${code}`);
  },

  /**
   * Find officials near GPS coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  async getByGPS(lat, lng) {
    return apiFetch(`/api/location/gps?lat=${lat}&lng=${lng}`);
  },

  /**
   * Get available area types
   */
  async getAreaTypes() {
    return apiFetch('/api/location/area-types');
  }
};

/**
 * Elected API endpoints
 */
export const ElectedAPI = {
  /**
   * Get list of elected officials with filters
   * @param {Object} options - Filter options
   */
  async getList({ limit = 50, offset = 0, gender, active } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (gender) params.append('gender', gender);
    if (active !== undefined) params.append('active', active);
    return apiFetch(`/api/elected?${params}`);
  },

  /**
   * Simple search by name
   * @param {string} name - Name to search
   * @param {number} limit - Max results
   */
  async search(name, limit = 20) {
    return apiFetch(`/api/elected/search?name=${encodeURIComponent(name)}&limit=${limit}`);
  },

  /**
   * Advanced multi-criteria search
   * @param {Object} criteria - Search criteria
   * Returns { elected: [], pagination: { limit, offset, total } }
   */
  async advancedSearch(criteria = {}) {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    // Fetch directly to preserve pagination info
    const response = await fetch(`${API_BASE}/api/elected/advanced-search?${params}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Advanced search failed');
    const result = await response.json();

    // Return with pagination info preserved
    return {
      elected: result.data || [],
      pagination: result.pagination || { total: result.data?.length || 0 }
    };
  },

  /**
   * Get full profile of an official
   * @param {string} id - Official ID
   */
  async getProfile(id) {
    return apiFetch(`/api/elected/${id}`);
  },

  /**
   * Get all mandates for an official
   * @param {string} id - Official ID
   */
  async getMandates(id) {
    return apiFetch(`/api/elected/${id}/mandates`);
  },

  /**
   * Get career timeline for an official
   * @param {string} id - Official ID
   */
  async getCareer(id) {
    return apiFetch(`/api/elected/${id}/career`);
  },

  /**
   * Get all current mayors
   */
  async getCurrentMayors() {
    return apiFetch('/api/elected/current/mayors');
  },

  /**
   * Get all current deputies
   */
  async getCurrentDeputies() {
    return apiFetch('/api/elected/current/deputies');
  },

  /**
   * Get all current senators
   */
  async getCurrentSenators() {
    return apiFetch('/api/elected/current/senators');
  }
};

/**
 * Areas API endpoints
 */
export const AreasAPI = {
  /**
   * Get area category types
   */
  async getTypes() {
    return apiFetch('/api/areas/types');
  },

  /**
   * Search for a territory
   * @param {Object} options - Search options
   */
  async search({ name, type, limit = 20 } = {}) {
    const params = new URLSearchParams({ limit });
    if (name) params.append('name', name);
    if (type) params.append('type', type);
    return apiFetch(`/api/areas/search?${params}`);
  },

  /**
   * Get details for a territory
   * @param {string} id - Territory ID
   */
  async getDetails(id) {
    return apiFetch(`/api/areas/${id}`);
  },

  /**
   * Get elected officials for a territory
   * @param {string} id - Territory ID
   * @param {Object} options - Filter options
   */
  async getElected(id, { limit = 50, offset = 0, active } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (active !== undefined) params.append('active', active);
    return apiFetch(`/api/areas/${id}/elected?${params}`);
  }
};

/**
 * Export API endpoints
 */
export const ExportAPI = {
  /**
   * Get CSV export URL for elected officials
   * @param {Object} filters - Export filters
   */
  getElectedCSVUrl(filters = {}) {
    const params = new URLSearchParams(filters);
    return `${API_BASE}/api/export/elected?${params}`;
  },

  /**
   * Get JSON export URL for stats overview
   */
  getStatsOverviewUrl() {
    return `${API_BASE}/api/export/stats/overview`;
  }
};

// Default export with all APIs
export default {
  Stats: StatsAPI,
  Location: LocationAPI,
  Elected: ElectedAPI,
  Areas: AreasAPI,
  Export: ExportAPI
};
