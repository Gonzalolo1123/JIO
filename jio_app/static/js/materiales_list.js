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
    
    function initMaterialesList() {
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
        
        const materialesBase = document.getElementById('materialesPage')?.dataset.materialesBase || '/panel/materiales/';
        
        const modalCreate = document.getElementById('modalCreateMaterial');
        const modalEdit = document.getElementById('modalEditMaterial');
        const formCreate = document.getElementById('formCreateMaterial');
        const formEdit = document.getElementById('formEditMaterial');
        const btnOpenCreate = document.getElementById('btnOpenCreateMaterial');
        
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
        }
        
        function populateEditForm(material) {
            document.getElementById('editMaterialId').value = material.id;
            document.getElementById('editMaterialNombre').value = material.nombre;
            document.getElementById('editMaterialCategoria').value = material.categoria;
            document.getElementById('editMaterialDescripcion').value = material.descripcion || '';
            document.getElementById('editMaterialStockActual').value = material.stock_actual;
            document.getElementById('editMaterialStockMinimo').value = material.stock_minimo;
            document.getElementById('editMaterialUnidad').value = material.unidad_medida;
            document.getElementById('editMaterialPrecio').value = material.precio_unitario;
            document.getElementById('editMaterialEstado').value = material.estado;
            document.getElementById('editMaterialUbicacion').value = material.ubicacion || '';
            document.getElementById('editMaterialProveedor').value = material.proveedor_id || '';
            document.getElementById('editMaterialFechaCompra').value = material.fecha_ultima_compra || '';
            document.getElementById('editMaterialObservaciones').value = material.observaciones || '';
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
                        mostrarExitoValidacion(data.message, '¡Material Creado!');
                        closeModal(modalCreate);
                        isSubmittingCreate = false;
                        createAbortController = null;
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al crear el material'], 'Error al Crear Material');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al crear el material'], 'Error al Crear Material');
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
                
                const materialId = document.getElementById('editMaterialId').value;
                const formData = new FormData(this);
                const endpoint = `${materialesBase}${materialId}/update/`;
                
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
                        mostrarExitoValidacion(data.message, '¡Material Actualizado!');
                        closeModal(modalEdit);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al actualizar el material'], 'Error al Actualizar Material');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al actualizar el material'], 'Error al Actualizar Material');
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
        
        // Botones de editar material
        editClickHandler = async function(e) {
            if (e.target.matches('[data-edit-material]')) {
                e.stopPropagation();
                const materialId = e.target.dataset.editMaterial;
                
                try {
                    const response = await fetch(`${materialesBase}${materialId}/json/`);
                    const material = await response.json();
                    
                    if (response.ok) {
                        populateEditForm(material);
                        openModal(modalEdit);
                    } else {
                        mostrarErroresValidacion([material.error || 'Error al cargar el material'], 'Error al Cargar Material');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                }
            }
        };
        document.addEventListener('click', editClickHandler);
        
        // Botones de eliminar material
        deleteClickHandler = async function(e) {
            if (e.target.matches('[data-delete-material]')) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                if (isDeleting) {
                    return;
                }
                
                if (deleteAbortController) {
                    deleteAbortController.abort();
                }
                deleteAbortController = new AbortController();
                
                const materialId = e.target.dataset.deleteMaterial;
                const materialRow = e.target.closest('tr');
                const materialNombre = materialRow?.querySelector('td:nth-child(2) strong')?.textContent || 'este material';
                
                if (e.target.disabled || e.target.dataset.processing === 'true') {
                    return;
                }
                
                const confirmado = await mostrarConfirmacionEliminar(
                    `¿Estás seguro de que quieres eliminar el material "${materialNombre}"?`,
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
                        
                        const response = await fetch(`${materialesBase}${materialId}/delete/`, {
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
                            mostrarExitoValidacion(data.message, '¡Material Eliminado!');
                            if (materialRow) {
                                materialRow.remove();
                            }
                            isDeleting = false;
                            deleteAbortController = null;
                        } else {
                            mostrarErroresValidacion(data.errors || [data.error || 'Error al eliminar el material'], 'Error al Eliminar Material');
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
        document.addEventListener('DOMContentLoaded', initMaterialesList);
    } else {
        initMaterialesList();
    }
})();

