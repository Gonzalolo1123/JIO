const BASE_URL = '/cursos/';

////////////////////////////////
//// CURSOS E INSCRIPCIONES ////
////////////////////////////////

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Inicializando módulo de cursos...');
  
  // Verificar que las funciones de validación estén disponibles
  if (typeof validarNombre === 'undefined' || typeof validarFormulario === 'undefined') {
    console.error('❌ ERROR: Las funciones de validación no están disponibles. Verifique que validaciones.js se cargue antes que cursos.js');
    Swal.fire('Error', 'Error de configuración: Las validaciones no están disponibles. Por favor, recarga la página.', 'error');
    return;
  }
  
  console.log('✅ Funciones de validación disponibles:', {
    validarNombre: typeof validarNombre,
    validarNumeroEntero: typeof validarNumeroEntero,
    validarFecha: typeof validarFecha,
    validarSeleccion: typeof validarSeleccion,
    validarFormulario: typeof validarFormulario,
    mostrarExitoValidacion: typeof mostrarExitoValidacion
  });
  
  inicializarEventListeners();
});

// Función para obtener csrf token
function getCSRFToken() {
  const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
  return csrfInput ? csrfInput.value : '';
}

// Función para mostrar formulario de edición (ahora abre el modal)
function mostrarFormularioEdicion(id, id_tipo, fecha_realizacion = null) {
  console.log(`🎯 Abriendo modal de edición para ${id_tipo} con ID: ${id}`);
  console.log(`🔍 Buscando modal con ID: modal-fondo-editar-${id_tipo}-${id}`);
  const modalFondo = document.getElementById(`modal-fondo-editar-${id_tipo}-${id}`);
  if (modalFondo) {
    modalFondo.style.display = 'flex';

    // Si es un modal de curso y se pasó la fecha, establecer el valor del input de fecha
    if (id_tipo === 'curso' && fecha_realizacion) {
      const fechaInput = modalFondo.querySelector('[name="curso-fecha_realizacion"]');
      if (fechaInput) {
        fechaInput.value = fecha_realizacion;
        console.log('Fecha establecida en el input del modal:', fecha_realizacion);
      }
    }

    setTimeout(() => {
      const primerInput = modalFondo.querySelector('input, select');
      if (primerInput) {
        primerInput.focus();
      }
    }, 100);
  } else {
    console.error(`❌ No se encontró el modal de edición para ${id_tipo} con ID: ${id}`);
  }
}

// Función para ocultar formulario de edición (ahora cierra el modal)
function cerrarModalEdicion(id_tipo, id) {
  console.log(`🔒 Cerrando modal de edición para ${id_tipo} con ID: ${id}`);
  const modalFondo = document.getElementById(`modal-fondo-editar-${id_tipo}-${id}`);
  if (modalFondo) {
    modalFondo.style.display = 'none';
    const form = modalFondo.querySelector('form');
    if (form) {
      form.reset();
    }
  }
}

// Función para actualizar vista de datos
function actualizarVista(objeto, id_tipo) {
  const row = document.querySelector(`tr[data-id="${objeto.id}"]`);
  if (id_tipo=='curso') {
    if (row) {
      const cells = row.cells;
      cells[1].textContent = objeto.nombre;
      cells[2].textContent = objeto.cupos;
      cells[3].textContent = new Date(objeto.fecha_realizacion).toLocaleDateString('es-ES');
      cells[4].textContent = objeto.estado;
      // La celda del establecimiento se actualizará con window.location.reload()
    }
  }
  if (id_tipo=='inscripcion') {
    if (row) {
      // Las celdas de inscripción se actualizarán con window.location.reload()
    }
  }
}

///////////////////////////
// FUNCIONES DE CREACIÓN //
///////////////////////////

// Función para crear curso
function crearCurso(formData) {
  return fetch(`${BASE_URL}crear_curso/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => {
    if (response.ok) {
      return response.json().then(responseData => {
        // No mostrar mensaje aquí, se maneja en manejoCrearCurso
        return responseData;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al crear el curso');
      });
    }
  })
  .catch(error => {
    console.error('Error al crear curso:', error);
    throw error; // Re-lanzar el error para que se maneje en manejoCrearCurso
  });
}

// Función para crear inscripción
function crearInscripcion(formData) {
  return fetch(`${BASE_URL}crear_inscripcion/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => {
    if (response.ok) {
      return response.json().then(responseData => {
        // No mostrar mensaje aquí, se maneja en manejoCrearInscripcion
        return responseData;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al crear la inscripción');
      });
    }
  })
  .catch(error => {
    console.error('Error al crear inscripción:', error);
    throw error; // Re-lanzar el error para que se maneje en manejoCrearInscripcion
  });
}

////////////////////////////////
// FUNCIONES DE ACTUALIZACIÓN //
////////////////////////////////

// Función para actualizar curso
function actualizarCurso(id, data) {
  return fetch(`${BASE_URL}actualizar_curso/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      return response.json().then(responseData => {
        mostrarExitoValidacion('El curso ha sido actualizado correctamente.', '¡Actualización Exitosa!');
        return responseData;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al actualizar el curso');
      });
    }
  })
  .catch(error => {
    console.error('Error al actualizar curso:', error);
    Swal.fire('Error', 'Ocurrió un error al actualizar el curso: ' + error.message, 'error');
    throw error;
  });
}

// Función para actualizar inscripción
function actualizarInscripcion(id, data) {
  return fetch(`${BASE_URL}actualizar_inscripcion/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      return response.json().then(responseData => {
        mostrarExitoValidacion('La inscripción ha sido actualizada correctamente.', '¡Actualización Exitosa!');
        return responseData;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al actualizar la inscripción');
      });
    }
  })
  .catch(error => {
    console.error('Error al actualizar inscripción:', error);
    Swal.fire('Error', 'Ocurrió un error al actualizar la inscripción: ' + error.message, 'error');
    throw error;
  });
}

//////////////////////////////
// FUNCIONES DE ELIMINACIÓN //
//////////////////////////////

// Función para eliminar curso
function eliminarCurso(id) {
  return fetch(`${BASE_URL}borrar_curso/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      return response.json().then(responseData => {
        mostrarExitoValidacion('El curso ha sido eliminado correctamente.', '¡Eliminación Exitosa!');
        return responseData;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al eliminar el curso');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar curso:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar el curso: ' + error.message, 'error');
    throw error;
  });
}

// Función para eliminar inscripción
function eliminarInscripcion(id) {
  return fetch(`${BASE_URL}borrar_inscripcion/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      return response.json().then(responseData => {
        mostrarExitoValidacion('La inscripción ha sido eliminada correctamente.', '¡Eliminación Exitosa!');
        return responseData;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al eliminar la inscripción');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar inscripción:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar la inscripción: ' + error.message, 'error');
    throw error;
  });
}

////////////////////////////////////
// INICIALIZACIÓN EVENT LISTENERS //
////////////////////////////////////

function inicializarEventListeners() {
  console.log('🔧 Inicializando event listeners de cursos...');

  // Event listeners para formularios de creación
  const formCrearCurso = document.getElementById('form-crear-curso');
  const formCrearInscripcion = document.getElementById('form-crear-inscripcion');

  if (formCrearCurso) {
    formCrearCurso.addEventListener('submit', manejoCrearCurso);
  }
  if (formCrearInscripcion) {
    formCrearInscripcion.addEventListener('submit', manejoCrearInscripcion);
  }

  // Event listeners para botones de edición
document.querySelectorAll('[name="btn-editar-curso"]').forEach(btn => {
  btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const fecha = this.getAttribute('data-fecha');
      mostrarFormularioEdicion(id, 'curso', fecha);
  });
});

document.querySelectorAll('[name="btn-editar-inscripcion"]').forEach(btn => {
  btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      mostrarFormularioEdicion(id, 'inscripcion');
  });
});

  // Event listeners para botones de eliminación
document.querySelectorAll('[name="btn-eliminar-curso"]').forEach(btn => {
  btn.addEventListener('click', function() {
    const id = this.getAttribute('data-id');

    Swal.fire({
      title: '¿Eliminar curso?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        eliminarCurso(id)
          .then(data => {
            if (data.error) throw new Error(data.error);
            document.querySelector(`tr[data-id="${id}"]`).remove();
            document.querySelector(`#form-editar-curso-${id}`)?.remove();
          })
          .catch(error => {
            console.error('Error:', error);
            Swal.fire('Error', 'Error al eliminar curso: ' + error.message, 'error');
          });
      }
    });
  });
});

document.querySelectorAll('[name="btn-eliminar-inscripcion"]').forEach(btn => {
  btn.addEventListener('click', function() {
    const id = this.getAttribute('data-id');
    
    Swal.fire({
      title: '¿Eliminar inscripción?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        eliminarInscripcion(id)
          .then(data => {
            if (data.error) throw new Error(data.error);
            document.querySelector(`tr[data-id="${id}"]`).remove();
            document.querySelector(`#form-editar-inscripcion-${id}`)?.remove();
          })
          .catch(error => {
            console.error('Error:', error);
            Swal.fire('Error', 'Error al eliminar inscripción: ' + error.message, 'error');
          });
      }
    });
  });
});

  // Event listeners para formularios de edición (usando delegación de eventos)
  document.addEventListener('submit', function(e) {
    if (e.target && e.target.matches('[name="form-editar-curso"]')) {
      e.preventDefault();
      const form = e.target; // Referencia al formulario que disparó el evento
      const id = form.dataset.id;
      
      // Debug: verificar que el ID se obtiene correctamente
      console.log('Curso ID obtenido:', id);
      console.log('Tipo de id:', typeof id);
      
      if (!id || id === '') {
        Swal.fire('Error', 'No se pudo obtener el ID del curso. Por favor, recarga la página.', 'error');
        return;
      }
      
      console.log('Evento submit disparado para el formulario con data-id:', id);
      
      const nombreInput = document.getElementById(`curso-nombre-editar-modal-${id}`);
      const cuposInput = document.getElementById(`curso-cupos-editar-modal-${id}`);
      const fechaInput = document.getElementById(`curso-fecha_realizacion-editar-modal-${id}`);
      const establecimientoInput = document.getElementById(`curso-establecimiento-editar-modal-${id}`);
      
      // Debug: verificar que los campos se encuentran
      console.log('Campos encontrados:', {
        nombre: nombreInput,
        cupos: cuposInput,
        fecha: fechaInput,
        establecimiento: establecimientoInput
      });
      
      if (!nombreInput || !cuposInput || !fechaInput || !establecimientoInput) {
        Swal.fire('Error', 'No se pudieron encontrar todos los campos del formulario. Por favor, recarga la página.', 'error');
        return;
      }
      
      // Obtener y limpiar valores
      const nombre = nombreInput.value.trim();
      const cupos = cuposInput.value.trim();
      const fecha_realizacion = fechaInput.value;
      const establecimiento_id = establecimientoInput.value;
      
      console.log('Valor de establecimiento_id a enviar:', establecimiento_id);

      // Validaciones usando la nueva función validarFormulario
      const validaciones = [
        () => validarNombre(nombre, 'nombre del curso', 3, 30, true),
        () => validarNumeroEntero(cupos, 'cupos', 1, 100, true),
        () => validarFecha(fecha_realizacion, 'fecha de realización', true, false, true),
        () => validarSeleccion(establecimiento_id, 'establecimiento', true)
      ];

      // Validar formulario y mostrar errores si existen
      if (!validarFormulario(validaciones, 'Errores en el Formulario de Edición de Curso')) {
        return;
      }
      
      // Validación adicional: la fecha no puede ser anterior a hoy
      const hoy2 = new Date();
      hoy2.setHours(0,0,0,0);
      const fechaCurso2 = new Date(fecha_realizacion);
      if (fechaCurso2 < hoy2) {
        mostrarErroresValidacion(['La fecha de realización del curso no puede ser anterior a hoy.'], 'Error en la fecha');
        return;
      }

      console.log('Valor de fecha_realizacion a enviar (después de validación):', fecha_realizacion);

      const formData = {
        nombre: nombre,
        cupos: parseInt(cupos),
        fecha_realizacion: fecha_realizacion,
        establecimiento_id: establecimiento_id
      };
      
      // Debug: verificar los datos del formulario
      console.log('Datos del formulario de curso:', formData);
      
      actualizarCurso(id, formData)
        .then(data => {
          if (data.error) throw new Error(data.error);
          actualizarVista(data, 'curso');
          cerrarModalEdicion('curso', id);
        })
        .catch(error => {
          console.error('Error:', error);
          Swal.fire('Error', 'Error al actualizar: ' + error.message, 'error');
        });
    }
    
    // Event listener para formularios de edición de inscripciones
    if (e.target && e.target.matches('[name="form-editar-inscripcion"]')) {
      e.preventDefault();
      const form = e.target; // Referencia al formulario que disparó el evento
      const id = form.dataset.id;
      
      // Debug: verificar que el ID se obtiene correctamente
      console.log('🎯 Inscripción ID obtenido:', id);
      console.log('🎯 Tipo de id:', typeof id);
      console.log('🎯 Formulario completo:', form);
      
      if (!id || id === '') {
        Swal.fire('Error', 'No se pudo obtener el ID de la inscripción. Por favor, recarga la página.', 'error');
        return;
      }
      
      console.log('🎯 Evento submit disparado para el formulario de inscripción con data-id:', id);
      
      // Usar los nombres correctos de los campos del modal de edición
      const usuarioSelect = document.getElementById(`inscripcion-usuario-editar-modal-${id}`);
      const cursoSelect = document.getElementById(`inscripcion-curso-editar-modal-${id}`);
      
      // Debug: verificar que los campos se encuentran
      console.log('🎯 Campos encontrados:', {
        usuario: usuarioSelect,
        curso: cursoSelect
      });
      
      if (!usuarioSelect || !cursoSelect) {
        console.error('❌ No se pudieron encontrar los campos del formulario');
        console.error('❌ Buscando campos con IDs:');
        console.error(`❌ inscripcion-usuario-editar-modal-${id}`);
        console.error(`❌ inscripcion-curso-editar-modal-${id}`);
        Swal.fire('Error', 'No se pudieron encontrar todos los campos del formulario. Por favor, recarga la página.', 'error');
        return;
      }
      
      const usuario_id = usuarioSelect.value;
      const curso_id = cursoSelect.value;
      
      console.log('🎯 Valores obtenidos:', {
        usuario_id: usuario_id,
        curso_id: curso_id
      });
      
      // Validaciones usando la nueva función validarFormulario
      const validaciones = [
        () => validarSeleccion(usuario_id, 'usuario', true),
        () => validarSeleccion(curso_id, 'curso', true)
      ];

      // Validar formulario y mostrar errores si existen
      if (!validarFormulario(validaciones, 'Errores en el Formulario de Edición de Inscripción')) {
        return;
      }
      
      const formData = {
        usuario_id: usuario_id,
        curso_id: curso_id
      };
      
      // Debug: verificar los datos del formulario
      console.log('🎯 Datos del formulario de inscripción:', formData);
      
      actualizarInscripcion(id, formData)
        .then(data => {
          if (data.error) throw new Error(data.error);
          actualizarVista(data, 'inscripcion');
          cerrarModalEdicion('inscripcion', id);
        })
        .catch(error => {
          console.error('Error:', error);
          Swal.fire('Error', 'Error al actualizar: ' + error.message, 'error');
        });
    }
  });

  // Modal Functionality
  inicializarModales();
  
  console.log('✅ Event listeners de cursos inicializados correctamente');
}

///////////////////////////
// FUNCIONALIDAD MODALES //
///////////////////////////

function inicializarModales() {
  console.log('🎭 Inicializando modales de cursos...');

  // Botones para abrir modales de creación
  const botonesModalesCreacion = {
    'curso': document.getElementById('abrir-form-curso'),
    'inscripcion': document.getElementById('abrir-form-inscripcion')
  };

  // Event listeners para botones de abrir modal de creación
  Object.entries(botonesModalesCreacion).forEach(([tipo, boton]) => {
    if (boton) {
      boton.addEventListener('click', function() {
        console.log(`🎯 Botón abrir modal ${tipo} clickeado`);
        const estado = this.getAttribute('data-estado');
        
        if (estado === 'cerrado') {
          abrirModal(tipo, this);
        } else {
          cerrarModal(tipo, this);
        }
      });
    }
  });

  // Event listeners para cerrar modales de creación con click en fondo
  Object.keys(botonesModalesCreacion).forEach(tipo => {
    const modalFondo = document.getElementById(`modal-fondo-${tipo}`);
    if (modalFondo) {
      modalFondo.addEventListener('click', function(event) {
        if (event.target === modalFondo) {
          console.log(`🖱️ Click en fondo del modal ${tipo}, cerrando...`);
          cerrarModal(tipo);
        }
      });
    }
  });

  // Event listeners para cerrar modales de edición con click en fondo
  document.querySelectorAll('.modal-fondo[id^="modal-fondo-editar-"]').forEach(modalFondo => {
    modalFondo.addEventListener('click', function(event) {
      if (event.target === modalFondo) {
        console.log(`🖱️ Click en fondo del modal de edición, cerrando...`);
        const id_parts = modalFondo.id.split('-');
        const id_tipo = id_parts[2];
        const id = id_parts[id_parts.length - 1];
        cerrarModalEdicion(id_tipo, id);
      }
    });
  });

  // Event listener para cerrar modales con ESC
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const modalAbiertoCreacion = document.querySelector('.modal-fondo[id^="modal-fondo-"][style*="flex"]');
      const modalAbiertoEdicion = document.querySelector('.modal-fondo[id^="modal-fondo-editar-"][style*="flex"]');

      if (modalAbiertoCreacion) {
        const tipo = modalAbiertoCreacion.id.replace('modal-fondo-', '');
        console.log(`⌨️ Tecla ESC presionada, cerrando modal ${tipo}...`);
        cerrarModal(tipo);
      } else if (modalAbiertoEdicion) {
        const id_parts = modalAbiertoEdicion.id.split('-');
        const id_tipo = id_parts[2];
        const id = id_parts[id_parts.length - 1];
        console.log(`⌨️ Tecla ESC presionada, cerrando modal de edición ${id_tipo} con ID: ${id}...`);
        cerrarModalEdicion(id_tipo, id);
      }
    }
  });

  console.log('✅ Modales de cursos inicializados correctamente');
}

// Función para abrir modal de creación
function abrirModal(tipo, boton = null) {
  console.log(`🔓 Abriendo modal ${tipo}...`);
  
  const modalFondo = document.getElementById(`modal-fondo-${tipo}`);
  const botonAbrir = boton || document.getElementById(`abrir-form-${tipo}`);
  
  if (modalFondo && botonAbrir) {
    modalFondo.style.display = 'flex';
    botonAbrir.setAttribute('data-estado', 'abierto');
    botonAbrir.textContent = '-';
    
    // Enfocar el primer input
    setTimeout(() => {
      const primerInput = modalFondo.querySelector('input, select');
      if (primerInput) {
        primerInput.focus();
      }
    }, 100);
    
    console.log(`✅ Modal ${tipo} abierto correctamente`);
  } else {
    console.error(`❌ No se encontró el modal o botón para ${tipo}`);
  }
}

// Función para cerrar modal de creación
function cerrarModal(tipo, boton = null) {
  console.log(`🔒 Cerrando modal ${tipo}...`);
  
  const modalFondo = document.getElementById(`modal-fondo-${tipo}`);
  const botonAbrir = boton || document.getElementById(`abrir-form-${tipo}`);
  
  if (modalFondo && botonAbrir) {
    modalFondo.style.display = 'none';
    botonAbrir.setAttribute('data-estado', 'cerrado');
    botonAbrir.textContent = '+';
    
    // Limpiar el formulario
    const form = modalFondo.querySelector('form');
    if (form) {
      form.reset();
    }
    
    console.log(`✅ Modal ${tipo} cerrado correctamente`);
  } else {
    console.error(`❌ No se encontró el modal o botón para ${tipo}`);
  }
}

////////////////////////////////////////////
// FUNCIONES DE MANEJO DE EVENT LISTENERS //
////////////////////////////////////////////

// Creación de cursos de event listeners
function manejoCrearCurso(e) {
  e.preventDefault();
  console.log('🎯 Iniciando validación de creación de curso...');

  const nombreInput = document.getElementById('curso-nombre-modal');
  const cuposInput = document.getElementById('curso-cupos-modal');
  const fechaInput = document.getElementById('curso-fecha_realizacion-modal');
  const establecimientoSelect = document.getElementById('curso-establecimiento-modal');

  console.log('🔍 Campos encontrados:', {
    nombre: nombreInput,
    cupos: cuposInput,
    fecha: fechaInput,
    establecimiento: establecimientoSelect
  });

  // Obtener y limpiar valores
  const nombre = nombreInput?.value.trim() || '';
  const cupos = cuposInput?.value.trim() || '';
  const fecha_realizacion = fechaInput?.value || '';
  const establecimiento_id = establecimientoSelect?.value || '';

  console.log('📋 Valores obtenidos:', {
    nombre: nombre,
    cupos: cupos,
    fecha_realizacion: fecha_realizacion,
    establecimiento_id: establecimiento_id
  });

  // Verificar que las funciones de validación estén disponibles
  console.log('🔍 Verificando funciones de validación:', {
    validarNombre: typeof validarNombre,
    validarNumeroEntero: typeof validarNumeroEntero,
    validarFecha: typeof validarFecha,
    validarSeleccion: typeof validarSeleccion,
    validarFormulario: typeof validarFormulario
  });

  // Validaciones usando la nueva función validarFormulario
  const validaciones = [
    () => validarNombre(nombre, 'nombre del curso', 3, 30, true),
    () => validarNumeroEntero(cupos, 'cupos', 1, 100, true),
    () => validarFecha(fecha_realizacion, 'fecha de realización', true, false, true),
    () => validarSeleccion(establecimiento_id, 'establecimiento', true)
  ];

  console.log('✅ Validaciones configuradas, ejecutando validarFormulario...');

  // Validar formulario y mostrar errores si existen
  if (!validarFormulario(validaciones, 'Errores en el Formulario de Curso')) {
    console.log('❌ Validaciones fallaron, deteniendo envío');
    return;
  }
  console.log('✅ Validaciones pasaron, enviando datos...');

  const formData = {
    nombre: nombre,
    cupos: parseInt(cupos),
    fecha_realizacion: fecha_realizacion,
    establecimiento_id: establecimiento_id
  };

  console.log('📤 Enviando datos:', formData);

  crearCurso(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      console.log('✅ Curso creado exitosamente');
      cerrarModal('curso');
      mostrarExitoValidacion('Curso creado exitosamente', '¡Curso Creado!');
    })
    .catch(error => {
      console.error('Error:', error);
      Swal.fire('Error', 'Error al crear curso: ' + error.message, 'error');
    });
}

// Creación de inscripciones de event listeners
function manejoCrearInscripcion(e) {
  e.preventDefault();
  console.log('🎯 Iniciando validación de creación de inscripción...');
  
  const usuarioSelect = document.getElementById('inscripcion-usuario-modal');
  const cursoSelect = document.getElementById('inscripcion-curso-modal');

  console.log('🔍 Campos encontrados:', {
    usuario: usuarioSelect,
    curso: cursoSelect
  });

  // Obtener valores
  const usuario_id = usuarioSelect?.value || '';
  const curso_id = cursoSelect?.value || '';

  console.log('📋 Valores obtenidos:', {
    usuario_id: usuario_id,
    curso_id: curso_id
  });

  // Verificar que las funciones de validación estén disponibles
  console.log('🔍 Verificando funciones de validación:', {
    validarSeleccion: typeof validarSeleccion,
    validarFormulario: typeof validarFormulario
  });

  // Validaciones usando la nueva función validarFormulario
  const validaciones = [
    () => validarSeleccion(usuario_id, 'usuario', true),
    () => validarSeleccion(curso_id, 'curso', true)
  ];

  console.log('✅ Validaciones configuradas, ejecutando validarFormulario...');

  // Validar formulario y mostrar errores si existen
  if (!validarFormulario(validaciones, 'Errores en el Formulario de Inscripción')) {
    console.log('❌ Validaciones fallaron, deteniendo envío');
    return;
  }

  console.log('✅ Validaciones pasaron, enviando datos...');
  
  const formData = {
    usuario_id: usuario_id,
    curso_id: curso_id
  };

  console.log('📤 Enviando datos:', formData);
  
  crearInscripcion(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      console.log('✅ Inscripción creada exitosamente');
      cerrarModal('inscripcion');
      mostrarExitoValidacion('Inscripción creada exitosamente', '¡Inscripción Creada!');
    })
    .catch(error => {
      console.error('Error:', error);
      Swal.fire('Error', 'Error al crear inscripción: ' + error.message, 'error');
    });
}