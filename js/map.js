/**
 * BREF Dashboard - Map Configuration
 * Leaflet map setup and France visualization
 */

// Map configuration
const MAP_CONFIG = {
    center: [46.603354, 1.888334], // Center of France
    zoom: 6,
    minZoom: 5,
    maxZoom: 12,
    tileLayer: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

// Color scales for choropleth (light theme friendly - more vibrant)
const COLOR_SCALES = {
    density: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1', '#0c4a6e'],
    parity: ['#fee2e2', '#fdba74', '#fde047', '#86efac', '#34d399'],
    age: ['#bbf7d0', '#86efac', '#fcd34d', '#fb923c', '#ef4444']
};

let map = null;
let geojsonLayer = null;
let currentMetric = 'density';

/**
 * Initialize the Leaflet map
 */
export function initMap(containerId = 'map') {
    map = L.map(containerId, {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Add dark tile layer
    L.tileLayer(MAP_CONFIG.tileLayer, {
        attribution: MAP_CONFIG.attribution,
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Style zoom controls
    map.zoomControl.setPosition('topright');

    return map;
}

/**
 * Load and display France GeoJSON
 */
export async function loadFranceGeoJSON(dataByDepartment = {}) {
    try {
        // Try to load local GeoJSON first, fallback to remote
        let geojsonUrl = './assets/france-departments.geojson';
        let response = await fetch(geojsonUrl);

        if (!response.ok) {
            // Fallback to a public GeoJSON source
            geojsonUrl = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson';
            response = await fetch(geojsonUrl);
        }

        if (!response.ok) {
            throw new Error('Could not load GeoJSON');
        }

        const geojson = await response.json();
        displayGeoJSON(geojson, dataByDepartment);
        return geojson;
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        // Show message on map
        showMapMessage('Carte non disponible');
        return null;
    }
}

/**
 * Display GeoJSON on map with styling
 */
function displayGeoJSON(geojson, dataByDepartment) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    geojsonLayer = L.geoJSON(geojson, {
        style: (feature) => getFeatureStyle(feature, dataByDepartment),
        onEachFeature: (feature, layer) => {
            const deptCode = feature.properties.code;
            const deptName = feature.properties.nom;
            const data = dataByDepartment[deptCode] || {};

            // Tooltip on hover
            layer.bindTooltip(createTooltipContent(deptName, deptCode, data), {
                sticky: true,
                className: 'map-tooltip-container'
            });

            // Click handler
            layer.on('click', () => {
                onDepartmentClick(deptCode, deptName, data);
            });

            // Hover effects
            layer.on('mouseover', (e) => {
                layer.setStyle({
                    weight: 2,
                    fillOpacity: 0.8
                });
            });

            layer.on('mouseout', () => {
                geojsonLayer.resetStyle(layer);
            });
        }
    }).addTo(map);

    // Fit bounds to France
    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
}

/**
 * Get style for a GeoJSON feature
 */
function getFeatureStyle(feature, dataByDepartment) {
    const deptCode = feature.properties.code;
    const data = dataByDepartment[deptCode];

    let fillColor = '#dbeafe'; // Default light blue

    if (data) {
        // Map metric names to data property names
        let value;
        if (currentMetric === 'density') {
            value = data.total || 0;
        } else if (currentMetric === 'parity') {
            value = data.parity || 0;
        } else if (currentMetric === 'age') {
            value = data.avgAge || 55;
        } else {
            value = data.total || 0;
        }
        fillColor = getColorForValue(value, currentMetric);
    }

    return {
        fillColor,
        fillOpacity: 0.7,
        weight: 1,
        color: '#64748b',
        opacity: 1
    };
}

/**
 * Get color based on value and metric type
 */
function getColorForValue(value, metric) {
    const scale = COLOR_SCALES[metric] || COLOR_SCALES.density;

    if (metric === 'density') {
        // Thresholds for elected count (thousands)
        if (value <= 2000) return scale[0];
        if (value <= 4000) return scale[1];
        if (value <= 6000) return scale[2];
        if (value <= 8000) return scale[3];
        return scale[4];
    } else if (metric === 'parity') {
        // Thresholds for female percentage
        if (value < 35) return scale[0];
        if (value < 38) return scale[1];
        if (value < 41) return scale[2];
        if (value < 44) return scale[3];
        return scale[4];
    } else if (metric === 'age') {
        // Thresholds for average age
        if (value < 58) return scale[0];
        if (value < 61) return scale[1];
        if (value < 63) return scale[2];
        if (value < 65) return scale[3];
        return scale[4];
    }

    // Fallback
    return scale[2];
}

/**
 * Create tooltip HTML content
 */
function createTooltipContent(name, code, data) {
    const total = data.total || 0;
    const parity = data.parity || data.parityPercent || 0;
    const avgAge = data.avgAge || data.averageAge || 0;

    return `
    <div class="map-tooltip">
      <div class="map-tooltip__title">${name} (${code})</div>
      <div class="map-tooltip__stat">
        <span class="map-tooltip__label">Élus</span>
        <span class="map-tooltip__value">${total.toLocaleString('fr-FR')}</span>
      </div>
      ${parity ? `
      <div class="map-tooltip__stat">
        <span class="map-tooltip__label">Parité</span>
        <span class="map-tooltip__value">${parity.toFixed(1)}%</span>
      </div>
      ` : ''}
      ${avgAge ? `
      <div class="map-tooltip__stat">
        <span class="map-tooltip__label">Âge moyen</span>
        <span class="map-tooltip__value">${avgAge.toFixed(1)} ans</span>
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Handle department click
 */
function onDepartmentClick(code, name, data) {
    // Dispatch custom event for app to handle
    const event = new CustomEvent('departmentSelected', {
        detail: { code, name, data }
    });
    document.dispatchEvent(event);
}

/**
 * Update map with new data
 */
export function updateMapData(dataByDepartment, metric = 'density') {
    currentMetric = metric;

    if (geojsonLayer) {
        geojsonLayer.eachLayer((layer) => {
            const deptCode = layer.feature.properties.code;
            const data = dataByDepartment[deptCode] || {};

            layer.setStyle(getFeatureStyle(layer.feature, dataByDepartment));
            layer.setTooltipContent(createTooltipContent(
                layer.feature.properties.nom,
                deptCode,
                data
            ));
        });
    }
}

/**
 * Show message on map (for errors or loading)
 */
function showMapMessage(message) {
    const container = document.getElementById('map');
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.className = 'map-overlay';
    overlay.innerHTML = `
    <div class="map-overlay__content">
      <div class="map-overlay__icon">🗺️</div>
      <div class="map-overlay__message">${message}</div>
    </div>
  `;
    container.appendChild(overlay);
}

/**
 * Zoom to a specific department
 */
export function zoomToDepartment(code) {
    if (!geojsonLayer) return;

    geojsonLayer.eachLayer((layer) => {
        if (layer.feature.properties.code === code) {
            map.fitBounds(layer.getBounds(), { padding: [50, 50] });
            layer.openTooltip();
        }
    });
}

/**
 * Reset map view to full France
 */
export function resetMapView() {
    if (map && geojsonLayer) {
        map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
    }
}

/**
 * Get map instance
 */
export function getMap() {
    return map;
}

/**
 * Create map legend
 */
export function createMapLegend(metric = 'density') {
    const scale = COLOR_SCALES[metric] || COLOR_SCALES.density;
    const labels = {
        density: ['< 2K', '2K-4K', '4K-6K', '6K-8K', '> 8K'],
        parity: ['< 35%', '35-38%', '38-41%', '41-44%', '> 44%'],
        age: ['< 58 ans', '58-61', '61-63', '63-65', '> 65 ans']
    };

    const titles = {
        density: 'Nombre d\'élus',
        parity: 'Parité femmes',
        age: 'Âge moyen'
    };

    return `
    <div class="map-legend">
      <div class="map-legend__title">${titles[metric] || 'Valeur'}</div>
      <div class="map-legend__scale">
        ${scale.map((color, i) => `
          <div class="map-legend__item">
            <span class="map-legend__color" style="background: ${color}"></span>
            <span>${labels[metric]?.[i] || ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export { MAP_CONFIG, COLOR_SCALES };
