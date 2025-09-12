// Variables globales
let selectedCategory = 'todos';
let selectedPeriod = 'monthly';
let categoryData = {};
let moneyData = {};
let membershipData = {};
let moneyChart, productChart, membershipChart;

// Función para obtener datos de categoría para un período específico
function getCategoryDataForPeriod(period, category) {
    if (!categoryData || !categoryData[period]) {
        return { labels: ['Sin datos'], data: [0] };
    }
    
    const periodData = categoryData[period];
    if (!periodData || !periodData[category]) {
        return { labels: ['Sin datos'], data: [0] };
    }
    
    const categoryDataForPeriod = periodData[category];
    const labels = Object.keys(categoryDataForPeriod).sort();
    const data = labels.map(label => categoryDataForPeriod[label]);
    
    return { labels, data };
}

// Función para obtener datos de todas las categorías para un período específico
function getAllCategoriesDataForPeriod(period) {
    if (!categoryData || !categoryData[period]) {
        return { labels: ['Sin datos'], datasets: [] };
    }
    
    const periodData = categoryData[period];
    if (!periodData || Object.keys(periodData).length === 0) {
        return { labels: ['Sin datos'], datasets: [] };
    }
    
    // Obtener todas las fechas únicas
    const allDates = new Set();
    Object.values(periodData).forEach(categoryDataItem => {
        if (categoryDataItem && typeof categoryDataItem === 'object') {
            Object.keys(categoryDataItem).forEach(date => allDates.add(date));
        }
    });
    
    const labels = Array.from(allDates).sort();
    
    // Crear datasets para cada categoría
    const datasets = [];
    const colors = ['#e10600', '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'];
    
    Object.keys(periodData).forEach((category, index) => {
        if (periodData[category] && typeof periodData[category] === 'object') {
            const data = labels.map(label => periodData[category][label] || 0);
            datasets.push({
                label: category,
                data: data,
                backgroundColor: colors[index % colors.length] + '40',
                borderColor: colors[index % colors.length],
                borderWidth: 2,
                fill: false
            });
        }
    });
    
    return { labels, datasets };
}

// Funciones de actualización
function updateMoneyChart(period) {
    if (!moneyData || !moneyData[period] || !moneyChart) return;
    const data = moneyData[period];
    moneyChart.data.labels = data.labels;
    moneyChart.data.datasets[0].data = data.data;
    moneyChart.update();
}

function updateCategoryChart(period) {
    if (!categoryData || !productChart) return;
    
    if (selectedCategory === 'todos') {
        const data = getAllCategoriesDataForPeriod(period);
        productChart.data.labels = data.labels;
        productChart.data.datasets = data.datasets;
    } else {
        const data = getCategoryDataForPeriod(period, selectedCategory);
        productChart.data.labels = data.labels;
        productChart.data.datasets = [{
            label: selectedCategory,
            data: data.data,
            backgroundColor: 'rgba(225, 6, 0, 0.2)',
            borderColor: '#e10600',
            borderWidth: 2,
            fill: true
        }];
    }
    productChart.update();
}

function setCategory(category) {
    selectedCategory = category;
    
    // Actualizar estado visual de los botones
    const buttons = document.querySelectorAll('#product-buttons button');
    buttons.forEach(button => {
        button.classList.remove('active');
        if (button.textContent === category || (category === 'todos' && button.textContent === 'Todas las categorías')) {
            button.classList.add('active');
        }
    });
    
    updateCategoryChart(selectedPeriod);
}

function setCategoryPeriod(period) {
    selectedPeriod = period;
    updateCategoryChart(period);
}

function updateMembershipChart(period) {
    if (!membershipData || !membershipData[period] || !membershipChart) return;
    const data = membershipData[period];
    membershipChart.data.labels = data.labels;
    membershipChart.data.datasets[0].data = data.data;
    membershipChart.update();
}

function changeViewMode(mode) {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        canvas.classList.remove('chart-small', 'chart-medium', 'chart-large');
        canvas.classList.add(`chart-${mode}`);
    });
}

// Script para las estadísticas de ventas con datos reales de la base de datos
document.addEventListener('DOMContentLoaded', function() {
    // Obtener los datos del contexto de Django
    const etiquetas = JSON.parse(document.getElementById('etiquetas-data').textContent || '[]');
    const totales = JSON.parse(document.getElementById('totales-data').textContent || '[]');
    const productos = JSON.parse(document.getElementById('productos-data').textContent || '[]');
    const cantidades = JSON.parse(document.getElementById('cantidades-data').textContent || '[]');
    
    // Nuevos datos de ventas monetarias
    const ventasDiariasLabels = JSON.parse(document.getElementById('ventas-diarias-labels').textContent || '[]');
    const ventasDiariasData = JSON.parse(document.getElementById('ventas-diarias-data').textContent || '[]');
    const ventasSemanalesLabels = JSON.parse(document.getElementById('ventas-semanales-labels').textContent || '[]');
    const ventasSemanalesData = JSON.parse(document.getElementById('ventas-semanales-data').textContent || '[]');
    const ventasMensualesLabels = JSON.parse(document.getElementById('ventas-mensuales-labels').textContent || '[]');
    const ventasMensualesData = JSON.parse(document.getElementById('ventas-mensuales-data').textContent || '[]');
    const ventasAnualesLabels = JSON.parse(document.getElementById('ventas-anuales-labels').textContent || '[]');
    const ventasAnualesData = JSON.parse(document.getElementById('ventas-anuales-data').textContent || '[]');
    
    // Datos de ventas por producto
    const ventasPorProducto = JSON.parse(document.getElementById('ventas-por-producto').textContent || '{}');
    
    // Nuevos datos de ventas por categoría
    const ventasCategoriaDiariasData = JSON.parse(document.getElementById('ventas-categoria-diarias-data').textContent || '{}');
    const ventasCategoriaSemanalesData = JSON.parse(document.getElementById('ventas-categoria-semanales-data').textContent || '{}');
    const ventasCategoriaMensualesData = JSON.parse(document.getElementById('ventas-categoria-mensuales-data').textContent || '{}');
    const ventasCategoriaAnualesData = JSON.parse(document.getElementById('ventas-categoria-anuales-data').textContent || '{}');
    const categoriasUnicas = JSON.parse(document.getElementById('categorias-unicas').textContent || '[]');
    
    // Datos de membresías
    const membresiasDiariasLabels = JSON.parse(document.getElementById('membresias-diarias-labels').textContent || '[]');
    const membresiasDiariasData = JSON.parse(document.getElementById('membresias-diarias-data').textContent || '[]');
    const membresiasSemanalesLabels = JSON.parse(document.getElementById('membresias-semanales-labels').textContent || '[]');
    const membresiasSemanalesData = JSON.parse(document.getElementById('membresias-semanales-data').textContent || '[]');
    const membresiasMensualesLabels = JSON.parse(document.getElementById('membresias-mensuales-labels').textContent || '[]');
    const membresiasMensualesData = JSON.parse(document.getElementById('membresias-mensuales-data').textContent || '[]');

    // Inicialización de contextos de gráficos
    const moneyChartCtx = document.getElementById('moneyChart').getContext('2d');
    const productChartCtx = document.getElementById('productChart').getContext('2d');
    const membershipChartCtx = document.getElementById('membershipChart').getContext('2d');

    // Actualizar variables globales
    selectedCategory = categoriasUnicas.length > 0 ? categoriasUnicas[0] : 'todos';
    selectedPeriod = 'monthly';

    // Datos de ventas monetarias organizados por período
    moneyData = {
        daily: {
            labels: ventasDiariasLabels.length > 0 ? ventasDiariasLabels : ['Sin ventas recientes'],
            data: ventasDiariasData.length > 0 ? ventasDiariasData : [0]
        },
        weekly: {
            labels: ventasSemanalesLabels.length > 0 ? ventasSemanalesLabels : ['Sin ventas recientes'],
            data: ventasSemanalesData.length > 0 ? ventasSemanalesData : [0]
        },
        monthly: {
            labels: ventasMensualesLabels.length > 0 ? ventasMensualesLabels : ['Sin ventas registradas'],
            data: ventasMensualesData.length > 0 ? ventasMensualesData : [0]
        },
        yearly: {
            labels: ventasAnualesLabels.length > 0 ? ventasAnualesLabels : ['Sin ventas registradas'],
            data: ventasAnualesData.length > 0 ? ventasAnualesData : [0]
        }
    };

    // Datos de ventas por categoría organizados por período
    categoryData = {
        daily: ventasCategoriaDiariasData,
        weekly: ventasCategoriaSemanalesData,
        monthly: ventasCategoriaMensualesData,
        yearly: ventasCategoriaAnualesData
    };

    // Datos de membresías organizados por período
    membershipData = {
        daily: {
            labels: membresiasDiariasLabels.length > 0 ? membresiasDiariasLabels : ['Sin membresías recientes'],
            data: membresiasDiariasData.length > 0 ? membresiasDiariasData : [0]
        },
        weekly: {
            labels: membresiasSemanalesLabels.length > 0 ? membresiasSemanalesLabels : ['Sin membresías recientes'],
            data: membresiasSemanalesData.length > 0 ? membresiasSemanalesData : [0]
        },
        monthly: {
            labels: membresiasMensualesLabels.length > 0 ? membresiasMensualesLabels : ['Sin membresías registradas'],
            data: membresiasMensualesData.length > 0 ? membresiasMensualesData : [0]
        }
    };

    // Configuración de gráficos
    moneyChart = new Chart(moneyChartCtx, {
        type: 'line',
        data: {
            labels: moneyData.monthly.labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: moneyData.monthly.data,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: '#e10600',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ingresos: $' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    productChart = new Chart(productChartCtx, {
        type: 'line',
        data: getAllCategoriesDataForPeriod('monthly'),
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad Vendida'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Período'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Ventas por Categoría de Producto'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });

    membershipChart = new Chart(membershipChartCtx, {
        type: 'bar',
        data: {
            labels: membershipData.monthly.labels,
            datasets: [{
                label: 'Membresías Vendidas',
                data: membershipData.monthly.data,
                backgroundColor: 'rgba(0, 123, 255, 0.6)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Generar botones de categorías dinámicamente
    function generateCategoryButtons() {
        const productButtonsContainer = document.getElementById('product-buttons');
        if (!productButtonsContainer) return;

        // Limpiar contenedor
        productButtonsContainer.innerHTML = '';

        // Agregar botón "Todas las categorías"
        const allButton = document.createElement('button');
        allButton.textContent = 'Todas las categorías';
        allButton.onclick = () => setCategory('todos');
        allButton.classList.add('active');
        productButtonsContainer.appendChild(allButton);

        // Agregar botones para cada categoría
        categoriasUnicas.forEach((categoria) => {
            const button = document.createElement('button');
            button.textContent = categoria;
            button.onclick = () => setCategory(categoria);
            productButtonsContainer.appendChild(button);
        });
    }

    // Llamar a la función para generar botones
    generateCategoryButtons();

    // Mostrar información de datos disponibles
    console.log('Datos de ventas cargados:', {
        diarias: ventasDiariasData.length,
        semanales: ventasSemanalesData.length,
        mensuales: ventasMensualesData.length,
        anuales: ventasAnualesData.length
    });
    
    console.log('Categorías disponibles:', categoriasUnicas);
    console.log('Membresías cargadas:', {
        diarias: membresiasDiariasData.length,
        semanales: membresiasSemanalesData.length,
        mensuales: membresiasMensualesData.length
    });

    // Mostrar información en la página si no hay datos
    function mostrarInfoDatos() {
        const infoContainer = document.createElement('div');
        infoContainer.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #6c757d;
        `;
        
        let infoHTML = '<h4>Información sobre los datos:</h4><ul>';
        
        if (ventasDiariasData.length === 0 && ventasMensualesData.length === 0) {
            infoHTML += '<li>No hay ventas registradas en la base de datos</li>';
            infoHTML += '<li>Las ventas se registran cuando los clientes compran productos</li>';
        } else {
            infoHTML += `<li>Ventas encontradas: ${ventasMensualesData.length} meses con datos</li>`;
        }
        
        if (membresiasDiariasData.length === 0 && membresiasMensualesData.length === 0) {
            infoHTML += '<li>No hay membresías registradas en la base de datos</li>';
            infoHTML += '<li>Las membresías se registran cuando los clientes adquieren membresías</li>';
        } else {
            infoHTML += `<li>Membresías encontradas: ${membresiasMensualesData.length} meses con datos</li>`;
        }
        
        if (categoriasUnicas.length === 0) {
            infoHTML += '<li>No hay categorías de productos con ventas registradas</li>';
        } else {
            infoHTML += `<li>Categorías disponibles: ${categoriasUnicas.length}</li>`;
        }
        
        infoHTML += '</ul>';
        
        if (ventasDiariasData.length === 0 && membresiasDiariasData.length === 0) {
            infoHTML += '<p><strong>Para ver datos en las estadísticas, necesitas:</strong></p>';
            infoHTML += '<ol>';
            infoHTML += '<li>Crear productos en el inventario</li>';
            infoHTML += '<li>Registrar ventas de productos a clientes</li>';
            infoHTML += '<li>Registrar membresías vendidas a clientes</li>';
            infoHTML += '</ol>';
        }
        
        infoContainer.innerHTML = infoHTML;
        
        // Insertar al inicio del contenido
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(infoContainer, content.firstChild);
        }
    }
    
    // Mostrar información si no hay datos suficientes
    if ((ventasDiariasData.length === 0 && ventasMensualesData.length === 0) || 
        (membresiasDiariasData.length === 0 && membresiasMensualesData.length === 0)) {
        mostrarInfoDatos();
    }

    // Lógica para los botones de vista de gráficos
    const viewModeButtons = document.querySelectorAll('.view-mode-btn');
    function setViewModeActive(mode) {
        viewModeButtons.forEach(b => b.classList.remove('active'));
        if (mode === 'small') document.getElementById('btn-small').classList.add('active');
        else if (mode === 'medium') document.getElementById('btn-medium').classList.add('active');
        else if (mode === 'large') document.getElementById('btn-large').classList.add('active');
        // Actualizar todos los canvas al tamaño seleccionado y borrar height/width
        document.querySelectorAll('canvas').forEach(canvas => {
            canvas.classList.remove('chart-small', 'chart-medium', 'chart-large');
            canvas.classList.add(`chart-${mode}`);
            canvas.removeAttribute('height');
            canvas.removeAttribute('width');
        });
    }
    viewModeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            let mode = 'medium';
            if (this.id === 'btn-small') mode = 'small';
            else if (this.id === 'btn-medium') mode = 'medium';
            else if (this.id === 'btn-large') mode = 'large';
            setViewModeActive(mode);
        });
    });
    // Al cargar la página, dejar "Mediano" activo y aplicar tamaño a los canvas
    setViewModeActive('medium');

    // --- Botones de periodo para Estadísticas Monetarias ---
    const moneyPeriodButtons = document.querySelectorAll('#time-filter button');
    function setActiveButtonGroup(btns, idx) {
        btns.forEach(b => b.classList.remove('active'));
        if (btns[idx]) btns[idx].classList.add('active');
    }
    moneyPeriodButtons.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            setActiveButtonGroup(moneyPeriodButtons, idx);
        });
    });
    setActiveButtonGroup(moneyPeriodButtons, 2); // Mensual por defecto

    // --- Botones de periodo para Ventas por Producto ---
    // Selecciono el grupo correcto de botones de la sección de producto
    const productSections = document.querySelectorAll('.section');
    const productPeriodButtons = productSections[1].querySelectorAll('.button-group')[1].querySelectorAll('button');
    productPeriodButtons.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            setActiveButtonGroup(productPeriodButtons, idx);
        });
    });
    setActiveButtonGroup(productPeriodButtons, 2); // Mensual por defecto

    // --- Botones de periodo para Membresías ---
    // Selecciono el grupo correcto de botones de la última sección
    const membershipSections = document.querySelectorAll('.section');
    const membershipPeriodButtons = membershipSections[membershipSections.length-1].querySelectorAll('.button-group button');
    membershipPeriodButtons.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            setActiveButtonGroup(membershipPeriodButtons, idx);
        });
    });
    setActiveButtonGroup(membershipPeriodButtons, 2); // Mensual por defecto
});

// Función para exportar datos
function exportData() {
    const ventasMensualesLabels = JSON.parse(document.getElementById('ventas-mensuales-labels').textContent || '[]');
    const ventasMensualesData = JSON.parse(document.getElementById('ventas-mensuales-data').textContent || '[]');
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Mes,Ventas\n"
        + ventasMensualesLabels.map((label, index) => `${label},${ventasMensualesData[index]}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ventas_mensuales.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 