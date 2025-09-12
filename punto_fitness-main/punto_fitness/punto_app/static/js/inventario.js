const BASE_URL = '/inventario/';

////////////////////////////////
//// PRODUCTOS Y CATEGORIAS ////
////////////////////////////////

document.addEventListener('DOMContentLoaded', function() {
  inicializarEventListeners();
});

// Función para obtener csrf token
function getCSRFToken() {
  const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
  return csrfInput ? csrfInput.value : '';
}

// Función para mostrar formulario de edición
function mostrarFormularioEdicion(id, id_tipo) {
  document.querySelectorAll(`.form-edicion-${id_tipo}`).forEach(form => {
    form.style.display = 'none';
  });
  document.getElementById(`form-editar-${id_tipo}-${id}`).style.display = 'table-row';
}

// Función para ocultar formulario de edición
function ocultarFormularioEdicion(id, id_tipo) {
  document.getElementById(`form-editar-${id_tipo}-${id}`).style.display = 'none';
}

// Función para actualizar vista de datos
function actualizarVista(objeto, id_tipo) {
  const row = document.querySelector(`tr[data-id="${objeto.id}"]`);
  if (!row) {
    console.warn(`No se encontró la fila con data-id="${objeto.id}"`);
    return;
  }
  
  const cells = row.cells;
  
  if (id_tipo=='producto') {
    if (cells.length >= 9) {
      cells[0].textContent = objeto.nombre || '';
      cells[1].textContent = objeto.descripcion || '';
      cells[2].textContent = objeto.precio || '';
      cells[3].textContent = objeto.stock_actual || '';
      cells[4].textContent = objeto.stock_minimo || '';
      cells[5].textContent = objeto.categoria__nombre || '';
      cells[6].textContent = objeto.establecimiento__nombre || '';
      // Actualizar la imagen
      const imgElement = cells[7].querySelector('img');
      if (imgElement && objeto.imagen) {
        imgElement.src = `/static/${objeto.imagen}`;
        imgElement.alt = objeto.nombre;
      }
      // cells[8] es la columna de acciones, no se actualiza
    }
  }
  if (id_tipo=='categoria') {
    if (cells.length >= 2) {
      cells[0].textContent = objeto.nombre || '';
      cells[1].textContent = objeto.descripcion || '';
      // cells[2] es la columna de acciones, no se actualiza
    }
  }
  if (id_tipo=='compra') {
    if (cells.length >= 6) {
      cells[0].textContent = objeto.fecha || '';
      cells[1].textContent = objeto.total || '';
      cells[2].textContent = objeto.iva || '';
      cells[3].textContent = objeto.estado || '';
      cells[4].textContent = objeto.establecimiento__nombre || '';
      cells[5].textContent = objeto.vendedor__nombre || '';
      // cells[6] es la columna de acciones, no se actualiza
    }
  }
  if (id_tipo=='vendedor') {
    if (cells.length >= 4) {
      cells[0].textContent = objeto.nombre || '';
      cells[1].textContent = objeto.telefono || '';
      cells[2].textContent = objeto.email || '';
      cells[3].textContent = objeto.proveedor__nombre || '';
      // cells[4] es la columna de acciones, no se actualiza
    }
  }
  if (id_tipo=='proveedor') {
    if (cells.length >= 3) {
      cells[0].textContent = objeto.nombre || '';
      cells[1].textContent = objeto.telefono || '';
      cells[2].textContent = objeto.email || '';
      // cells[3] es la columna de acciones, no se actualiza
    }
  }
}

///////////////////////////
// FUNCIONES DE CREACIÓN //
///////////////////////////

// Función para crear producto
function crearProducto(formData) {
  return fetch(`${BASE_URL}crear_producto/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => response.json());
}

// Función para crear categoria
function crearCategoria(formData) {
  return fetch(`${BASE_URL}crear_categoria/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => response.json());
}

// Función para crear compra
function crearCompraVendedor(formData) {
  return fetch(`${BASE_URL}crear_compra_vendedor/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => response.json());
}

// Función para crear vendedor
function crearVendedor(formData) {
  return fetch(`${BASE_URL}crear_vendedor/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => response.json());
}

// Función para crear proveedor
function crearProveedor(formData) {
  return fetch(`${BASE_URL}crear_proveedor/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(formData)
  }).then(response => response.json());
}

////////////////////////////////
// FUNCIONES DE ACTUALIZACIÓN //
////////////////////////////////

// Función para actualizar producto
function actualizarProducto(id, data) {
  return fetch(`${BASE_URL}actualizar_producto/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Error al actualizar producto');
      });
    }
  });
}


// Función para actualizar categoria
function actualizarCategoria(id, data) {
  return fetch(`${BASE_URL}actualizar_categoria/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: '¡Actualizacion Exitosa!',
        html: `<p style="color: #555;">Tu Actualizacion ha sido registrada correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      Swal.fire('Error', 'Hubo un problema al inscribirse.', 'error');
    }
  })
  .catch(error => {
    console.error(error);
    Swal.fire('Error', 'Ocurrió un error de red.', 'error');
  });
}

// Función para actualizar compra
function actualizarCompraVendedor(id, data) {
  return fetch(`${BASE_URL}actualizar_compra_vendedor/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: '¡Actualizacion Exitosa!',
        html: `<p style="color: #555;">Tu Actualizacion ha sido registrada correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      Swal.fire('Error', 'Hubo un problema al inscribirse.', 'error');
    }
  })
  .catch(error => {
    console.error(error);
    Swal.fire('Error', 'Ocurrió un error de red.', 'error');
  });}

// Función para actualizar vendedor
function actualizarVendedor(id, data) {
  return fetch(`${BASE_URL}actualizar_vendedor/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      return response.json().then(data => {
        Swal.fire({
          title: '¡Actualizacion Exitosa!',
          html: `<p style="color: #555;">Tu Actualizacion ha sido registrada correctamente.</p>`,
          icon: 'success',
          confirmButtonColor: '#28a745'
        }).then(() => {
          // Recarga la página cuando se cierra el SweetAlert
          location.reload();
        });
        return data;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Hubo un problema al inscribirse.');
      });
    }
  })
  .catch(error => {
    console.error(error);
    Swal.fire('Error', 'Ocurrió un error de red.', 'error');
    return { error: error.message };
  });
}

// Función para actualizar proveedor
function actualizarProveedor(id, data) {
  return fetch(`${BASE_URL}actualizar_proveedor/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  }).then(response => {
    if (response.ok) {
      return response.json().then(data => {
        if (data.success) {
          Swal.fire({
            title: '¡Actualizacion Exitosa!',
            html: `<p style="color: #555;">Tu Actualizacion ha sido registrada correctamente.</p>`,
            icon: 'success',
            confirmButtonColor: '#28a745'
          }).then(() => {
            // Recarga la página cuando se cierra el SweetAlert
            location.reload();
          });
          return data.data; // Retornamos los datos del proveedor
        } else {
          throw new Error(data.error || 'Error al actualizar proveedor');
        }
      });
    } else {
      throw new Error('Error en la respuesta del servidor');
    }
  })
  .catch(error => {
    console.error(error);
    Swal.fire('Error', 'Ocurrió un error de red.', 'error');
  });
}

//////////////////////////////
// FUNCIONES DE ELIMINACIÓN //
//////////////////////////////

// Función para eliminar producto
function eliminarProducto(id) {
  return fetch(`${BASE_URL}borrar_producto/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: 'Eliminación Exitosa!',
        html: `<p style="color: #555;">El producto ha sido eliminado correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      return response.json().then(data => {
        throw new Error(data.error || 'Error al eliminar el producto');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar proveedor:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar el procduto: ' + error.message, 'error');
  });
}

// Función para eliminar categoria
function eliminarCategoria(id) {
  return fetch(`${BASE_URL}borrar_categoria/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: 'Eliminación Exitosa!',
        html: `<p style="color: #555;">La categoria ha sido eliminado correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      return response.json().then(data => {
        throw new Error(data.error || 'Error al eliminar categoria');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar proveedor:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar el proveedor: ' + error.message, 'error');
  });
}

// Función para eliminar compra
function eliminarCompraVendedor(id) {
  return fetch(`${BASE_URL}borrar_compra_vendedor/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: 'Eliminación Exitosa!',
        html: `<p style="color: #555;">La compra ha sido eliminado correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      return response.json().then(data => {
        throw new Error(data.error || 'Error al eliminar la compra');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar proveedor:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar la compra: ' + error.message, 'error');
  });
}

// Función para eliminar vendedor
function eliminarVendedor(id) {
  return fetch(`${BASE_URL}borrar_vendedor/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: 'Eliminación Exitosa!',
        html: `<p style="color: #555;">El vendedor ha sido eliminado correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      return response.json().then(data => {
        throw new Error(data.error || 'Error al eliminar el vendedor');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar proveedor:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar el vendedor: ' + error.message, 'error');
  });}

// Función para eliminar proveedor
function eliminarProveedor(id) {
  return fetch(`${BASE_URL}borrar_proveedor/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  }).then(response => {
    if (response.ok) {
      Swal.fire({
        title: 'Eliminación Exitosa!',
        html: `<p style="color: #555;">El proveedor ha sido eliminado correctamente.</p>`,
        icon: 'success',
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Recarga la página cuando se cierra el SweetAlert
        location.reload();
      });
    } else {
      return response.json().then(data => {
        throw new Error(data.error || 'Error al eliminar proveedor');
      });
    }
  })
  .catch(error => {
    console.error('Error al eliminar proveedor:', error);
    Swal.fire('Error', 'Ocurrió un error al eliminar el proveedor: ' + error.message, 'error');
  });
}

////////////////////////////////////////////
// FUNCIONES DE MANEJO DE EVENT LISTENERS //
////////////////////////////////////////////

// Función para manejar la creación de producto
function manejoCrearProducto(e) {
  e.preventDefault();
  // Verificar existencia de campos
  const nombreInput = document.getElementById('producto-nombre');
  const descripcionInput = document.getElementById('producto-descripcion');
  const precioInput = document.getElementById('producto-precio');
  const stockActualInput = document.getElementById('producto-stock-actual');
  const stockMinimoInput = document.getElementById('producto-stock-minimo');
  const categoriaInput = document.getElementById('producto-categoria');
  const establecimientoInput = document.getElementById('producto-establecimiento');
  const imagenInput = document.getElementById('producto-imagen');
  const compraInput = document.getElementById('producto-compra');
  if (!nombreInput || !descripcionInput || !precioInput || !stockActualInput || !stockMinimoInput || !categoriaInput || !establecimientoInput || !imagenInput || !compraInput) {
    mostrarErroresValidacion(['Faltan campos obligatorios en el formulario de producto. Por favor, recarga la página.'], 'Error de formulario');
    return;
  }
  const nombre = nombreInput.value.trim();
  const descripcion = descripcionInput.value.trim();
  const precio = precioInput.value.trim();
  const stock_actual = stockActualInput.value.trim();
  const stock_minimo = stockMinimoInput.value.trim();
  const categoria_id = categoriaInput.value;
  const establecimiento_id = establecimientoInput.value;
  const imagen = imagenInput.value;
  const compra_id = compraInput.value;

  let errores = [];
  errores = errores.concat(validarNombre(nombre, 'nombre', 3, 30));
  errores = errores.concat(validarDescripcion(descripcion, 'descripción', 5, 50));
  errores = errores.concat(validarPrecioChileno(precio));
  errores = errores.concat(validarNumeroEntero(stock_actual, 'stock actual', 0, 99999));
  errores = errores.concat(validarNumeroEntero(stock_minimo, 'stock mínimo', 0, 99999));
  if (!categoria_id) errores.push('Debe seleccionar una categoría');
  if (!establecimiento_id) errores.push('Debe seleccionar un establecimiento');
  if (!imagen) errores.push('Debe seleccionar una imagen');

  if (errores.length > 0) {
    mostrarErroresValidacion(errores, 'Errores en el formulario de producto');
    return;
  }

  const formData = {
    nombre,
    descripcion,
    precio,
    stock_actual,
    stock_minimo,
    categoria_id,
    establecimiento_id,
    imagen,
    compra_id
  };
  crearProducto(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      mostrarExitoValidacion('Producto creado exitosamente');
    })
    .catch(error => {
      mostrarErroresValidacion([error.message], 'Error al crear producto');
    });
}

// Función para manejar la creación de categoría
function manejoCrearCategoria(e) {
  e.preventDefault();
  const nombreInput = document.getElementById('categoria-nombre');
  const descripcionInput = document.getElementById('categoria-descripcion');
  if (!nombreInput || !descripcionInput) {
    mostrarErroresValidacion(['Faltan campos obligatorios en el formulario de categoría. Por favor, recarga la página.'], 'Error de formulario');
    return;
  }
  const nombre = nombreInput.value.trim();
  const descripcion = descripcionInput.value.trim();
  let errores = [];
  errores = errores.concat(validarNombre(nombre, 'nombre', 3, 30));
  errores = errores.concat(validarDescripcion(descripcion, 'descripción', 5, 50));
  if (errores.length > 0) {
    mostrarErroresValidacion(errores, 'Errores en el formulario de categoría');
    return;
  }
  const formData = { nombre, descripcion };
  crearCategoria(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      
      // Verificar si venimos del flujo de producto
      const creandoDesdeProducto = sessionStorage.getItem('creandoCategoriaDesdeProducto');
      const creandoDesdeProductoEditar = sessionStorage.getItem('creandoCategoriaDesdeProductoEditar');
      
      if (creandoDesdeProducto === 'true' || creandoDesdeProductoEditar === 'true') {
        // Guardar la información de la categoría recién creada
        sessionStorage.setItem('categoriaRecienCreada', JSON.stringify({
          id: data.id,
          nombre: data.nombre,
          descripcion: data.descripcion
        }));
        
        // Cerrar el modal de categoría
        cerrarModal('categoria');
        
        // Reabrir el modal correspondiente
        if (creandoDesdeProducto === 'true') {
          // Cerrar el modal de categoría
          cerrarModal('categoria');
          // Recargar la página inmediatamente
          location.reload();
          return;
        } else if (creandoDesdeProductoEditar === 'true') {
          // Volver al formulario de edición de producto
          const datosProducto = sessionStorage.getItem('datosProductoEdicion');
          if (datosProducto) {
            const datos = JSON.parse(datosProducto);
            abrirModalEdicion('producto', sessionStorage.getItem('productoEditandoId'), datos);
            // Obtener la categoría recién creada y preseleccionarla
            const categoriaRecienCreada = sessionStorage.getItem('categoriaRecienCreada');
            if (categoriaRecienCreada) {
              try {
                const categoria = JSON.parse(categoriaRecienCreada);
                preseleccionarCategoriaRecienCreada('producto-categoria-editar', categoria);
              } catch (e) {
                console.error('Error al parsear categoría recién creada:', e);
              }
            }
          } else {
            // Si no hay datos guardados, recargar la página
            location.reload();
          }
        }
        
        // Limpiar las flags de sessionStorage
        sessionStorage.removeItem('creandoCategoriaDesdeProducto');
        sessionStorage.removeItem('creandoCategoriaDesdeProductoEditar');
        sessionStorage.removeItem('datosProductoEdicion');
        sessionStorage.removeItem('productoEditandoId');
        
        // Mostrar mensaje de éxito sin recargar la página
        if (typeof Swal !== 'undefined' && Swal.fire) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'Categoría creada exitosamente y preseleccionada en el formulario de producto',
            icon: 'success',
            confirmButtonColor: '#28a745',
            confirmButtonText: 'Aceptar'
          });
        } else {
          alert('Categoría creada exitosamente y preseleccionada en el formulario de producto');
        }
      } else {
        // Flujo normal de creación de categoría
        mostrarExitoValidacion('Categoría creada exitosamente');
      }
    })
    .catch(error => {
      mostrarErroresValidacion([error.message], 'Error al crear categoría');
    });
}

// Función para manejar la creación de compra
function manejoCrearCompraVendedor(e) {
  e.preventDefault();
  const fechaInput = document.getElementById('compra-fecha');
  const totalInput = document.getElementById('compra-total');
  const ivaInput = document.getElementById('compra-iva');
  const estadoInput = document.getElementById('compra-estado');
  const establecimientoInput = document.getElementById('compra-establecimiento');
  const vendedorInput = document.getElementById('compra-vendedor');
  if (!fechaInput || !totalInput || !ivaInput || !estadoInput || !establecimientoInput || !vendedorInput) {
    mostrarErroresValidacion(['Faltan campos obligatorios en el formulario de compra. Por favor, recarga la página.'], 'Error de formulario');
    return;
  }
  const fecha = fechaInput.value;
  const total = totalInput.value.trim();
  const iva = ivaInput.value.trim();
  const estado = estadoInput.value;
  const establecimientoId = establecimientoInput.value;
  const vendedorId = vendedorInput.value;
  let errores = [];
  errores = errores.concat(validarFecha(fecha, 'fecha'));
  errores = errores.concat(validarPrecioChileno(total, 'total'));
  errores = errores.concat(validarPorcentaje(iva, 'IVA', 0, 100));
  if (!estado) errores.push('Debe seleccionar un estado');
  if (!establecimientoId) errores.push('Debe seleccionar un establecimiento');
  if (!vendedorId) errores.push('Debe seleccionar un vendedor');
  if (errores.length > 0) {
    mostrarErroresValidacion(errores, 'Errores en el formulario de compra');
    return;
  }
  const formData = {
    fecha,
    total,
    iva,
    estado: estado === 'True',
    establecimiento_id: establecimientoId,
    vendedor_id: vendedorId,
  };
  crearCompraVendedor(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      mostrarExitoValidacion('Compra creada exitosamente');
    })
    .catch(error => {
      mostrarErroresValidacion([error.message], 'Error al crear compra');
    });
}

// Función para manejar la creación de vendedor
function manejoCrearVendedor(e) {
  e.preventDefault();
  const nombreInput = document.getElementById('vendedor-nombre');
  const telefonoInput = document.getElementById('vendedor-telefono');
  const emailInput = document.getElementById('vendedor-email');
  const proveedorInput = document.getElementById('vendedor-proveedor');
  if (!nombreInput || !telefonoInput || !emailInput || !proveedorInput) {
    mostrarErroresValidacion(['Faltan campos obligatorios en el formulario de vendedor. Por favor, recarga la página.'], 'Error de formulario');
    return;
  }
  const nombre = nombreInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const email = emailInput.value.trim();
  const proveedorId = proveedorInput.value;
  let errores = [];
  errores = errores.concat(validarNombre(nombre, 'nombre', 3, 30));
  errores = errores.concat(validarTelefonoChileno(telefono, 'teléfono'));
  errores = errores.concat(validarEmail(email, 'email'));
  if (!proveedorId) errores.push('Debe seleccionar un proveedor');
  if (errores.length > 0) {
    mostrarErroresValidacion(errores, 'Errores en el formulario de vendedor');
    return;
  }
  const formData = {
    nombre,
    telefono,
    email,
    proveedor_id: proveedorId,
  };
  crearVendedor(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      mostrarExitoValidacion('Vendedor creado exitosamente');
    })
    .catch(error => {
      mostrarErroresValidacion([error.message], 'Error al crear vendedor');
    });
}

// Función para manejar la creación de proveedor
function manejoCrearProveedor(e) {
  e.preventDefault();
  const nombreInput = document.getElementById('proveedor-nombre');
  const telefonoInput = document.getElementById('proveedor-telefono');
  const emailInput = document.getElementById('proveedor-email');
  if (!nombreInput || !telefonoInput || !emailInput) {
    mostrarErroresValidacion(['Faltan campos obligatorios en el formulario de proveedor. Por favor, recarga la página.'], 'Error de formulario');
    return;
  }
  const nombre = nombreInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const email = emailInput.value.trim();
  let errores = [];
  errores = errores.concat(validarNombre(nombre, 'nombre', 3, 100));
  errores = errores.concat(validarTelefonoChileno(telefono, 'teléfono'));
  errores = errores.concat(validarEmail(email, 'email'));
  if (errores.length > 0) {
    mostrarErroresValidacion(errores, 'Errores en el formulario de proveedor');
    return;
  }
  const formData = {
    nombre,
    telefono,
    email,
  };
  crearProveedor(formData)
    .then(data => {
      if (data.error) throw new Error(data.error);
      mostrarExitoValidacion('Proveedor creado exitosamente');
    })
    .catch(error => {
      mostrarErroresValidacion([error.message], 'Error al crear proveedor');
    });
}

////////////////////////////////////
// INICIALIZACIÓN EVENT LISTENERS //
////////////////////////////////////

function inicializarEventListeners() {
  console.log('🎯 Inicializando event listeners...');

  // Verificar si hay una categoría recién creada y si venimos del flujo de producto
  const categoriaRecienCreada = sessionStorage.getItem('categoriaRecienCreada');
  const creandoDesdeProducto = sessionStorage.getItem('creandoCategoriaDesdeProducto');
  
  if (categoriaRecienCreada && creandoDesdeProducto === 'true') {
    try {
      const categoria = JSON.parse(categoriaRecienCreada);
      sessionStorage.removeItem('categoriaRecienCreada');
      sessionStorage.removeItem('creandoCategoriaDesdeProducto');
      // Abrir el modal de producto de forma directa y robusta
      const modalProducto = document.getElementById('modal-fondo-producto');
      const botonProducto = document.getElementById('abrir-form-producto');
      if (modalProducto && botonProducto) {
        modalProducto.style.display = 'flex';
        botonProducto.setAttribute('data-estado', 'abierto');
        botonProducto.textContent = '-';
        preseleccionarCategoriaRecienCreada('producto-categoria', categoria);
        // Recargar la página automáticamente
        location.reload();
      }
    } catch (e) {
      console.error('Error al parsear categoría recién creada:', e);
      sessionStorage.removeItem('categoriaRecienCreada');
      sessionStorage.removeItem('creandoCategoriaDesdeProducto');
    }
  }

  const editandoProductoId = sessionStorage.getItem('editandoProductoId');
  if (categoriaRecienCreada && creandoDesdeProducto === 'edicion' && editandoProductoId) {
    try {
      const categoria = JSON.parse(categoriaRecienCreada);
      sessionStorage.removeItem('categoriaRecienCreada');
      sessionStorage.removeItem('creandoCategoriaDesdeProducto');
      setTimeout(() => {
        const modalEditar = document.getElementById('modal-fondo-editar-producto');
        if (modalEditar) {
          modalEditar.style.display = 'flex';
          // Preseleccionar la categoría recién creada
          preseleccionarCategoriaRecienCreada('producto-categoria-editar', categoria);
        }
      }, 100);
      sessionStorage.removeItem('editandoProductoId');
    } catch (e) {
      console.error('Error al parsear categoría recién creada:', e);
      sessionStorage.removeItem('categoriaRecienCreada');
      sessionStorage.removeItem('creandoCategoriaDesdeProducto');
      sessionStorage.removeItem('editandoProductoId');
    }
  }

  // Event listeners para formularios de creación
  document.getElementById('form-crear-producto').addEventListener('submit', manejoCrearProducto);
  document.getElementById('form-crear-categoria').addEventListener('submit', manejoCrearCategoria);
  document.getElementById('form-crear-compra').addEventListener('submit', manejoCrearCompraVendedor);
  document.getElementById('form-crear-vendedor').addEventListener('submit', manejoCrearVendedor);
  document.getElementById('form-crear-proveedor').addEventListener('submit', manejoCrearProveedor);

  // Los event listeners para formularios de edición se manejan en inicializarBotonesEdicion()

  // Event listeners para botones de eliminación
  document.querySelectorAll('[name="btn-eliminar-producto"]').forEach(boton => {
    boton.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if (confirm('¿Está seguro de que desea eliminar este producto?')) {
        eliminarProducto(id);
      }
    });
  });

  document.querySelectorAll('[name="btn-eliminar-categoria"]').forEach(boton => {
    boton.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if (confirm('¿Está seguro de que desea eliminar esta categoría?')) {
        eliminarCategoria(id);
      }
    });
  });

  document.querySelectorAll('[name="btn-eliminar-compra"]').forEach(boton => {
    boton.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if (confirm('¿Está seguro de que desea eliminar esta compra?')) {
        eliminarCompraVendedor(id);
      }
    });
  });

  document.querySelectorAll('[name="btn-eliminar-vendedor"]').forEach(boton => {
    boton.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if (confirm('¿Está seguro de que desea eliminar este vendedor?')) {
        eliminarVendedor(id);
      }
    });
  });

  document.querySelectorAll('[name="btn-eliminar-proveedor"]').forEach(boton => {
    boton.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      console.log('Intentando eliminar proveedor con ID:', id);
      if (confirm('¿Está seguro de que desea eliminar este proveedor?')) {
        eliminarProveedor(id);
      }
    });
  });
  
  // Inicializar selector de imágenes
  inicializarSelectorImagenes();

  // Event listeners para botones de edición (modales)
  inicializarBotonesEdicion();

  // Modal Functionality
  inicializarModales();
  
  console.log('✅ Event listeners inicializados correctamente');
}

///////////////////////////
// FUNCIONALIDAD MODALES //
///////////////////////////

function inicializarModales() {
  console.log('🎭 Inicializando modales...');

  // Botones para abrir modales
  const botonesModales = {
    'producto': document.getElementById('abrir-form-producto'),
    'categoria': document.getElementById('abrir-form-categoria'),
    'compra': document.getElementById('abrir-form-compra'),
    'vendedor': document.getElementById('abrir-form-vendedor'),
    'proveedor': document.getElementById('abrir-form-proveedor')
  };

  // Event listeners para botones de abrir modal
  Object.entries(botonesModales).forEach(([tipo, boton]) => {
    if (boton) {
      boton.addEventListener('click', function() {
        console.log(`🎯 Botón abrir modal ${tipo} clickeado`);
        const estado = this.getAttribute('data-estado');
        
        if (estado === 'cerrado') {
          abrirModal(tipo, this);
        } else {
          cerrarModal(tipo);
        }
      });
    }
  });

  // Event listeners para cerrar modales con click en fondo (modales de creación)
  Object.keys(botonesModales).forEach(tipo => {
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
  const tiposEdicion = ['producto', 'categoria', 'compra', 'vendedor', 'proveedor'];
  tiposEdicion.forEach(tipo => {
    const modalFondo = document.getElementById(`modal-fondo-editar-${tipo}`);
    if (modalFondo) {
      modalFondo.addEventListener('click', function(event) {
        if (event.target === modalFondo) {
          console.log(`🖱️ Click en fondo del modal de edición ${tipo}, cerrando...`);
          cerrarModalEdicion(tipo);
        }
      });
    }
  });

  // Event listener para cerrar modales con ESC
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const modalAbierto = document.querySelector('.modal-fondo[style*="flex"]');
      if (modalAbierto) {
        const tipo = modalAbierto.id.replace('modal-fondo-', '');
        if (tipo.includes('editar-')) {
          const tipoEdicion = tipo.replace('editar-', '');
          console.log(`⌨️ Tecla ESC presionada, cerrando modal de edición ${tipoEdicion}...`);
          cerrarModalEdicion(tipoEdicion);
        } else {
          console.log(`⌨️ Tecla ESC presionada, cerrando modal ${tipo}...`);
          cerrarModal(tipo);
        }
      }
    }
  });

  console.log('✅ Modales inicializados correctamente');
}

// Función para abrir modal
function abrirModal(tipo, boton = null) {
  console.log(`🔓 Abriendo modal ${tipo}...`);
  
  const modalFondo = document.getElementById(`modal-fondo-${tipo}`);
  const botonAbrir = boton || document.getElementById(`abrir-form-${tipo}`);
  
  if (modalFondo && botonAbrir) {
    // Si es el modal de producto, verificar si hay categorías
    if (tipo === 'producto') {
      const selectCategoria = document.getElementById('producto-categoria');
      if (selectCategoria && selectCategoria.options.length <= 1) { // Solo tiene la opción "Seleccione"
        Swal.fire({
          title: 'No hay categorías disponibles',
          text: '¿Deseas crear una nueva categoría?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, crear categoría',
          cancelButtonText: 'No, cancelar',
          confirmButtonColor: '#28a745',
          cancelButtonColor: '#dc3545'
        }).then((result) => {
          if (result.isConfirmed) {
            // Marcar que venimos del flujo de producto
            sessionStorage.setItem('creandoCategoriaDesdeProducto', 'true');
            // Cerrar el modal de producto
            cerrarModal('producto');
            // Abrir el modal de categoría
            abrirModal('categoria');
          }
        });
        return;
      }
    }

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
    
    // Verificar si hay una categoría recién creada para preseleccionar (solo para producto)
    const categoriaRecienCreada = sessionStorage.getItem('categoriaRecienCreada');
    if (categoriaRecienCreada && tipo === 'producto') {
      try {
        const categoria = JSON.parse(categoriaRecienCreada);
        preseleccionarCategoriaRecienCreada('producto-categoria', categoria);
      } catch (e) {
        console.error('Error al parsear categoría recién creada:', e);
      }
    }
    
    console.log(`✅ Modal ${tipo} abierto correctamente`);
  } else {
    console.error(`❌ No se encontró el modal o botón para ${tipo}`);
  }
}

// Función para cerrar modal
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
    
    // Si es el modal de producto, recargar la página solo si no estamos creando una categoría
    if (tipo === 'producto') {
      const creandoCategoria = sessionStorage.getItem('creandoCategoriaDesdeProducto');
      if (!creandoCategoria) {
        location.reload();
      }
    }
    
    console.log(`✅ Modal ${tipo} cerrado correctamente`);
  } else {
    console.error(`❌ No se encontró el modal o botón para ${tipo}`);
  }
}

///////////////////////////////
// FUNCIONALIDAD MODALES EDICIÓN //
///////////////////////////////

// Función para abrir modal de edición
function abrirModalEdicion(tipo, id, datos) {
  console.log(`🔓 Abriendo modal de edición ${tipo} para ID ${id}...`);
  
  const modalFondo = document.getElementById(`modal-fondo-editar-${tipo}`);
  
  if (modalFondo) {
    // Si es un producto, guardar el ID para el flujo de categoría
    if (tipo === 'producto') {
      sessionStorage.setItem('productoEditandoId', id);
    }
    
    // Llenar el formulario con los datos actuales
    llenarFormularioEdicion(tipo, datos);
    
    // Mostrar el modal
    modalFondo.style.display = 'flex';
    
    // Enfocar el primer input
    setTimeout(() => {
      const primerInput = modalFondo.querySelector('input, select');
      if (primerInput) {
        primerInput.focus();
      }
    }, 100);
    
    // Verificar si hay una categoría recién creada para preseleccionar
    const categoriaRecienCreada = sessionStorage.getItem('categoriaRecienCreada');
    if (categoriaRecienCreada && tipo === 'producto') {
      try {
        const categoria = JSON.parse(categoriaRecienCreada);
        preseleccionarCategoriaRecienCreada('producto-categoria-editar', categoria);
      } catch (e) {
        console.error('Error al parsear categoría recién creada:', e);
      }
    }
    
    console.log(`✅ Modal de edición ${tipo} abierto correctamente`);
  } else {
    console.error(`❌ No se encontró el modal de edición para ${tipo}`);
  }
}

// Función para cerrar modal de edición
function cerrarModalEdicion(tipo) {
  console.log(`🔒 Cerrando modal de edición ${tipo}...`);
  
  const modalFondo = document.getElementById(`modal-fondo-editar-${tipo}`);
  
  if (modalFondo) {
    modalFondo.style.display = 'none';
    
    // Limpiar el formulario
    const form = modalFondo.querySelector('form');
    if (form) {
      form.reset();
    }
    
    // Si es el modal de edición de producto, recargar la página solo si no estamos creando una categoría
    if (tipo === 'producto') {
      const creandoCategoria = sessionStorage.getItem('creandoCategoriaDesdeProductoEditar');
      if (!creandoCategoria) {
        location.reload();
      }
    }
    
    console.log(`✅ Modal de edición ${tipo} cerrado correctamente`);
  } else {
    console.error(`❌ No se encontró el modal de edición para ${tipo}`);
  }
}

// Función para llenar el formulario de edición con datos
function llenarFormularioEdicion(tipo, datos) {
  const modalFondo = document.getElementById(`modal-fondo-editar-${tipo}`);
  if (!modalFondo) return;
  
  const form = modalFondo.querySelector('form');
  if (!form) return;
  
  // Llenar el campo ID oculto
  const idInput = form.querySelector(`input[name="${tipo}-id"]`);
  console.log('🔍 Buscando campo ID:', `input[name="${tipo}-id"]`);
  console.log('🔍 Campo ID encontrado:', idInput);
  if (idInput) {
    idInput.value = datos.id;
    console.log('✅ Campo ID llenado con valor:', datos.id);
  } else {
    console.error('❌ No se encontró el campo ID para', tipo);
  }
  
  // Llenar los campos según el tipo
  switch (tipo) {
    case 'producto':
      form.querySelector('#producto-nombre-editar').value = datos.nombre || '';
      form.querySelector('#producto-descripcion-editar').value = datos.descripcion || '';
      form.querySelector('#producto-precio-editar').value = datos.precio || '';
      form.querySelector('#producto-stock-actual-editar').value = datos.stock_actual || '';
      form.querySelector('#producto-stock-minimo-editar').value = datos.stock_minimo || '';
      form.querySelector('#producto-compra-editar').value = datos.compra_id || '';
      form.querySelector('#producto-categoria-editar').value = datos.categoria_id || '';
      form.querySelector('#producto-establecimiento-editar').value = datos.establecimiento_id || '';
      // Actualizar la imagen
      const inputImagen = form.querySelector('#producto-imagen-editar');
      const vistaPrevia = form.querySelector('#vista-previa-imagen-editar');
      const imgPrevia = vistaPrevia.querySelector('img');
      if (inputImagen && datos.imagen) {
        inputImagen.value = datos.imagen;
        if (imgPrevia) {
          imgPrevia.src = `/static/${datos.imagen}`;
          vistaPrevia.style.display = 'block';
        }
      }
      break;
      
    case 'categoria':
      form.querySelector('#categoria-nombre-editar').value = datos.nombre || '';
      form.querySelector('#categoria-descripcion-editar').value = datos.descripcion || '';
      break;
      
    case 'compra':
      form.querySelector('#compra-fecha-editar').value = datos.fecha || '';
      form.querySelector('#compra-total-editar').value = datos.total || '';
      form.querySelector('#compra-iva-editar').value = datos.iva || '';
      form.querySelector('#compra-estado-editar').value = datos.estado ? 'True' : 'False';
      form.querySelector('#compra-establecimiento-editar').value = datos.establecimiento_id || '';
      form.querySelector('#compra-vendedor-editar').value = datos.vendedor_id || '';
      break;
      
    case 'vendedor':
      form.querySelector('#vendedor-nombre-editar').value = datos.nombre || '';
      form.querySelector('#vendedor-telefono-editar').value = datos.telefono || '';
      form.querySelector('#vendedor-email-editar').value = datos.email || '';
      form.querySelector('#vendedor-proveedor-editar').value = datos.proveedor_id || '';
      break;
      
    case 'proveedor':
      if (form.querySelector('#proveedor-nombre-editar')) {
          form.querySelector('#proveedor-nombre-editar').value = datos.nombre || '';
      }
      if (form.querySelector('#proveedor-telefono-editar')) {
          form.querySelector('#proveedor-telefono-editar').value = datos.telefono || '';
      }
      if (form.querySelector('#proveedor-email-editar')) {
          form.querySelector('#proveedor-email-editar').value = datos.email || '';
      }
      break;
  }
}

// Función para manejar el envío de formularios de edición
function manejarFormularioEdicion(tipo, formData) {
  console.log('📝 Formulario de edición', tipo, 'enviado');
  console.log('📋 Datos del formulario:', formData);
  
  const id = formData[`${tipo}-id`];
  console.log('🆔 ID extraído:', id);
  
  delete formData[`${tipo}-id`];
  let dataToSend = {};
  switch (tipo) {
    case 'producto':
      dataToSend = {
        nombre: formData['producto-nombre'],
        descripcion: formData['producto-descripcion'],
        precio: formData['producto-precio'],
        stock_actual: formData['producto-stock-actual'],
        stock_minimo: formData['producto-stock-minimo'],
        compra_id: formData['producto-compra'],
        categoria_id: formData['producto-categoria'],
        establecimiento_id: formData['producto-establecimiento'],
        imagen: formData['producto-imagen']
      };
      // Validaciones consistentes con creación
      let erroresProducto = [];
      erroresProducto = erroresProducto.concat(validarNombre(dataToSend.nombre, 'nombre', 3, 30));
      erroresProducto = erroresProducto.concat(validarDescripcion(dataToSend.descripcion, 'descripción', 5, 50));
      erroresProducto = erroresProducto.concat(validarPrecioChileno(dataToSend.precio));
      erroresProducto = erroresProducto.concat(validarNumeroEntero(dataToSend.stock_actual, 'stock actual', 0, 99999));
      erroresProducto = erroresProducto.concat(validarNumeroEntero(dataToSend.stock_minimo, 'stock mínimo', 0, 99999));
      if (!dataToSend.categoria_id) erroresProducto.push('Debe seleccionar una categoría');
      if (!dataToSend.establecimiento_id) erroresProducto.push('Debe seleccionar un establecimiento');
      if (!dataToSend.imagen) erroresProducto.push('Debe seleccionar una imagen');
      if (erroresProducto.length > 0) {
        mostrarErroresValidacion(erroresProducto, 'Errores en el formulario de producto');
        return;
      }
      break;
    case 'categoria':
      dataToSend = {
        nombre: formData['categoria-nombre'],
        descripcion: formData['categoria-descripcion']
      };
      // Validaciones consistentes con creación
      let erroresCategoria = [];
      erroresCategoria = erroresCategoria.concat(validarNombre(dataToSend.nombre, 'nombre', 3, 30));
      erroresCategoria = erroresCategoria.concat(validarDescripcion(dataToSend.descripcion, 'descripción', 5, 50));
      if (erroresCategoria.length > 0) {
        mostrarErroresValidacion(erroresCategoria, 'Errores en el formulario de categoría');
        return;
      }
      break;
    case 'compra':
      dataToSend = {
        fecha: formData['compra-fecha'],
        total: formData['compra-total'],
        iva: formData['compra-iva'],
        estado: formData['compra-estado'],
        establecimiento_id: formData['compra-establecimiento'],
        vendedor_id: formData['compra-vendedor']
      };
      // Validaciones consistentes con creación
      let erroresCompra = [];
      erroresCompra = erroresCompra.concat(validarFecha(dataToSend.fecha, 'fecha'));
      erroresCompra = erroresCompra.concat(validarPrecioChileno(dataToSend.total, 'total'));
      erroresCompra = erroresCompra.concat(validarPorcentaje(dataToSend.iva, 'IVA', 0, 100));
      if (!dataToSend.estado) erroresCompra.push('Debe seleccionar un estado');
      if (!dataToSend.establecimiento_id) erroresCompra.push('Debe seleccionar un establecimiento');
      if (!dataToSend.vendedor_id) erroresCompra.push('Debe seleccionar un vendedor');
      if (erroresCompra.length > 0) {
        mostrarErroresValidacion(erroresCompra, 'Errores en el formulario de compra');
        return;
      }
      break;
    case 'vendedor':
      dataToSend = {
        nombre: formData['vendedor-nombre'],
        telefono: formData['vendedor-telefono'],
        email: formData['vendedor-email'],
        proveedor_id: formData['vendedor-proveedor']
      };
      // Validaciones consistentes con creación
      let erroresVendedor = [];
      erroresVendedor = erroresVendedor.concat(validarNombre(dataToSend.nombre, 'nombre', 3, 30));
      erroresVendedor = erroresVendedor.concat(validarTelefonoChileno(dataToSend.telefono, 'teléfono'));
      erroresVendedor = erroresVendedor.concat(validarEmail(dataToSend.email, 'email'));
      if (!dataToSend.proveedor_id) erroresVendedor.push('Debe seleccionar un proveedor');
      if (erroresVendedor.length > 0) {
        mostrarErroresValidacion(erroresVendedor, 'Errores en el formulario de vendedor');
        return;
      }
      break;
    case 'proveedor':
      dataToSend = {
          nombre: formData['proveedor-nombre'],
          telefono: formData['proveedor-telefono'],
          email: formData['proveedor-email']
      };
      // Validaciones consistentes con creación
      let erroresProveedor = [];
      erroresProveedor = erroresProveedor.concat(validarNombre(dataToSend.nombre, 'nombre', 3, 100));
      erroresProveedor = erroresProveedor.concat(validarTelefonoChileno(dataToSend.telefono, 'teléfono'));
      erroresProveedor = erroresProveedor.concat(validarEmail(dataToSend.email, 'email'));
      if (erroresProveedor.length > 0) {
        mostrarErroresValidacion(erroresProveedor, 'Errores en el formulario de proveedor');
        return;
      }
      break;
  }
  
  // Llamar a la función de actualización correspondiente
  const funcionesActualizacion = {
    'producto': actualizarProducto,
    'categoria': actualizarCategoria,
    'compra': actualizarCompraVendedor,
    'vendedor': actualizarVendedor,
    'proveedor': actualizarProveedor
  };
  
  const funcionActualizacion = funcionesActualizacion[tipo];
  if (funcionActualizacion) {
    funcionActualizacion(id, dataToSend)
      .then(response => {
        if (!response.error) {
          actualizarVista(response, tipo);
          cerrarModalEdicion(tipo);
        } else {
          Swal.fire('Error', response.error || `Hubo un problema al actualizar el ${tipo}.`, 'error');
        }
      })
      .catch(error => {
        Swal.fire('Error', 'Ocurrió un error de red.', 'error');
      });
  }
}

// Función para obtener datos de una fila de la tabla
function obtenerDatosFila(tipo, id) {
  console.log('Obteniendo datos para:', tipo, 'con ID:', id);
  
  // Mapeo de tipos a nombres de sección
  const secciones = {
    'producto': 'productos',
    'categoria': 'categorias',
    'compra': 'compras',
    'vendedor': 'vendedores',
    'proveedor': 'proveedores'
  };
  
  // Verificar que estamos en la sección correcta
  const nombreSeccion = secciones[tipo];
  if (!nombreSeccion) {
    console.error(`Tipo de sección no válido: ${tipo}`);
    return null;
  }
  
  const seccion = document.querySelector(`section[name="seccion-${nombreSeccion}"]`);
  if (!seccion) {
    console.error(`No se encontró la sección de ${nombreSeccion}`);
    return null;
  }
  
  // Buscar la fila dentro de la sección correcta
  const row = seccion.querySelector(`tr[data-id="${id}"]`);
  if (!row) {
    console.error(`No se encontró la fila con ID ${id} en la sección de ${nombreSeccion}`);
    return null;
  }
  
  console.log('Fila encontrada:', row);
  const cells = row.cells;
  console.log('Celdas encontradas:', cells.length);
  
  let datos = null;
  
  switch (tipo) {
    case 'producto':
      if (cells.length >= 8) {
        datos = {
          id: id,
          nombre: cells[0].textContent,
          descripcion: cells[1].textContent,
          precio: cells[2].textContent,
          stock_actual: cells[3].textContent,
          stock_minimo: cells[4].textContent,
          compra_id: row.getAttribute('data-compra-id') || '',
          categoria_id: row.getAttribute('data-categoria-id') || '',
          establecimiento_id: row.getAttribute('data-establecimiento-id') || '',
          imagen: row.querySelector('img') ? row.querySelector('img').src.split('/static/')[1] || '' : ''
        };
      }
      break;
      
    case 'categoria':
      if (cells.length >= 2) {
        datos = {
          id: id,
          nombre: cells[0].textContent,
          descripcion: cells[1].textContent
        };
      }
      break;
      
    case 'compra':
      if (cells.length >= 6) {
        datos = {
          id: id,
          fecha: cells[0].textContent,
          total: cells[1].textContent,
          iva: cells[2].textContent,
          estado: cells[3].textContent === 'Hecho',
          establecimiento_id: row.getAttribute('data-establecimiento-id') || '',
          vendedor_id: row.getAttribute('data-vendedor-id') || ''
        };
      }
      break;
      
    case 'vendedor':
      if (cells.length >= 4) {
        datos = {
          id: id,
          nombre: cells[0].textContent,
          telefono: cells[1].textContent,
          email: cells[2].textContent,
          proveedor_id: row.getAttribute('data-proveedor-id') || ''
        };
      }
      break;
      
    case 'proveedor':
      if (cells.length >= 3) {
        datos = {
          id: id,
          nombre: cells[0].textContent.trim(),
          telefono: cells[1].textContent.trim(),
          email: cells[2].textContent.trim()
        };
        console.log('Datos del proveedor obtenidos:', datos);
        
        // Validación adicional
        if (!datos.nombre || !datos.telefono || !datos.email) {
          console.error('Datos incompletos del proveedor:', datos);
          return null;
        }
        
        // Validación de formato
        if (!/^\d{9,11}$/.test(datos.telefono)) {
          console.error('Formato de teléfono inválido:', datos.telefono);
          return null;
        }
        
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(datos.email)) {
          console.error('Formato de email inválido:', datos.email);
          return null;
        }
      } else {
        console.error('Número insuficiente de celdas para proveedor:', cells.length);
      }
      break;
  }
  
  return datos;
}

// Función para inicializar los event listeners de los botones de edición
function inicializarBotonesEdicion() {
  console.log('🎯 Inicializando botones de edición...');
  
  // Botones de edición para cada tipo
  const tipos = ['producto', 'categoria', 'compra', 'vendedor', 'proveedor'];
  
  tipos.forEach(tipo => {
    const botones = document.querySelectorAll(`[name="btn-editar-${tipo}"]`);
    botones.forEach(boton => {
      boton.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        console.log(`🖱️ Botón editar ${tipo} clickeado para ID ${id}`);
        
        // Obtener datos básicos de la fila
        const datos = obtenerDatosFila(tipo, id);
        if (datos) {
          abrirModalEdicion(tipo, id, datos);
        } else {
          console.error(`❌ No se pudieron obtener los datos para ${tipo} con ID ${id}`);
    }
  });
});
  });
  
  // Event listeners para formularios de edición
  tipos.forEach(tipo => {
    const form = document.getElementById(`form-editar-${tipo}`);
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log(`📝 Formulario de edición ${tipo} enviado`);
        
        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
          data[key] = value;
        });
        
        manejarFormularioEdicion(tipo, data);
      });
    }
  });
  
  console.log('✅ Botones de edición inicializados correctamente');
}

///////////////////////////
// SELECCIÓN DE IMÁGENES //
///////////////////////////

// Función para inicializar el selector de imágenes
function inicializarSelectorImagenes() {
  // Elementos del formulario de creación
  const btnSeleccionarImagen = document.getElementById('btn-seleccionar-imagen');
  const btnSubirImagen = document.getElementById('btn-subir-imagen');
  const inputSubirImagen = document.getElementById('input-subir-imagen');
  const modalImagenes = document.getElementById('modal-imagenes');
  const galeriaImagenes = document.getElementById('galeria-imagenes');
  const inputImagen = document.getElementById('producto-imagen');
  const vistaPrevia = document.getElementById('vista-previa-imagen');
  const cerrarModal = document.querySelector('.cerrar-modal-imagenes');

  // Elementos del formulario de edición
  const btnSeleccionarImagenEditar = document.getElementById('btn-seleccionar-imagen-editar');
  const inputImagenEditar = document.getElementById('producto-imagen-editar');
  const vistaPreviaEditar = document.getElementById('vista-previa-imagen-editar');

  // Cargar las imágenes disponibles
  cargarImagenesDisponibles();

  // Función para manejar la selección de imagen
  function manejarSeleccionImagen(input, vistaPrevia) {
    return (imagen) => {
      input.value = imagen;
      const imgPrevia = vistaPrevia.querySelector('img');
      if (imgPrevia) {
        imgPrevia.src = `/static/${imagen}`;
        vistaPrevia.style.display = 'block';
      }
      modalImagenes.style.display = 'none';
    };
  }

  // Event listener para el botón de seleccionar imagen (creación)
  if (btnSeleccionarImagen) {
    btnSeleccionarImagen.addEventListener('click', () => {
      modalImagenes.style.display = 'block';
      modalImagenes.dataset.target = 'creacion';
    });
  }

  // Event listener para el botón de seleccionar imagen (edición)
  if (btnSeleccionarImagenEditar) {
    btnSeleccionarImagenEditar.addEventListener('click', () => {
      modalImagenes.style.display = 'block';
      modalImagenes.dataset.target = 'edicion';
      // Guardar el id del producto que se está editando
      const formEditar = btnSeleccionarImagenEditar.closest('form');
      if (formEditar) {
        modalImagenes.dataset.productoEditarId = formEditar.querySelector('[name="producto-id"]').value;
      }
    });
  }

  // Event listener para el botón de subir imagen
  if (btnSubirImagen) {
    btnSubirImagen.addEventListener('click', () => {
      inputSubirImagen.click();
    });
  }

  // Event listener para cuando se selecciona un archivo
  if (inputSubirImagen) {
    inputSubirImagen.addEventListener('change', (e) => {
      const archivo = e.target.files[0];
      if (archivo) {
        const formData = new FormData();
        formData.append('imagen', archivo);

        fetch('/subir_imagen_producto/', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Actualizar el input y la vista previa según el formulario activo
            const target = modalImagenes.dataset.target;
            if (target === 'creacion' && inputImagen) {
              inputImagen.value = data.ruta;
              actualizarVistaPrevia();
            } else if (target === 'edicion' && inputImagenEditar) {
              inputImagenEditar.value = data.ruta;
              const imgPrevia = vistaPreviaEditar.querySelector('img');
              if (imgPrevia) {
                imgPrevia.src = `/static/${data.ruta}`;
                vistaPreviaEditar.style.display = 'block';
              }
              // Actualizar la fila de la tabla si está visible
              const productoId = modalImagenes.dataset.productoEditarId;
              if (productoId) {
                const row = document.querySelector(`tr[data-id="${productoId}"]`);
                if (row) {
                  const imgCell = row.querySelector('td img');
                  if (imgCell) imgCell.src = `/static/${data.ruta}`;
                }
              }
            }
            
            // Recargar la galería de imágenes
            cargarImagenesDisponibles();
            
            // Cerrar el modal
            modalImagenes.style.display = 'none';
          } else {
            alert('Error al subir la imagen: ' + data.error);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Error al subir la imagen');
        });
      }
    });
  }

  // Event listener para cerrar el modal
  if (cerrarModal) {
    cerrarModal.addEventListener('click', () => {
      modalImagenes.style.display = 'none';
    });
  }

  // Cerrar modal al hacer clic fuera
  window.addEventListener('click', (e) => {
    if (e.target === modalImagenes) {
      modalImagenes.style.display = 'none';
    }
  });

  // Event listeners para los inputs de imagen
  if (inputImagen) {
    inputImagen.addEventListener('change', actualizarVistaPrevia);
  }
  if (inputImagenEditar) {
    inputImagenEditar.addEventListener('change', () => {
      const imgPrevia = vistaPreviaEditar.querySelector('img');
      if (imgPrevia && inputImagenEditar.value) {
        imgPrevia.src = `/static/${inputImagenEditar.value}`;
        vistaPreviaEditar.style.display = 'block';
      } else {
        vistaPreviaEditar.style.display = 'none';
      }
    });
  }
}

// Función para cargar las imágenes disponibles
function cargarImagenesDisponibles() {
  const galeriaImagenes = document.getElementById('galeria-imagenes');
  const modalImagenes = document.getElementById('modal-imagenes');

  if (!galeriaImagenes) return;

  // Hacer una petición al servidor para obtener la lista de imágenes
  fetch('/obtener_imagenes_productos/')
    .then(response => response.json())
    .then(data => {
      galeriaImagenes.innerHTML = '';
      data.imagenes.forEach(imagen => {
        const div = document.createElement('div');
        div.className = 'imagen-item';
        div.innerHTML = `
          <img src="/static/${imagen}" alt="${imagen.split('/').pop()}" data-ruta="${imagen}">
        `;
        
        // Event listener para seleccionar imagen
        div.addEventListener('click', () => {
          const target = modalImagenes.dataset.target;
          if (target === 'creacion') {
            const inputImagen = document.getElementById('producto-imagen');
            const vistaPrevia = document.getElementById('vista-previa-imagen');
            if (inputImagen && vistaPrevia) {
              inputImagen.value = imagen;
              const imgPrevia = vistaPrevia.querySelector('img');
              if (imgPrevia) {
                imgPrevia.src = `/static/${imagen}`;
                vistaPrevia.style.display = 'block';
              }
            }
          } else if (target === 'edicion') {
            const inputImagen = document.getElementById('producto-imagen-editar');
            const vistaPrevia = document.getElementById('vista-previa-imagen-editar');
            if (inputImagen && vistaPrevia) {
              inputImagen.value = imagen;
              const imgPrevia = vistaPrevia.querySelector('img');
              if (imgPrevia) {
                imgPrevia.src = `/static/${imagen}`;
                vistaPrevia.style.display = 'block';
              }
            }
          }
          modalImagenes.style.display = 'none';
        });
        
        galeriaImagenes.appendChild(div);
      });
    })
    .catch(error => console.error('Error al cargar imágenes:', error));
}

// Función para actualizar la vista previa de la imagen
function actualizarVistaPrevia() {
  const inputImagen = document.getElementById('producto-imagen');
  const vistaPrevia = document.getElementById('vista-previa-imagen');
  const imgPrevia = vistaPrevia.querySelector('img');
  
  if (inputImagen.value) {
    imgPrevia.src = `/static/${inputImagen.value}`;
    vistaPrevia.style.display = 'block';
  } else {
    vistaPrevia.style.display = 'none';
  }
}

// Función para abrir modal de categoría desde el formulario de producto
function abrirModalCategoriaDesdeProducto() {
  // Marcar que venimos del flujo de producto
  sessionStorage.setItem('creandoCategoriaDesdeProducto', 'true');
  // Abrir el modal de categoría
  cerrarModal('producto');
  abrirModal('categoria');
}

function abrirModalCategoriaDesdeProductoEditar() {
  // Obtener los datos actuales del formulario de producto
  const formProducto = document.getElementById('form-editar-producto');
  const datosProducto = {
    id: formProducto.querySelector('#producto-id-editar').value, // <-- AGREGO EL ID
    nombre: formProducto.querySelector('#producto-nombre-editar').value,
    descripcion: formProducto.querySelector('#producto-descripcion-editar').value,
    precio: formProducto.querySelector('#producto-precio-editar').value,
    stock_actual: formProducto.querySelector('#producto-stock-actual-editar').value,
    stock_minimo: formProducto.querySelector('#producto-stock-minimo-editar').value,
    compra_id: formProducto.querySelector('#producto-compra-editar').value,
    categoria_id: formProducto.querySelector('#producto-categoria-editar').value,
    establecimiento_id: formProducto.querySelector('#producto-establecimiento-editar').value,
    imagen: formProducto.querySelector('#producto-imagen-editar').value
  };
  
  // Guardar los datos en sessionStorage
  sessionStorage.setItem('datosProductoEdicion', JSON.stringify(datosProducto));
  sessionStorage.setItem('creandoCategoriaDesdeProductoEditar', 'true');
  
  // Cerrar el modal de edición de producto
  cerrarModalEdicion('producto');
  // Abrir el modal de categoría
  abrirModal('categoria');
}

// Función para preseleccionar una categoría recién creada en el select
function preseleccionarCategoriaRecienCreada(selectId, categoria) {
  const select = document.getElementById(selectId);
  if (!select) {
    console.error(`No se encontró el select con ID: ${selectId}`);
    return;
  }
  
  // Verificar si la categoría ya existe en el select
  let categoriaExiste = false;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === categoria.id.toString()) {
      categoriaExiste = true;
      break;
    }
  }
  
  if (!categoriaExiste) {
    // Agregar la nueva categoría al select
    const option = document.createElement('option');
    option.value = categoria.id;
    option.textContent = categoria.nombre;
    select.appendChild(option);
  }
  
  // Preseleccionar la categoría
  select.value = categoria.id;
  
  // Limpiar la categoría recién creada del sessionStorage
  sessionStorage.removeItem('categoriaRecienCreada');
  
  console.log(`✅ Categoría "${categoria.nombre}" preseleccionada en ${selectId}`);
}