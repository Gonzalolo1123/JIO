document.addEventListener('DOMContentLoaded', function() {
    inicializarModales();
    inicializarEventListeners();
    inicializarModalesClienteMembresia();
    inicializarEventListenersClienteMembresia();
    inicializarSelectorImagenesMembresia();
});

// Funciones para manejar modales
function inicializarModales() {
    // Botón para abrir modal de creación
    const btnAbrirForm = document.getElementById('abrir-form-membresia');
    if (btnAbrirForm) {
        btnAbrirForm.addEventListener('click', function() {
            const estado = this.getAttribute('data-estado');
            if (estado === 'cerrado') {
                abrirModal('membresia', this);
            } else {
                cerrarModal('membresia', this);
            }
        });
    }

    // Event listeners para cerrar modales con click en fondo
    document.querySelectorAll('.modal-fondo').forEach(modalFondo => {
        modalFondo.addEventListener('click', function(event) {
            if (event.target === modalFondo) {
                const id_parts = modalFondo.id.split('-');
                if (id_parts.length > 2) {
                    const id_tipo = id_parts[2];
                    const id = id_parts[id_parts.length - 1];
                    cerrarModalEdicion(id_tipo, id);
                } else {
                    // Determinar qué tipo de modal cerrar basado en el ID
                    if (modalFondo.id === 'modal-fondo-membresia') {
                        cerrarModal('membresia');
                    } else if (modalFondo.id === 'modal-fondo-cliente-membresia') {
                        cerrarModal('cliente-membresia');
                    }
                }
            }
        });
    });
}

function inicializarEventListeners() {
    // Event listeners para botones de editar
    document.querySelectorAll('[name="btn-editar-membresia"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            abrirModalEdicion('membresia', id);
        });
    });

    // Event listeners para botones de eliminar
    document.querySelectorAll('[name="btn-eliminar-membresia"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (confirm('¿Estás seguro de que deseas eliminar esta membresía?')) {
                eliminarMembresia(id);
            }
        });
    });

    // Event listener para formulario de creación
    const formCrear = document.getElementById('form-crear-membresia');
    if (formCrear) {
        formCrear.addEventListener('submit', function(e) {
            e.preventDefault();
            crearMembresia(this);
        });
    }

    // Event listeners para formularios de edición
    document.querySelectorAll('[name="form-editar-membresia"]').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            actualizarMembresia(id, this);
        });
    });
}

// Funciones para abrir/cerrar modales
function abrirModal(tipo, botonAbrir) {
    const modalFondo = document.getElementById(`modal-fondo-${tipo}`);
    if (modalFondo) {
        modalFondo.style.display = 'flex';
        botonAbrir.setAttribute('data-estado', 'abierto');
        botonAbrir.textContent = '-';
        
        // Si es el modal de cliente-membresia, inicializar la duración personalizada
        if (tipo === 'cliente-membresia') {
            setTimeout(() => {
                const selectMembresia = document.getElementById('cliente-membresia-membresia');
                if (selectMembresia) {
                    mostrarOcultarDuracionPersonalizada(selectMembresia.value, 'duracion-personalizada-container');
                }
            }, 100);
        }
    }
}

function cerrarModal(tipo, botonAbrir = null) {
    const modalFondo = document.getElementById(`modal-fondo-${tipo}`);
    if (modalFondo) {
        modalFondo.style.display = 'none';
        if (botonAbrir) {
            botonAbrir.setAttribute('data-estado', 'cerrado');
            botonAbrir.textContent = '+';
        }
    }
}

function abrirModalEdicion(tipo, id) {
    const modalFondo = document.getElementById(`modal-fondo-editar-${tipo}-${id}`);
    if (modalFondo) {
        modalFondo.style.display = 'flex';
        
        // Si es el modal de edición de cliente-membresia, inicializar la duración personalizada
        if (tipo === 'cliente-membresia') {
            setTimeout(() => {
                const selectMembresia = document.getElementById(`cliente-membresia-membresia-editar-${id}`);
                if (selectMembresia) {
                    mostrarOcultarDuracionPersonalizada(selectMembresia.value, `duracion-personalizada-container-editar-${id}`);
                }
            }, 100);
        }
    }
}

function cerrarModalEdicion(tipo, id) {
    const modalFondo = document.getElementById(`modal-fondo-editar-${tipo}-${id}`);
    if (modalFondo) {
        modalFondo.style.display = 'none';
    }
}

// Funciones CRUD
async function crearMembresia(form) {
    try {
        const formData = new FormData(form);
        const data = {
            nombre: formData.get('membresia-nombre'),
            descripcion: formData.get('membresia-descripcion'),
            precio: formData.get('membresia-precio'),
            duracion: formData.get('membresia-duracion'),
            dias_por_semana: formData.get('membresia-dias-por-semana'),
            establecimiento_id: formData.get('membresia-establecimiento') || 1,
            imagen: formData.get('membresia-imagen')
        };
        let errores = [];
        errores = errores.concat(validarNombre(data.nombre, 'nombre', 3, 30));
        errores = errores.concat(validarDescripcion(data.descripcion, 'descripción', 5, 50));
        errores = errores.concat(validarPrecioChileno(data.precio, 'precio'));
        if (!data.duracion) {
            errores.push('La duración es obligatoria.');
        }
        errores = errores.concat(validarNumeroEntero(data.dias_por_semana, 'días por semana', 1, 7));
        if (!data.imagen) {
            errores.push('La imagen es obligatoria.');
        }
        if (errores.length > 0) {
            mostrarErroresValidacion(errores, 'Errores en el formulario de membresía');
            return;
        }

        const response = await fetch('/membresias/crear_membresia/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            mostrarErroresValidacion([errorData.error || 'Error al crear la membresía'], 'Error');
            return;
        }
        
        const result = await response.json();
        if (result.error) {
            mostrarErroresValidacion([result.error], 'Error');
            return;
        }
        
        mostrarExitoValidacion('Membresía creada exitosamente', '¡Éxito!');
        cerrarModal('membresia');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear la membresía: ' + error.message);
    }
}

async function actualizarMembresia(id, form) {
    try {
        const formData = new FormData(form);
        const data = {
            nombre: formData.get(`membresia-nombre-editar-${id}`),
            descripcion: formData.get(`membresia-descripcion-editar-${id}`),
            precio: formData.get(`membresia-precio-editar-${id}`),
            duracion: formData.get(`membresia-duracion-editar-${id}`),
            dias_por_semana: formData.get(`membresia-dias-por-semana-editar-${id}`),
            establecimiento_id: formData.get(`membresia-establecimiento-editar-${id}`) || 1,
            imagen: formData.get(`membresia-imagen-editar-${id}`)
        };
        let errores = [];
        errores = errores.concat(validarNombre(data.nombre, 'nombre', 3, 30));
        errores = errores.concat(validarDescripcion(data.descripcion, 'descripción', 5, 50));
        errores = errores.concat(validarPrecioChileno(data.precio, 'precio'));
        if (!data.duracion) {
            errores.push('La duración es obligatoria.');
        }
        errores = errores.concat(validarNumeroEntero(data.dias_por_semana, 'días por semana', 1, 7));
        if (!data.imagen) {
            errores.push('La imagen es obligatoria.');
        }
        if (errores.length > 0) {
            mostrarErroresValidacion(errores, 'Errores en el formulario de membresía');
            return;
        }

        const response = await fetch(`/membresias/actualizar_membresia/${id}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            mostrarErroresValidacion([errorData.error || 'Error al actualizar la membresía'], 'Error');
            return;
        }
        
        const result = await response.json();
        if (result.error) {
            mostrarErroresValidacion([result.error], 'Error');
            return;
        }
        
        mostrarExitoValidacion('Membresía actualizada exitosamente', '¡Éxito!');
        cerrarModalEdicion('membresia', id);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la membresía: ' + error.message);
    }
}

async function eliminarMembresia(id) {
    try {
        const response = await fetch(`/membresias/borrar_membresia/${id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        if (!response.ok) throw new Error('Error al eliminar la membresía');
        mostrarExitoValidacion('Membresía eliminada exitosamente', '¡Éxito!');
        // window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        mostrarErroresValidacion([error.message], 'Error al eliminar la membresía');
    }
}

// Función auxiliar para obtener el token CSRF
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

// Funciones para ClienteMembresia
function inicializarModalesClienteMembresia() {
    console.log('Inicializando modales de ClienteMembresia...');
    // Botón para abrir modal de creación de cliente membresía
    const btnAbrirFormClienteMembresia = document.getElementById('abrir-form-cliente-membresia');
    console.log('Botón abrir ClienteMembresia:', btnAbrirFormClienteMembresia);
    if (btnAbrirFormClienteMembresia) {
        btnAbrirFormClienteMembresia.addEventListener('click', function() {
            console.log('Botón ClienteMembresia clickeado');
            const estado = this.getAttribute('data-estado');
            if (estado === 'cerrado') {
                abrirModal('cliente-membresia', this);
            } else {
                cerrarModal('cliente-membresia', this);
            }
        });
    }
}

function inicializarEventListenersClienteMembresia() {
    console.log('Inicializando event listeners de ClienteMembresia...');
    // Event listeners para botones de editar cliente membresía
    const botonesEditar = document.querySelectorAll('[name="btn-editar-cliente-membresia"]');
    console.log('Botones editar ClienteMembresia encontrados:', botonesEditar.length);
    botonesEditar.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Botón editar ClienteMembresia clickeado');
            const id = this.getAttribute('data-id');
            abrirModalEdicion('cliente-membresia', id);
        });
    });

    // Event listeners para botones de eliminar cliente membresía
    const botonesEliminar = document.querySelectorAll('[name="btn-eliminar-cliente-membresia"]');
    console.log('Botones eliminar ClienteMembresia encontrados:', botonesEliminar.length);
    botonesEliminar.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Botón eliminar ClienteMembresia clickeado');
            const id = this.getAttribute('data-id');
            if (confirm('¿Estás seguro de que deseas eliminar esta membresía de cliente?')) {
                eliminarClienteMembresia(id);
            }
        });
    });

    // Event listener para formulario de creación de cliente membresía
    const formCrearClienteMembresia = document.getElementById('form-crear-cliente-membresia');
    console.log('Formulario crear ClienteMembresia:', formCrearClienteMembresia);
    if (formCrearClienteMembresia) {
        formCrearClienteMembresia.addEventListener('submit', function(e) {
            console.log('Formulario ClienteMembresia enviado');
            e.preventDefault();
            crearClienteMembresia(this);
        });
    }

    // Event listeners para formularios de edición de cliente membresía
    const formulariosEditar = document.querySelectorAll('[name="form-editar-cliente-membresia"]');
    console.log('Formularios editar ClienteMembresia encontrados:', formulariosEditar.length);
    formulariosEditar.forEach(form => {
        form.addEventListener('submit', function(e) {
            console.log('Formulario editar ClienteMembresia enviado');
            e.preventDefault();
            const id = this.getAttribute('data-id');
            actualizarClienteMembresia(id, this);
        });
    });

    // Event listeners para mostrar/ocultar campo de duración personalizada
    inicializarEventListenersDuracionPersonalizada();
}

// Funciones para manejar duración personalizada
function inicializarEventListenersDuracionPersonalizada() {
    console.log('Inicializando event listeners de duración personalizada...');
    
    // Para el formulario de creación
    const selectMembresia = document.getElementById('cliente-membresia-membresia');
    if (selectMembresia) {
        console.log('Event listener agregado para formulario de creación');
        selectMembresia.addEventListener('change', function() {
            console.log('Membresía seleccionada en creación:', this.value);
            mostrarOcultarDuracionPersonalizada(this.value, 'duracion-personalizada-container');
        });
    }

    // Para los formularios de edición
    document.querySelectorAll('[id^="cliente-membresia-membresia-editar-"]').forEach(select => {
        select.addEventListener('change', function() {
            const id = this.id.split('-').pop();
            console.log('Membresía seleccionada en edición:', this.value, 'para ID:', id);
            mostrarOcultarDuracionPersonalizada(this.value, `duracion-personalizada-container-editar-${id}`);
        });
    });
}

function mostrarOcultarDuracionPersonalizada(membresiaId, containerId) {
    console.log('Verificando duración personalizada para membresía ID:', membresiaId, 'container:', containerId);
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('Container no encontrado:', containerId);
        return;
    }

    // Buscar la membresía seleccionada en los datos
    const membresia = window.membresiasData.find(m => m.id == membresiaId);
    console.log('Membresía encontrada:', membresia);
    
    if (membresia && membresia.duracion === 'personalizada') {
        console.log('Mostrando campo de duración personalizada');
        container.style.display = 'block';
    } else {
        console.log('Ocultando campo de duración personalizada');
        container.style.display = 'none';
    }
}

// Funciones CRUD para ClienteMembresia
async function crearClienteMembresia(form) {
    console.log('Iniciando creación de ClienteMembresia...');
    try {
        const formData = new FormData(form);
        const data = {
            usuario_id: formData.get('cliente-membresia-usuario'),
            membresia_id: formData.get('cliente-membresia-membresia'),
            fecha_inicio: formData.get('cliente-membresia-fecha-inicio'),
            fecha_fin: formData.get('cliente-membresia-fecha-fin'),
            estado: formData.get('cliente-membresia-estado') === 'True',
            codigo_qr: formData.get('cliente-membresia-codigo-qr')
        };

        // Agregar días personalizados si la membresía es personalizada
        const membresia = window.membresiasData.find(m => m.id == data.membresia_id);
        if (membresia && membresia.duracion === 'personalizada') {
            const diasPersonalizados = formData.get('cliente-membresia-dias-personalizados');
            if (diasPersonalizados) {
                data.dias_personalizados = diasPersonalizados;
            } else {
                // Si es personalizada pero no se proporcionaron días, usar valor por defecto
                data.dias_personalizados = 30;
            }
        }
        let errores = [];
        errores = errores.concat(validarNumeroEntero(data.usuario_id, 'usuario', 1, 999999));
        errores = errores.concat(validarNumeroEntero(data.membresia_id, 'membresía', 1, 999999));
        errores = errores.concat(validarFecha(data.fecha_inicio, 'fecha de inicio', true, false, true));
        
        // Validar días personalizados si la membresía es personalizada
        if (membresia && membresia.duracion === 'personalizada') {
            const diasPersonalizados = data.dias_personalizados;
            if (!diasPersonalizados || diasPersonalizados < 1 || diasPersonalizados > 365) {
                errores.push('La duración personalizada debe estar entre 1 y 365 días.');
            }
        }
        if (errores.length > 0) {
            mostrarErroresValidacion(errores, 'Errores en el formulario de cliente-membresía');
            return;
        }
        
        console.log('Datos a enviar:', data);

        const response = await fetch('/membresias/crear_cliente_membresia/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });

        console.log('Respuesta del servidor:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            mostrarErroresValidacion([errorData.error || 'Error al crear la membresía de cliente'], 'Error');
            return;
        }
        
        const result = await response.json();
        if (result.error) {
            mostrarErroresValidacion([result.error], 'Error');
            return;
        }
        
        console.log('ClienteMembresia creada exitosamente:', result);
        mostrarExitoValidacion('Membresía de cliente creada exitosamente', '¡Éxito!');
        cerrarModal('cliente-membresia');
    } catch (error) {
        console.error('Error al crear ClienteMembresia:', error);
        alert('Error al crear la membresía de cliente: ' + error.message);
    }
}

async function actualizarClienteMembresia(id, form) {
    try {
        const formData = new FormData(form);
        const data = {
            usuario_id: formData.get(`cliente-membresia-usuario-editar-${id}`),
            membresia_id: formData.get(`cliente-membresia-membresia-editar-${id}`),
            fecha_inicio: formData.get(`cliente-membresia-fecha-inicio-editar-${id}`),
            fecha_fin: formData.get(`cliente-membresia-fecha-fin-editar-${id}`),
            estado: formData.get(`cliente-membresia-estado-editar-${id}`) === 'True',
            codigo_qr: formData.get(`cliente-membresia-codigo-qr-editar-${id}`)
        };

        // Agregar días personalizados si la membresía es personalizada
        const membresia = window.membresiasData.find(m => m.id == data.membresia_id);
        if (membresia && membresia.duracion === 'personalizada') {
            const diasPersonalizados = formData.get(`cliente-membresia-dias-personalizados-editar-${id}`);
            if (diasPersonalizados) {
                data.dias_personalizados = diasPersonalizados;
            } else {
                // Si es personalizada pero no se proporcionaron días, usar valor por defecto
                data.dias_personalizados = 30;
            }
        }
        let errores = [];
        errores = errores.concat(validarNumeroEntero(data.usuario_id, 'usuario', 1, 999999));
        errores = errores.concat(validarNumeroEntero(data.membresia_id, 'membresía', 1, 999999));
        errores = errores.concat(validarFecha(data.fecha_inicio, 'fecha de inicio', true, false, true));
        
        // Validar días personalizados si la membresía es personalizada
        if (membresia && membresia.duracion === 'personalizada') {
            const diasPersonalizados = data.dias_personalizados;
            if (!diasPersonalizados || diasPersonalizados < 1 || diasPersonalizados > 365) {
                errores.push('La duración personalizada debe estar entre 1 y 365 días.');
            }
        }
        if (errores.length > 0) {
            mostrarErroresValidacion(errores, 'Errores en la edición de cliente-membresía');
            return;
        }

        const response = await fetch(`/membresias/actualizar_cliente_membresia/${id}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            mostrarErroresValidacion([errorData.error || 'Error al actualizar la membresía de cliente'], 'Error');
            return;
        }
        
        const result = await response.json();
        if (result.error) {
            mostrarErroresValidacion([result.error], 'Error');
            return;
        }
        
        mostrarExitoValidacion('Membresía de cliente actualizada exitosamente', '¡Éxito!');
        cerrarModalEdicion('cliente-membresia', id);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la membresía de cliente: ' + error.message);
    }
}

async function eliminarClienteMembresia(id) {
    try {
        const response = await fetch(`/membresias/borrar_cliente_membresia/${id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        if (!response.ok) throw new Error('Error al eliminar la membresía de cliente');
        mostrarExitoValidacion('Membresía de cliente eliminada exitosamente', '¡Éxito!');
        // window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        mostrarErroresValidacion([error.message], 'Error al eliminar la membresía de cliente');
    }
}

// === IMÁGENES DE MEMBRESÍA ===
function inicializarSelectorImagenesMembresia() {
    // Crear
    const btnSeleccionarImagen = document.getElementById('btn-seleccionar-imagen');
    const inputImagen = document.getElementById('membresia-imagen');
    const vistaPrevia = document.getElementById('vista-previa-imagen');
    if (btnSeleccionarImagen) {
        btnSeleccionarImagen.addEventListener('click', function() {
            abrirModalImagenesMembresia(inputImagen, vistaPrevia);
        });
    }
    // Editar (varios)
    document.querySelectorAll('[id^="btn-seleccionar-imagen-editar-"]').forEach(btn => {
        const id = btn.id.replace('btn-seleccionar-imagen-editar-', '');
        const input = document.getElementById(`membresia-imagen-editar-${id}`);
        const vista = document.getElementById(`vista-previa-imagen-editar-${id}`);
        btn.addEventListener('click', function() {
            abrirModalImagenesMembresia(input, vista);
        });
    });
    // Cerrar modal
    document.querySelectorAll('.cerrar-modal-imagenes').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('modal-imagenes-membresia').style.display = 'none';
        });
    });
}

function abrirModalImagenesMembresia(inputImagen, vistaPrevia) {
    const modal = document.getElementById('modal-imagenes-membresia');
    modal.style.display = 'flex';
    cargarImagenesDisponiblesMembresia(inputImagen, vistaPrevia);
    // Subir nueva imagen
    document.getElementById('btn-subir-imagen-membresia').onclick = function() {
        document.getElementById('input-subir-imagen-membresia').click();
    };
    document.getElementById('input-subir-imagen-membresia').onchange = function(e) {
        const file = e.target.files[0];
        if (file) subirImagenMembresia(file, inputImagen, vistaPrevia);
    };
}

function cargarImagenesDisponiblesMembresia(inputImagen, vistaPrevia) {
    fetch('/obtener_imagenes_membresias/')
        .then(res => res.json())
        .then(data => {
            const galeria = document.getElementById('galeria-imagenes-membresia');
            galeria.innerHTML = '';
            data.imagenes.forEach(ruta => {
                const img = document.createElement('img');
                img.src = `/static/${ruta}`;
                img.style.maxWidth = '120px';
                img.style.maxHeight = '120px';
                img.classList.add('img-galeria');
                img.onclick = function() {
                    inputImagen.value = ruta;
                    if (vistaPrevia) {
                        vistaPrevia.style.display = 'block';
                        const imgPrev = vistaPrevia.querySelector('img');
                        if (imgPrev) imgPrev.src = `/static/${ruta}`;
                    }
                    document.getElementById('modal-imagenes-membresia').style.display = 'none';
                };
                galeria.appendChild(img);
            });
        });
}

function subirImagenMembresia(file, inputImagen, vistaPrevia) {
    const formData = new FormData();
    formData.append('imagen', file);
    fetch('/subir_imagen_membresia/', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.ruta) {
            inputImagen.value = data.ruta;
            if (vistaPrevia) {
                vistaPrevia.style.display = 'block';
                const imgPrev = vistaPrevia.querySelector('img');
                if (imgPrev) imgPrev.src = `/static/${data.ruta}`;
            }
            document.getElementById('modal-imagenes-membresia').style.display = 'none';
        } else if (data.error) {
            alert('Error al subir imagen: ' + data.error);
        }
    });
} 