// Prevenir múltiples inicializaciones
(function() {
    'use strict';
    
    let initialized = false;
    let isSubmittingCreate = false;
    let isSubmittingEdit = false;
    let isDeleting = false;
    let juegoCounter = 0; // Contador para IDs únicos de filas de juegos
    
    // Handlers nombrados para poder removerlos
    let editClickHandler = null;
    let deleteClickHandler = null;
    let escapeKeyHandler = null;
    
    function initArriendosList() {
        if (initialized) {
            return;
        }
        
        // Remover listeners anteriores si existen
        if (editClickHandler) {
            document.removeEventListener('click', editClickHandler);
        }
        if (deleteClickHandler) {
            document.removeEventListener('click', deleteClickHandler);
        }
        if (escapeKeyHandler) {
            document.removeEventListener('keydown', escapeKeyHandler);
        }
        
        initialized = true;
        
        const arriendosBase = document.getElementById('arriendosPage')?.dataset.arriendosBase || '/panel/arriendos/';
        
        // Elementos del DOM
        const modalCreate = document.getElementById('modalCreateArriendo');
        const modalEdit = document.getElementById('modalEditArriendo');
        const formCreate = document.getElementById('formCreateArriendo');
        const formEdit = document.getElementById('formEditArriendo');
        const btnOpenCreate = document.getElementById('btnOpenCreateArriendo');
        const btnAddJuegoCreate = document.getElementById('btnAddJuegoCreate');
        const btnAddJuegoEdit = document.getElementById('btnAddJuegoEdit');
        
        // Debug: verificar elementos
        if (!btnOpenCreate) {
            console.error('Error: No se encontró el botón btnOpenCreateArriendo');
        }
        if (!modalCreate) {
            console.error('Error: No se encontró el modal modalCreateArriendo');
        }
        if (!window.juegosDisponibles) {
            console.warn('Advertencia: window.juegosDisponibles no está definido aún');
        }
        
        // Función para agregar fila de juego
        function agregarFilaJuego(containerId, juego = null) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container ${containerId} no encontrado`);
                return;
            }
            
            if (!window.juegosDisponibles || !Array.isArray(window.juegosDisponibles)) {
                console.error('juegosDisponibles no está disponible');
                mostrarErroresValidacion(['Error: No se pudieron cargar los juegos disponibles'], 'Error');
                return;
            }
            
            const juegoId = juego ? (juego.juego_id || juego.id) : '';
            const cantidad = juego ? juego.cantidad : 1;
            const precioUnitario = juego ? juego.precio_unitario : 0;
            
            const juegoData = window.juegosDisponibles.find(j => j.id == juegoId);
            const nombreJuego = juegoData ? juegoData.nombre : '';
            const precioBase = juegoData ? juegoData.precio : precioUnitario;
            
            const rowId = `juego-row-${juegoCounter++}`;
            const row = document.createElement('div');
            row.id = rowId;
            row.className = 'juego-row';
            row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr auto;gap:0.75rem;align-items:end;padding:0.75rem;background:#f8f9fa;border-radius:8px;';
            
            row.innerHTML = `
                <div style="grid-column: 1 / 3;">
                    <label style="font-size:0.875rem;color:#666;margin-bottom:0.25rem;display:block;">Juego</label>
                    <select class="juego-select" data-row-id="${rowId}" required>
                        <option value="">Selecciona un juego disponible</option>
                        ${(window.juegosDisponibles || []).map(j => 
                            `<option value="${j.id}" data-precio="${j.precio}" ${j.id == juegoId ? 'selected' : ''}>${j.nombre} - ${formatearPrecioChileno(j.precio)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.875rem;color:#666;margin-bottom:0.25rem;display:block;">Precio</label>
                    <input type="text" class="juego-subtotal" data-row-id="${rowId}" value="${formatearPrecioChileno(precioBase)}" readonly style="background:#e8f5e9;font-weight:600;">
                </div>
                <div>
                    <button type="button" class="btn btn-danger btn-remove-juego" data-row-id="${rowId}" style="padding:0.5rem 0.75rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(row);
            
            // Event listeners para esta fila
            const select = row.querySelector('.juego-select');
            const subtotalInput = row.querySelector('.juego-subtotal');
            const removeBtn = row.querySelector('.btn-remove-juego');
            
            select.addEventListener('change', function() {
                actualizarSubtotal(rowId);
                actualizarTotal(containerId);
                actualizarJuegosJson(containerId === 'juegosContainerCreate' ? 'create' : 'edit');
            });
            
            removeBtn.addEventListener('click', function() {
                row.remove();
                actualizarTotal(containerId);
                actualizarJuegosJson(containerId === 'juegosContainerCreate' ? 'create' : 'edit');
            });
            
            // Actualizar subtotal inicial
            actualizarSubtotal(rowId);
        }
        
        function actualizarSubtotal(rowId) {
            const row = document.getElementById(rowId);
            if (!row) return;
            
            const select = row.querySelector('.juego-select');
            const subtotalInput = row.querySelector('.juego-subtotal');
            
            const juegoId = select.value;
            
            if (juegoId) {
                const juegoData = window.juegosDisponibles.find(j => j.id == juegoId);
                if (juegoData) {
                    // Cantidad siempre es 1
                    const subtotal = juegoData.precio;
                    subtotalInput.value = formatearPrecioChileno(subtotal);
                }
            } else {
                subtotalInput.value = formatearPrecioChileno(0);
            }
        }
        
        // Precio por kilómetro (configurable)
        const PRECIO_POR_KM = 1000;
        
        function calcularPrecioDistancia(distanciaKm) {
            return distanciaKm * PRECIO_POR_KM;
        }
        
        function actualizarPrecioDistancia(tipo) {
            const isCreate = tipo === 'create';
            const distanciaInput = document.getElementById(isCreate ? 'createDistanciaKm' : 'editDistanciaKm');
            const precioSpan = document.getElementById(isCreate ? 'createPrecioDistancia' : 'editPrecioDistancia');
            const precioDistanciaSpan = document.getElementById(isCreate ? 'precioDistanciaCreate' : 'precioDistanciaEdit');
            
            if (!distanciaInput) return;
            
            const distanciaKm = parseInt(distanciaInput.value) || 0;
            const precioDistancia = calcularPrecioDistancia(distanciaKm);
            
            if (precioSpan) {
                precioSpan.textContent = formatearPrecioChileno(precioDistancia);
            }
            if (precioDistanciaSpan) {
                precioDistanciaSpan.textContent = formatearPrecioChileno(precioDistancia);
            }
            
            // Actualizar total también
            actualizarTotal(isCreate ? 'juegosContainerCreate' : 'juegosContainerEdit');
        }
        
        function actualizarTotal(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const isCreate = containerId === 'juegosContainerCreate';
            const totalSpan = document.getElementById(isCreate ? 'totalCreate' : 'totalEdit');
            const subtotalJuegosSpan = document.getElementById(isCreate ? 'subtotalJuegosCreate' : 'subtotalJuegosEdit');
            const distanciaInput = document.getElementById(isCreate ? 'createDistanciaKm' : 'editDistanciaKm');
            
            // Calcular subtotal de juegos
            let subtotalJuegos = 0;
            container.querySelectorAll('.juego-row').forEach(row => {
                const select = row.querySelector('.juego-select');
                const juegoId = select.value;
                
                if (juegoId) {
                    const juegoData = window.juegosDisponibles.find(j => j.id == juegoId);
                    if (juegoData) {
                        // Cantidad siempre es 1
                        subtotalJuegos += juegoData.precio;
                    }
                }
            });
            
            // Calcular precio por distancia
            const distanciaKm = distanciaInput ? (parseInt(distanciaInput.value) || 0) : 0;
            const precioDistancia = calcularPrecioDistancia(distanciaKm);
            
            // Total = subtotal juegos + precio distancia
            const total = subtotalJuegos + precioDistancia;
            
            if (subtotalJuegosSpan) {
                subtotalJuegosSpan.textContent = formatearPrecioChileno(subtotalJuegos);
            }
            
            if (totalSpan) {
                totalSpan.textContent = formatearPrecioChileno(total);
            }
        }
        
        function actualizarJuegosJson(tipo) {
            const container = document.getElementById(`juegosContainer${tipo === 'create' ? 'Create' : 'Edit'}`);
            const jsonInput = document.getElementById(`${tipo}JuegosJson`);
            if (!container || !jsonInput) return;
            
            const juegos = [];
            container.querySelectorAll('.juego-row').forEach(row => {
                const select = row.querySelector('.juego-select');
                const juegoId = select.value;
                
                if (juegoId) {
                    // Cantidad siempre es 1
                    juegos.push({
                        juego_id: parseInt(juegoId),
                        cantidad: 1
                    });
                }
            });
            
            jsonInput.value = JSON.stringify(juegos);
        }
        
        // Funciones de modal
        function openModal(modal) {
            if (modal) {
                console.log('Abriendo modal, estado actual:', modal.classList.toString(), modal.getAttribute('aria-hidden'));
                modal.classList.add('show');
                modal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
                console.log('Modal después de abrir:', modal.classList.toString(), modal.getAttribute('aria-hidden'));
                
                // Verificar que el modal se esté mostrando
                setTimeout(() => {
                    const isVisible = window.getComputedStyle(modal).display === 'flex';
                    console.log('Modal visible?', isVisible, 'Display:', window.getComputedStyle(modal).display);
                    if (!isVisible) {
                        console.error('Modal no se está mostrando. Verificar CSS.');
                    }
                }, 100);
            } else {
                console.error('openModal: modal es null o undefined');
            }
        }
        
        function closeModal(modal) {
            if (modal) {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
                
                // Limpiar formularios
                if (modal === modalCreate && formCreate) {
                    formCreate.reset();
                    document.getElementById('juegosContainerCreate').innerHTML = '';
                    juegoCounter = 0;
                    actualizarTotal('juegosContainerCreate');
                }
            }
        }
        
        // Botón abrir modal crear
        if (btnOpenCreate) {
            console.log('Botón encontrado, agregando listener');
            btnOpenCreate.addEventListener('click', function(e) {
                console.log('Click en botón detectado');
                e.preventDefault();
                e.stopPropagation();
                
                if (!modalCreate) {
                    console.error('Modal de creación no encontrado');
                    alert('Error: Modal no encontrado. Revisa la consola.');
                    return;
                }
                
                if (!window.juegosDisponibles || !Array.isArray(window.juegosDisponibles)) {
                    console.error('juegosDisponibles no está definido o no es un array', window.juegosDisponibles);
                    mostrarErroresValidacion(['Error: No se pudieron cargar los juegos disponibles'], 'Error');
                    return;
                }
                
                console.log('Preparando modal...');
                
                if (formCreate) {
                    formCreate.reset();
                }
                
                const juegosContainer = document.getElementById('juegosContainerCreate');
                if (juegosContainer) {
                    // Limpiar completamente el contenedor
                    juegosContainer.innerHTML = '';
                }
                
                // Resetear juegos disponibles (se cargarán cuando se seleccione fecha)
                window.juegosDisponibles = [];
                
                // Resetear contador
                juegoCounter = 0;
                
                // Resetear distancia
                const distanciaInput = document.getElementById('createDistanciaKm');
                if (distanciaInput) {
                    distanciaInput.value = 0;
                    actualizarPrecioDistancia('create');
                }
                
                // Resetear mapa si existe
                if (typeof resetMapCreate === 'function') {
                    resetMapCreate();
                }
                
                // Establecer fecha de hoy por defecto
                const fechaInput = document.getElementById('createFechaEvento');
                if (fechaInput) {
                    const today = new Date().toISOString().split('T')[0];
                    fechaInput.value = today;
                    // Cargar juegos para hoy y luego agregar SOLO UNA fila
                    cargarJuegosDisponibles(today).then(() => {
                        // Asegurar que el contenedor esté vacío antes de agregar
                        if (juegosContainer) {
                            juegosContainer.innerHTML = '';
                        }
                        juegoCounter = 0;
                        agregarFilaJuego('juegosContainerCreate');
                        actualizarTotal('juegosContainerCreate');
                    });
                } else {
                    // Si no hay fechaInput, agregar SOLO UNA fila
                    agregarFilaJuego('juegosContainerCreate');
                    actualizarTotal('juegosContainerCreate');
                }
                
                console.log('Abriendo modal...');
                openModal(modalCreate);
                console.log('Modal debería estar abierto ahora');
                
                // Inicializar mapa después de abrir el modal
                setTimeout(() => {
                    // Verificar que Leaflet esté cargado
                    if (typeof L === 'undefined') {
                        console.error('Leaflet no está cargado');
                        return;
                    }
                    
                    if (typeof window.initMapCreate === 'function') {
                        console.log('Llamando a initMapCreate...');
                        window.initMapCreate();
                        // Invalidar tamaño después de un momento para que Leaflet recalcule
                        setTimeout(() => {
                            if (window.mapCreate) {
                                window.mapCreate.invalidateSize();
                                console.log('Tamaño del mapa invalidado');
                            }
                        }, 400);
                    } else {
                        console.warn('initMapCreate no está disponible aún');
                    }
                }, 400);
            });
        } else {
            console.error('Botón btnOpenCreateArriendo no encontrado');
        }
        
        // Cargar juegos disponibles según fecha
        async function cargarJuegosDisponibles(fecha, arriendoId = null) {
            if (!fecha) {
                console.warn('No se proporcionó fecha para cargar juegos');
                return;
            }
            
            try {
                let url = `${arriendosBase}juegos-disponibles/?fecha=${fecha}`;
                if (arriendoId) {
                    url += `&arriendo_id=${arriendoId}`;
                }
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Error ${response.status}`);
                }
                
                const data = await response.json();
                if (data.juegos) {
                    window.juegosDisponibles = data.juegos;
                    console.log(`Cargados ${data.juegos.length} juegos disponibles para ${fecha}`);
                    
                    // Actualizar todos los selects existentes
                    document.querySelectorAll('.juego-select').forEach(select => {
                        const selectedValue = select.value;
                        select.innerHTML = `
                            <option value="">Selecciona un juego disponible</option>
                            ${window.juegosDisponibles.map(j => 
                                `<option value="${j.id}" data-precio="${j.precio}" ${j.id == selectedValue ? 'selected' : ''}>${j.nombre} - ${formatearPrecioChileno(j.precio)}</option>`
                            ).join('')}
                        `;
                        
                        // Si el juego seleccionado ya no está disponible, limpiar
                        if (selectedValue && !window.juegosDisponibles.find(j => j.id == selectedValue)) {
                            select.value = '';
                            const rowId = select.dataset.rowId;
                            if (rowId) {
                                actualizarSubtotal(rowId);
                            }
                        }
                    });
                    
                    // Actualizar totales
                    actualizarTotal('juegosContainerCreate');
                    actualizarTotal('juegosContainerEdit');
                }
            } catch (error) {
                console.error('Error al cargar juegos disponibles:', error);
                mostrarErroresValidacion(['Error al cargar juegos disponibles para esta fecha'], 'Error');
            }
        }
        
        // Listener para cambio de fecha en crear
        const fechaInputCreate = document.getElementById('createFechaEvento');
        if (fechaInputCreate) {
            fechaInputCreate.addEventListener('change', function() {
                const fecha = this.value;
                if (fecha) {
                    cargarJuegosDisponibles(fecha);
                }
            });
        }
        
        // Listener para cambio de fecha en editar
        const fechaInputEdit = document.getElementById('editFechaEvento');
        if (fechaInputEdit) {
            fechaInputEdit.addEventListener('change', function() {
                const fecha = this.value;
                const arriendoId = document.getElementById('editArriendoId')?.value;
                if (fecha) {
                    cargarJuegosDisponibles(fecha, arriendoId);
                }
            });
        }
        
        // Listeners para cambio de distancia
        const distanciaInputCreate = document.getElementById('createDistanciaKm');
        if (distanciaInputCreate) {
            distanciaInputCreate.addEventListener('input', function() {
                actualizarPrecioDistancia('create');
            });
        }
        
        const distanciaInputEdit = document.getElementById('editDistanciaKm');
        if (distanciaInputEdit) {
            distanciaInputEdit.addEventListener('input', function() {
                actualizarPrecioDistancia('edit');
            });
        }
        
        // Botón agregar juego
        if (btnAddJuegoCreate) {
            btnAddJuegoCreate.addEventListener('click', () => {
                agregarFilaJuego('juegosContainerCreate');
            });
        }
        
        if (btnAddJuegoEdit) {
            btnAddJuegoEdit.addEventListener('click', () => {
                agregarFilaJuego('juegosContainerEdit');
            });
        }
        
        // Formulario crear
        if (formCreate) {
            formCreate.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                if (isSubmittingCreate) return;
                
                // Validar que haya al menos un juego
                const juegosContainer = document.getElementById('juegosContainerCreate');
                const juegosRows = juegosContainer.querySelectorAll('.juego-row');
                if (juegosRows.length === 0) {
                    mostrarErroresValidacion(['Debe agregar al menos un juego'], 'Error de Validación');
                    return;
                }
                
                // Validar que todos los juegos estén completos
                let hayErrores = false;
                juegosRows.forEach(row => {
                    const select = row.querySelector('.juego-select');
                    if (!select.value) {
                        hayErrores = true;
                    }
                });
                
                if (hayErrores) {
                    mostrarErroresValidacion(['Todos los juegos deben estar seleccionados'], 'Error de Validación');
                    return;
                }
                
                actualizarJuegosJson('create');
                
                isSubmittingCreate = true;
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creando...';
                }
                
                const formData = new FormData(this);
                
                try {
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                    if (!csrfToken) {
                        throw new Error('Token CSRF no encontrado');
                    }
                    
                    const endpoint = formCreate.dataset.endpoint;
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRFToken': csrfToken
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ errors: [`Error ${response.status}`] }));
                        throw new Error(JSON.stringify(errorData));
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        mostrarExitoValidacion(data.message, '¡Arriendo Creado!');
                        closeModal(modalCreate);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al crear el arriendo'], 'Error al Crear Arriendo');
                        isSubmittingCreate = false;
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    try {
                        const errorObj = JSON.parse(error.message);
                        mostrarErroresValidacion(errorObj.errors || ['Error al crear el arriendo'], 'Error al Crear Arriendo');
                    } catch {
                        mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                    }
                    isSubmittingCreate = false;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }
        
        // Función para poblar formulario de edición
        async function populateEditForm(arriendo) {
            document.getElementById('editArriendoId').value = arriendo.id;
            document.getElementById('editClienteId').value = arriendo.cliente_id;
            
            // Mostrar datos del cliente (solo lectura)
            const nombres = arriendo.cliente_nombre ? arriendo.cliente_nombre.split(' ') : [];
            document.getElementById('editClienteNombre').value = nombres[0] || '';
            const apellidos = nombres.slice(1).join(' ') || '';
            document.getElementById('editClienteApellido').value = apellidos;
            document.getElementById('editClienteEmail').value = arriendo.cliente_email || '';
            document.getElementById('editClienteTelefono').value = arriendo.cliente_telefono || '';
            document.getElementById('editClienteRut').value = arriendo.cliente_rut || '';
            document.getElementById('editClienteTipo').value = arriendo.cliente_tipo || '';
            
            document.getElementById('editFechaEvento').value = arriendo.fecha_evento;
            document.getElementById('editHoraInstalacion').value = arriendo.hora_instalacion;
            document.getElementById('editHoraRetiro').value = arriendo.hora_retiro;
            document.getElementById('editDireccion').value = arriendo.direccion_evento;
            document.getElementById('editEstado').value = arriendo.estado;
            document.getElementById('editObservaciones').value = arriendo.observaciones || '';
            
            // Cargar juegos disponibles para la fecha del evento (excluir este arriendo)
            await cargarJuegosDisponibles(arriendo.fecha_evento, arriendo.id);
            
            // Poblar distancia
            const distanciaInput = document.getElementById('editDistanciaKm');
            if (distanciaInput) {
                distanciaInput.value = arriendo.distancia_km || 0;
                actualizarPrecioDistancia('edit');
            }
            
            // Inicializar mapa de edición si existe la función
            if (typeof initMapEdit === 'function') {
                const latInput = document.getElementById('editLatitud');
                const lngInput = document.getElementById('editLongitud');
                const lat = latInput?.value || null;
                const lng = lngInput?.value || null;
                setTimeout(() => {
                    initMapEdit(arriendo.direccion_evento, lat, lng);
                }, 300);
            }
            
            // Limpiar y poblar juegos
            const container = document.getElementById('juegosContainerEdit');
            container.innerHTML = '';
            juegoCounter = 0;
            
            if (arriendo.detalles && arriendo.detalles.length > 0) {
                // Esperar a que los juegos se carguen antes de agregar las filas
                console.log('📋 Detalles del arriendo:', arriendo.detalles);
                console.log('🎮 Juegos disponibles:', window.juegosDisponibles);
                
                // Esperar más tiempo para asegurar que los juegos se hayan cargado
                setTimeout(() => {
                    if (!window.juegosDisponibles || window.juegosDisponibles.length === 0) {
                        console.error('❌ No hay juegos disponibles cargados');
                        agregarFilaJuego('juegosContainerEdit');
                    } else {
                        arriendo.detalles.forEach(detalle => {
                            console.log('➕ Agregando fila para detalle:', detalle);
                            agregarFilaJuego('juegosContainerEdit', detalle);
                        });
                    }
                    actualizarTotal('juegosContainerEdit');
                    actualizarJuegosJson('edit');
                }, 500);
            } else {
                agregarFilaJuego('juegosContainerEdit');
                actualizarTotal('juegosContainerEdit');
                actualizarJuegosJson('edit');
            }
        }
        
        // Formulario editar
        if (formEdit) {
            formEdit.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                if (isSubmittingEdit) return;
                
                // Validar que haya al menos un juego
                const juegosContainer = document.getElementById('juegosContainerEdit');
                const juegosRows = juegosContainer.querySelectorAll('.juego-row');
                if (juegosRows.length === 0) {
                    mostrarErroresValidacion(['Debe agregar al menos un juego'], 'Error de Validación');
                    return;
                }
                
                actualizarJuegosJson('edit');
                
                isSubmittingEdit = true;
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Guardando...';
                }
                
                const arriendoId = document.getElementById('editArriendoId').value;
                const formData = new FormData(this);
                
                const endpoint = `${arriendosBase}${arriendoId}/update/`;
                
                try {
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                    if (!csrfToken) {
                        throw new Error('Token CSRF no encontrado');
                    }
                    
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRFToken': csrfToken
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ errors: [`Error ${response.status}`] }));
                        throw new Error(JSON.stringify(errorData));
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        mostrarExitoValidacion(data.message, '¡Arriendo Actualizado!');
                        closeModal(modalEdit);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al actualizar el arriendo'], 'Error al Actualizar Arriendo');
                        isSubmittingEdit = false;
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    try {
                        const errorObj = JSON.parse(error.message);
                        mostrarErroresValidacion(errorObj.errors || ['Error al actualizar el arriendo'], 'Error al Actualizar Arriendo');
                    } catch {
                        mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                    }
                    isSubmittingEdit = false;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }
        
        // Botones de editar
        editClickHandler = async function(e) {
            if (e.target.matches('[data-edit-arriendo]')) {
                e.stopPropagation();
                const arriendoId = e.target.dataset.editArriendo;
                
                try {
                    const response = await fetch(`${arriendosBase}${arriendoId}/json/`);
                    const arriendo = await response.json();
                    
                    if (response.ok) {
                        populateEditForm(arriendo);
                        openModal(modalEdit);
                    } else {
                        mostrarErroresValidacion([arriendo.error || 'Error al cargar el arriendo'], 'Error al Cargar Arriendo');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                }
            }
        };
        document.addEventListener('click', editClickHandler);
        
        // Botones de eliminar
        deleteClickHandler = async function(e) {
            if (e.target.matches('[data-delete-arriendo]')) {
                e.stopPropagation();
                
                if (isDeleting) return;
                
                const arriendoId = e.target.dataset.deleteArriendo;
                const arriendoRow = e.target.closest('tr');
                const arriendoIdText = arriendoRow?.querySelector('td:first-child')?.textContent || 'este arriendo';
                
                if (confirm(`¿Estás seguro de que quieres eliminar el arriendo ${arriendoIdText}?`)) {
                    isDeleting = true;
                    const deleteBtn = e.target;
                    const originalText = deleteBtn.textContent;
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = 'Eliminando...';
                    
                    try {
                        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                        if (!csrfToken) {
                            throw new Error('Token CSRF no encontrado');
                        }
                        
                        const response = await fetch(`${arriendosBase}${arriendoId}/delete/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': csrfToken
                            }
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
                            throw new Error(errorData.error || `Error ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            mostrarExitoValidacion(data.message, '¡Arriendo Eliminado!');
                            if (arriendoRow) {
                                arriendoRow.remove();
                            }
                            isDeleting = false;
                        } else {
                            mostrarErroresValidacion(data.errors || [data.error || 'Error al eliminar el arriendo'], 'Error al Eliminar Arriendo');
                            isDeleting = false;
                            deleteBtn.disabled = false;
                            deleteBtn.textContent = originalText;
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarErroresValidacion([error.message || 'Error de conexión'], 'Error de Conexión');
                        isDeleting = false;
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = originalText;
                    }
                }
            }
        };
        document.addEventListener('click', deleteClickHandler);
        
        // Cerrar modales
        document.querySelectorAll('.modal-backdrop, [data-modal-close]').forEach(element => {
            element.addEventListener('click', function(e) {
                if (e.target === element || element.hasAttribute('data-modal-close')) {
                    const modal = element.closest('.modal') || document.querySelector('.modal[aria-hidden="false"]');
                    if (modal) {
                        closeModal(modal);
                    }
                }
            });
        });
        
        // Cerrar con Escape
        escapeKeyHandler = function(e) {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[aria-hidden="false"]');
                if (openModal) {
                    closeModal(openModal);
                }
            }
        };
        document.addEventListener('keydown', escapeKeyHandler);
    }
    
    // Inicializar - esperar a que el DOM y los scripts inline estén listos
    function waitForJuegosDisponibles(callback, maxAttempts = 50) {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.juegosDisponibles || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                callback();
            }
        }, 100);
    }
    
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                waitForJuegosDisponibles(initArriendosList);
            });
        } else {
            waitForJuegosDisponibles(initArriendosList);
        }
    }
    
    init();
})();

