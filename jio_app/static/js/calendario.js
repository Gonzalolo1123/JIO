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
    const juegoSelect = document.getElementById('juego');
    const formErrors = document.getElementById('form-errors');
    const btnSubmit = document.getElementById('btn-submit');
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
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendario();
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
        
        // Limpiar y poblar select de juegos
        if (juegoSelect) {
            juegoSelect.innerHTML = '<option value="">Selecciona un juego</option>';
            
            // Agregar juegos disponibles primero
            if (juegosDisponibles && Array.isArray(juegosDisponibles) && juegosDisponibles.length > 0) {
                console.log('➕ Agregando', juegosDisponibles.length, 'juegos disponibles');
                juegosDisponibles.forEach(juego => {
                    if (juego && juego.id && juego.nombre) {
                        const option = document.createElement('option');
                        option.value = juego.id;
                        option.textContent = `${juego.nombre} - $${juego.precio.toLocaleString('es-CL')}`;
                        option.style.color = '#000';
                        option.style.backgroundColor = '#fff';
                        option.classList.add('juego-disponible');
                        juegoSelect.appendChild(option);
                    }
                });
            }
            
            // IMPORTANTE: Agregar juegos ocupados (no disponibles) después
            // Estos DEBEN aparecer siempre que existan, incluso si hay juegos disponibles
            if (juegosOcupados && Array.isArray(juegosOcupados) && juegosOcupados.length > 0) {
                console.log('🔴 Agregando', juegosOcupados.length, 'juegos ocupados:', juegosOcupados);
                
                // Separador visual más visible
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '═══════════════════════════════════════════════════════════';
                separator.style.fontWeight = 'bold';
                separator.style.color = '#666';
                separator.style.backgroundColor = '#e0e0e0';
                separator.style.fontSize = '0.85rem';
                juegoSelect.appendChild(separator);
                
                const separator2 = document.createElement('option');
                separator2.disabled = true;
                separator2.textContent = '  ⚠️ JUEGOS NO DISPONIBLES (RESERVADOS) ⚠️';
                separator2.style.fontWeight = 'bold';
                separator2.style.color = '#c62828';
                separator2.style.backgroundColor = '#ffebee';
                separator2.style.fontSize = '0.9rem';
                juegoSelect.appendChild(separator2);
                
                const separator3 = document.createElement('option');
                separator3.disabled = true;
                separator3.textContent = '═══════════════════════════════════════════════════════════';
                separator3.style.fontWeight = 'bold';
                separator3.style.color = '#666';
                separator3.style.backgroundColor = '#e0e0e0';
                separator3.style.fontSize = '0.85rem';
                juegoSelect.appendChild(separator3);
                
                juegosOcupados.forEach((juego, index) => {
                    console.log(`   📝 Procesando juego ocupado ${index + 1}:`, juego);
                    
                    // Validar que el juego tenga datos válidos
                    if (!juego) {
                        console.warn(`   ⚠️ Juego ocupado ${index + 1} es null o undefined`);
                        return;
                    }
                    
                    if (!juego.id) {
                        console.warn(`   ⚠️ Juego ocupado ${index + 1} no tiene ID:`, juego);
                        return;
                    }
                    
                    if (!juego.nombre) {
                        console.warn(`   ⚠️ Juego ocupado ${index + 1} (ID: ${juego.id}) no tiene nombre:`, juego);
                        return;
                    }
                    
                    const option = document.createElement('option');
                    option.value = juego.id;
                    option.disabled = true; // Deshabilitar para que no se pueda seleccionar
                    
                    // Texto MUY visible con "NO DISPONIBLE" al lado del nombre
                    // Formato: "Nombre del Juego - $Precio - ❌ NO DISPONIBLE"
                    const precio = juego.precio ? juego.precio.toLocaleString('es-CL') : '0';
                    option.textContent = `${juego.nombre} - $${precio} - ❌ NO DISPONIBLE`;
                    
                    // Aplicar estilos inline (aunque algunos navegadores los ignoren en option)
                    // El texto "NO DISPONIBLE" será siempre visible incluso si los colores no se aplican
                    try {
                        option.style.cssText = 'color: #c62828 !important; background-color: #ffcdd2 !important; font-weight: 600 !important;';
                    } catch (e) {
                        console.warn('No se pudieron aplicar estilos inline:', e);
                    }
                    
                    option.classList.add('juego-ocupado');
                    option.setAttribute('data-ocupado', 'true');
                    option.setAttribute('data-nombre', juego.nombre);
                    option.setAttribute('data-juego-id', juego.id);
                    
                    juegoSelect.appendChild(option);
                    console.log(`   ✅ Juego ocupado agregado al DOM: "${juego.nombre}" (ID: ${juego.id})`);
                });
                
                console.log(`✅ Total: ${juegosOcupados.length} juegos ocupados procesados y agregados al select`);
            } else {
                console.log('ℹ️ No hay juegos ocupados para mostrar. Tipo:', typeof juegosOcupados, 'Valor:', juegosOcupados);
            }
            
            // Si no hay juegos disponibles ni ocupados
            if ((!juegosDisponibles || juegosDisponibles.length === 0) && 
                (!juegosOcupados || juegosOcupados.length === 0)) {
                const option = document.createElement('option');
                option.value = '';
                option.disabled = true;
                option.textContent = 'No hay juegos disponibles';
                juegoSelect.appendChild(option);
            }
            
            // Log final para verificar
            const totalOpciones = juegoSelect.options.length;
            const opcionesOcupadas = juegoSelect.querySelectorAll('.juego-ocupado').length;
            console.log(`📊 Total opciones en select: ${totalOpciones}, Ocupadas: ${opcionesOcupadas}`);
            
            // Mostrar mensaje informativo si hay juegos ocupados
            const infoOcupados = document.getElementById('info-juegos-ocupados');
            if (infoOcupados) {
                if (opcionesOcupadas > 0) {
                    infoOcupados.style.display = 'block';
                } else {
                    infoOcupados.style.display = 'none';
                }
            }
            
            // Verificar visualmente que se agregaron
            setTimeout(() => {
                const opcionesVisible = Array.from(juegoSelect.options).filter(opt => opt.classList.contains('juego-ocupado'));
                console.log(`🔍 Verificación: ${opcionesVisible.length} opciones ocupadas encontradas en el DOM`);
                opcionesVisible.forEach((opt, idx) => {
                    console.log(`   Opción ${idx + 1}: "${opt.textContent}" (disabled: ${opt.disabled}, value: ${opt.value})`);
                });
                
                // También verificar todas las opciones para debug
                console.log('📋 Todas las opciones del select:');
                Array.from(juegoSelect.options).forEach((opt, idx) => {
                    const esOcupado = opt.classList.contains('juego-ocupado');
                    const icono = esOcupado ? '🔴' : '✅';
                    console.log(`   ${icono} ${idx}: "${opt.textContent.substring(0, 50)}..." (disabled: ${opt.disabled}, ocupado: ${esOcupado})`);
                });
            }, 200);
        } else {
            console.error('❌ juegoSelect no encontrado');
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
        
        console.log('Modal mostrado, display:', modalReserva.style.display);
    }
    
    function cerrarModal() {
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
    
    async function procesarReserva() {
        const formData = new FormData(formularioReserva);
        const fechaStr = selectedDate.toISOString().split('T')[0];
        
        // Usar dirección completa de Google Maps si está disponible, sino usar la dirección ingresada
        const direccionFinal = direccionCompletaInput && direccionCompletaInput.value 
            ? direccionCompletaInput.value 
            : formData.get('direccion');
        
        const datosReserva = {
            fecha: fechaStr,
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            juego: formData.get('juego'),
            horario: formData.get('horario'),
            direccion: direccionFinal,
            direccion_lat: direccionLatInput ? direccionLatInput.value : '',
            direccion_lng: direccionLngInput ? direccionLngInput.value : '',
            comentarios: formData.get('comentarios'),
            distancia_km: formData.get('distancia_km') || '0'
        };
        
        // Validar datos básicos
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
                mostrarMensajeExito(data.message || '¡Reserva creada exitosamente!');
                cerrarModal();
                // Recargar calendario para actualizar disponibilidad
                setTimeout(() => {
                    renderCalendario();
                }, 2000);
            } else {
                mostrarErrores(data.errors || ['Error al crear la reserva']);
            }
        } catch (error) {
            console.error('Error al enviar reserva:', error);
            mostrarErrores(['Error de conexión. Por favor, intenta nuevamente.']);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Confirmar Reserva';
        }
    }
    
    function validarDatosReserva(datos) {
        const errores = [];
        
        if (!datos.nombre || !datos.nombre.trim()) {
            errores.push('El nombre es obligatorio');
        }
        
        if (!datos.email || !datos.email.trim()) {
            errores.push('El email es obligatorio');
        } else if (!isValidEmail(datos.email)) {
            errores.push('El email no es válido');
        }
        
        if (!datos.telefono || !datos.telefono.trim()) {
            errores.push('El teléfono es obligatorio');
        }
        
        if (!datos.juego) {
            errores.push('Debe seleccionar un juego');
        }
        
        if (!datos.horario) {
            errores.push('Debe seleccionar un horario');
        }
        
        if (!datos.direccion || !datos.direccion.trim()) {
            errores.push('La dirección es obligatoria');
        }
        
        if (errores.length > 0) {
            mostrarErrores(errores);
            return false;
        }
        
        return true;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function mostrarErrores(errores) {
        formErrors.style.display = 'block';
        formErrors.innerHTML = '<ul>' + errores.map(error => `<li>${error}</li>`).join('') + '</ul>';
        
        // Scroll al área de errores
        formErrors.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    function mostrarMensajeExito(mensaje) {
        // Usar alert simple o mejor, SweetAlert si está disponible
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: mensaje,
                confirmButtonColor: '#2c5530'
            });
        } else {
            alert(mensaje);
        }
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
