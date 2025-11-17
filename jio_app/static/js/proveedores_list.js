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
    
    function initProveedoresList() {
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
        
        const proveedoresBase = document.getElementById('proveedoresPage')?.dataset.proveedoresBase || '/panel/proveedores/';
        
        const modalCreate = document.getElementById('modalCreateProveedor');
        const modalEdit = document.getElementById('modalEditProveedor');
        const formCreate = document.getElementById('formCreateProveedor');
        const formEdit = document.getElementById('formEditProveedor');
        const btnOpenCreate = document.getElementById('btnOpenCreateProveedor');
        
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
        
        function populateEditForm(proveedor) {
            document.getElementById('editProveedorId').value = proveedor.id;
            document.getElementById('editProveedorNombre').value = proveedor.nombre;
            document.getElementById('editProveedorTipo').value = proveedor.tipo_proveedor;
            document.getElementById('editProveedorRut').value = proveedor.rut || '';
            document.getElementById('editProveedorContacto').value = proveedor.contacto_nombre || '';
            document.getElementById('editProveedorTelefono').value = proveedor.telefono || '';
            document.getElementById('editProveedorEmail').value = proveedor.email || '';
            document.getElementById('editProveedorDireccion').value = proveedor.direccion || '';
            document.getElementById('editProveedorActivo').value = proveedor.activo ? 'true' : 'false';
            document.getElementById('editProveedorServicios').value = proveedor.servicios_ofrecidos || '';
            document.getElementById('editProveedorObservaciones').value = proveedor.observaciones || '';
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
                        mostrarExitoValidacion(data.message, '¡Proveedor Creado!');
                        closeModal(modalCreate);
                        isSubmittingCreate = false;
                        createAbortController = null;
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al crear el proveedor'], 'Error al Crear Proveedor');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al crear el proveedor'], 'Error al Crear Proveedor');
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
                
                const proveedorId = document.getElementById('editProveedorId').value;
                const formData = new FormData(this);
                const endpoint = `${proveedoresBase}${proveedorId}/update/`;
                
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
                        mostrarExitoValidacion(data.message, '¡Proveedor Actualizado!');
                        closeModal(modalEdit);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al actualizar el proveedor'], 'Error al Actualizar Proveedor');
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
                        mostrarErroresValidacion(errorObj.errors || ['Error al actualizar el proveedor'], 'Error al Actualizar Proveedor');
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
        
        // Botones de editar proveedor
        editClickHandler = async function(e) {
            if (e.target.matches('[data-edit-proveedor]')) {
                e.stopPropagation();
                const proveedorId = e.target.dataset.editProveedor;
                
                try {
                    const response = await fetch(`${proveedoresBase}${proveedorId}/json/`);
                    const proveedor = await response.json();
                    
                    if (response.ok) {
                        populateEditForm(proveedor);
                        openModal(modalEdit);
                    } else {
                        mostrarErroresValidacion([proveedor.error || 'Error al cargar el proveedor'], 'Error al Cargar Proveedor');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                }
            }
        };
        document.addEventListener('click', editClickHandler);
        
        // Botones de eliminar proveedor
        deleteClickHandler = async function(e) {
            if (e.target.matches('[data-delete-proveedor]')) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                if (isDeleting) {
                    return;
                }
                
                if (deleteAbortController) {
                    deleteAbortController.abort();
                }
                deleteAbortController = new AbortController();
                
                const proveedorId = e.target.dataset.deleteProveedor;
                const proveedorRow = e.target.closest('tr');
                const proveedorNombre = proveedorRow?.querySelector('td:nth-child(2) strong')?.textContent || 'este proveedor';
                
                if (e.target.disabled || e.target.dataset.processing === 'true') {
                    return;
                }
                
                const confirmado = await mostrarConfirmacionEliminar(
                    `¿Estás seguro de que quieres eliminar el proveedor "${proveedorNombre}"?`,
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
                        
                        const response = await fetch(`${proveedoresBase}${proveedorId}/delete/`, {
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
                            mostrarExitoValidacion(data.message, '¡Proveedor Eliminado!');
                            if (proveedorRow) {
                                proveedorRow.remove();
                            }
                            isDeleting = false;
                            deleteAbortController = null;
                        } else {
                            mostrarErroresValidacion(data.errors || [data.error || 'Error al eliminar el proveedor'], 'Error al Eliminar Proveedor');
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
        document.addEventListener('DOMContentLoaded', initProveedoresList);
    } else {
        initProveedoresList();
    }
})();

