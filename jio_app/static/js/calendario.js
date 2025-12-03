// JavaScript para el calendario de reservas
document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let selectedDate = null;
    
    // Elementos del DOM - con validación
    const currentMonthElement = document.getElementById('current-month');
    const calendarioGrid = document.getElementById('calendario-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const modalReserva = document.getElementById('modal-reserva');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const fechaSeleccionadaElement = document.getElementById('fecha-seleccionada');
    const formularioReserva = document.getElementById('formulario-reserva');
    const cancelarReservaBtn = document.getElementById('cancelar-reserva');
    const formErrors = document.getElementById('form-errors');
    const btnSubmit = document.getElementById('btn-submit');
    let juegoCounter = 0; // Contador para IDs únicos de filas de juegos
    // Variables para dirección y mapa (se inicializan después de verificar que el modal existe)
    let direccionInput = null;
    let direccionLatInput = null;
    let direccionLngInput = null;
    let direccionCompletaInput = null;
    let abrirGoogleMapsBtn = null;
    let btnBuscarDireccion = null;
    let mapaLeaflet = null;
    let marcadorEvento = null;
    let marcadorOsorno = null;
    let mapaInfoSeleccionada = null;
    let direccionSeleccionadaText = null;
    let distanciaSeleccionadaText = null;
    let autocompleteSuggestions = null;
    let autocompleteTimeout = null;
    let selectedSuggestionIndex = -1;
    let currentSuggestions = [];
    
    // Variables para código de descuento
    let promocionAplicada = null;
    
    // Coordenadas de Osorno (ciudad base)
    const OSORNO_LAT = -40.5739;
    const OSORNO_LNG = -73.1317;
    
    // Inicializar elementos de dirección cuando el modal se muestra
    function inicializarElementosDireccion() {
        direccionInput = document.getElementById('direccion');
        direccionLatInput = document.getElementById('direccion_lat');
        direccionLngInput = document.getElementById('direccion_lng');
        direccionCompletaInput = document.getElementById('direccion_completa');
        abrirGoogleMapsBtn = document.getElementById('abrir-google-maps');
        btnBuscarDireccion = document.getElementById('btn-buscar-direccion');
        mapaInfoSeleccionada = document.getElementById('mapa-info-seleccionada');
        direccionSeleccionadaText = document.getElementById('direccion-seleccionada-text');
        distanciaSeleccionadaText = document.getElementById('distancia-seleccionada-text');
        autocompleteSuggestions = document.getElementById('autocomplete-suggestions');
        
        if (!direccionInput) {
            console.warn('Campo de dirección no encontrado');
            return false;
        }
        return true;
    }
    
    // Validar que los elementos críticos existan
    if (!modalReserva) {
        console.error('ERROR: No se encontró el elemento modal-reserva en el DOM');
        return;
    }
    if (!calendarioGrid) {
        console.error('ERROR: No se encontró el elemento calendario-grid en el DOM');
        return;
    }
    if (!currentMonthElement) {
        console.error('ERROR: No se encontró el elemento current-month en el DOM');
        return;
    }
    
    // Nombres de meses en español
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Inicializar calendario
    initCalendario();
    
    function initCalendario() {
        renderCalendario();
        setupEventListeners();
        // setupGoogleMapsLink se llama cuando se abre el modal
    }
    
    function inicializarMapa() {
        // Verificar que Leaflet esté disponible
        if (typeof L === 'undefined') {
            console.error('Leaflet no está disponible. Asegúrate de que el script esté cargado.');
            const mapaLoading = document.getElementById('mapa-loading');
            if (mapaLoading) {
                mapaLoading.innerHTML = '<p style="color: #c62828;">❌ Error: No se pudo cargar el mapa. Por favor, recarga la página.</p>';
            }
            return;
        }
        
        const mapaDiv = document.getElementById('mapa');
        if (!mapaDiv) {
            console.error('Div del mapa no encontrado');
            return;
        }
        
        // Ocultar loading
        const mapaLoading = document.getElementById('mapa-loading');
        if (mapaLoading) {
            mapaLoading.style.display = 'none';
        }
        
        // Si el mapa ya existe, solo invalidar tamaño
        if (mapaLeaflet) {
            setTimeout(() => {
                mapaLeaflet.invalidateSize();
            }, 100);
            return;
        }
        
        console.log('🗺️ Inicializando mapa Leaflet...');
        
        try {
            // Crear mapa centrado en Osorno
            mapaLeaflet = L.map(mapaDiv, {
                center: [OSORNO_LAT, OSORNO_LNG],
                zoom: 12,
                zoomControl: true,
            });
            
            // Agregar capa de OpenStreetMap (gratis, sin API key)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(mapaLeaflet);
            
            // Marcador fijo en Osorno (rojo)
            marcadorOsorno = L.marker([OSORNO_LAT, OSORNO_LNG], {
                title: 'Osorno',
                icon: L.divIcon({
                    className: 'osorno-marker',
                    html: '<div style="background-color:#FF0000;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                }),
            }).addTo(mapaLeaflet).bindPopup('📍 Osorno');
            
            // Marcador arrastrable para la ubicación del evento (inicialmente oculto)
            marcadorEvento = L.marker([OSORNO_LAT, OSORNO_LNG], {
                draggable: true,
                title: 'Arrastra para seleccionar ubicación',
            });
            marcadorEvento.setOpacity(0); // Oculto hasta que se seleccione una ubicación
            
            // Evento cuando se hace clic en el mapa
            mapaLeaflet.on('click', function(e) {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                console.log('📍 Click en mapa:', lat, lng);
                
                // Mover/crear marcador
                if (marcadorEvento) {
                    marcadorEvento.setLatLng([lat, lng]);
                    if (!mapaLeaflet.hasLayer(marcadorEvento)) {
                        marcadorEvento.addTo(mapaLeaflet);
                    }
                    marcadorEvento.setOpacity(1);
                } else {
                    marcadorEvento = L.marker([lat, lng], {
                        draggable: true,
                        title: 'Arrastra para seleccionar ubicación',
                    }).addTo(mapaLeaflet);
                    
                    // Agregar evento de arrastre al marcador cuando se crea
                    marcadorEvento.on('dragend', function(e) {
                        const dragLat = e.target.getLatLng().lat;
                        const dragLng = e.target.getLatLng().lng;
                        console.log('📍 Marcador arrastrado a:', dragLat, dragLng);
                        obtenerDireccionDesdeCoordenadas(dragLat, dragLng);
                    });
                }
                
                // Obtener dirección inversa (reverse geocoding) usando Nominatim
                obtenerDireccionDesdeCoordenadas(lat, lng);
            });
            
            // Invalidar tamaño después de un breve delay para asegurar que el contenedor tenga dimensiones
            setTimeout(() => {
                if (mapaLeaflet) {
                    mapaLeaflet.invalidateSize();
                }
            }, 200);
            
            console.log('✅ Mapa inicializado correctamente');
            
        } catch (error) {
            console.error('Error al inicializar mapa:', error);
            if (mapaLoading) {
                mapaLoading.innerHTML = '<p style="color: #c62828;">❌ Error al cargar el mapa: ' + error.message + '</p>';
                mapaLoading.style.display = 'flex';
            }
        }
    }
    
    function obtenerDireccionDesdeCoordenadas(lat, lng) {
        // Usar Nominatim (OpenStreetMap) para reverse geocoding (gratis, sin API key)
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.display_name) {
                    const direccionCompleta = data.display_name;
                    
                    // Actualizar campos
                    if (direccionInput) direccionInput.value = direccionCompleta;
                    if (direccionLatInput) direccionLatInput.value = lat;
                    if (direccionLngInput) direccionLngInput.value = lng;
                    if (direccionCompletaInput) direccionCompletaInput.value = direccionCompleta;
                    
                    // Calcular distancia desde Osorno
                    const distancia = calcularDistancia(OSORNO_LAT, OSORNO_LNG, lat, lng);
                    const distanciaInput = document.getElementById('distancia_km');
                    if (distanciaInput) {
                        distanciaInput.value = Math.round(distancia);
                    }
                    
                    // Mostrar información
                    if (direccionSeleccionadaText) {
                        direccionSeleccionadaText.textContent = direccionCompleta;
                    }
                    if (distanciaSeleccionadaText) {
                        distanciaSeleccionadaText.textContent = `${Math.round(distancia)} km`;
                    }
                    if (mapaInfoSeleccionada) {
                        mapaInfoSeleccionada.style.display = 'block';
                    }
                    
                    // Habilitar botón de Google Maps
                    if (abrirGoogleMapsBtn) {
                        abrirGoogleMapsBtn.disabled = false;
                        const mapaLinkContainer = document.getElementById('mapa-link-container');
                        if (mapaLinkContainer) {
                            mapaLinkContainer.style.display = 'block';
                        }
                    }
                    
                    // Actualizar popup del marcador
                    if (marcadorEvento) {
                        marcadorEvento.bindPopup(`📍 ${direccionCompleta}<br>📏 ${Math.round(distancia)} km desde Osorno`).openPopup();
                    }
                    
                    console.log('✅ Dirección obtenida:', direccionCompleta, 'Distancia:', distancia, 'km');
                } else {
                    console.warn('No se pudo obtener la dirección para las coordenadas:', lat, lng);
                }
            })
            .catch(error => {
                console.error('Error al obtener dirección:', error);
            });
    }
    
    function buscarDireccionEnMapa() {
        const direccion = direccionInput ? direccionInput.value.trim() : '';
        
        if (!direccion) {
            alert('Por favor, ingresa una dirección para buscar en el mapa');
            return;
        }
        
        console.log('🔍 Buscando dirección en el mapa:', direccion);
        
        // Asegurarse de que el mapa esté inicializado
        if (!mapaLeaflet) {
            console.log('⚠️ Mapa no inicializado, inicializando...');
            inicializarMapa();
            // Esperar un poco para que el mapa se inicialice
            setTimeout(() => {
                buscarDireccionEnMapa();
            }, 500);
            return;
        }
        
        // Mostrar loading
        const mapaLoading = document.getElementById('mapa-loading');
        if (mapaLoading) {
            mapaLoading.style.display = 'flex';
        }
        
        // Asegurarse de que el contenedor del mapa sea visible
        const mapaContainer = document.getElementById('mapa-container');
        if (mapaContainer) {
            mapaContainer.style.display = 'block';
            mapaContainer.style.visibility = 'visible';
        }
        
        // Usar Nominatim (OpenStreetMap) para geocoding (gratis, sin API key)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', Chile')}&limit=1&addressdetails=1`;
        
        fetch(url, {
            headers: {
                'User-Agent': 'JIO Reservas App'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (mapaLoading) {
                    mapaLoading.style.display = 'none';
                }
                
                if (data && data.length > 0) {
                    const resultado = data[0];
                    const lat = parseFloat(resultado.lat);
                    const lng = parseFloat(resultado.lon);
                    const direccionCompleta = resultado.display_name;
                    
                    console.log('✅ Dirección encontrada:', direccionCompleta, 'Coordenadas:', lat, lng);
                    
                    // Centrar mapa en la ubicación encontrada
                    if (mapaLeaflet) {
                        mapaLeaflet.setView([lat, lng], 15);
                        
                        // Invalidar tamaño para asegurar que se renderice correctamente
                        setTimeout(() => {
                            mapaLeaflet.invalidateSize();
                        }, 100);
                        
                        // Crear o mover marcador
                        if (marcadorEvento) {
                            marcadorEvento.setLatLng([lat, lng]);
                            if (!mapaLeaflet.hasLayer(marcadorEvento)) {
                                marcadorEvento.addTo(mapaLeaflet);
                            }
                            marcadorEvento.setOpacity(1);
                        } else {
                            marcadorEvento = L.marker([lat, lng], {
                                draggable: true,
                                title: 'Arrastra para seleccionar ubicación',
                            }).addTo(mapaLeaflet);
                            
                            // Agregar evento de arrastre al marcador
                            marcadorEvento.on('dragend', function(e) {
                                const dragLat = e.target.getLatLng().lat;
                                const dragLng = e.target.getLatLng().lng;
                                console.log('📍 Marcador arrastrado a:', dragLat, dragLng);
                                obtenerDireccionDesdeCoordenadas(dragLat, dragLng);
                            });
                        }
                        
                        // Actualizar información
                        obtenerDireccionDesdeCoordenadas(lat, lng);
                    }
                } else {
                    alert('No se encontró la dirección. Por favor, intenta con una dirección más específica.');
                    if (mapaLoading) {
                        mapaLoading.style.display = 'none';
                    }
                }
            })
            .catch(error => {
                console.error('Error al buscar dirección:', error);
                alert('Error al buscar la dirección. Por favor, intenta nuevamente.');
                if (mapaLoading) {
                    mapaLoading.style.display = 'none';
                }
            });
    }
    
    // Funciones para autocompletado de direcciones
    function buscarAutocompletado(query) {
        if (!query || query.length < 3) {
            ocultarAutocompletado();
            return;
        }
        
        // Asegurarse de que el elemento existe
        if (!autocompleteSuggestions) {
            autocompleteSuggestions = document.getElementById('autocomplete-suggestions');
            if (!autocompleteSuggestions) {
                console.error('❌ Elemento autocomplete-suggestions no encontrado');
                return;
            }
        }
        
        console.log('🔍 Buscando autocompletado para:', query);
        
        // Mostrar loading
        autocompleteSuggestions.innerHTML = '<div class="autocomplete-loading">🔍 Buscando direcciones...</div>';
        autocompleteSuggestions.style.display = 'block';
        autocompleteSuggestions.style.visibility = 'visible';
        autocompleteSuggestions.style.opacity = '1';
        
        // Usar Nominatim (OpenStreetMap) para autocompletado (gratis, sin API key)
        // Agregar "Chile" para mejorar resultados en Chile
        // viewbox: formato es (min_lon,min_lat,max_lon,max_lat)
        const minLon = OSORNO_LNG - 2;
        const maxLon = OSORNO_LNG + 2;
        const minLat = OSORNO_LAT - 2;
        const maxLat = OSORNO_LAT + 2;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Chile')}&limit=5&addressdetails=1&bounded=1&viewbox=${minLon},${minLat},${maxLon},${maxLat}&countrycodes=cl`;
        
        console.log('🌐 Haciendo petición a:', url);
        
        fetch(url, {
            headers: {
                'User-Agent': 'JIO Reservas App' // Nominatim requiere un User-Agent
            }
        })
            .then(response => {
                console.log('📡 Respuesta recibida, status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('📦 Datos recibidos:', data);
                if (data && data.length > 0) {
                    currentSuggestions = data;
                    mostrarAutocompletado(data);
                } else {
                    console.log('⚠️ No se encontraron resultados');
                    if (autocompleteSuggestions) {
                        autocompleteSuggestions.innerHTML = '<div class="autocomplete-loading">No se encontraron direcciones</div>';
                        autocompleteSuggestions.style.display = 'block';
                        autocompleteSuggestions.style.visibility = 'visible';
                        autocompleteSuggestions.style.opacity = '1';
                    }
                }
            })
            .catch(error => {
                console.error('❌ Error al buscar autocompletado:', error);
                if (autocompleteSuggestions) {
                    autocompleteSuggestions.innerHTML = '<div class="autocomplete-loading">Error al buscar direcciones: ' + error.message + '</div>';
                    autocompleteSuggestions.style.display = 'block';
                    autocompleteSuggestions.style.visibility = 'visible';
                    autocompleteSuggestions.style.opacity = '1';
                }
            });
    }
    
    function mostrarAutocompletado(suggestions) {
        if (!autocompleteSuggestions) {
            console.error('❌ autocompleteSuggestions no está disponible');
            return;
        }
        
        console.log('✅ Mostrando', suggestions.length, 'sugerencias');
        
        selectedSuggestionIndex = -1;
        autocompleteSuggestions.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-suggestion';
            div.setAttribute('data-index', index);
            
            // Obtener tipo de lugar
            const type = suggestion.type || suggestion.class || 'lugar';
            const icon = obtenerIconoPorTipo(type);
            
            // Formatear dirección
            const direccionTexto = suggestion.display_name || suggestion.name || '';
            
            div.innerHTML = `
                <span class="autocomplete-suggestion-icon">${icon}</span>
                <div class="autocomplete-suggestion-text">
                    <strong>${direccionTexto.split(',').slice(0, 2).join(',')}</strong>
                    <div class="autocomplete-suggestion-type">${direccionTexto}</div>
                </div>
            `;
            
            div.addEventListener('click', function() {
                seleccionarSugerenciaAutocompletado(suggestion);
            });
            
            div.addEventListener('mouseenter', function() {
                selectedSuggestionIndex = index;
                actualizarSeleccionAutocompletado();
            });
            
            autocompleteSuggestions.appendChild(div);
        });
        
        autocompleteSuggestions.style.display = 'block';
        autocompleteSuggestions.style.visibility = 'visible';
        autocompleteSuggestions.style.opacity = '1';
        console.log('✅ Autocompletado mostrado, display:', autocompleteSuggestions.style.display, 'z-index:', window.getComputedStyle(autocompleteSuggestions).zIndex);
    }
    
    function obtenerIconoPorTipo(type) {
        const tipoLower = (type || '').toLowerCase();
        if (tipoLower.includes('house') || tipoLower.includes('residential')) return '🏠';
        if (tipoLower.includes('road') || tipoLower.includes('street')) return '🛣️';
        if (tipoLower.includes('city') || tipoLower.includes('town')) return '🏙️';
        if (tipoLower.includes('village')) return '🏘️';
        if (tipoLower.includes('commercial') || tipoLower.includes('shop')) return '🏪';
        if (tipoLower.includes('administrative')) return '🏛️';
        return '📍';
    }
    
    function ocultarAutocompletado() {
        if (autocompleteSuggestions) {
            autocompleteSuggestions.style.display = 'none';
            autocompleteSuggestions.style.visibility = 'hidden';
            autocompleteSuggestions.style.opacity = '0';
            autocompleteSuggestions.innerHTML = '';
        }
        selectedSuggestionIndex = -1;
        currentSuggestions = [];
    }
    
    function actualizarSeleccionAutocompletado() {
        if (!autocompleteSuggestions) return;
        
        const items = autocompleteSuggestions.querySelectorAll('.autocomplete-suggestion');
        items.forEach((item, index) => {
            if (index === selectedSuggestionIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    function seleccionarSugerenciaAutocompletado(suggestion) {
        if (!suggestion) return;
        
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        const direccionCompleta = suggestion.display_name || suggestion.name || '';
        
        console.log('✅ Dirección seleccionada:', direccionCompleta, 'Coordenadas:', lat, lng);
        
        // Actualizar campo de dirección
        if (direccionInput) {
            direccionInput.value = direccionCompleta;
        }
        
        // Ocultar autocompletado
        ocultarAutocompletado();
        
        // Centrar mapa en la ubicación seleccionada
        if (mapaLeaflet) {
            mapaLeaflet.setView([lat, lng], 15);
            
            // Crear o mover marcador
            if (marcadorEvento) {
                marcadorEvento.setLatLng([lat, lng]);
                if (!mapaLeaflet.hasLayer(marcadorEvento)) {
                    marcadorEvento.addTo(mapaLeaflet);
                }
                marcadorEvento.setOpacity(1);
            } else {
                marcadorEvento = L.marker([lat, lng], {
                    draggable: true,
                    title: 'Arrastra para seleccionar ubicación',
                }).addTo(mapaLeaflet);
                
                // Agregar evento de arrastre al marcador
                marcadorEvento.on('dragend', function(e) {
                    const dragLat = e.target.getLatLng().lat;
                    const dragLng = e.target.getLatLng().lng;
                    console.log('📍 Marcador arrastrado a:', dragLat, dragLng);
                    obtenerDireccionDesdeCoordenadas(dragLat, dragLng);
                });
            }
            
            // Actualizar información y calcular distancia
            obtenerDireccionDesdeCoordenadas(lat, lng);
        }
    }
    
    function setupGoogleMapsLink() {
        if (!direccionInput) {
            console.warn('Campo de dirección no encontrado');
            return;
        }
        
        console.log('🔧 Configurando funcionalidad de mapa...');
        console.log('🔍 Verificando elementos:', {
            direccionInput: direccionInput,
            autocompleteSuggestions: autocompleteSuggestions || document.getElementById('autocomplete-suggestions')
        });
        
        // Re-inicializar autocompleteSuggestions por si acaso
        if (!autocompleteSuggestions) {
            autocompleteSuggestions = document.getElementById('autocomplete-suggestions');
            if (autocompleteSuggestions) {
                console.log('✅ autocompleteSuggestions encontrado:', autocompleteSuggestions);
            } else {
                console.error('❌ autocompleteSuggestions NO encontrado en el DOM');
            }
        }
        
        // Inicializar mapa si Leaflet está disponible
        if (typeof L !== 'undefined') {
            setTimeout(() => {
                inicializarMapa();
            }, 300);
        } else {
            console.warn('Leaflet no está disponible aún, esperando...');
            let intentos = 0;
            const checkLeaflet = setInterval(() => {
                intentos++;
                if (typeof L !== 'undefined') {
                    clearInterval(checkLeaflet);
                    setTimeout(() => {
                        inicializarMapa();
                    }, 300);
                } else if (intentos > 50) {
                    clearInterval(checkLeaflet);
                    console.error('Leaflet no se cargó después de varios intentos');
                }
            }, 100);
        }
        
        // Botón de búsqueda
        if (btnBuscarDireccion) {
            btnBuscarDireccion.addEventListener('click', function(e) {
                e.preventDefault();
                buscarDireccionEnMapa();
            });
        }
        
        // Autocompletado mientras escribe
        if (direccionInput) {
            // Asegurarse de que autocompleteSuggestions está inicializado
            if (!autocompleteSuggestions) {
                autocompleteSuggestions = document.getElementById('autocomplete-suggestions');
            }
            
            console.log('✅ Configurando autocompletado. Elemento input:', direccionInput, 'Elemento suggestions:', autocompleteSuggestions);
            
            direccionInput.addEventListener('input', function(e) {
                const query = e.target.value.trim();
                console.log('📝 Input detectado:', query, 'Longitud:', query.length);
                
                // Asegurarse de que autocompleteSuggestions existe
                if (!autocompleteSuggestions) {
                    autocompleteSuggestions = document.getElementById('autocomplete-suggestions');
                }
                
                if (query.length >= 3) {
                    // Debounce: esperar 300ms después de que el usuario deje de escribir
                    clearTimeout(autocompleteTimeout);
                    autocompleteTimeout = setTimeout(() => {
                        console.log('⏰ Ejecutando búsqueda de autocompletado...');
                        buscarAutocompletado(query);
                    }, 300);
                } else {
                    ocultarAutocompletado();
                }
            });
            
            // Manejar teclado en el campo de dirección
            direccionInput.addEventListener('keydown', function(e) {
                if (autocompleteSuggestions && autocompleteSuggestions.style.display !== 'none') {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
                        actualizarSeleccionAutocompletado();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                        actualizarSeleccionAutocompletado();
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
                            seleccionarSugerenciaAutocompletado(currentSuggestions[selectedSuggestionIndex]);
                        } else {
                            buscarDireccionEnMapa();
                        }
                    } else if (e.key === 'Escape') {
                        ocultarAutocompletado();
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarDireccionEnMapa();
                }
            });
            
            // Ocultar autocompletado al hacer clic fuera
            document.addEventListener('click', function(e) {
                if (autocompleteSuggestions && 
                    !autocompleteSuggestions.contains(e.target) && 
                    e.target !== direccionInput) {
                    ocultarAutocompletado();
                }
            });
        }
        
        // Botón de Google Maps
        if (abrirGoogleMapsBtn) {
            abrirGoogleMapsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const lat = direccionLatInput ? direccionLatInput.value : '';
                const lng = direccionLngInput ? direccionLngInput.value : '';
                const direccion = direccionInput ? direccionInput.value.trim() : '';
                
                if (!lat || !lng) {
                    alert('Por favor, selecciona una ubicación en el mapa primero');
                    return;
                }
                
                // Abrir Google Maps con las coordenadas
                const url = `https://www.google.com/maps?q=${lat},${lng}`;
                window.open(url, '_blank', 'noopener,noreferrer');
                console.log('✅ Google Maps abierto con coordenadas:', lat, lng);
            });
        }
        
        console.log('✅ Configuración de mapa completada');
    }
    
    
    function calcularDistancia(lat1, lng1, lat2, lng2) {
        // Fórmula de Haversine para calcular distancia entre dos puntos
        const R = 6371; // Radio de la Tierra en kilómetros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    function setupEventListeners() {
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendario();
            });
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                const hoy = new Date();
                const fechaMaxima = new Date();
                fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 1);
                
                // Verificar si el siguiente mes no excede 1 año
                const siguienteMes = new Date(currentDate);
                siguienteMes.setMonth(siguienteMes.getMonth() + 1);
                
                // Si el siguiente mes no excede 1 año, permitir navegación
                if (siguienteMes <= fechaMaxima) {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    renderCalendario();
                } else {
                    // Mostrar mensaje o simplemente no hacer nada
                    console.log('No se puede navegar más de 1 año en el futuro');
                }
            });
        }
        
        if (cancelarReservaBtn) {
            cancelarReservaBtn.addEventListener('click', () => {
                cerrarModal();
            });
        }
        
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                cerrarModal();
            });
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => {
                cerrarModal();
            });
        }
        
        if (formularioReserva) {
            formularioReserva.addEventListener('submit', (e) => {
                e.preventDefault();
                procesarReserva();
            });
        }
        
        // Botón para agregar juego
        const btnAddJuego = document.getElementById('btn-add-juego');
        if (btnAddJuego) {
            btnAddJuego.addEventListener('click', function() {
                agregarFilaJuego();
            });
        }
        
        // Listener para distancia que actualiza el precio
        const distanciaInput = document.getElementById('distancia_km');
        if (distanciaInput) {
            distanciaInput.addEventListener('input', function() {
                actualizarPrecioDistancia();
                actualizarTotal();
            });
        }
        
        // Listener para botón de aplicar código de descuento (usar delegación de eventos)
        // Usar delegación porque el modal puede no estar en el DOM cuando se carga la página
        document.addEventListener('click', function(e) {
            // Verificar si el click fue en el botón o en algún elemento dentro del botón
            const btnAplicar = e.target.closest('#btn-aplicar-codigo');
            if (btnAplicar) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en botón aplicar código detectado (delegación)');
                validarYAplicarCodigo();
            }
        });
        
        // Listener adicional directo para asegurar que funcione
        // Se registrará cuando se abra el modal
        function registrarListenerCodigo() {
            const btnAplicar = document.getElementById('btn-aplicar-codigo');
            if (btnAplicar) {
                // Remover listener anterior si existe
                const nuevoBtn = btnAplicar.cloneNode(true);
                btnAplicar.parentNode.replaceChild(nuevoBtn, btnAplicar);
                
                nuevoBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Click en botón aplicar código detectado (directo)');
                    validarYAplicarCodigo();
                });
                console.log('✅ Listener de código registrado directamente');
            } else {
                console.warn('⚠️ Botón btn-aplicar-codigo no encontrado al registrar listener');
            }
        }
        
        // Guardar función para usarla cuando se abra el modal
        window.registrarListenerCodigo = registrarListenerCodigo;
        
        // Listener para Enter en el input de código
        document.addEventListener('keypress', function(e) {
            const codigoInput = document.getElementById('codigo_descuento');
            if (codigoInput && e.target === codigoInput && e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ Enter presionado en input de código');
                validarYAplicarCodigo();
            }
        });
        
        // Listener para cambio de hora de instalación (calcular automáticamente hora de retiro)
        const horaInstalacionInput = document.getElementById('hora_instalacion');
        if (horaInstalacionInput) {
            // Validar que la hora no sea antes de las 9:00 AM
            horaInstalacionInput.addEventListener('input', function() {
                if (this.value) {
                    const [horas, minutos] = this.value.split(':').map(Number);
                    if (horas < 9) {
                        // Si la hora es menor a 9, ajustarla a 9:00
                        this.value = '09:00';
                        if (typeof Swal !== 'undefined' && Swal.fire) {
                            Swal.fire({
                                title: 'Hora inválida',
                                text: 'Las instalaciones solo están disponibles desde las 9:00 AM',
                                icon: 'warning',
                                confirmButtonText: 'Entendido',
                                timer: 3000
                            });
                        }
                    }
                }
            });
            
            horaInstalacionInput.addEventListener('change', function() {
                // Validar nuevamente al cambiar
                if (this.value) {
                    const [horas, minutos] = this.value.split(':').map(Number);
                    if (horas < 9) {
                        this.value = '09:00';
                    }
                }
                calcularHoraRetiroAutomatica();
            });
        }
        
        // La hora de retiro ya no es editable, solo se muestra como texto
        // No necesitamos listener de cambio ya que es solo lectura
    }
    
    function renderCalendario() {
        // Actualizar título del mes
        currentMonthElement.textContent = `${meses[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        // Limpiar grid
        calendarioGrid.innerHTML = '';
        
        // Agregar headers de días de la semana
        diasSemana.forEach(dia => {
            const headerDay = document.createElement('div');
            headerDay.className = 'calendario-day-header';
            headerDay.textContent = dia;
            calendarioGrid.appendChild(headerDay);
        });
        
        // Obtener primer día del mes y número de días
        const primerDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const ultimoDia = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const diasEnMes = ultimoDia.getDate();
        const diaInicioSemana = primerDia.getDay();
        
        // Agregar días vacíos al inicio si es necesario
        for (let i = 0; i < diaInicioSemana; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendario-day';
            calendarioGrid.appendChild(emptyDay);
        }
        
        // Agregar días del mes
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Calcular fecha máxima (1 año desde hoy)
        const fechaMaxima = new Date();
        fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 1);
        fechaMaxima.setHours(0, 0, 0, 0);
        
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const dayElement = document.createElement('div');
            const fechaActual = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia);
            fechaActual.setHours(0, 0, 0, 0);
            
            dayElement.className = 'calendario-day';
            dayElement.innerHTML = `
                <div class="calendario-day-number">${dia}</div>
                <div class="calendario-day-status"></div>
            `;
            
            // Determinar estado del día
            if (fechaActual < hoy) {
                dayElement.classList.add('pasado');
                dayElement.querySelector('.calendario-day-status').textContent = 'Pasado';
            } else if (fechaActual > fechaMaxima) {
                // Fecha más de 1 año en el futuro
                dayElement.classList.add('pasado');
                dayElement.querySelector('.calendario-day-status').textContent = 'No disponible';
            } else {
                // Cargar disponibilidad desde el servidor
                cargarDisponibilidadFecha(fechaActual, dayElement);
            }
            
            calendarioGrid.appendChild(dayElement);
        }
    }
    
    async function cargarDisponibilidadFecha(fecha, dayElement) {
        const fechaStr = fecha.toISOString().split('T')[0];
        
        try {
            const url = `/api/disponibilidad/?fecha=${fechaStr}`;
            
            const response = await fetch(url);
            
            // Intentar parsear la respuesta incluso si hay error HTTP
            let data;
            try {
                data = await response.json();
                console.log(`📥 Respuesta del servidor para ${fechaStr}:`, data);
            } catch (parseError) {
                console.error('Error al parsear respuesta JSON:', parseError);
                throw new Error(`Error al procesar respuesta del servidor: ${response.status}`);
            }
            
            // Si hay un error en la respuesta, mostrar mensaje
            if (data.error) {
                console.error('Error del servidor:', data.error);
                dayElement.classList.add('ocupado');
                const statusElement = dayElement.querySelector('.calendario-day-status');
                if (statusElement) {
                    statusElement.textContent = 'Error';
                }
                return;
            }
            
            // DEBUG: Verificar que juegos_ocupados_list existe y tiene datos
            console.log(`🔍 DEBUG - Respuesta completa del servidor:`, data);
            console.log(`🔍 DEBUG - Juegos ocupados en respuesta:`, data.juegos_ocupados_list);
            console.log(`🔍 DEBUG - Tipo:`, typeof data.juegos_ocupados_list, 'Es array?', Array.isArray(data.juegos_ocupados_list));
            console.log(`🔍 DEBUG - data.juegos_ocupados (número):`, data.juegos_ocupados);
            console.log(`🔍 DEBUG - data.total_disponibles:`, data.total_disponibles);
            console.log(`🔍 DEBUG - data.total_juegos:`, data.total_juegos);
            if (data.juegos_ocupados_list && Array.isArray(data.juegos_ocupados_list)) {
                console.log(`🔍 DEBUG - Cantidad de juegos ocupados:`, data.juegos_ocupados_list.length);
                if (data.juegos_ocupados_list.length > 0) {
                    console.log(`🔍 DEBUG - IDs de juegos ocupados:`, data.juegos_ocupados_list.map(j => j.id));
                }
            }
            
            // Verificar si hay juegos disponibles
            // Un día está disponible si hay AL MENOS un juego disponible
            const tieneJuegosDisponibles = data.disponible && 
                                          data.juegos_disponibles && 
                                          Array.isArray(data.juegos_disponibles) && 
                                          data.juegos_disponibles.length > 0;
            
            // Obtener juegos ocupados (siempre los necesitamos para mostrarlos)
            const juegosOcupados = data.juegos_ocupados_list || [];
            const totalDisponibles = data.total_disponibles !== undefined ? data.total_disponibles : (data.juegos_disponibles ? data.juegos_disponibles.length : 0);
            const totalJuegos = data.total_juegos || 0;
            const tieneReservas = (juegosOcupados && juegosOcupados.length > 0) || (data.juegos_ocupados && data.juegos_ocupados > 0);
            
            console.log(`📅 Fecha ${fechaStr}:`);
            console.log(`   - Total disponibles: ${totalDisponibles}`);
            console.log(`   - Juegos ocupados en lista: ${juegosOcupados.length}`);
            console.log(`   - Total juegos sistema: ${totalJuegos}`);
            console.log(`   - Tiene reservas: ${tieneReservas}`);
            console.log(`   - data.juegos_ocupados: ${data.juegos_ocupados}`);
            
            if (tieneJuegosDisponibles) {
                dayElement.classList.add('disponible');
                const statusElement = dayElement.querySelector('.calendario-day-status');
                if (statusElement) {
                    // IMPORTANTE: Si hay reservas (juegos ocupados), SIEMPRE mostrar cuántos quedan disponibles
                    if (tieneReservas) {
                        // Mostrar el conteo de juegos disponibles cuando hay reservas
                        statusElement.textContent = `${totalDisponibles} disponible${totalDisponibles !== 1 ? 's' : ''}`;
                        console.log(`  ✅ Día disponible con reservas: ${totalDisponibles} juegos disponibles de ${totalJuegos} totales`);
                    } else if (totalDisponibles > 0) {
                        // Si no hay reservas pero hay juegos disponibles, mostrar "Disponible"
                        statusElement.textContent = 'Disponible';
                    } else {
                        statusElement.textContent = 'Disponible';
                    }
                }
                
                // Agregar listener de click
                dayElement.style.cursor = 'pointer';
                dayElement.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('🖱️ Click en día disponible:', fecha);
                    console.log('  ✅ Juegos disponibles:', data.juegos_disponibles?.length || 0, data.juegos_disponibles);
                    console.log('  ❌ Juegos ocupados:', juegosOcupados.length, juegosOcupados);
                    // IMPORTANTE: Siempre pasar los juegos ocupados para mostrarlos
                    seleccionarFecha(fecha, data.juegos_disponibles, dayElement, juegosOcupados);
                }, { once: false });
            } else {
                // No hay juegos disponibles (todos ocupados o no hay juegos)
                dayElement.classList.add('ocupado');
                const statusElement = dayElement.querySelector('.calendario-day-status');
                if (statusElement) {
                    if (data.mensaje) {
                        statusElement.textContent = data.mensaje.includes('pasada') ? 'Pasado' : 'Ocupado';
                    } else if (totalJuegos > 0 && juegosOcupados.length >= totalJuegos) {
                        // Todos los juegos están ocupados
                        statusElement.textContent = 'Todos ocupados';
                    } else if (tieneReservas && totalDisponibles === 0) {
                        // Hay reservas pero no quedan juegos disponibles
                        statusElement.textContent = '0 disponibles';
                    } else {
                        statusElement.textContent = 'Ocupado';
                    }
                }
                
                // Si hay juegos ocupados pero no disponibles, aún permitir ver el modal para mostrar los ocupados
                if (juegosOcupados.length > 0) {
                    dayElement.style.cursor = 'pointer';
                    dayElement.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('🖱️ Click en día ocupado, mostrando juegos ocupados:', juegosOcupados);
                        seleccionarFecha(fecha, [], dayElement, juegosOcupados);
                    }, { once: false });
                }
            }
        } catch (error) {
            console.error('Error al cargar disponibilidad para', fechaStr, ':', error);
            // En caso de error, marcar como ocupado por seguridad
            dayElement.classList.add('ocupado');
            const statusElement = dayElement.querySelector('.calendario-day-status');
            if (statusElement) {
                statusElement.textContent = 'Error';
            }
        }
    }
    
    function seleccionarFecha(fecha, juegosDisponibles, dayElement, juegosOcupados = []) {
        // Remover selección anterior
        const diasAnteriores = calendarioGrid.querySelectorAll('.seleccionado');
        diasAnteriores.forEach(dia => dia.classList.remove('seleccionado'));
        
        // Seleccionar nuevo día
        if (dayElement) {
            dayElement.classList.add('seleccionado');
        }
        
        selectedDate = fecha;
        mostrarModalReserva(fecha, juegosDisponibles, juegosOcupados);
    }
    
    function mostrarModalReserva(fecha, juegosDisponibles, juegosOcupados = []) {
        console.log('📋 Mostrando modal para fecha:', fecha);
        console.log('✅ Juegos disponibles:', juegosDisponibles?.length || 0, juegosDisponibles);
        console.log('❌ Juegos ocupados recibidos:', juegosOcupados?.length || 0, juegosOcupados);
        
        // Validar que juegosOcupados sea un array
        if (!Array.isArray(juegosOcupados)) {
            console.warn('⚠️ juegosOcupados no es un array, convirtiendo:', juegosOcupados);
            juegosOcupados = juegosOcupados ? [juegosOcupados] : [];
        }
        
        if (!modalReserva) {
            console.error('Modal no encontrado en el DOM');
            return;
        }
        
        const fechaFormateada = `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
        if (fechaSeleccionadaElement) {
            fechaSeleccionadaElement.textContent = `Reserva para: ${fechaFormateada}`;
        }
        
        // Guardar juegos disponibles y ocupados para usar en las filas
        juegosDisponiblesData = juegosDisponibles || [];
        juegosOcupadosData = juegosOcupados || [];
        
        // Limpiar contenedor de juegos
        const juegosContainer = document.getElementById('juegos-container');
        if (juegosContainer) {
            juegosContainer.innerHTML = '';
            juegoCounter = 0;
        }
        
        // Ocultar contenedor de total inicialmente
        const totalContainer = document.getElementById('total-container');
        if (totalContainer) {
            totalContainer.style.display = 'none';
        }
        
        // Mostrar información de juegos ocupados si hay
        const infoJuegosOcupados = document.getElementById('info-juegos-ocupados');
        if (infoJuegosOcupados) {
            if (juegosOcupados && juegosOcupados.length > 0) {
                infoJuegosOcupados.style.display = 'block';
            } else {
                infoJuegosOcupados.style.display = 'none';
            }
        }
        
        // Agregar una fila de juego por defecto
        if (juegosDisponiblesData.length > 0) {
            agregarFilaJuego();
        }
        
        // Limpiar errores
        if (formErrors) {
            formErrors.style.display = 'none';
            formErrors.innerHTML = '';
        }
        
        // Limpiar formulario
        if (formularioReserva) {
            formularioReserva.reset();
            const distanciaInput = document.getElementById('distancia_km');
            if (distanciaInput) {
                distanciaInput.value = '0';
            }
            // Limpiar campos de dirección
            if (direccionInput) direccionInput.value = '';
            if (direccionLatInput) direccionLatInput.value = '';
            if (direccionLngInput) direccionLngInput.value = '';
            if (direccionCompletaInput) direccionCompletaInput.value = '';
            if (abrirGoogleMapsBtn) abrirGoogleMapsBtn.disabled = true;
            
            // Ocultar autocompletado
            ocultarAutocompletado();
            
            // Limpiar mapa y marcadores
            if (marcadorEvento && mapaLeaflet) {
                mapaLeaflet.removeLayer(marcadorEvento);
                marcadorEvento = null;
            }
            if (mapaLeaflet) {
                mapaLeaflet.setView([OSORNO_LAT, OSORNO_LNG], 12);
            }
            if (mapaInfoSeleccionada) {
                mapaInfoSeleccionada.style.display = 'none';
            }
            const mapaLinkContainer = document.getElementById('mapa-link-container');
            if (mapaLinkContainer) {
                mapaLinkContainer.style.display = 'none';
            }
        }
        
        // Establecer hora de instalación por defecto (09:00) y calcular hora de retiro
        const horaInstalacionInput = document.getElementById('hora_instalacion');
        if (horaInstalacionInput) {
            horaInstalacionInput.value = '09:00';
            // Calcular hora de retiro automáticamente
            setTimeout(() => {
                calcularHoraRetiroAutomatica();
            }, 100);
        }
        
        // Mostrar modal
        modalReserva.classList.add('show');
        modalReserva.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        
        // Inicializar elementos de dirección y configurar mapa
        setTimeout(() => {
            if (inicializarElementosDireccion()) {
                setupGoogleMapsLink();
                console.log('✅ Mapa configurado correctamente');
            } else {
                console.warn('⚠️ No se pudieron inicializar los elementos de dirección');
            }
        }, 300);
        
        // Registrar listener del botón de código de descuento
        setTimeout(() => {
            if (window.registrarListenerCodigo) {
                window.registrarListenerCodigo();
            }
        }, 100);
        
        console.log('Modal mostrado, display:', modalReserva.style.display);
    }
    
    function cerrarModal() {
        // Limpiar código de descuento
        promocionAplicada = null;
        const codigoInput = document.getElementById('codigo_descuento');
        const codigoMensaje = document.getElementById('codigo-mensaje');
        if (codigoInput) codigoInput.value = '';
        if (codigoMensaje) {
            codigoMensaje.textContent = '';
            codigoMensaje.style.display = 'none';
        }
        selectedDate = null;
        modalReserva.classList.remove('show');
        modalReserva.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar scroll del body
        
        // Remover selección del calendario
        const diasSeleccionados = calendarioGrid.querySelectorAll('.seleccionado');
        diasSeleccionados.forEach(dia => dia.classList.remove('seleccionado'));
        
        // Limpiar formulario
        formularioReserva.reset();
        formErrors.style.display = 'none';
        formErrors.innerHTML = '';
        
        // Limpiar contenedor de juegos
        const juegosContainer = document.getElementById('juegos-container');
        if (juegosContainer) {
            juegosContainer.innerHTML = '';
            juegoCounter = 0;
        }
        
        // Ocultar contenedor de total
        const totalContainer = document.getElementById('total-container');
        if (totalContainer) {
            totalContainer.style.display = 'none';
        }
        
        // Limpiar campos de dirección
        if (direccionInput) direccionInput.value = '';
        if (direccionLatInput) direccionLatInput.value = '';
        if (direccionLngInput) direccionLngInput.value = '';
        if (direccionCompletaInput) direccionCompletaInput.value = '';
        if (abrirGoogleMapsBtn) abrirGoogleMapsBtn.disabled = true;
        const distanciaInput = document.getElementById('distancia_km');
        if (distanciaInput) distanciaInput.value = '0';
        
        // Ocultar autocompletado
        ocultarAutocompletado();
    }
    
    // Funciones para manejar múltiples juegos
    let juegosDisponiblesData = []; // Almacenar juegos disponibles para la fecha seleccionada
    let juegosOcupadosData = []; // Almacenar juegos ocupados para la fecha seleccionada
    
    function formatearPrecioChileno(precio) {
        return '$' + precio.toLocaleString('es-CL');
    }
    
    function calcularPrecioDistancia(km) {
        return km * 1000; // $1.000 por km
    }
    
    function actualizarPrecioDistancia() {
        const distanciaInput = document.getElementById('distancia_km');
        const precioDistanciaSpan = document.getElementById('precio-distancia');
        if (distanciaInput && precioDistanciaSpan) {
            const km = parseInt(distanciaInput.value) || 0;
            const precio = calcularPrecioDistancia(km);
            precioDistanciaSpan.textContent = formatearPrecioChileno(precio);
        }
    }
    
    function agregarFilaJuego(juegoId = null) {
        const container = document.getElementById('juegos-container');
        if (!container) return;
        
        const rowId = `juego-row-${juegoCounter++}`;
        const row = document.createElement('div');
        row.className = 'juego-row';
        row.id = rowId;
        
        // Select de juegos
        const select = document.createElement('select');
        select.className = 'juego-select';
        select.name = 'juego_id';
        select.required = true;
        select.innerHTML = '<option value="">Selecciona un juego</option>';
        
        // Agregar juegos disponibles
        juegosDisponiblesData.forEach(juego => {
            const option = document.createElement('option');
            option.value = juego.id;
            option.textContent = `${juego.nombre} - ${formatearPrecioChileno(juego.precio)}`;
            option.dataset.precio = juego.precio;
            option.classList.add('juego-disponible');
            if (juegoId && juego.id == juegoId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Agregar separador visual si hay juegos disponibles y ocupados
        if (juegosDisponiblesData.length > 0 && juegosOcupadosData.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '────────────────────────────';
            separator.style.color = '#ccc';
            separator.style.backgroundColor = '#f5f5f5';
            separator.style.fontSize = '0.85rem';
            select.appendChild(separator);
        }
        
        // Agregar juegos ocupados (no disponibles) al final
        juegosOcupadosData.forEach(juego => {
            const option = document.createElement('option');
            option.value = juego.id;
            option.disabled = true; // Deshabilitar para que no se pueda seleccionar
            option.textContent = `${juego.nombre} - ${formatearPrecioChileno(juego.precio)} (No disponible)`;
            option.dataset.precio = juego.precio;
            option.classList.add('juego-ocupado');
            // Estilos más sutiles
            option.style.color = '#d32f2f';
            option.style.backgroundColor = '#fff5f5';
            option.style.fontStyle = 'italic';
            select.appendChild(option);
        });
        
        // Precio
        const precioSpan = document.createElement('span');
        precioSpan.className = 'juego-precio';
        precioSpan.textContent = '$0';
        
        // Botón eliminar (más pequeño con X)
        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'btn-remove-juego';
        // Usar ícono de FontAwesome si está disponible, sino usar texto X
        btnRemove.innerHTML = '<i class="fas fa-times" style="font-size: 1rem; font-weight: bold;"></i>';
        btnRemove.title = 'Eliminar juego';
        // Fallback: si no hay FontAwesome, mostrar texto X
        if (!document.querySelector('link[href*="font-awesome"]')) {
            btnRemove.innerHTML = '<span style="font-size: 1.5rem; font-weight: bold; line-height: 1;">×</span>';
        }
        btnRemove.addEventListener('click', function() {
            row.remove();
            actualizarTotal();
            actualizarJuegosJson();
        });
        
        // Event listeners
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const precio = parseFloat(selectedOption.dataset.precio) || 0;
                precioSpan.textContent = formatearPrecioChileno(precio);
            } else {
                precioSpan.textContent = '$0';
            }
            actualizarTotal();
            actualizarJuegosJson();
        });
        
        row.appendChild(select);
        row.appendChild(precioSpan);
        row.appendChild(btnRemove);
        
        container.appendChild(row);
        
        // Mostrar contenedor de total si hay juegos
        const totalContainer = document.getElementById('total-container');
        if (totalContainer) {
            totalContainer.style.display = 'block';
        }
        
        // Si se pasó un juegoId, seleccionarlo
        if (juegoId) {
            select.value = juegoId;
            select.dispatchEvent(new Event('change'));
        }
        
        actualizarTotal();
        actualizarJuegosJson();
    }
    
    // Función para calcular hora de retiro automáticamente (6 horas después de instalación)
    function calcularHoraRetiroAutomatica() {
        const horaInstalacionInput = document.getElementById('hora_instalacion');
        const horaRetiroInput = document.getElementById('hora_retiro'); // Campo hidden
        const horaRetiroTexto = document.getElementById('hora_retiro_texto'); // Campo de texto visible
        
        if (!horaInstalacionInput || !horaRetiroInput || !horaRetiroTexto || !horaInstalacionInput.value) {
            return;
        }
        
        // Obtener hora de instalación
        const [horas, minutos] = horaInstalacionInput.value.split(':').map(Number);
        
        // Calcular hora de retiro (6 horas después)
        let horasRetiro = horas + 6;
        let minutosRetiro = minutos;
        
        // Si pasa de medianoche, ajustar
        if (horasRetiro >= 24) {
            horasRetiro = horasRetiro - 24;
        }
        
        // Formatear con 2 dígitos
        const horaRetiroFormateada = `${String(horasRetiro).padStart(2, '0')}:${String(minutosRetiro).padStart(2, '0')}`;
        
        // Actualizar el campo hidden (para el formulario)
        horaRetiroInput.value = horaRetiroFormateada;
        
        // Actualizar el campo de texto visible
        horaRetiroTexto.textContent = horaRetiroFormateada;
        
        // Recalcular horas extra después de actualizar la hora
        calcularHorasExtra();
    }
    
    // Función para calcular horas extra y su precio
    function calcularHorasExtra() {
        const horaInstalacionInput = document.getElementById('hora_instalacion');
        const horaRetiroInput = document.getElementById('hora_retiro');
        const horasExtraSpan = document.getElementById('horas-extra');
        const precioHorasExtraSpan = document.getElementById('precio-horas-extra');
        
        if (!horaInstalacionInput || !horaRetiroInput || !horaInstalacionInput.value || !horaRetiroInput.value) {
            if (horasExtraSpan) horasExtraSpan.textContent = '0';
            if (precioHorasExtraSpan) precioHorasExtraSpan.textContent = '$0';
            actualizarTotal();
            return;
        }
        
        // Obtener horas de instalación y retiro
        const [horasInst, minutosInst] = horaInstalacionInput.value.split(':').map(Number);
        const [horasRet, minutosRet] = horaRetiroInput.value.split(':').map(Number);
        
        // Convertir a minutos para facilitar el cálculo
        const minutosInstalacion = horasInst * 60 + minutosInst;
        let minutosRetiro = horasRet * 60 + minutosRet;
        
        // Si la hora de retiro es menor que la de instalación, asumir que es al día siguiente
        if (minutosRetiro < minutosInstalacion) {
            minutosRetiro += 24 * 60; // Agregar 24 horas en minutos
        }
        
        // Calcular diferencia en minutos
        const diferenciaMinutos = minutosRetiro - minutosInstalacion;
        
        // Calcular horas base (6 horas = 360 minutos)
        const horasBase = 6;
        const minutosBase = horasBase * 60;
        
        // Calcular horas extra (solo si excede las 6 horas base)
        let horasExtra = 0;
        if (diferenciaMinutos > minutosBase) {
            const minutosExtra = diferenciaMinutos - minutosBase;
            // Redondear hacia arriba (si hay al menos 1 minuto extra, cuenta como 1 hora)
            horasExtra = Math.ceil(minutosExtra / 60);
        }
        
        // Calcular precio (10.000 pesos por hora extra)
        const PRECIO_POR_HORA_EXTRA = 10000;
        const precioHorasExtra = horasExtra * PRECIO_POR_HORA_EXTRA;
        
        // Actualizar la UI
        if (horasExtraSpan) {
            horasExtraSpan.textContent = horasExtra;
        }
        if (precioHorasExtraSpan) {
            precioHorasExtraSpan.textContent = formatearPrecioChileno(precioHorasExtra);
        }
        
        // Actualizar el total también
        actualizarTotal();
    }
    
    function actualizarTotal() {
        const container = document.getElementById('juegos-container');
        const subtotalJuegosSpan = document.getElementById('subtotal-juegos');
        const precioDistanciaSpan = document.getElementById('precio-distancia-total');
        const precioHorasExtraSpan = document.getElementById('precio-horas-extra-total');
        const totalSpan = document.getElementById('total-reserva');
        const distanciaInput = document.getElementById('distancia_km');
        const descuentoContainer = document.getElementById('descuento-container');
        const montoDescuentoSpan = document.getElementById('monto-descuento');
        const codigoAplicadoText = document.getElementById('codigo-aplicado-text');
        
        if (!container) return;
        
        // Calcular subtotal de juegos
        let subtotalJuegos = 0;
        container.querySelectorAll('.juego-row').forEach(row => {
            const select = row.querySelector('.juego-select');
            const precioSpan = row.querySelector('.juego-precio');
            if (select.value && precioSpan) {
                const precioText = precioSpan.textContent.replace(/[^0-9]/g, '');
                if (precioText) {
                    subtotalJuegos += parseInt(precioText);
                }
            }
        });
        
        // Calcular precio por distancia
        const distanciaKm = distanciaInput ? (parseInt(distanciaInput.value) || 0) : 0;
        let precioDistancia = calcularPrecioDistancia(distanciaKm);
        
        // Calcular precio de horas extra
        const horasExtraSpan = document.getElementById('horas-extra');
        const horasExtra = horasExtraSpan ? (parseInt(horasExtraSpan.textContent) || 0) : 0;
        const PRECIO_POR_HORA_EXTRA = 10000;
        const precioHorasExtra = horasExtra * PRECIO_POR_HORA_EXTRA;
        
        // Total sin descuento = subtotal juegos + precio distancia + precio horas extra
        let totalSinDescuento = subtotalJuegos + precioDistancia + precioHorasExtra;
        
        // Aplicar descuento si hay promoción aplicada
        let montoDescuento = 0;
        console.log('💰 Calculando descuento. Promoción aplicada:', promocionAplicada);
        
        if (promocionAplicada) {
            console.log('📊 Tipo de descuento:', promocionAplicada.tipo_descuento);
            console.log('📊 Valor descuento:', promocionAplicada.valor_descuento);
            console.log('📊 Total sin descuento:', totalSinDescuento);
            console.log('📊 Precio distancia:', precioDistancia);
            
            if (promocionAplicada.tipo_descuento === 'porcentaje') {
                montoDescuento = totalSinDescuento * (promocionAplicada.valor_descuento / 100);
            } else if (promocionAplicada.tipo_descuento === 'monto_fijo') {
                montoDescuento = promocionAplicada.valor_descuento;
                if (montoDescuento > totalSinDescuento) {
                    montoDescuento = totalSinDescuento;
                }
            } else if (promocionAplicada.tipo_descuento === 'envio_gratis' || promocionAplicada.envio_gratis) {
                // Descontar el precio por distancia
                montoDescuento = precioDistancia;
            } else if (promocionAplicada.monto_descuento) {
                // Si el backend ya calculó el descuento, usarlo
                montoDescuento = promocionAplicada.monto_descuento;
            }
            
            console.log('💰 Monto descuento calculado:', montoDescuento);
        }
        
        const total = totalSinDescuento - montoDescuento;
        console.log('💰 Total final:', total);
        
        // Actualizar UI
        if (subtotalJuegosSpan) subtotalJuegosSpan.textContent = formatearPrecioChileno(subtotalJuegos);
        if (precioDistanciaSpan) precioDistanciaSpan.textContent = formatearPrecioChileno(precioDistancia);
        if (precioHorasExtraSpan) precioHorasExtraSpan.textContent = formatearPrecioChileno(precioHorasExtra);
        
        // Mostrar/ocultar descuento
        console.log('🎨 Elementos de descuento:', {
            descuentoContainer: !!descuentoContainer,
            montoDescuentoSpan: !!montoDescuentoSpan,
            codigoAplicadoText: !!codigoAplicadoText,
            promocionAplicada: !!promocionAplicada,
            montoDescuento
        });
        
        if (descuentoContainer && montoDescuentoSpan && codigoAplicadoText) {
            if (promocionAplicada && montoDescuento > 0) {
                console.log('✅ Mostrando descuento en UI');
                descuentoContainer.style.display = 'flex';
                montoDescuentoSpan.textContent = '-' + formatearPrecioChileno(montoDescuento);
                codigoAplicadoText.textContent = promocionAplicada.codigo;
            } else {
                console.log('❌ Ocultando descuento');
                descuentoContainer.style.display = 'none';
            }
        } else {
            console.warn('⚠️ Faltan elementos para mostrar descuento');
        }
        
        if (totalSpan) {
            totalSpan.textContent = formatearPrecioChileno(total);
            console.log('✅ Total actualizado en UI:', formatearPrecioChileno(total));
        }
    }
    
    // Hacer la función accesible globalmente para debugging
    window.validarYAplicarCodigo = async function validarYAplicarCodigo() {
        console.log('🔍 Iniciando validación de código...');
        console.log('🔍 Stack trace:', new Error().stack);
        const codigoInput = document.getElementById('codigo_descuento');
        const codigoMensaje = document.getElementById('codigo-mensaje');
        const btnAplicar = document.getElementById('btn-aplicar-codigo');
        
        // Limpiar mensaje anterior
        if (codigoMensaje) {
            codigoMensaje.style.display = 'none';
            codigoMensaje.textContent = '';
        }
        
        console.log('Elementos encontrados:', {
            codigoInput: !!codigoInput,
            codigoMensaje: !!codigoMensaje,
            btnAplicar: !!btnAplicar,
            selectedDate: !!selectedDate
        });
        
        // Validaciones inmediatas - mostrar mensajes de error de inmediato
        if (!codigoInput) {
            console.error('❌ No se encontró el input de código');
            mostrarMensajeCodigo('Error: No se encontró el campo de código de descuento', 'error');
            return;
        }
        
        if (!selectedDate) {
            console.warn('⚠️ No hay fecha seleccionada');
            mostrarMensajeCodigo('⚠️ Debe seleccionar una fecha primero', 'error');
            return;
        }
        
        const codigo = codigoInput.value.trim().toUpperCase();
        console.log('Código ingresado:', codigo);
        
        if (!codigo) {
            console.warn('⚠️ Código vacío');
            mostrarMensajeCodigo('⚠️ Por favor, ingresa un código de descuento', 'error');
            return;
        }
        
        // Mostrar mensaje de carga inmediatamente
        mostrarMensajeCodigo('⏳ Validando código...', 'info');
        
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : '';
        
        // Obtener total actual
        const container = document.getElementById('juegos-container');
        let subtotalJuegos = 0;
        if (container) {
            container.querySelectorAll('.juego-row').forEach(row => {
                const select = row.querySelector('.juego-select');
                const precioSpan = row.querySelector('.juego-precio');
                if (select.value && precioSpan) {
                    const precioText = precioSpan.textContent.replace(/[^0-9]/g, '');
                    if (precioText) {
                        subtotalJuegos += parseInt(precioText);
                    }
                }
            });
        }
        
        const distanciaInput = document.getElementById('distancia_km');
        const distanciaKm = distanciaInput ? (parseInt(distanciaInput.value) || 0) : 0;
        const precioDistancia = calcularPrecioDistancia(distanciaKm);
        
        const horasExtraSpan = document.getElementById('horas-extra');
        const horasExtra = horasExtraSpan ? (parseInt(horasExtraSpan.textContent) || 0) : 0;
        const precioHorasExtra = horasExtra * 10000;
        
        const totalPrecio = subtotalJuegos + precioDistancia + precioHorasExtra;
        
        // Obtener IDs de juegos seleccionados
        const juegosIds = [];
        if (container) {
            container.querySelectorAll('.juego-select').forEach(select => {
                if (select.value) {
                    juegosIds.push(parseInt(select.value));
                }
            });
        }
        
        console.log('📊 Datos calculados:', {
            subtotalJuegos,
            precioDistancia,
            precioHorasExtra,
            totalPrecio,
            juegosIds,
            email
        });
        
        // Deshabilitar botón y mostrar estado de carga
        if (btnAplicar) {
            btnAplicar.disabled = true;
            const textoOriginal = btnAplicar.textContent || 'Aplicar';
            btnAplicar.dataset.originalText = textoOriginal;
            btnAplicar.textContent = 'Validando...';
            btnAplicar.style.opacity = '0.7';
            btnAplicar.style.cursor = 'not-allowed';
        }
        
        try {
            const fechaStr = selectedDate.toISOString().split('T')[0];
            const csrftoken = getCookie('csrftoken');
            
            console.log('📤 Enviando petición a /api/validar-codigo/');
            console.log('Datos enviados:', {
                codigo,
                fecha: fechaStr,
                email,
                total_precio: totalPrecio,
                juegos_ids: juegosIds
            });
            
            const response = await fetch('/api/validar-codigo/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    codigo: codigo,
                    fecha: fechaStr,
                    email: email,
                    total_precio: totalPrecio,
                    juegos_ids: juegosIds
                })
            });
            
            console.log('📥 Respuesta recibida, status:', response.status);
            
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('❌ Error al parsear JSON:', parseError);
                const errorText = await response.text();
                console.error('Contenido del error:', errorText);
                mostrarMensajeCodigo('❌ Error al procesar la respuesta del servidor. Por favor, intenta nuevamente.', 'error');
                promocionAplicada = null;
                actualizarTotal();
                return;
            }
            
            if (!response.ok) {
                console.error('❌ Error HTTP:', response.status, response.statusText);
                console.error('Datos del error:', data);
                const mensajeError = data.error || `Error del servidor (${response.status}). Por favor, intenta nuevamente.`;
                mostrarMensajeCodigo(`❌ ${mensajeError}`, 'error');
                promocionAplicada = null;
                actualizarTotal();
                return;
            }
            console.log('📦 Datos recibidos:', data);
            
            if (data.success) {
                console.log('✅ Código válido, aplicando descuento...');
                promocionAplicada = data.promocion;
                console.log('Promoción aplicada:', promocionAplicada);
                const mensajeExito = `✓ Código "${codigo}" aplicado correctamente. Descuento: ${formatearPrecioChileno(data.promocion.monto_descuento)}`;
                mostrarMensajeCodigo(mensajeExito, 'success');
                actualizarTotal();
            } else {
                console.warn('⚠️ Código inválido:', data.error);
                promocionAplicada = null;
                const mensajeError = data.error || 'Error al validar el código';
                mostrarMensajeCodigo(`❌ ${mensajeError}`, 'error');
                actualizarTotal();
            }
        } catch (error) {
            console.error('❌ Error al validar código:', error);
            console.error('Stack trace:', error.stack);
            mostrarMensajeCodigo('❌ Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.', 'error');
            promocionAplicada = null;
            actualizarTotal();
        } finally {
            if (btnAplicar) {
                btnAplicar.disabled = false;
                btnAplicar.textContent = btnAplicar.dataset.originalText || 'Aplicar';
                btnAplicar.style.opacity = '1';
                btnAplicar.style.cursor = 'pointer';
            }
        }
    }
    
    function mostrarMensajeCodigo(mensaje, tipo) {
        console.log('💬 Mostrando mensaje:', mensaje, 'Tipo:', tipo);
        const codigoMensaje = document.getElementById('codigo-mensaje');
        if (!codigoMensaje) {
            console.error('❌ No se encontró el elemento codigo-mensaje');
            // Intentar mostrar con alert como fallback
            alert(mensaje);
            return;
        }
        
        codigoMensaje.textContent = mensaje;
        codigoMensaje.style.display = 'block';
        codigoMensaje.style.padding = '0.75rem';
        codigoMensaje.style.borderRadius = '4px';
        codigoMensaje.style.marginTop = '0.5rem';
        codigoMensaje.style.fontSize = '0.875rem';
        codigoMensaje.style.fontWeight = '500';
        codigoMensaje.style.transition = 'all 0.3s ease';
        
        // Estilos según el tipo de mensaje
        if (tipo === 'success') {
            codigoMensaje.style.color = '#2c5530';
            codigoMensaje.style.backgroundColor = '#d4edda';
            codigoMensaje.style.border = '1px solid #c3e6cb';
        } else if (tipo === 'info') {
            codigoMensaje.style.color = '#0c5460';
            codigoMensaje.style.backgroundColor = '#d1ecf1';
            codigoMensaje.style.border = '1px solid #bee5eb';
        } else {
            // error
            codigoMensaje.style.color = '#721c24';
            codigoMensaje.style.backgroundColor = '#f8d7da';
            codigoMensaje.style.border = '1px solid #f5c6cb';
        }
        
        // Hacer scroll suave al mensaje para que sea visible
        codigoMensaje.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        console.log('✅ Mensaje mostrado en elemento:', codigoMensaje);
    }
    
    function actualizarJuegosJson() {
        const container = document.getElementById('juegos-container');
        const jsonInput = document.getElementById('juegos-json');
        
        if (!container) {
            console.error('❌ No se encontró el contenedor de juegos');
            return;
        }
        
        if (!jsonInput) {
            console.error('❌ No se encontró el input juegos-json');
            return;
        }
        
        const juegos = [];
        const rows = container.querySelectorAll('.juego-row');
        console.log(`🔍 Encontradas ${rows.length} filas de juegos`);
        
        rows.forEach((row, index) => {
            const select = row.querySelector('.juego-select');
            
            if (select && select.value) {
                const juegoId = parseInt(select.value);
                // Siempre cantidad 1 ya que solo hay un juego por cada uno
                juegos.push({
                    juego_id: juegoId,
                    cantidad: 1
                });
                console.log(`✅ Juego ${index + 1}: ID=${juegoId}, Cantidad=1`);
            } else {
                console.warn(`⚠️ Fila ${index + 1} no tiene juego seleccionado`);
            }
        });
        
        const jsonString = JSON.stringify(juegos);
        jsonInput.value = jsonString;
        console.log('📝 JSON actualizado:', jsonString);
        
        return juegos;
    }
    
    async function procesarReserva() {
        if (!selectedDate) {
            mostrarErroresValidacion(['Debe seleccionar una fecha'], 'Error en el Formulario');
            return;
        }
        
        const fechaStr = selectedDate.toISOString().split('T')[0];
        
        // Actualizar JSON de juegos antes de obtener los datos
        const juegosActualizados = actualizarJuegosJson();
        
        // Usar dirección completa de Google Maps si está disponible, sino usar la dirección ingresada
        const direccionFinal = direccionCompletaInput && direccionCompletaInput.value 
            ? direccionCompletaInput.value 
            : (direccionInput ? direccionInput.value.trim() : '');
        
        // Obtener valores directamente de los inputs
        const nombreInput = document.getElementById('nombre');
        const apellidoInput = document.getElementById('apellido');
        const emailInput = document.getElementById('email');
        const telefonoInput = document.getElementById('telefono');
        const horaInstalacionInput = document.getElementById('hora_instalacion');
        const horaRetiroInput = document.getElementById('hora_retiro');
        const observacionesInput = document.getElementById('observaciones');
        const distanciaInput = document.getElementById('distancia_km');
        
        const datosReserva = {
            fecha: fechaStr,
            nombre: nombreInput ? nombreInput.value.trim() : '',
            apellido: apellidoInput ? apellidoInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            telefono: telefonoInput ? telefonoInput.value.trim() : '',
            hora_instalacion: horaInstalacionInput ? horaInstalacionInput.value.trim() : '',
            hora_retiro: horaRetiroInput ? horaRetiroInput.value.trim() : '',
            direccion: direccionFinal,
            direccion_lat: direccionLatInput ? direccionLatInput.value : '',
            direccion_lng: direccionLngInput ? direccionLngInput.value : '',
            observaciones: observacionesInput ? observacionesInput.value.trim() : '',
            distancia_km: distanciaInput ? (distanciaInput.value || '0') : '0',
            juegos: juegosActualizados || [],
            codigo_descuento: promocionAplicada ? promocionAplicada.codigo : ''
        };
        
        console.log('📤 Datos a enviar:', datosReserva);
        console.log('🎮 Juegos:', datosReserva.juegos);
        console.log('⏰ Horas:', {
            instalacion: datosReserva.hora_instalacion,
            retiro: datosReserva.hora_retiro
        });
        
        // Validar datos con funciones estandarizadas (incluye validación de juegos)
        if (!validarDatosReserva(datosReserva)) {
            return;
        }
        
        // Deshabilitar botón de envío
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando...';
        
        try {
            // Obtener token CSRF
            const csrftoken = getCookie('csrftoken');
            
            const response = await fetch('/api/reserva/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(datosReserva)
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarExitoValidacion(data.message || '¡Reserva creada exitosamente!', '¡Éxito!');
                cerrarModal();
                // Recargar calendario para actualizar disponibilidad
                setTimeout(() => {
                    renderCalendario();
                }, 2000);
            } else {
                mostrarErroresValidacion(data.errors || ['Error al crear la reserva'], 'Error al Crear Reserva');
            }
        } catch (error) {
            console.error('Error al enviar reserva:', error);
            mostrarErroresValidacion(['Error de conexión. Por favor, intenta nuevamente.'], 'Error de Conexión');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Confirmar Reserva';
        }
    }
    
    function validarDatosReserva(datos) {
        const todosLosErrores = [];
        
        // Validar fecha (aunque viene del calendario, validar que no sea pasada)
        if (datos.fecha) {
            const erroresFecha = validarFecha(datos.fecha, 'fecha del evento', true, false);
            todosLosErrores.push(...erroresFecha);
        } else {
            todosLosErrores.push('La fecha del evento es obligatoria');
        }
        
        // Validar nombre
        const erroresNombre = validarNombre(datos.nombre, 'nombre', 3, 30, false, false);
        todosLosErrores.push(...erroresNombre);
        
        // Validar apellido
        const erroresApellido = validarNombre(datos.apellido, 'apellido', 3, 30, false, false);
        todosLosErrores.push(...erroresApellido);
        
        // Validar email
        const erroresEmail = validarEmail(datos.email, 'email', 100, true, false);
        todosLosErrores.push(...erroresEmail);
        
        // Validar teléfono (opcional, pero si se ingresa debe ser válido)
        if (datos.telefono && datos.telefono.trim()) {
            const erroresTelefono = validarTelefonoChileno(datos.telefono, 'teléfono', false, false);
            todosLosErrores.push(...erroresTelefono);
        }
        
        // Validar hora de instalación (desde las 9:00 AM)
        if (!datos.hora_instalacion) {
            todosLosErrores.push('La hora de instalación es obligatoria');
        } else {
            const [horas, minutos] = datos.hora_instalacion.split(':').map(Number);
            if (horas < 9 || (horas === 9 && minutos < 0)) {
                todosLosErrores.push('Las instalaciones solo están disponibles desde las 9:00 AM');
            }
        }
        
        // Validar hora de retiro (antes de las 00:00, máximo 23:59)
        if (!datos.hora_retiro) {
            todosLosErrores.push('La hora de retiro es obligatoria');
        } else {
            const [horas, minutos] = datos.hora_retiro.split(':').map(Number);
            if (horas >= 24 || (horas === 23 && minutos > 59)) {
                todosLosErrores.push('La hora de retiro debe ser antes de las 00:00');
            }
        }
        
        // Validar que la hora de retiro sea posterior a la hora de instalación
        if (datos.hora_instalacion && datos.hora_retiro) {
            const erroresHorarioPosterior = validarHorarioRetiroPosterior(datos.hora_instalacion, datos.hora_retiro, false);
            todosLosErrores.push(...erroresHorarioPosterior);
        }
        
        // Validar dirección
        const erroresDireccion = validarDireccionChilena(datos.direccion, 'dirección', 5, 200, false);
        todosLosErrores.push(...erroresDireccion);
        
        // Validar que haya al menos un juego
        if (!datos.juegos || !Array.isArray(datos.juegos) || datos.juegos.length === 0) {
            todosLosErrores.push('Debe agregar al menos un juego');
        } else {
            // Validar que todos los juegos tengan un juego_id válido
            datos.juegos.forEach((juego, index) => {
                if (!juego.juego_id || juego.juego_id <= 0) {
                    todosLosErrores.push(`El juego ${index + 1} debe estar seleccionado correctamente`);
                }
            });
        }
        
        // Mostrar errores si los hay
        if (todosLosErrores.length > 0) {
            mostrarErroresValidacion(todosLosErrores, 'Errores en el Formulario de Reserva');
            return false;
        }
        
        return true;
    }
    
    // Función auxiliar para obtener cookie CSRF
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
