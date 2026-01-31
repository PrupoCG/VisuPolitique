/**
 * BREF Dashboard - Chart Configurations
 * Chart.js setup and chart creation utilities
 */

// Color palette for charts
const COLORS = {
    primary: '#4361ee',
    secondary: '#7209b7',
    accent: '#f72585',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    male: '#3b82f6',
    female: '#ec4899',
    // Political nuances colors
    political: {
        'Extrême gauche': '#bb1e10',
        'Gauche': '#e63946',
        'Centre gauche': '#f4a261',
        'Centre': '#f1c40f',
        'Centre droit': '#3498db',
        'Droite': '#2c3e50',
        'Extrême droite': '#1a1a2e',
        'Écologiste': '#27ae60',
        'Régionaliste': '#9b59b6',
        'Divers': '#95a5a6'
    },
    // Chart gradient colors
    palette: [
        '#4361ee', '#7209b7', '#3a0ca3', '#f72585',
        '#4cc9f0', '#4895ef', '#560bad', '#b5179e',
        '#10b981', '#f59e0b'
    ]
};

// Default chart options (light theme)
const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                color: '#475569',
                font: { family: "'Inter', sans-serif", size: 12 },
                padding: 16,
                usePointStyle: true,
                pointStyle: 'circle'
            }
        },
        tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#0f172a',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            titleFont: { family: "'Inter', sans-serif", weight: 600 },
            bodyFont: { family: "'Inter', sans-serif" },
            displayColors: true,
            boxPadding: 4
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(226, 232, 240, 0.8)', drawBorder: false },
            ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 11 } }
        },
        y: {
            grid: { color: 'rgba(226, 232, 240, 0.8)', drawBorder: false },
            ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 11 } }
        }
    }
};

/**
 * Create a donut/pie chart for gender distribution
 */
export function createGenderChart(ctx, data) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hommes', 'Femmes'],
            datasets: [{
                data: [data.male || data.hommes, data.female || data.femmes],
                backgroundColor: [COLORS.male, COLORS.female],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            ...defaultOptions,
            cutout: '65%',
            plugins: {
                ...defaultOptions.plugins,
                legend: {
                    ...defaultOptions.plugins.legend,
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Create a bar chart for age distribution
 */
export function createAgeChart(ctx, data) {
    // data should be array of { tranche: '18-30', count: 123 }
    const labels = data.map(d => d.tranche || d.range || d.label);
    const values = data.map(d => d.count || d.value || d.total);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Nombre d\'élus',
                data: values,
                backgroundColor: createGradient(ctx, COLORS.primary, COLORS.secondary),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...defaultOptions,
            plugins: {
                ...defaultOptions.plugins,
                legend: { display: false }
            },
            scales: {
                ...defaultOptions.scales,
                y: {
                    ...defaultOptions.scales.y,
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Create a horizontal bar chart for political nuances
 */
export function createNuancesChart(ctx, data) {
    // data should be array of { nuance: 'Gauche', count: 123 }
    const sorted = [...data].sort((a, b) => (b.count || b.total) - (a.count || a.total));
    const labels = sorted.map(d => d.nuance || d.label);
    const values = sorted.map(d => d.count || d.total || d.value);
    const colors = sorted.map(d => COLORS.political[d.nuance] || COLORS.palette[0]);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Élus',
                data: values,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            ...defaultOptions,
            indexAxis: 'y',
            plugins: {
                ...defaultOptions.plugins,
                legend: { display: false },
                // Custom plugin to display values on bars
                tooltip: {
                    ...defaultOptions.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            return context.raw.toLocaleString('fr-FR') + ' élus';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ...defaultOptions.scales.x,
                    beginAtZero: true,
                    ticks: {
                        ...defaultOptions.scales.x.ticks,
                        callback: function (value) {
                            return value >= 1000 ? (value / 1000) + 'K' : value;
                        }
                    }
                },
                y: {
                    ...defaultOptions.scales.y,
                    grid: { display: false },
                    ticks: {
                        ...defaultOptions.scales.y.ticks,
                        font: { size: 10 }
                    }
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function (chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        const formatted = value >= 1000 ? Math.round(value / 1000) + 'K' : value;

                        ctx.save();
                        ctx.fillStyle = '#475569';
                        ctx.font = '10px Inter, sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';

                        const x = bar.x + 5;
                        const y = bar.y;
                        ctx.fillText(formatted, x, y);
                        ctx.restore();
                    });
                });
            }
        }]
    });
}

/**
 * Create a polar area chart for mandate types
 */
export function createMandatesChart(ctx, data) {
    // data should be array of { type: 'Maire', count: 123 }
    const sorted = [...data].sort((a, b) => (b.count || b.total) - (a.count || a.total));
    // Take top 6 to keep it readable
    const top = sorted.slice(0, 6);
    const labels = top.map(d => truncateLabel(d.type || d.label, 18));
    const values = top.map(d => d.count || d.total || d.value);

    return new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(67, 97, 238, 0.8)',
                    'rgba(114, 9, 183, 0.8)',
                    'rgba(247, 37, 133, 0.8)',
                    'rgba(76, 201, 240, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#475569',
                        font: { family: "'Inter', sans-serif", size: 10 },
                        padding: 8,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    ...defaultOptions.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value.toLocaleString('fr-FR')} (${percent}%)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    display: false
                }
            }
        }
    });
}

/**
 * Create a line chart for evolution over time
 */
export function createEvolutionChart(ctx, data) {
    // data should be array of { year: 2020, total: 123, women: 50 }
    const labels = data.map(d => d.year || d.date);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total',
                    data: data.map(d => d.total),
                    borderColor: COLORS.primary,
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Femmes',
                    data: data.map(d => d.women || d.femmes),
                    borderColor: COLORS.female,
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            ...defaultOptions,
            plugins: {
                ...defaultOptions.plugins,
                legend: {
                    ...defaultOptions.plugins.legend,
                    position: 'top'
                }
            },
            scales: {
                ...defaultOptions.scales,
                y: {
                    ...defaultOptions.scales.y,
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Create a bar chart for professions
 */
export function createProfessionsChart(ctx, data, limit = 10) {
    const topData = data.slice(0, limit);
    const labels = topData.map(d => truncateLabel(d.profession || d.label, 20));
    const values = topData.map(d => d.count || d.total || d.value);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Élus',
                data: values,
                backgroundColor: COLORS.palette,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            ...defaultOptions,
            indexAxis: 'y',
            plugins: {
                ...defaultOptions.plugins,
                legend: { display: false }
            },
            scales: {
                x: {
                    ...defaultOptions.scales.x,
                    beginAtZero: true
                },
                y: {
                    ...defaultOptions.scales.y,
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Create gradient for chart backgrounds
 */
function createGradient(ctx, color1, color2) {
    const canvas = ctx.canvas || ctx;
    const context = canvas.getContext ? canvas.getContext('2d') : ctx;
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height || 300);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

/**
 * Truncate long labels
 */
function truncateLabel(label, maxLength) {
    if (!label) return '';
    return label.length > maxLength ? label.slice(0, maxLength - 1) + '…' : label;
}

/**
 * Format large numbers
 */
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('fr-FR');
}

/**
 * Animate a number counting up
 */
export function animateValue(element, start, end, duration = 1000) {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.floor(start + range * easeProgress);
        element.textContent = formatNumber(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Export colors for use in other modules
export { COLORS, defaultOptions };
