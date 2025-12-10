// Prevenir múltiples inicializaciones
(function() {
    'use strict';
    
    let initialized = false;
    let isSubmittingCreate = false;
    let isSubmittingEdit = false;
    let isDeleting = false;
    
    let createAbortController = null;
    let deleteAbortController = null;
    
    let editClickHandler = null;
    let deleteClickHandler = null;
    let escapeKeyHandler = null;
    
    function initGastosList() {
        if (initialized) {
            return;
        }
        
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
        
        const gastosBase = document.getElementById('gastosPage')?.dataset.gastosBase || '/panel/gastos/';
        
        const modalCreate = document.getElementById('modalCreateGasto');
        const modalEdit = document.getElementById('modalEditGasto');
        const formCreate = document.getElementById('formCreateGasto');
        const formEdit = document.getElementById('formEditGasto');
        const btnOpenCreate = document.getElementById('btnOpenCreateGasto');
        
        function closeModal(modal) {
            if (!modal) return;
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        
        function openModal(modal) {
            if (!modal) return;
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        function clearForm(form) {
            if (!form) return;
            form.reset();
            const preview = document.getElementById('createGastoComprobantePreview');
            if (preview) preview.innerHTML = '';
        }
        
        function populateEditForm(gasto) {
            document.getElementById('editGastoId').value = gasto.id;
            document.getElementById('editGastoCategoria').value = gasto.categoria;
            document.getElementById('editGastoDescripcion').value = gasto.descripcion;
            document.getElementById('editGastoMonto').value = gasto.monto;
            document.getElementById('editGastoFecha').value = gasto.fecha_gasto;
            document.getElementById('editGastoMetodoPago').value = gasto.metodo_pago;
            document.getElementById('editGastoVehiculo').value = gasto.vehiculo_id || '';
            document.getElementById('editGastoReserva').value = gasto.reserva_id || '';
            document.getElementById('editGastoObservaciones').value = gasto.observaciones || '';
            
            // Preview de comprobante
            const previewDiv = document.getElementById('editGastoComprobantePreview');
            const eliminarContainer = document.getElementById('editGastoEliminarComprobanteContainer');
            const comprobanteInput = document.getElementById('editGastoComprobante');
            
            comprobanteInput.value = '';
            const eliminarCheckbox = document.getElementById('editGastoEliminarComprobante');
            if (eliminarCheckbox) eliminarCheckbox.checked = false;
            
            if (gasto.comprobante) {
                previewDiv.innerHTML = `
                    <div style="position: relative; display: inline-block;">
                        <img src="${gasto.comprobante}" alt="Comprobante actual" style="max-width: 300px; max-height: 200px; border-radius: 8px; border: 2px solid #e0e0e0;">
                        <p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">Comprobante actual</p>
                    </div>
                `;
                if (eliminarContainer) eliminarContainer.style.display = 'block';
            } else {
                previewDiv.innerHTML = '<p style="color: #999;">Sin comprobante</p>';
                if (eliminarContainer) eliminarContainer.style.display = 'none';
            }
        }
        
        // Preview de comprobante al seleccionar archivo
        const editComprobanteInput = document.getElementById('editGastoComprobante');
        const editComprobantePreview = document.getElementById('editGastoComprobantePreview');
        
        if (editComprobanteInput && editComprobantePreview) {
            editComprobanteInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        mostrarErroresValidacion(['El archivo no puede exceder 5MB'], 'Archivo muy grande');
                        this.value = '';
                        return;
                    }
                    
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                    if (!allowedTypes.includes(file.type)) {
                        mostrarErroresValidacion(['Formato no válido. Use JPG, PNG, GIF o WEBP'], 'Formato inválido');
                        this.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        editComprobantePreview.innerHTML = `
                            <div style="position: relative; display: inline-block;">
                                <img src="${e.target.result}" alt="Nuevo comprobante" style="max-width: 300px; max-height: 200px; border-radius: 8px; border: 2px solid #4CAF50;">
                                <p style="margin-top: 0.5rem; color: #4CAF50; font-size: 0.9rem;">✓ Nuevo comprobante seleccionado</p>
                            </div>
                        `;
                    };
                    reader.readAsDataURL(file);
                    
                    const eliminarCheckbox = document.getElementById('editGastoEliminarComprobante');
                    if (eliminarCheckbox) eliminarCheckbox.checked = false;
                }
            });
        }
        
        // Event listeners para modales
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) closeModal(modal);
            });
        });
        
        // Abrir modal de creación
        if (btnOpenCreate) {
            btnOpenCreate.addEventListener('click', function() {
                clearForm(formCreate);
                openModal(modalCreate);
            });
        }
        
        // Envío del formulario de creación
        if (formCreate && !formCreate.dataset.listenerAttached) {
            formCreate.dataset.listenerAttached = 'true';
            
            formCreate.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                if (isSubmittingCreate) {
                    return;
                }
                
                if (createAbortController) {
                    createAbortController.abort();
                }
                createAbortController = new AbortController();
                
                isSubmittingCreate = true;
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creando...';
                }
                
                const formData = new FormData(this);
                const endpoint = this.dataset.endpoint;
                
                try {
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                    if (!csrfToken) {
                        throw new Error('Token CSRF no encontrado');
                    }
                    
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData,
                        signal: createAbortController.signal,
                        headers: {
                            'X-CSRFToken': csrfToken
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ errors: [`Error ${response.status}: ${response.statusText}`] }));
                        throw new Error(JSON.stringify(errorData));
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        mostrarExitoValidacion(data.message, '¡Gasto Creado!');
                        closeModal(modalCreate);
                        isSubmittingCreate = false;
                        createAbortController = null;
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al crear el gasto'], 'Error al Crear Gasto');
                        isSubmittingCreate = false;
                        createAbortController = null;
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return;
                    }
                    
                    console.error('Error:', error);
                    try {
                        const errorObj = JSON.parse(error.message);
                        mostrarErroresValidacion(errorObj.errors || ['Error al crear el gasto'], 'Error al Crear Gasto');
                    } catch {
                        mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                    }
                    isSubmittingCreate = false;
                    createAbortController = null;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }
        
        // Envío del formulario de edición
        if (formEdit && !formEdit.dataset.listenerAttached) {
            formEdit.dataset.listenerAttached = 'true';
            
            formEdit.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                if (isSubmittingEdit) {
                    return;
                }
                
                isSubmittingEdit = true;
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Guardando...';
                }
                
                const gastoId = document.getElementById('editGastoId').value;
                const formData = new FormData(this);
                
                // Agregar el valor del checkbox de eliminar comprobante si existe
                const eliminarCheckbox = document.getElementById('editGastoEliminarComprobante');
                if (eliminarCheckbox && eliminarCheckbox.checked) {
                    formData.set('eliminar_comprobante', 'true');
                }
                
                const endpoint = `${gastosBase}${gastoId}/update/`;
                
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
                        const errorData = await response.json().catch(() => ({ errors: [`Error ${response.status}: ${response.statusText}`] }));
                        throw new Error(JSON.stringify(errorData));
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        mostrarExitoValidacion(data.message, '¡Gasto Actualizado!');
                        closeModal(modalEdit);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al actualizar el gasto'], 'Error al Actualizar Gasto');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al actualizar el gasto'], 'Error al Actualizar Gasto');
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
        
        // Botones de editar gasto
        editClickHandler = async function(e) {
            if (e.target.matches('[data-edit-gasto]')) {
                e.stopPropagation();
                const gastoId = e.target.dataset.editGasto;
                
                try {
                    const response = await fetch(`${gastosBase}${gastoId}/json/`);
                    const gasto = await response.json();
                    
                    if (response.ok) {
                        populateEditForm(gasto);
                        openModal(modalEdit);
                    } else {
                        mostrarErroresValidacion([gasto.error || 'Error al cargar el gasto'], 'Error al Cargar Gasto');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                }
            }
        };
        document.addEventListener('click', editClickHandler);
        
        // Botones de eliminar gasto
        deleteClickHandler = async function(e) {
            if (e.target.matches('[data-delete-gasto]')) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                if (isDeleting) {
                    return;
                }
                
                if (deleteAbortController) {
                    deleteAbortController.abort();
                }
                deleteAbortController = new AbortController();
                
                const gastoId = e.target.dataset.deleteGasto;
                const gastoRow = e.target.closest('tr');
                const gastoDescripcion = gastoRow?.querySelector('td:nth-child(4)')?.textContent || 'este gasto';
                
                if (e.target.disabled || e.target.dataset.processing === 'true') {
                    return;
                }
                
                const confirmado = await mostrarConfirmacionEliminar(
                    `¿Estás seguro de que quieres eliminar el gasto "${gastoDescripcion}"?`,
                    'Confirmar Eliminación'
                );
                
                if (confirmado) {
                    isDeleting = true;
                    const deleteBtn = e.target;
                    deleteBtn.dataset.processing = 'true';
                    const originalText = deleteBtn.textContent;
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = 'Eliminando...';
                    
                    try {
                        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                        if (!csrfToken) {
                            throw new Error('Token CSRF no encontrado');
                        }
                        
                        const response = await fetch(`${gastosBase}${gastoId}/delete/`, {
                            method: 'POST',
                            signal: deleteAbortController.signal,
                            headers: {
                                'X-CSRFToken': csrfToken
                            }
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: `Error ${response.status}: ${response.statusText}` }));
                            throw new Error(errorData.error || `Error ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            mostrarExitoValidacion(data.message, '¡Gasto Eliminado!');
                            if (gastoRow) {
                                gastoRow.remove();
                            }
                            isDeleting = false;
                            deleteAbortController = null;
                        } else {
                            mostrarErroresValidacion(data.errors || [data.error || 'Error al eliminar el gasto'], 'Error al Eliminar Gasto');
                            isDeleting = false;
                            deleteAbortController = null;
                            deleteBtn.disabled = false;
                            deleteBtn.dataset.processing = 'false';
                            deleteBtn.textContent = originalText;
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            return;
                        }
                        
                        console.error('Error:', error);
                        mostrarErroresValidacion([error.message || 'Error de conexión'], 'Error de Conexión');
                        isDeleting = false;
                        deleteAbortController = null;
                        deleteBtn.disabled = false;
                        deleteBtn.dataset.processing = 'false';
                        deleteBtn.textContent = originalText;
                    }
                }
            }
        };
        document.addEventListener('click', deleteClickHandler);
    
        // Cerrar modal al hacer clic en el backdrop
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', function() {
                const modal = this.previousElementSibling;
                closeModal(modal);
            });
        });
        
        // Cerrar modal con tecla Escape
        escapeKeyHandler = function(e) {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[aria-hidden="false"]');
                if (openModal) {
                    closeModal(openModal);
                }
            }
        };
        document.addEventListener('keydown', escapeKeyHandler);
        
        // Funcionalidad para agregar vehículo rápido
        const modalVehiculoRapido = document.getElementById('modalCreateVehiculoRapido');
        const formVehiculoRapido = document.getElementById('formCreateVehiculoRapido');
        const btnAddVehiculoCreate = document.getElementById('btnAddVehiculoCreate');
        const btnAddVehiculoEdit = document.getElementById('btnAddVehiculoEdit');
        const selectCreateVehiculo = document.getElementById('createGastoVehiculo');
        const selectEditVehiculo = document.getElementById('editGastoVehiculo');
        let selectVehiculoActual = null; // Para saber qué select actualizar
        
        function abrirModalVehiculo(selectTarget) {
            if (!modalVehiculoRapido) {
                console.error('Modal de vehículo no encontrado');
                return;
            }
            selectVehiculoActual = selectTarget;
            if (formVehiculoRapido) {
                formVehiculoRapido.reset();
            }
            openModal(modalVehiculoRapido);
        }
        
        if (btnAddVehiculoCreate) {
            btnAddVehiculoCreate.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botón agregar vehículo (crear) clickeado');
                abrirModalVehiculo(selectCreateVehiculo);
            });
        } else {
            console.warn('Botón btnAddVehiculoCreate no encontrado');
        }
        
        if (btnAddVehiculoEdit) {
            btnAddVehiculoEdit.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botón agregar vehículo (editar) clickeado');
                abrirModalVehiculo(selectEditVehiculo);
            });
        } else {
            console.warn('Botón btnAddVehiculoEdit no encontrado');
        }
        
        // Envío del formulario de vehículo rápido
        if (formVehiculoRapido && !formVehiculoRapido.dataset.listenerAttached) {
            formVehiculoRapido.dataset.listenerAttached = 'true';
            
            formVehiculoRapido.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creando...';
                }
                
                const formData = new FormData(this);
                const endpoint = this.dataset.endpoint;
                
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
                        const errorData = await response.json().catch(() => ({ errors: [`Error ${response.status}: ${response.statusText}`] }));
                        throw new Error(JSON.stringify(errorData));
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Agregar el nuevo vehículo al select
                        if (selectVehiculoActual) {
                            const option = document.createElement('option');
                            option.value = data.vehiculo_id;
                            option.textContent = `${data.patente} - ${data.marca} ${data.modelo}`;
                            option.selected = true;
                            selectVehiculoActual.appendChild(option);
                        }
                        
                        mostrarExitoValidacion(data.message || 'Vehículo creado correctamente', '¡Vehículo Creado!');
                        closeModal(modalVehiculoRapido);
                        
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al crear el vehículo'], 'Error al Crear Vehículo');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    try {
                        const errorObj = JSON.parse(error.message);
                        mostrarErroresValidacion(errorObj.errors || ['Error al crear el vehículo'], 'Error al Crear Vehículo');
                    } catch {
                        mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGastosList);
    } else {
        initGastosList();
    }
})();

