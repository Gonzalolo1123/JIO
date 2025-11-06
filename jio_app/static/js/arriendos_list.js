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
            window.juegosDisponibles = [];
        }
        if (!window.juegosOcupados) {
            window.juegosOcupados = [];
        }
        
        // Función para actualizar otros selects cuando se cambia un juego
        function actualizarOtrosSelects(containerId, filaActualId, juegoSeleccionadoId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const juegoIdNum = juegoSeleccionadoId ? parseInt(juegoSeleccionadoId) : null;
            
            // Obtener todos los otros selects del mismo contenedor y reconstruirlos
            container.querySelectorAll('.juego-select').forEach(select => {
                const selectRow = select.closest('.juego-row');
                if (selectRow && selectRow.id !== filaActualId) {
                    const selectedValue = select.value;
                    const rowId = select.dataset.rowId;
                    
                    // Obtener IDs de juegos ya seleccionados en otras filas
                    const juegosYaSeleccionados = new Set();
                    container.querySelectorAll('.juego-row').forEach(otherRow => {
                        if (otherRow !== selectRow) {
                            const otherSelect = otherRow.querySelector('.juego-select');
                            if (otherSelect && otherSelect.value) {
                                juegosYaSeleccionados.add(parseInt(otherSelect.value));
                            }
                        }
                    });
                    
                    // Limpiar select
                    select.innerHTML = '<option value="">Selecciona un juego disponible</option>';
                    
                    // Si hay un juego seleccionado, agregarlo primero
                    const selectedId = selectedValue ? parseInt(selectedValue) : null;
                    
                    // CATEGORÍA 1: Juego seleccionado
                    if (selectedId && !juegosYaSeleccionados.has(selectedId)) {
                        const juegoSeleccionado = window.juegosDisponibles.find(j => parseInt(j.id) === selectedId);
                        if (juegoSeleccionado) {
                            // Encabezado de categoría
                            const headerSeleccionado = document.createElement('option');
                            headerSeleccionado.disabled = true;
                            headerSeleccionado.textContent = '━━━ JUEGO SELECCIONADO ━━━';
                            headerSeleccionado.style.fontWeight = 'bold';
                            headerSeleccionado.style.color = '#1976d2';
                            headerSeleccionado.style.backgroundColor = '#e3f2fd';
                            headerSeleccionado.style.fontSize = '0.875rem';
                            select.appendChild(headerSeleccionado);
                            
                            const option = document.createElement('option');
                            option.value = juegoSeleccionado.id;
                            option.textContent = `✓ ${juegoSeleccionado.nombre} - ${formatearPrecioChileno(juegoSeleccionado.precio)}`;
                            option.dataset.precio = juegoSeleccionado.precio;
                            option.classList.add('juego-seleccionado');
                            option.selected = true;
                            option.style.fontWeight = '600';
                            option.style.color = '#1976d2';
                            select.appendChild(option);
                            
                            // Separador
                            const separator1 = document.createElement('option');
                            separator1.disabled = true;
                            separator1.textContent = '';
                            select.appendChild(separator1);
                        }
                    } else if (selectedId && juegosYaSeleccionados.has(selectedId)) {
                        // El juego seleccionado ya está en otra fila, limpiar
                        const rowId = select.dataset.rowId;
                        if (rowId) {
                            actualizarSubtotal(rowId);
                        }
                    }
                    
                    // CATEGORÍA 2: Juegos disponibles (excluyendo los ya seleccionados)
                    const otrosDisponibles = window.juegosDisponibles.filter(j => {
                        const juegoIdActual = parseInt(j.id);
                        if (selectedId && juegoIdActual === selectedId) {
                            return false;
                        }
                        return !juegosYaSeleccionados.has(juegoIdActual);
                    });
                    
                    if (otrosDisponibles.length > 0) {
                        // Encabezado de categoría
                        const headerDisponibles = document.createElement('option');
                        headerDisponibles.disabled = true;
                        headerDisponibles.textContent = '━━━ JUEGOS DISPONIBLES ━━━';
                        headerDisponibles.style.fontWeight = 'bold';
                        headerDisponibles.style.color = '#2e7d32';
                        headerDisponibles.style.backgroundColor = '#e8f5e9';
                        headerDisponibles.style.fontSize = '0.875rem';
                        select.appendChild(headerDisponibles);
                        
                        otrosDisponibles.forEach(juego => {
                            const option = document.createElement('option');
                            option.value = juego.id;
                            option.textContent = `${juego.nombre} - ${formatearPrecioChileno(juego.precio)}`;
                            option.dataset.precio = juego.precio;
                            option.classList.add('juego-disponible');
                            select.appendChild(option);
                        });
                    }
                    
                    // CATEGORÍA 3: Juegos no disponibles (ocupados)
                    if (window.juegosOcupados.length > 0) {
                        // Separador antes de ocupados
                        const separator2 = document.createElement('option');
                        separator2.disabled = true;
                        separator2.textContent = '';
                        select.appendChild(separator2);
                        
                        // Encabezado de categoría
                        const headerOcupados = document.createElement('option');
                        headerOcupados.disabled = true;
                        headerOcupados.textContent = '━━━ JUEGOS NO DISPONIBLES ━━━';
                        headerOcupados.style.fontWeight = 'bold';
                        headerOcupados.style.color = '#d32f2f';
                        headerOcupados.style.backgroundColor = '#ffebee';
                        headerOcupados.style.fontSize = '0.875rem';
                        select.appendChild(headerOcupados);
                        
                        window.juegosOcupados.forEach(juego => {
                            const option = document.createElement('option');
                            option.value = juego.id;
                            option.disabled = true;
                            option.textContent = `${juego.nombre} - ${formatearPrecioChileno(juego.precio)}`;
                            option.dataset.precio = juego.precio;
                            option.classList.add('juego-ocupado');
                            option.style.color = '#d32f2f';
                            option.style.backgroundColor = '#fff5f5';
                            option.style.fontStyle = 'italic';
                            select.appendChild(option);
                        });
                    }
                }
            });
            
            // Actualizar totales
            actualizarTotal(containerId);
            actualizarJuegosJson(containerId === 'juegosContainerCreate' ? 'create' : 'edit');
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
                // En lugar de mostrar error y retornar, crear una fila vacía que se actualizará cuando se carguen los juegos
                console.warn('Creando fila de juego sin opciones (se actualizará cuando se carguen los juegos)');
                window.juegosDisponibles = []; // Asegurar que sea un array vacío
            }
            
            const juegoId = juego ? (juego.juego_id || juego.id) : '';
            const cantidad = juego ? juego.cantidad : 1;
            const precioUnitario = juego ? juego.precio_unitario : 0;
            
            // Si estamos agregando un juego específico (edición) y no está en disponibles, agregarlo
            if (juegoId && juego) {
                const juegoData = window.juegosDisponibles.find(j => j.id == juegoId);
                if (!juegoData) {
                    // Agregar el juego a disponibles usando la información del objeto juego
                    const juegoArriendo = {
                        id: juegoId,
                        nombre: juego.juego_nombre || juego.nombre || `Juego ${juegoId}`,
                        precio: precioUnitario || juego.precio || 0,
                        categoria: juego.categoria || ''
                    };
                    window.juegosDisponibles.push(juegoArriendo);
                    console.log(`✅ Agregado juego a disponibles en agregarFilaJuego: ${juegoArriendo.nombre} (ID: ${juegoId})`);
                    
                    // Remover de ocupados si está ahí
                    window.juegosOcupados = window.juegosOcupados.filter(j => j.id != juegoId);
                }
            }
            
            const juegoData = window.juegosDisponibles.find(j => j.id == juegoId);
            const nombreJuego = juegoData ? juegoData.nombre : (juego ? (juego.juego_nombre || juego.nombre) : '');
            const precioBase = juegoData ? juegoData.precio : precioUnitario;
            
            const rowId = `juego-row-${juegoCounter++}`;
            const row = document.createElement('div');
            row.id = rowId;
            row.className = 'juego-row';
            row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr auto;gap:0.75rem;align-items:end;padding:0.75rem;background:#f8f9fa;border-radius:8px;';
            
            // Crear estructura HTML del row
            // Si hay un juego seleccionado, mostrar un texto indicando cuál es el juego actual
            const juegoSeleccionadoText = juegoId && nombreJuego ? 
                `<div style="margin-bottom:0.5rem;padding:0.5rem;background:#e3f2fd;border-left:3px solid #2196f3;border-radius:4px;">
                    <span style="font-size:0.875rem;font-weight:600;color:#1976d2;">Juego seleccionado:</span>
                    <span style="font-size:0.875rem;color:#333;margin-left:0.25rem;">${nombreJuego} - ${formatearPrecioChileno(precioBase)}</span>
                </div>` : '';
            
            row.innerHTML = `
                <div style="grid-column: 1 / 3;">
                    <label style="font-size:0.875rem;color:#666;margin-bottom:0.25rem;display:block;">Juego</label>
                    ${juegoSeleccionadoText}
                    <select class="juego-select" data-row-id="${rowId}" required>
                        <option value="">Selecciona un juego disponible</option>
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
            
            // Obtener el select y llenarlo con opciones organizadas
            const select = row.querySelector('.juego-select');
            
            // Obtener IDs de juegos ya seleccionados en otras filas del mismo contenedor
            const juegosYaSeleccionados = new Set();
            container.querySelectorAll('.juego-row').forEach(otherRow => {
                if (otherRow !== row) { // No incluir la fila actual
                    const otherSelect = otherRow.querySelector('.juego-select');
                    if (otherSelect && otherSelect.value) {
                        juegosYaSeleccionados.add(parseInt(otherSelect.value));
                    }
                }
            });
            
            // Si hay un juego seleccionado en esta fila, agregarlo primero con indicador especial
            const juegoIdNum = juegoId ? parseInt(juegoId) : null;
            
            // CATEGORÍA 1: Juego seleccionado
            if (juegoIdNum) {
                let juegoSeleccionado = window.juegosDisponibles.find(j => parseInt(j.id) === juegoIdNum);
                
                // Si no está en disponibles pero tenemos la información del objeto juego, usar esa
                if (!juegoSeleccionado && juego && nombreJuego) {
                    juegoSeleccionado = {
                        id: juegoIdNum,
                        nombre: nombreJuego,
                        precio: precioBase
                    };
                }
                
                if (juegoSeleccionado) {
                    // Encabezado de categoría
                    const headerSeleccionado = document.createElement('option');
                    headerSeleccionado.disabled = true;
                    headerSeleccionado.textContent = '━━━ JUEGO SELECCIONADO ━━━';
                    headerSeleccionado.style.fontWeight = 'bold';
                    headerSeleccionado.style.color = '#1976d2';
                    headerSeleccionado.style.backgroundColor = '#e3f2fd';
                    headerSeleccionado.style.fontSize = '0.875rem';
                    select.appendChild(headerSeleccionado);
                    
                    const option = document.createElement('option');
                    option.value = juegoSeleccionado.id;
                    option.textContent = `✓ ${juegoSeleccionado.nombre} - ${formatearPrecioChileno(juegoSeleccionado.precio)}`;
                    option.dataset.precio = juegoSeleccionado.precio;
                    option.classList.add('juego-seleccionado');
                    option.selected = true;
                    option.style.fontWeight = '600';
                    option.style.color = '#1976d2';
                    select.appendChild(option);
                    
                    // Separador
                    const separator1 = document.createElement('option');
                    separator1.disabled = true;
                    separator1.textContent = '';
                    select.appendChild(separator1);
                }
            }
            
            // CATEGORÍA 2: Juegos disponibles (excluyendo el seleccionado y los ya seleccionados en otras filas)
            const otrosDisponibles = (window.juegosDisponibles || []).filter(j => {
                const juegoIdActual = parseInt(j.id);
                // Si hay un juego seleccionado en esta fila, excluirlo también
                if (juegoIdNum && juegoIdActual === juegoIdNum) {
                    return false;
                }
                // Excluir juegos ya seleccionados en otras filas
                return !juegosYaSeleccionados.has(juegoIdActual);
            });
            
            if (otrosDisponibles.length > 0) {
                // Encabezado de categoría
                const headerDisponibles = document.createElement('option');
                headerDisponibles.disabled = true;
                headerDisponibles.textContent = '━━━ JUEGOS DISPONIBLES ━━━';
                headerDisponibles.style.fontWeight = 'bold';
                headerDisponibles.style.color = '#2e7d32';
                headerDisponibles.style.backgroundColor = '#e8f5e9';
                headerDisponibles.style.fontSize = '0.875rem';
                select.appendChild(headerDisponibles);
                
                otrosDisponibles.forEach(j => {
                    const option = document.createElement('option');
                    option.value = j.id;
                    option.textContent = `${j.nombre} - ${formatearPrecioChileno(j.precio)}`;
                    option.dataset.precio = j.precio;
                    option.classList.add('juego-disponible');
                    select.appendChild(option);
                });
            }
            
            // CATEGORÍA 3: Juegos no disponibles (ocupados)
            if ((window.juegosOcupados || []).length > 0) {
                // Separador antes de ocupados
                const separator2 = document.createElement('option');
                separator2.disabled = true;
                separator2.textContent = '';
                select.appendChild(separator2);
                
                // Encabezado de categoría
                const headerOcupados = document.createElement('option');
                headerOcupados.disabled = true;
                headerOcupados.textContent = '━━━ JUEGOS NO DISPONIBLES ━━━';
                headerOcupados.style.fontWeight = 'bold';
                headerOcupados.style.color = '#d32f2f';
                headerOcupados.style.backgroundColor = '#ffebee';
                headerOcupados.style.fontSize = '0.875rem';
                select.appendChild(headerOcupados);
                
                window.juegosOcupados.forEach(j => {
                    const option = document.createElement('option');
                    option.value = j.id;
                    option.disabled = true; // Deshabilitar para que no se pueda seleccionar
                    option.textContent = `${j.nombre} - ${formatearPrecioChileno(j.precio)}`;
                    option.dataset.precio = j.precio;
                    option.classList.add('juego-ocupado');
                    option.style.color = '#d32f2f';
                    option.style.backgroundColor = '#fff5f5';
                    option.style.fontStyle = 'italic';
                    select.appendChild(option);
                });
            }
            
            // Event listeners para esta fila
            const subtotalInput = row.querySelector('.juego-subtotal');
            const removeBtn = row.querySelector('.btn-remove-juego');
            
            select.addEventListener('change', function() {
                const nuevoJuegoId = this.value;
                actualizarSubtotal(rowId);
                actualizarTotal(containerId);
                actualizarJuegosJson(containerId === 'juegosContainerCreate' ? 'create' : 'edit');
                
                // Actualizar todos los otros selects para excluir el juego recién seleccionado
                actualizarOtrosSelects(containerId, rowId, nuevoJuegoId);
            });
            
            removeBtn.addEventListener('click', function() {
                row.remove();
                actualizarTotal(containerId);
                actualizarJuegosJson(containerId === 'juegosContainerCreate' ? 'create' : 'edit');
                
                // Actualizar todos los otros selects para que el juego eliminado vuelva a estar disponible
                actualizarOtrosSelects(containerId, '', '');
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
            
            if (!distanciaInput) return;
            
            const distanciaKm = parseInt(distanciaInput.value) || 0;
            const precioDistancia = calcularPrecioDistancia(distanciaKm);
            
            if (precioSpan) {
                precioSpan.textContent = formatearPrecioChileno(precioDistancia);
            }
            
            // Actualizar total también (esto actualizará todos los campos del desglose)
            actualizarTotal(isCreate ? 'juegosContainerCreate' : 'juegosContainerEdit');
        }
        
        // Función para calcular hora de retiro automáticamente (6 horas después de instalación)
        function calcularHoraRetiroAutomatica(tipo) {
            const isCreate = tipo === 'create';
            const horaInstalacionInput = document.getElementById(isCreate ? 'createHoraInstalacion' : 'editHoraInstalacion');
            const horaRetiroInput = document.getElementById(isCreate ? 'createHoraRetiro' : 'editHoraRetiro');
            
            if (!horaInstalacionInput || !horaRetiroInput || !horaInstalacionInput.value) {
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
            
            // Solo actualizar si el usuario no ha modificado manualmente la hora de retiro
            // Usamos un flag para saber si fue modificado manualmente
            if (!horaRetiroInput.dataset.manualEdit || horaRetiroInput.dataset.manualEdit === 'false') {
                horaRetiroInput.value = horaRetiroFormateada;
                horaRetiroInput.dataset.autoCalculated = 'true';
                // Recalcular horas extra después de actualizar la hora
                calcularHorasExtra(tipo);
            }
        }
        
        // Función para calcular horas extra y su precio
        function calcularHorasExtra(tipo) {
            const isCreate = tipo === 'create';
            const horaInstalacionInput = document.getElementById(isCreate ? 'createHoraInstalacion' : 'editHoraInstalacion');
            const horaRetiroInput = document.getElementById(isCreate ? 'createHoraRetiro' : 'editHoraRetiro');
            const horasExtraSpan = document.getElementById(isCreate ? 'createHorasExtra' : 'editHorasExtra');
            const precioHorasExtraSpan = document.getElementById(isCreate ? 'createPrecioHorasExtra' : 'editPrecioHorasExtra');
            
            if (!horaInstalacionInput || !horaRetiroInput || !horaInstalacionInput.value || !horaRetiroInput.value) {
                if (horasExtraSpan) horasExtraSpan.textContent = '0';
                if (precioHorasExtraSpan) precioHorasExtraSpan.textContent = '$0';
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
            actualizarTotal(isCreate ? 'juegosContainerCreate' : 'juegosContainerEdit');
        }
        
        function actualizarTotal(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const isCreate = containerId === 'juegosContainerCreate';
            const totalSpan = document.getElementById(isCreate ? 'totalCreate' : 'totalEdit');
            const subtotalJuegosSpan = document.getElementById(isCreate ? 'subtotalJuegosCreate' : 'subtotalJuegosEdit');
            const precioDistanciaSpan = document.getElementById(isCreate ? 'precioDistanciaCreate' : 'precioDistanciaEdit');
            const precioHorasExtraSpan = document.getElementById(isCreate ? 'precioHorasExtraCreate' : 'precioHorasExtraEdit');
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
            
            // Calcular precio de horas extra
            const horasExtraSpan = document.getElementById(isCreate ? 'createHorasExtra' : 'editHorasExtra');
            const horasExtra = horasExtraSpan ? (parseInt(horasExtraSpan.textContent) || 0) : 0;
            const PRECIO_POR_HORA_EXTRA = 10000;
            const precioHorasExtra = horasExtra * PRECIO_POR_HORA_EXTRA;
            
            // Total = subtotal juegos + precio distancia + precio horas extra
            const total = subtotalJuegos + precioDistancia + precioHorasExtra;
            
            if (subtotalJuegosSpan) {
                subtotalJuegosSpan.textContent = formatearPrecioChileno(subtotalJuegos);
            }
            
            if (precioDistanciaSpan) {
                precioDistanciaSpan.textContent = formatearPrecioChileno(precioDistancia);
            }
            
            if (precioHorasExtraSpan) {
                precioHorasExtraSpan.textContent = formatearPrecioChileno(precioHorasExtra);
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
            const btnOpenCreateHandler = function(e) {
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
                
                // Establecer fecha de hoy por defecto y bloquear fechas anteriores y más de 1 año
                const fechaInput = document.getElementById('createFechaEvento');
                if (fechaInput) {
                    const today = new Date().toISOString().split('T')[0];
                    // Calcular fecha máxima (1 año desde hoy)
                    const fechaMaxima = new Date();
                    fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 1);
                    const fechaMaximaStr = fechaMaxima.toISOString().split('T')[0];
                    // Establecer min y max para limitar el rango
                    fechaInput.min = today; // Bloquear fechas anteriores a hoy (permitir hoy y futuras)
                    fechaInput.max = fechaMaximaStr; // Bloquear fechas más de 1 año en el futuro
                    fechaInput.value = today;
                    // Cargar juegos para hoy y luego agregar SOLO UNA fila
                    cargarJuegosDisponibles(today).then(() => {
                        // Verificar que los juegos se cargaron correctamente
                        if (window.juegosDisponibles && Array.isArray(window.juegosDisponibles) && window.juegosDisponibles.length > 0) {
                            // Asegurar que el contenedor esté vacío antes de agregar
                            if (juegosContainer) {
                                juegosContainer.innerHTML = '';
                            }
                            juegoCounter = 0;
                            agregarFilaJuego('juegosContainerCreate');
                            actualizarTotal('juegosContainerCreate');
                        } else {
                            console.warn('No se cargaron juegos disponibles para la fecha seleccionada');
                            mostrarErroresValidacion(['No hay juegos disponibles para la fecha seleccionada'], 'Advertencia');
                        }
                    }).catch(error => {
                        console.error('Error al cargar juegos:', error);
                        mostrarErroresValidacion(['Error al cargar los juegos disponibles'], 'Error');
                    });
                } else {
                    // Si no hay fechaInput, intentar agregar una fila (aunque no haya juegos)
                    if (window.juegosDisponibles && Array.isArray(window.juegosDisponibles) && window.juegosDisponibles.length > 0) {
                        agregarFilaJuego('juegosContainerCreate');
                        actualizarTotal('juegosContainerCreate');
                    } else {
                        console.warn('No hay juegos disponibles para agregar');
                    }
                }
                
                console.log('Abriendo modal...');
                // Establecer hora de instalación por defecto (09:00) y calcular hora de retiro automáticamente
                const horaInstCreate = document.getElementById('createHoraInstalacion');
                if (horaInstCreate && !horaInstCreate.value) {
                    horaInstCreate.value = '09:00';
                    try { calcularHoraRetiroAutomatica('create'); } catch (e) { console.warn('No se pudo calcular hora de retiro automáticamente:', e); }
                }
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
            };
            
            // Remover listener anterior si existe
            if (btnOpenCreate.dataset.listenerAttached && btnOpenCreate._handler) {
                btnOpenCreate.removeEventListener('click', btnOpenCreate._handler);
            }
            
            btnOpenCreate.addEventListener('click', btnOpenCreateHandler);
            btnOpenCreate._handler = btnOpenCreateHandler;
            btnOpenCreate.dataset.listenerAttached = 'true';
        } else {
            console.error('Botón btnOpenCreateArriendo no encontrado');
        }
        
        // Cargar juegos disponibles según fecha (igual que en calendario)
        async function cargarJuegosDisponibles(fecha, arriendoId = null) {
            if (!fecha) {
                console.warn('No se proporcionó fecha para cargar juegos');
                return;
            }
            
            try {
                // Usar el mismo endpoint que calendario para obtener disponibles y ocupados
                let url = `/api/disponibilidad/?fecha=${fecha}`;
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Error ${response.status}`);
                }
                
                const data = await response.json();
                
                // Guardar juegos disponibles y ocupados (igual que calendario)
                window.juegosDisponibles = data.juegos_disponibles || [];
                window.juegosOcupados = data.juegos_ocupados_list || [];
                
                // Si se está editando, obtener los juegos del arriendo actual y agregarlos a disponibles
                if (arriendoId) {
                    try {
                        const arriendoResponse = await fetch(`${arriendosBase}${arriendoId}/json/`);
                        if (arriendoResponse.ok) {
                            const arriendoData = await arriendoResponse.json();
                            if (arriendoData.detalles && arriendoData.detalles.length > 0) {
                                // Obtener IDs de juegos del arriendo actual
                                const juegosArriendoIds = new Set(arriendoData.detalles.map(d => d.juego_id).filter(Boolean));
                                
                                // Agregar los juegos del arriendo actual a disponibles usando la información de los detalles
                                arriendoData.detalles.forEach(detalle => {
                                    if (detalle.juego_id) {
                                        const juegoId = parseInt(detalle.juego_id); // Asegurar que sea número
                                        
                                        // Verificar si ya existe en disponibles (comparación robusta)
                                        const yaExiste = window.juegosDisponibles.find(j => parseInt(j.id) === juegoId);
                                        
                                        if (!yaExiste) {
                                            // Construir objeto de juego desde los detalles del arriendo
                                            const juegoArriendo = {
                                                id: juegoId,
                                                nombre: detalle.juego_nombre || `Juego ${juegoId}`,
                                                precio: detalle.precio_unitario || 0,
                                                categoria: '' // No viene en los detalles
                                            };
                                            
                                            // Agregar a disponibles
                                            window.juegosDisponibles.push(juegoArriendo);
                                            console.log(`✅ Agregado juego del arriendo actual a disponibles: ${juegoArriendo.nombre} (ID: ${juegoId})`);
                                        }
                                        
                                        // Remover de ocupados si está ahí (comparación robusta)
                                        window.juegosOcupados = window.juegosOcupados.filter(j => parseInt(j.id) !== juegoId);
                                    }
                                });
                                
                                // También intentar obtener información adicional desde el endpoint de juegos disponibles
                                // (por si acaso hay información adicional que necesitemos)
                                try {
                                    const juegosArriendoResponse = await fetch(`${arriendosBase}juegos-disponibles/?fecha=${fecha}&arriendo_id=${arriendoId}`);
                                    if (juegosArriendoResponse.ok) {
                                        const juegosArriendoData = await juegosArriendoResponse.json();
                                        if (juegosArriendoData.juegos) {
                                            // Actualizar información de juegos que ya agregamos
                                            juegosArriendoData.juegos.forEach(juego => {
                                                if (juegosArriendoIds.has(juego.id)) {
                                                    const juegoExistente = window.juegosDisponibles.find(j => j.id == juego.id);
                                                    if (juegoExistente) {
                                                        // Actualizar con información más completa si está disponible
                                                        if (juego.categoria) juegoExistente.categoria = juego.categoria;
                                                    }
                                                }
                                            });
                                        }
                                    }
                                } catch (error2) {
                                    console.warn('Error al obtener información adicional de juegos:', error2);
                                    // No es crítico, continuamos con la información de los detalles
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error al cargar juegos del arriendo actual:', error);
                        // Continuar sin agregar los juegos del arriendo actual
                    }
                }
                
                console.log(`Cargados ${window.juegosDisponibles.length} juegos disponibles y ${window.juegosOcupados.length} juegos ocupados para ${fecha}`);
                console.log('Juegos disponibles:', window.juegosDisponibles);
                console.log('Juegos ocupados:', window.juegosOcupados);
                
                // Actualizar todos los selects existentes con la misma lógica que agregarFilaJuego
                // Primero, obtener todos los contenedores de juegos
                const containers = [
                    document.getElementById('juegosContainerCreate'),
                    document.getElementById('juegosContainerEdit')
                ].filter(c => c !== null);
                
                containers.forEach(container => {
                    container.querySelectorAll('.juego-select').forEach(select => {
                        const selectedValue = select.value;
                        const rowId = select.dataset.rowId;
                        const row = select.closest('.juego-row');
                        
                        // Obtener IDs de juegos ya seleccionados en otras filas del mismo contenedor
                        const juegosYaSeleccionados = new Set();
                        container.querySelectorAll('.juego-row').forEach(otherRow => {
                            if (otherRow !== row) { // No incluir la fila actual
                                const otherSelect = otherRow.querySelector('.juego-select');
                                if (otherSelect && otherSelect.value) {
                                    juegosYaSeleccionados.add(parseInt(otherSelect.value));
                                }
                            }
                        });
                        
                        // Limpiar select
                        select.innerHTML = '<option value="">Selecciona un juego disponible</option>';
                        
                        // Si hay un juego seleccionado, agregarlo primero con indicador especial
                        const selectedId = selectedValue ? parseInt(selectedValue) : null;
                        
                        // CATEGORÍA 1: Juego seleccionado
                        if (selectedId) {
                            const juegoSeleccionado = window.juegosDisponibles.find(j => parseInt(j.id) === selectedId);
                            if (juegoSeleccionado) {
                                // Encabezado de categoría
                                const headerSeleccionado = document.createElement('option');
                                headerSeleccionado.disabled = true;
                                headerSeleccionado.textContent = '━━━ JUEGO SELECCIONADO ━━━';
                                headerSeleccionado.style.fontWeight = 'bold';
                                headerSeleccionado.style.color = '#1976d2';
                                headerSeleccionado.style.backgroundColor = '#e3f2fd';
                                headerSeleccionado.style.fontSize = '0.875rem';
                                select.appendChild(headerSeleccionado);
                                
                                const option = document.createElement('option');
                                option.value = juegoSeleccionado.id;
                                option.textContent = `✓ ${juegoSeleccionado.nombre} - ${formatearPrecioChileno(juegoSeleccionado.precio)}`;
                                option.dataset.precio = juegoSeleccionado.precio;
                                option.classList.add('juego-seleccionado');
                                option.selected = true;
                                option.style.fontWeight = '600';
                                option.style.color = '#1976d2';
                                select.appendChild(option);
                                
                                // Separador
                                const separator1 = document.createElement('option');
                                separator1.disabled = true;
                                separator1.textContent = '';
                                select.appendChild(separator1);
                            }
                        }
                        
                        // CATEGORÍA 2: Juegos disponibles (excluyendo el seleccionado y los ya seleccionados en otras filas)
                        const otrosDisponibles = window.juegosDisponibles.filter(j => {
                            const juegoIdActual = parseInt(j.id);
                            // Si hay un juego seleccionado en esta fila, excluirlo también
                            if (selectedId && juegoIdActual === selectedId) {
                                return false;
                            }
                            // Excluir juegos ya seleccionados en otras filas
                            return !juegosYaSeleccionados.has(juegoIdActual);
                        });
                        
                        if (otrosDisponibles.length > 0) {
                            // Encabezado de categoría
                            const headerDisponibles = document.createElement('option');
                            headerDisponibles.disabled = true;
                            headerDisponibles.textContent = '━━━ JUEGOS DISPONIBLES ━━━';
                            headerDisponibles.style.fontWeight = 'bold';
                            headerDisponibles.style.color = '#2e7d32';
                            headerDisponibles.style.backgroundColor = '#e8f5e9';
                            headerDisponibles.style.fontSize = '0.875rem';
                            select.appendChild(headerDisponibles);
                            
                            otrosDisponibles.forEach(juego => {
                                const option = document.createElement('option');
                                option.value = juego.id;
                                option.textContent = `${juego.nombre} - ${formatearPrecioChileno(juego.precio)}`;
                                option.dataset.precio = juego.precio;
                                option.classList.add('juego-disponible');
                                select.appendChild(option);
                            });
                        }
                        
                        // CATEGORÍA 3: Juegos no disponibles (ocupados)
                        if (window.juegosOcupados.length > 0) {
                            // Separador antes de ocupados
                            const separator2 = document.createElement('option');
                            separator2.disabled = true;
                            separator2.textContent = '';
                            select.appendChild(separator2);
                            
                            // Encabezado de categoría
                            const headerOcupados = document.createElement('option');
                            headerOcupados.disabled = true;
                            headerOcupados.textContent = '━━━ JUEGOS NO DISPONIBLES ━━━';
                            headerOcupados.style.fontWeight = 'bold';
                            headerOcupados.style.color = '#d32f2f';
                            headerOcupados.style.backgroundColor = '#ffebee';
                            headerOcupados.style.fontSize = '0.875rem';
                            select.appendChild(headerOcupados);
                            
                            window.juegosOcupados.forEach(juego => {
                                const option = document.createElement('option');
                                option.value = juego.id;
                                option.disabled = true; // Deshabilitar para que no se pueda seleccionar
                                option.textContent = `${juego.nombre} - ${formatearPrecioChileno(juego.precio)}`;
                                option.dataset.precio = juego.precio;
                                option.classList.add('juego-ocupado');
                                option.style.color = '#d32f2f';
                                option.style.backgroundColor = '#fff5f5';
                                option.style.fontStyle = 'italic';
                                select.appendChild(option);
                            });
                        }
                        
                        // Si el juego seleccionado ya no está disponible, limpiar
                        if (selectedValue) {
                            const selectedIdCheck = parseInt(selectedValue);
                            const juegoDisponible = window.juegosDisponibles.find(j => parseInt(j.id) === selectedIdCheck);
                            if (!juegoDisponible) {
                                select.value = '';
                                if (rowId) {
                                    actualizarSubtotal(rowId);
                                }
                            }
                        }
                    });
                });
                
                // Actualizar totales
                actualizarTotal('juegosContainerCreate');
                actualizarTotal('juegosContainerEdit');
            } catch (error) {
                console.error('Error al cargar juegos disponibles:', error);
                mostrarErroresValidacion(['Error al cargar juegos disponibles para esta fecha'], 'Error');
                window.juegosDisponibles = [];
                window.juegosOcupados = [];
            }
        }
        
        // Listener para cambio de fecha en crear
        const fechaInputCreate = document.getElementById('createFechaEvento');
        if (fechaInputCreate) {
            // Establecer fecha mínima al inicializar
            const today = new Date().toISOString().split('T')[0];
            fechaInputCreate.min = today;
            
            fechaInputCreate.addEventListener('change', function() {
                const fecha = this.value;
                // Asegurar que el mínimo siempre sea hoy
                const today = new Date().toISOString().split('T')[0];
                this.min = today;
                if (fecha) {
                    cargarJuegosDisponibles(fecha);
                }
            });
        }
        
        // Listener para cambio de fecha en editar
        const fechaInputEdit = document.getElementById('editFechaEvento');
        if (fechaInputEdit) {
            // Establecer fecha mínima al inicializar
            const today = new Date().toISOString().split('T')[0];
            fechaInputEdit.min = today;
            
            fechaInputEdit.addEventListener('change', function() {
                const fecha = this.value;
                // Asegurar que el mínimo siempre sea hoy
                const today = new Date().toISOString().split('T')[0];
                this.min = today;
                const arriendoId = document.getElementById('editArriendoId')?.value;
                if (fecha) {
                    cargarJuegosDisponibles(fecha, arriendoId);
                }
            });
        }
        
        // Listeners para cambio de hora de instalación (calcular automáticamente hora de retiro)
        const horaInstalacionCreate = document.getElementById('createHoraInstalacion');
        if (horaInstalacionCreate) {
            // Validar que la hora no sea antes de las 9:00 AM
            horaInstalacionCreate.addEventListener('input', function() {
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
            
            horaInstalacionCreate.addEventListener('change', function() {
                // Validar nuevamente al cambiar
                if (this.value) {
                    const [horas, minutos] = this.value.split(':').map(Number);
                    if (horas < 9) {
                        this.value = '09:00';
                    }
                }
                // Marcar que la hora de retiro fue calculada automáticamente
                const horaRetiroInput = document.getElementById('createHoraRetiro');
                if (horaRetiroInput) {
                    horaRetiroInput.dataset.manualEdit = 'false';
                }
                calcularHoraRetiroAutomatica('create');
            });
        }
        
        const horaInstalacionEdit = document.getElementById('editHoraInstalacion');
        if (horaInstalacionEdit) {
            // Validar que la hora no sea antes de las 9:00 AM
            horaInstalacionEdit.addEventListener('input', function() {
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
            
            horaInstalacionEdit.addEventListener('change', function() {
                // Validar nuevamente al cambiar
                if (this.value) {
                    const [horas, minutos] = this.value.split(':').map(Number);
                    if (horas < 9) {
                        this.value = '09:00';
                    }
                }
                // Marcar que la hora de retiro fue calculada automáticamente
                const horaRetiroInput = document.getElementById('editHoraRetiro');
                if (horaRetiroInput) {
                    horaRetiroInput.dataset.manualEdit = 'false';
                }
                calcularHoraRetiroAutomatica('edit');
            });
        }
        
        // Listeners para cambio de hora de retiro (calcular horas extra)
        const horaRetiroCreate = document.getElementById('createHoraRetiro');
        if (horaRetiroCreate) {
            horaRetiroCreate.addEventListener('change', function() {
                // Marcar que fue editado manualmente
                this.dataset.manualEdit = 'true';
                calcularHorasExtra('create');
            });
        }
        
        const horaRetiroEdit = document.getElementById('editHoraRetiro');
        if (horaRetiroEdit) {
            horaRetiroEdit.addEventListener('change', function() {
                // Marcar que fue editado manualmente
                this.dataset.manualEdit = 'true';
                calcularHorasExtra('edit');
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
        if (btnAddJuegoCreate && !btnAddJuegoCreate.dataset.listenerAttached) {
            btnAddJuegoCreate.dataset.listenerAttached = 'true';
            btnAddJuegoCreate.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                agregarFilaJuego('juegosContainerCreate');
            });
        }
        
        if (btnAddJuegoEdit && !btnAddJuegoEdit.dataset.listenerAttached) {
            btnAddJuegoEdit.dataset.listenerAttached = 'true';
            btnAddJuegoEdit.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                agregarFilaJuego('juegosContainerEdit');
            });
        }
        
        // Función para validar formulario de arriendo
        function validarFormularioArriendo(form, esEdicion = false) {
            const todosLosErrores = [];
            
            // Obtener valores de los campos
            const nombre = form.querySelector(esEdicion ? '#editClienteNombre' : '#createClienteNombre')?.value?.trim() || '';
            const apellido = form.querySelector(esEdicion ? '#editClienteApellido' : '#createClienteApellido')?.value?.trim() || '';
            const rut = form.querySelector(esEdicion ? '#editClienteRut' : '#createClienteRut')?.value?.trim() || '';
            const email = form.querySelector(esEdicion ? '#editClienteEmail' : '#createClienteEmail')?.value?.trim() || '';
            const telefono = form.querySelector(esEdicion ? '#editClienteTelefono' : '#createClienteTelefono')?.value?.trim() || '';
            const tipoCliente = form.querySelector(esEdicion ? '#editClienteTipo' : '#createClienteTipo')?.value || '';
            const fechaEvento = form.querySelector(esEdicion ? '#editFechaEvento' : '#createFechaEvento')?.value || '';
            const horaInstalacion = form.querySelector(esEdicion ? '#editHoraInstalacion' : '#createHoraInstalacion')?.value || '';
            const horaRetiro = form.querySelector(esEdicion ? '#editHoraRetiro' : '#createHoraRetiro')?.value || '';
            const direccion = form.querySelector(esEdicion ? '#editDireccion' : '#createDireccion')?.value?.trim() || '';
            const estado = form.querySelector(esEdicion ? '#editEstado' : '#createEstado')?.value || '';
            
            // Validar datos del cliente (tanto en creación como en edición)
            const erroresNombre = validarNombre(nombre, 'nombre del cliente', 3, 30, true, false);
            todosLosErrores.push(...erroresNombre);
            
            const erroresApellido = validarNombre(apellido, 'apellido del cliente', 3, 30, true, false);
            todosLosErrores.push(...erroresApellido);
            
            // Validar RUT
            if (!rut) {
                todosLosErrores.push('El RUT es obligatorio');
            } else {
                const erroresRut = validarRUT(rut, 'RUT', true, false);
                todosLosErrores.push(...erroresRut);
            }
            
            // Validar email del cliente
            const erroresEmail = validarEmail(email, 'email del cliente', 100, true, false);
            todosLosErrores.push(...erroresEmail);
            
            // Validar teléfono (opcional, pero si se ingresa debe ser válido)
            if (telefono) {
                const erroresTelefono = validarTelefonoChileno(telefono, 'teléfono del cliente', false, false);
                todosLosErrores.push(...erroresTelefono);
            }
            
            // Validar tipo de cliente
            if (!tipoCliente || (tipoCliente !== 'particular' && tipoCliente !== 'empresa')) {
                todosLosErrores.push('Debe seleccionar un tipo de cliente válido');
            }
            
            // Validar fecha del evento
            const erroresFecha = validarFecha(fechaEvento, 'fecha del evento', true, false);
            todosLosErrores.push(...erroresFecha);
            
            // Validar hora de instalación (desde las 9:00 AM)
            if (!horaInstalacion) {
                todosLosErrores.push('La hora de instalación es obligatoria');
            } else {
                const [horas, minutos] = horaInstalacion.split(':').map(Number);
                if (horas < 9 || (horas === 9 && minutos < 0)) {
                    todosLosErrores.push('Las instalaciones solo están disponibles desde las 9:00 AM');
                }
            }
            
            // Validar hora de retiro (antes de las 00:00, máximo 23:59)
            if (!horaRetiro) {
                todosLosErrores.push('La hora de retiro es obligatoria');
            } else {
                const [horas, minutos] = horaRetiro.split(':').map(Number);
                if (horas >= 24 || (horas === 23 && minutos > 59)) {
                    todosLosErrores.push('La hora de retiro debe ser antes de las 00:00');
                }
            }
            
            // Validar que la hora de retiro sea posterior a la hora de instalación
            if (horaInstalacion && horaRetiro) {
                const erroresHorarioPosterior = validarHorarioRetiroPosterior(horaInstalacion, horaRetiro, false);
                todosLosErrores.push(...erroresHorarioPosterior);
            }
            
            // Validar dirección
            const erroresDireccion = validarDireccionChilena(direccion, 'dirección del evento', 5, 200, false);
            todosLosErrores.push(...erroresDireccion);
            
            // Validar estado
            if (!estado) {
                todosLosErrores.push('Debe seleccionar un estado');
            }
            
            // Validar que haya al menos un juego
            const juegosContainer = document.getElementById(esEdicion ? 'juegosContainerEdit' : 'juegosContainerCreate');
            const juegosRows = juegosContainer ? juegosContainer.querySelectorAll('.juego-row') : [];
            if (juegosRows.length === 0) {
                todosLosErrores.push('Debe agregar al menos un juego');
            } else {
                // Validar que todos los juegos estén completos
                juegosRows.forEach((row, index) => {
                    const select = row.querySelector('.juego-select');
                    if (!select.value) {
                        todosLosErrores.push(`El juego ${index + 1} debe estar seleccionado`);
                    }
                });
            }
            
            // Mostrar errores si los hay
            if (todosLosErrores.length > 0) {
                mostrarErroresValidacion(todosLosErrores, 'Errores en el Formulario de Arriendo');
                return false;
            }
            
            return true;
        }
        
        // Formulario crear
        if (formCreate) {
            // Remover listener anterior si existe
            const formCreateHandler = async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Verificar y establecer flag INMEDIATAMENTE para prevenir doble envío
                if (isSubmittingCreate) {
                    console.warn('Submit ya en proceso, ignorando...');
                    return false;
                }
                
                // Establecer flag ANTES de cualquier otra operación
                isSubmittingCreate = true;
                
                // Deshabilitar botón INMEDIATAMENTE
                const submitBtn = formCreate.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creando...';
                }
                
                // Validar formulario completo
                if (!validarFormularioArriendo(formCreate, false)) {
                    // Si hay errores, resetear flag y botón
                    isSubmittingCreate = false;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                    return false; // Si hay errores, no enviar
                }
                
                actualizarJuegosJson('create');
                
                const formData = new FormData(formCreate);
                
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
                        // NO resetear isSubmittingCreate aquí porque la página se va a recargar
                        // Mantener el botón deshabilitado para evitar clics adicionales
                        mostrarExitoValidacion(data.message, '¡Arriendo Creado!');
                        closeModal(modalCreate);
                        // Recargar inmediatamente para evitar duplicados
                        window.location.reload();
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
            };
            
            // Remover listener anterior si existe
            if (formCreate.dataset.listenerAttached && formCreate._submitHandler) {
                formCreate.removeEventListener('submit', formCreate._submitHandler);
            }
            
            formCreate.addEventListener('submit', formCreateHandler);
            formCreate._submitHandler = formCreateHandler;
            formCreate.dataset.listenerAttached = 'true';
        }
        
        // Función para poblar formulario de edición
        async function populateEditForm(arriendo) {
            document.getElementById('editArriendoId').value = arriendo.id;
            document.getElementById('editClienteId').value = arriendo.cliente_id;
            
            // Mostrar datos del cliente (editables)
            const nombres = arriendo.cliente_nombre ? arriendo.cliente_nombre.split(' ') : [];
            document.getElementById('editClienteNombre').value = nombres[0] || '';
            const apellidos = nombres.slice(1).join(' ') || '';
            document.getElementById('editClienteApellido').value = apellidos;
            document.getElementById('editClienteEmail').value = arriendo.cliente_email || '';
            document.getElementById('editClienteTelefono').value = arriendo.cliente_telefono || '';
            document.getElementById('editClienteRut').value = arriendo.cliente_rut || '';
            // Convertir el tipo de cliente del formato display al valor
            const tipoClienteValue = arriendo.cliente_tipo === 'Particular' ? 'particular' : 
                                   (arriendo.cliente_tipo === 'Empresa' ? 'empresa' : 
                                   (arriendo.cliente_tipo || ''));
            document.getElementById('editClienteTipo').value = tipoClienteValue;
            
            const editFechaInput = document.getElementById('editFechaEvento');
            const today = new Date().toISOString().split('T')[0];
            // Calcular fecha máxima (1 año desde hoy)
            const fechaMaxima = new Date();
            fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 1);
            const fechaMaximaStr = fechaMaxima.toISOString().split('T')[0];
            editFechaInput.value = arriendo.fecha_evento;
            editFechaInput.min = today; // Bloquear fechas anteriores a hoy
            editFechaInput.max = fechaMaximaStr; // Bloquear fechas más de 1 año en el futuro
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
            
            // Los juegos ya se cargaron en cargarJuegosDisponibles (línea 817), así que podemos agregar las filas directamente
            if (arriendo.detalles && arriendo.detalles.length > 0) {
                console.log('📋 Detalles del arriendo:', arriendo.detalles);
                console.log('🎮 Juegos disponibles:', window.juegosDisponibles);
                
                // Agregar filas para cada detalle del arriendo
                arriendo.detalles.forEach(detalle => {
                    console.log('➕ Agregando fila para detalle:', detalle);
                    agregarFilaJuego('juegosContainerEdit', detalle);
                });
                
                actualizarTotal('juegosContainerEdit');
                actualizarJuegosJson('edit');
            } else {
                agregarFilaJuego('juegosContainerEdit');
                actualizarTotal('juegosContainerEdit');
                actualizarJuegosJson('edit');
            }
        }
        
        // Formulario editar
        if (formEdit) {
            // Handler nombrado para poder removerlo
            const formEditHandler = async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (isSubmittingEdit) {
                    console.warn('Submit ya en proceso, ignorando...');
                    return;
                }
                
                // Validar formulario completo
                if (!validarFormularioArriendo(formEdit, true)) {
                    return; // Si hay errores, no enviar
                }
                
                actualizarJuegosJson('edit');
                
                isSubmittingEdit = true;
                const submitBtn = formEdit.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Guardando...';
                }
                
                const arriendoId = document.getElementById('editArriendoId').value;
                const formData = new FormData(formEdit);
                
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
            };
            
            // Remover listener anterior si existe
            if (formEdit.dataset.listenerAttached) {
                formEdit.removeEventListener('submit', formEditHandler);
            }
            
            formEdit.addEventListener('submit', formEditHandler);
            formEdit.dataset.listenerAttached = 'true';
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
                
                // Mostrar confirmación con SweetAlert2
                const confirmado = await mostrarConfirmacionEliminar(
                    `¿Estás seguro de que quieres eliminar el arriendo ${arriendoIdText}?`,
                    'Confirmar Eliminación'
                );
                
                if (confirmado) {
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

