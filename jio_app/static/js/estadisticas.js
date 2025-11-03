// Funciones para manejar los gráficos de estadísticas

// Variables globales para los gráficos
let moneyChart = null;
let categoryChart = null;
let daysChart = null;
let currentViewMode = 'medium'; // 'small', 'medium', 'large'

// Función para obtener datos de elementos ocultos
function getDataFromElement(elementId) {
    const element = document.getElementById(elementId);
    if (element && element.textContent.trim()) {
        try {
            return JSON.parse(element.textContent.trim());
        } catch (e) {
            console.error('Error parsing data from', elementId, e);
            return [];
        }
    }
    return [];
}

// Función para obtener el tamaño del gráfico según el modo
function getChartHeight() {
    switch (currentViewMode) {
        case 'small':
            return 300;
        case 'medium':
            return 400;
        case 'large':
            return 500;
        default:
            return 400;
    }
}

// Inicializar gráfico de dinero
function initMoneyChart() {
    const ctx = document.getElementById('moneyChart');
    if (!ctx) return;

    const weeklyLabels = getDataFromElement('ventas-semanales-labels');
    const weeklyData = getDataFromElement('ventas-semanales-data');

    moneyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeklyLabels,
            datasets: [{
                label: 'Ventas ($)',
                data: weeklyData,
                borderColor: '#2E7D32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: $' + context.parsed.y.toLocaleString('es-CL');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString('es-CL');
                        }
                    }
                }
            }
        }
    });

    // Activar botón semanal por defecto y desactivar otros
    const buttons = document.querySelectorAll('#time-filter button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('style');
    });
    if (buttons.length > 0) {
        buttons[0].classList.add('active');
    }
}

// Actualizar gráfico de dinero según período
function updateMoneyChart(period, buttonElement) {
    if (!moneyChart) {
        console.error('Money chart no inicializado');
        return;
    }

    let labels, data;

    switch (period) {
        case 'weekly':
            labels = getDataFromElement('ventas-semanales-labels');
            data = getDataFromElement('ventas-semanales-data');
            break;
        case 'monthly':
            labels = getDataFromElement('ventas-mensuales-labels');
            data = getDataFromElement('ventas-mensuales-data');
            break;
        case 'yearly':
            labels = getDataFromElement('ventas-anuales-labels');
            data = getDataFromElement('ventas-anuales-data');
            break;
        default:
            labels = getDataFromElement('ventas-semanales-labels');
            data = getDataFromElement('ventas-semanales-data');
    }

    // Validar que hay datos
    if (!Array.isArray(labels) || !Array.isArray(data)) {
        console.warn('Datos inválidos para período:', period);
        return;
    }

    // Actualizar datos del gráfico
    moneyChart.data.labels = labels;
    moneyChart.data.datasets[0].data = data;
    moneyChart.update('active');

    // Actualizar botones activos - Asegurar que solo uno esté activo
    const buttons = document.querySelectorAll('#time-filter button');
    // Primero remover active de TODOS
    buttons.forEach(btn => {
        btn.classList.remove('active');
        // Limpiar estilos inline
        btn.removeAttribute('style');
    });
    
    // Luego activar solo el seleccionado
    if (buttonElement) {
        buttonElement.classList.add('active');
    } else {
        // Si no se pasó buttonElement, buscar el botón por texto
        buttons.forEach(btn => {
            const btnText = btn.textContent.trim().toLowerCase();
            if ((period === 'weekly' && btnText === 'semanal') ||
                (period === 'monthly' && btnText === 'mensual') ||
                (period === 'yearly' && btnText === 'anual')) {
                btn.classList.add('active');
            }
        });
    }
}

// Inicializar gráfico de categorías
function initCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const categories = getDataFromElement('categorias-unicas');
    const weeklyData = getDataFromElement('ventas-categoria-semanales-data');

    // Validar datos
    if (!Array.isArray(categories) || categories.length === 0) {
        console.warn('No hay categorías disponibles');
        return;
    }
    if (!Array.isArray(weeklyData)) {
        console.warn('No hay datos de categorías');
        return;
    }

    // Colores para las categorías (más colores por si hay más categorías)
    const categoryColors = [
        'rgba(46, 125, 50, 0.8)',   // Verde oscuro - Castillo
        'rgba(76, 175, 80, 0.8)',   // Verde - Tobogán
        'rgba(129, 199, 132, 0.8)', // Verde claro - Obstáculos
        'rgba(67, 160, 71, 0.8)',   // Verde medio - Combo
        'rgba(102, 187, 106, 0.8)', // Verde medio claro - Deportivo
        'rgba(156, 204, 101, 0.8)'  // Verde amarillento - Infantil
    ];
    
    const categoryBorderColors = [
        'rgba(46, 125, 50, 1)',
        'rgba(76, 175, 80, 1)',
        'rgba(129, 199, 132, 1)',
        'rgba(67, 160, 71, 1)',
        'rgba(102, 187, 106, 1)',
        'rgba(156, 204, 101, 1)'
    ];

    // Generar colores dinámicos si hay más categorías que colores
    const bgColors = categories.map((_, index) => 
        categoryColors[index] || categoryColors[index % categoryColors.length]
    );
    const borderColors = categories.map((_, index) => 
        categoryBorderColors[index] || categoryBorderColors[index % categoryBorderColors.length]
    );

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Ventas por categoría ($)',
                data: weeklyData,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: $' + context.parsed.y.toLocaleString('es-CL');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString('es-CL');
                        }
                    }
                }
            }
        }
    });

    // Activar botón semanal por defecto y desactivar otros
    const buttons = document.querySelectorAll('#category-filter button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('style');
    });
    if (buttons.length > 0) {
        buttons[0].classList.add('active');
    }
}

// Actualizar gráfico de categorías según período
let categoryPeriod = 'weekly';
function setCategoryPeriod(period, buttonElement) {
    if (!categoryChart) {
        console.error('Category chart no inicializado');
        return;
    }

    categoryPeriod = period;
    let data;

    switch (period) {
        case 'weekly':
            data = getDataFromElement('ventas-categoria-semanales-data');
            break;
        case 'monthly':
            data = getDataFromElement('ventas-categoria-mensuales-data');
            break;
        case 'yearly':
            data = getDataFromElement('ventas-categoria-anuales-data');
            break;
        default:
            data = getDataFromElement('ventas-categoria-semanales-data');
    }

    // Validar que hay datos
    if (!Array.isArray(data)) {
        console.warn('Datos inválidos para período de categorías:', period);
        return;
    }

    // Actualizar datos del gráfico
    categoryChart.data.datasets[0].data = data;
    categoryChart.update('active');

    // Actualizar botones activos - Asegurar que solo uno esté activo
    const buttons = document.querySelectorAll('#category-filter button');
    // Primero remover active de TODOS
    buttons.forEach(btn => {
        btn.classList.remove('active');
        // Limpiar estilos inline
        btn.removeAttribute('style');
    });
    
    // Luego activar solo el seleccionado
    if (buttonElement) {
        buttonElement.classList.add('active');
    } else {
        // Si no se pasó buttonElement, buscar el botón por texto
        buttons.forEach(btn => {
            const btnText = btn.textContent.trim().toLowerCase();
            if ((period === 'daily' && btnText === 'diario') ||
                (period === 'weekly' && btnText === 'semanal') ||
                (period === 'monthly' && btnText === 'mensual') ||
                (period === 'yearly' && btnText === 'anual')) {
                btn.classList.add('active');
            }
        });
    }
}

// Inicializar gráfico de días con más reservas
function initDaysChart() {
    const ctx = document.getElementById('daysChart');
    if (!ctx) return;

    const labels = getDataFromElement('dias-semana-semanales-labels');
    const data = getDataFromElement('dias-semana-semanales-data');

    daysChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cantidad de reservas',
                data: data,
                backgroundColor: 'rgba(46, 125, 50, 0.8)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Reservas: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Activar botón semanal por defecto y desactivar otros
    const buttons = document.querySelectorAll('#days-filter button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('style');
    });
    if (buttons.length > 0) {
        buttons[0].classList.add('active');
    }
}

// Actualizar gráfico de días según período
function updateDaysChart(period, buttonElement) {
    if (!daysChart) {
        console.error('Days chart no inicializado');
        return;
    }

    let labels, data;

    switch (period) {
        case 'weekly':
            labels = getDataFromElement('dias-semana-semanales-labels');
            data = getDataFromElement('dias-semana-semanales-data');
            break;
        case 'monthly':
            labels = getDataFromElement('dias-semana-mensuales-labels');
            data = getDataFromElement('dias-semana-mensuales-data');
            break;
        case 'yearly':
            labels = getDataFromElement('dias-semana-anuales-labels');
            data = getDataFromElement('dias-semana-anuales-data');
            break;
        default:
            labels = getDataFromElement('dias-semana-semanales-labels');
            data = getDataFromElement('dias-semana-semanales-data');
    }

    // Validar que hay datos
    if (!Array.isArray(labels) || !Array.isArray(data)) {
        console.warn('Datos inválidos para período de días:', period);
        return;
    }

    // Actualizar datos del gráfico
    daysChart.data.labels = labels;
    daysChart.data.datasets[0].data = data;
    daysChart.update('active');

    // Actualizar botones activos - Asegurar que solo uno esté activo
    const buttons = document.querySelectorAll('#days-filter button');
    // Primero remover active de TODOS
    buttons.forEach(btn => {
        btn.classList.remove('active');
        // Limpiar estilos inline
        btn.removeAttribute('style');
    });
    
    // Luego activar solo el seleccionado
    if (buttonElement) {
        buttonElement.classList.add('active');
    } else {
        // Si no se pasó buttonElement, buscar el botón por texto
        buttons.forEach(btn => {
            const btnText = btn.textContent.trim().toLowerCase();
            if ((period === 'weekly' && btnText === 'semanal') ||
                (period === 'monthly' && btnText === 'mensual') ||
                (period === 'yearly' && btnText === 'anual')) {
                btn.classList.add('active');
            }
        });
    }
}

// Cambiar tamaño de vista de gráficos
function setViewMode(mode) {
    currentViewMode = mode;
    
    // Actualizar botones activos
    const buttons = document.querySelectorAll('#view-mode-group .view-mode-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const btnMap = {
        'small': 'btn-small',
        'medium': 'btn-medium',
        'large': 'btn-large'
    };
    
    const activeBtn = document.getElementById(btnMap[mode]);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Actualizar clases CSS de los contenedores de gráficos
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.classList.remove('small', 'medium', 'large');
        container.classList.add(mode);
    });
    
    // Redimensionar los gráficos usando Chart.js resize()
    setTimeout(() => {
        if (moneyChart) {
            moneyChart.resize();
        }
        if (categoryChart) {
            categoryChart.resize();
        }
        if (daysChart) {
            daysChart.resize();
        }
    }, 100);
}

// Función de depuración para verificar estado de botones
function debugButtons() {
    console.log('=== Estado de botones ===');
    const allButtons = document.querySelectorAll('.button-group button');
    allButtons.forEach((btn, idx) => {
        console.log(`Botón ${idx}:`, {
            text: btn.textContent.trim(),
            hasActive: btn.classList.contains('active'),
            background: window.getComputedStyle(btn).backgroundColor,
            color: window.getComputedStyle(btn).color
        });
    });
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráficos
    initMoneyChart();
    initCategoryChart();
    initDaysChart();

    // Inicializar contenedores con clase medium por defecto
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.classList.add('medium');
    });

    // Event listeners para botones de tamaño
    const btnSmall = document.getElementById('btn-small');
    const btnMedium = document.getElementById('btn-medium');
    const btnLarge = document.getElementById('btn-large');
    
    if (btnSmall) {
        btnSmall.addEventListener('click', () => setViewMode('small'));
    }
    if (btnMedium) {
        btnMedium.addEventListener('click', () => setViewMode('medium'));
    }
    if (btnLarge) {
        btnLarge.addEventListener('click', () => setViewMode('large'));
    }
});

