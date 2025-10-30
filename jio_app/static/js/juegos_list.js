document.addEventListener('DOMContentLoaded', function() {
    const juegosBase = document.getElementById('juegosPage')?.dataset.juegosBase || '/panel/juegos/';
    
    // Elementos del DOM
    const modalCreate = document.getElementById('modalCreateJuego');
    const modalEdit = document.getElementById('modalEditJuego');
    const formCreate = document.getElementById('formCreateJuego');
    const formEdit = document.getElementById('formEditJuego');
    const btnOpenCreate = document.getElementById('btnOpenCreateJuego');
    
    // Función para validar formulario de juego
    function validarFormularioJuego(form, esEdicion = false) {
        const validaciones = [];
        
        // Obtener valores de los campos
        const nombre = form.querySelector('input[name="nombre"]')?.value?.trim() || '';
        const descripcion = form.querySelector('textarea[name="descripcion"]')?.value?.trim() || '';
        const categoria = form.querySelector('select[name="categoria"]')?.value || '';
        const dimensiones = form.querySelector('input[name="dimensiones"]')?.value?.trim() || '';
        const capacidad = form.querySelector('input[name="capacidad_personas"]')?.value || '';
        const peso = form.querySelector('input[name="peso_maximo"]')?.value || '';
        const precio = form.querySelector('input[name="precio_base"]')?.value || '';
        const estado = form.querySelector('select[name="estado"]')?.value || '';
        
        // Validaciones
        validaciones.push(() => validarNombre(nombre, 'nombre del juego', 2, 100, true));
        
        // Descripción es opcional, pero si se proporciona debe ser válida
        if (descripcion) {
            validaciones.push(() => {
                const errores = [];
                if (descripcion.length > 1000) {
                    errores.push('La descripción no puede exceder los 1000 caracteres');
                }
                if (!/^[A-Za-zÑñÁÉÍÓÚáéíóú0-9\s\-.,()&]+$/.test(descripcion)) {
                    errores.push('La descripción contiene caracteres no permitidos');
                }
                return errores;
            });
        }
        
        validaciones.push(() => validarSeleccion(categoria, 'categoría'));
        
        validaciones.push(() => {
            const errores = [];
            if (!dimensiones) {
                errores.push('Las dimensiones son obligatorias');
            } else if (dimensiones.length > 50) {
                errores.push('Las dimensiones no pueden exceder los 50 caracteres');
            } else if (!/^[A-Za-zÑñÁÉÍÓÚáéíóú0-9\s\-.,()&xX]+$/.test(dimensiones)) {
                errores.push('Las dimensiones contienen caracteres no permitidos');
            }
            return errores;
        });
        
        validaciones.push(() => validarEnteroPositivo(capacidad, 'capacidad de personas', 1000));
        
        validaciones.push(() => validarEnteroPositivo(peso, 'peso máximo', 10000));
        
        validaciones.push(() => validarPrecioChileno(precio, 'precio base', 1, 999999999));
        
        // La validación de foto (archivo) se hace en el servidor
        // No se valida aquí porque es un archivo, no una URL
        
        validaciones.push(() => validarSeleccion(estado, 'estado'));
        
        return validarFormulario(validaciones, 'Errores en el Formulario de Juego');
    }
    
    // Funciones de utilidad
    
    function closeModal(modal) {
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    function openModal(modal) {
        modal.setAttribute('aria-hidden', 'false');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function clearForm(form) {
        form.reset();
        // Limpiar campos específicos si es necesario
        const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach(input => input.value = '');
    }
    
    function populateEditForm(juego) {
        document.getElementById('editJuegoId').value = juego.id;
        document.getElementById('editJuegoNombre').value = juego.nombre;
        document.getElementById('editJuegoDescripcion').value = juego.descripcion || '';
        document.getElementById('editJuegoCategoria').value = juego.categoria;
        document.getElementById('editJuegoDimensiones').value = juego.dimensiones;
        document.getElementById('editJuegoCapacidad').value = juego.capacidad_personas;
        document.getElementById('editJuegoPeso').value = juego.peso_maximo;
        document.getElementById('editJuegoPrecio').value = juego.precio_base;
        
        // Manejar preview de foto existente
        const previewDiv = document.getElementById('editJuegoFotoPreview');
        const eliminarContainer = document.getElementById('editJuegoEliminarFotoContainer');
        const fotoInput = document.getElementById('editJuegoFoto');
        
        // Limpiar input de archivo y checkbox
        fotoInput.value = '';
        const eliminarCheckbox = document.getElementById('editJuegoEliminarFoto');
        if (eliminarCheckbox) eliminarCheckbox.checked = false;
        
        if (juego.foto) {
            previewDiv.innerHTML = `
                <div style="position: relative; display: inline-block;">
                    <img src="${juego.foto}" alt="Imagen actual" style="max-width: 300px; max-height: 200px; border-radius: 8px; border: 2px solid #e0e0e0;">
                    <p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">Imagen actual</p>
                </div>
            `;
            if (eliminarContainer) eliminarContainer.style.display = 'block';
        } else {
            previewDiv.innerHTML = '<p style="color: #999;">Sin imagen</p>';
            if (eliminarContainer) eliminarContainer.style.display = 'none';
        }
        
        document.getElementById('editJuegoEstado').value = juego.estado;
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
            // Limpiar preview al abrir el modal
            const createPreview = document.getElementById('createJuegoFotoPreview');
            if (createPreview) createPreview.innerHTML = '';
            openModal(modalCreate);
        });
    }
    
    // Preview de imagen al seleccionar archivo en CREAR
    const createFotoInput = document.getElementById('createJuegoFoto');
    const createPreviewDiv = document.getElementById('createJuegoFotoPreview');
    
    if (createFotoInput && createPreviewDiv) {
        createFotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validar tamaño (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    mostrarErroresValidacion(['La imagen no puede exceder 5MB'], 'Imagen muy grande');
                    this.value = '';
                    createPreviewDiv.innerHTML = '';
                    return;
                }
                
                // Validar tipo
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    mostrarErroresValidacion(['Formato no válido. Use JPG, PNG, GIF o WEBP'], 'Formato inválido');
                    this.value = '';
                    createPreviewDiv.innerHTML = '';
                    return;
                }
                
                // Mostrar preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    createPreviewDiv.innerHTML = `
                        <div style="position: relative; display: inline-block;">
                            <img src="${e.target.result}" alt="Preview" style="max-width: 300px; max-height: 200px; border-radius: 8px; border: 2px solid #4CAF50;">
                            <p style="margin-top: 0.5rem; color: #4CAF50; font-size: 0.9rem;">✓ Nueva imagen seleccionada</p>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                createPreviewDiv.innerHTML = '';
            }
        });
    }
    
    // Preview de imagen al seleccionar archivo en EDITAR
    const editFotoInput = document.getElementById('editJuegoFoto');
    const editPreviewDiv = document.getElementById('editJuegoFotoPreview');
    
    if (editFotoInput && editPreviewDiv) {
        editFotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validar tamaño (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    mostrarErroresValidacion(['La imagen no puede exceder 5MB'], 'Imagen muy grande');
                    this.value = '';
                    return;
                }
                
                // Validar tipo
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    mostrarErroresValidacion(['Formato no válido. Use JPG, PNG, GIF o WEBP'], 'Formato inválido');
                    this.value = '';
                    return;
                }
                
                // Mostrar preview de la nueva imagen
                const reader = new FileReader();
                reader.onload = function(e) {
                    editPreviewDiv.innerHTML = `
                        <div style="position: relative; display: inline-block;">
                            <img src="${e.target.result}" alt="Nueva imagen" style="max-width: 300px; max-height: 200px; border-radius: 8px; border: 2px solid #4CAF50;">
                            <p style="margin-top: 0.5rem; color: #4CAF50; font-size: 0.9rem;">✓ Nueva imagen seleccionada (reemplazará la actual)</p>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
                
                // Desmarcar el checkbox de eliminar si existe
                const eliminarCheckbox = document.getElementById('editJuegoEliminarFoto');
                if (eliminarCheckbox) eliminarCheckbox.checked = false;
            }
        });
    }
    
    // Envío del formulario de creación
    if (formCreate) {
        formCreate.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validar formulario antes de enviar
            if (!validarFormularioJuego(this, false)) {
                return; // Si hay errores, no enviar
            }
            
            const formData = new FormData(this);
            const endpoint = this.dataset.endpoint;
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    mostrarExitoValidacion(data.message, '¡Juego Creado!');
                    closeModal(modalCreate);
                    // Recargar la página para ver el nuevo juego
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarErroresValidacion(data.errors || ['Error al crear el juego'], 'Error al Crear Juego');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
            }
        });
    }
    
    // Envío del formulario de edición
    if (formEdit) {
        formEdit.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validar formulario antes de enviar
            if (!validarFormularioJuego(this, true)) {
                return; // Si hay errores, no enviar
            }
            
            const juegoId = document.getElementById('editJuegoId').value;
            const formData = new FormData(this);
            
            // Agregar el valor del checkbox de eliminar foto si existe
            const eliminarCheckbox = document.getElementById('editJuegoEliminarFoto');
            if (eliminarCheckbox && eliminarCheckbox.checked) {
                formData.set('eliminar_foto', 'true');
            }
            
            const endpoint = `${juegosBase}${juegoId}/update/`;
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    mostrarExitoValidacion(data.message, '¡Juego Actualizado!');
                    closeModal(modalEdit);
                    // Recargar la página para ver los cambios
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarErroresValidacion(data.errors || ['Error al actualizar el juego'], 'Error al Actualizar Juego');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
            }
        });
    }
    
    // Botones de editar juego
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-edit-juego]')) {
            const juegoId = e.target.dataset.editJuego;
            
            try {
                const response = await fetch(`${juegosBase}${juegoId}/json/`);
                const juego = await response.json();
                
                if (response.ok) {
                    populateEditForm(juego);
                    openModal(modalEdit);
                } else {
                    mostrarErroresValidacion([juego.error || 'Error al cargar el juego'], 'Error al Cargar Juego');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
            }
        }
    });
    
    // Botones de eliminar juego
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-delete-juego]')) {
            const juegoId = e.target.dataset.deleteJuego;
            const juegoRow = e.target.closest('tr');
            const juegoNombre = juegoRow.querySelector('td:nth-child(3) strong').textContent;
            
            if (confirm(`¿Estás seguro de que quieres eliminar el juego "${juegoNombre}"?`)) {
                try {
                    const response = await fetch(`${juegosBase}${juegoId}/delete/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        mostrarExitoValidacion(data.message, '¡Juego Eliminado!');
                        // Remover la fila de la tabla
                        juegoRow.remove();
                    } else {
                        mostrarErroresValidacion(data.errors || ['Error al eliminar el juego'], 'Error al Eliminar Juego');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarErroresValidacion(['Error de conexión'], 'Error de Conexión');
                }
            }
        }
    });
    
    // Cerrar modal al hacer clic en el backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            const modal = this.previousElementSibling;
            closeModal(modal);
        });
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[aria-hidden="false"]');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
});
