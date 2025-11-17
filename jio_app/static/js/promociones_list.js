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
    
    function initPromocionesList() {
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
        
        const promocionesBase = document.getElementById('promocionesPage')?.dataset.promocionesBase || '/panel/promociones/';
        
        const modalCreate = document.getElementById('modalCreatePromocion');
        const modalEdit = document.getElementById('modalEditPromocion');
        const formCreate = document.getElementById('formCreatePromocion');
        const formEdit = document.getElementById('formEditPromocion');
        const btnOpenCreate = document.getElementById('btnOpenCreatePromocion');
        
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
            // Desmarcar todos los checkboxes de juegos
            form.querySelectorAll('input[name="juegos_ids"]').forEach(cb => cb.checked = false);
        }
        
        function populateEditForm(promocion) {
            document.getElementById('editPromocionId').value = promocion.id;
            document.getElementById('editPromocionCodigo').value = promocion.codigo;
            document.getElementById('editPromocionNombre').value = promocion.nombre;
            document.getElementById('editPromocionDescripcion').value = promocion.descripcion || '';
            document.getElementById('editPromocionTipoDescuento').value = promocion.tipo_descuento;
            document.getElementById('editPromocionValorDescuento').value = promocion.valor_descuento;
            document.getElementById('editPromocionFechaInicio').value = promocion.fecha_inicio;
            document.getElementById('editPromocionFechaFin').value = promocion.fecha_fin;
            document.getElementById('editPromocionMontoMinimo').value = promocion.monto_minimo;
            document.getElementById('editPromocionLimiteUsos').value = promocion.limite_usos;
            document.getElementById('editPromocionEstado').value = promocion.estado;
            
            // Actualizar ayuda del valor según tipo
            updateValorHelp('edit', promocion.tipo_descuento);
            
            // Marcar juegos seleccionados
            const checkboxes = document.querySelectorAll('#editPromocionJuegosContainer input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = promocion.juegos_ids.includes(parseInt(cb.value));
            });
        }
        
        // Actualizar ayuda del valor según tipo de descuento
        function updateValorHelp(tipo, tipoDescuento) {
            const helpElement = document.getElementById(`${tipo}PromocionValorHelp`);
            if (!helpElement) return;
            
            if (tipoDescuento === 'porcentaje') {
                helpElement.textContent = 'Porcentaje (0-100%)';
            } else if (tipoDescuento === 'monto_fijo') {
                helpElement.textContent = 'Monto fijo en pesos ($)';
            } else if (tipoDescuento === '2x1') {
                helpElement.textContent = 'No aplica (descuento automático)';
            } else if (tipoDescuento === 'envio_gratis') {
                helpElement.textContent = 'No aplica (descuento automático)';
            } else {
                helpElement.textContent = 'Porcentaje o monto según tipo';
            }
        }
        
        // Event listeners para cambio de tipo de descuento
        const createTipoSelect = document.getElementById('createPromocionTipoDescuento');
        if (createTipoSelect) {
            createTipoSelect.addEventListener('change', function() {
                updateValorHelp('create', this.value);
            });
        }
        
        const editTipoSelect = document.getElementById('editPromocionTipoDescuento');
        if (editTipoSelect) {
            editTipoSelect.addEventListener('change', function() {
                updateValorHelp('edit', this.value);
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
                
                // Agregar juegos seleccionados como array
                const juegosSeleccionados = Array.from(this.querySelectorAll('input[name="juegos_ids"]:checked')).map(cb => cb.value);
                juegosSeleccionados.forEach(juegoId => {
                    formData.append('juegos_ids[]', juegoId);
                });
                
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
                        mostrarExitoValidacion(data.message, '¡Promoción Creada!');
                        closeModal(modalCreate);
                        isSubmittingCreate = false;
                        createAbortController = null;
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al crear la promoción'], 'Error al Crear Promoción');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al crear la promoción'], 'Error al Crear Promoción');
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
                
                const promocionId = document.getElementById('editPromocionId').value;
                const formData = new FormData(this);
                
                // Agregar juegos seleccionados como array
                const juegosSeleccionados = Array.from(this.querySelectorAll('#editPromocionJuegosContainer input[type="checkbox"]:checked')).map(cb => cb.value);
                if (juegosSeleccionados.length > 0) {
                    juegosSeleccionados.forEach(juegoId => {
                        formData.append('juegos_ids[]', juegoId);
                    });
                } else {
                    // Si no hay juegos seleccionados, enviar array vacío para limpiar
                    formData.append('juegos_ids[]', '');
                }
                
                const endpoint = `${promocionesBase}${promocionId}/update/`;
                
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
                        mostrarExitoValidacion(data.message, '¡Promoción Actualizada!');
                        closeModal(modalEdit);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al actualizar la promoción'], 'Error al Actualizar Promoción');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al actualizar la promoción'], 'Error al Actualizar Promoción');
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
        
        // Botones de editar promoción
        editClickHandler = async function(e) {
            if (e.target.matches('[data-edit-promocion]')) {
                e.stopPropagation();
                const promocionId = e.target.dataset.editPromocion;
                
                try {
                    const response = await fetch(`${promocionesBase}${promocionId}/json/`);
                    const promocion = await response.json();
                    
                    if (response.ok) {
                        populateEditForm(promocion);
                        openModal(modalEdit);
                    } else {
                        mostrarErroresValidacion([promocion.error || 'Error al cargar la promoción'], 'Error al Cargar Promoción');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                }
            }
        };
        document.addEventListener('click', editClickHandler);
        
        // Botones de eliminar promoción
        deleteClickHandler = async function(e) {
            if (e.target.matches('[data-delete-promocion]')) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                if (isDeleting) {
                    return;
                }
                
                if (deleteAbortController) {
                    deleteAbortController.abort();
                }
                deleteAbortController = new AbortController();
                
                const promocionId = e.target.dataset.deletePromocion;
                const promocionRow = e.target.closest('tr');
                const promocionCodigo = promocionRow?.querySelector('td:nth-child(2) strong')?.textContent || 'esta promoción';
                
                if (e.target.disabled || e.target.dataset.processing === 'true') {
                    return;
                }
                
                const confirmado = await mostrarConfirmacionEliminar(
                    `¿Estás seguro de que quieres eliminar la promoción "${promocionCodigo}"?`,
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
                        
                        const response = await fetch(`${promocionesBase}${promocionId}/delete/`, {
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
                            mostrarExitoValidacion(data.message, '¡Promoción Eliminada!');
                            if (promocionRow) {
                                promocionRow.remove();
                            }
                            isDeleting = false;
                            deleteAbortController = null;
                        } else {
                            mostrarErroresValidacion(data.errors || [data.error || 'Error al eliminar la promoción'], 'Error al Eliminar Promoción');
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
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPromocionesList);
    } else {
        initPromocionesList();
    }
})();

