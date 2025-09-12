////////////////////////////////
// FUNCIONES DE VALIDACIÓN //
// Adaptadas para Chile //
////////////////////////////////

// Debug: Verificar disponibilidad de SweetAlert2
console.log('🔍 Verificando disponibilidad de SweetAlert2...');
if (typeof Swal !== 'undefined' && Swal.fire) {
  console.log('✅ SweetAlert2 está disponible');
} else {
  console.warn('⚠️ SweetAlert2 no está disponible, usando fallback con alert()');
}

// Función para mostrar errores con SweetAlert2
function mostrarErroresValidacion(errores, titulo = 'Errores de Validación') {
  if (errores.length === 0) return false;
  
  const listaErrores = errores.map(error => `• ${error}`).join('\n');
  
  console.log('🚨 Mostrando errores de validación:', { titulo, errores });
  console.log('🔍 Verificando SweetAlert2:', { 
    swalDefined: typeof Swal !== 'undefined', 
    swalFire: typeof Swal !== 'undefined' ? typeof Swal.fire : 'N/A' 
  });
  
  // Verificar si SweetAlert2 está disponible
  if (typeof Swal !== 'undefined' && Swal.fire) {
    console.log('✅ Usando SweetAlert2 para mostrar errores');
    Swal.fire({
      title: titulo,
      html: `<div style="text-align: left; color: #d33;">
        <p style="margin-bottom: 10px; font-weight: bold;">Por favor, corrija los siguientes errores:</p>
        <pre style="white-space: pre-wrap; font-family: inherit; color: #d33;">${listaErrores}</pre>
      </div>`,
      icon: 'error',
      confirmButtonColor: '#d33',
      confirmButtonText: 'Entendido',
      width: '500px'
    });
  } else {
    // Fallback si SweetAlert2 no está disponible
    console.log('⚠️ Usando fallback alert() para mostrar errores');
    alert(`${titulo}\n\n${listaErrores}`);
  }
  
  return true;
}

// Función para mostrar éxito con SweetAlert2
function mostrarExitoValidacion(mensaje, titulo = '¡Éxito!') {
  console.log('🎉 Mostrando mensaje de éxito:', { titulo, mensaje });
  
  // Verificar si SweetAlert2 está disponible
  if (typeof Swal !== 'undefined' && Swal.fire) {
    console.log('✅ Usando SweetAlert2 para mostrar éxito');
    return Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'success',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Aceptar'
    }).then((result) => {
      // Recargar la página después de que el usuario cierre el SweetAlert
      if (result.isConfirmed) {
        console.log('🔄 Recargando página después del mensaje de éxito...');
        window.location.reload();
      }
    });
  } else {
    // Fallback si SweetAlert2 no está disponible
    console.log('⚠️ Usando fallback alert() para mostrar éxito');
    alert(`${titulo}\n${mensaje}`);
    // Recargar la página después del alert
    window.location.reload();
    // Devolver una Promise resuelta para mantener compatibilidad
    return Promise.resolve();
  }
}

// Función para validar nombre genérico
function validarNombre(nombre, campo = 'nombre', minLength = 3, maxLength = 30, permitirNumeros = false, mostrarAlerta = false) {
  const errores = [];
  
  if (!nombre) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (nombre.length < minLength) {
    errores.push(`El ${campo} debe tener al menos ${minLength} caracteres`);
  } else if (nombre.length > maxLength) {
    errores.push(`El ${campo} no puede exceder los ${maxLength} caracteres`);
  } else if (/^\s+$/.test(nombre)) {
    errores.push(`El ${campo} no puede contener solo espacios en blanco`);
  } else {
    const regex = permitirNumeros 
      ? /^[A-Za-zÑñÁÉÍÓÚáéíóú0-9\s\-.,()&]+$/
      : /^[A-Za-zÑñÁÉÍÓÚáéíóú\s\-]+$/;
    if (!regex.test(nombre)) {
      errores.push(`El ${campo} contiene caracteres no permitidos`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar descripción
function validarDescripcion(descripcion, campo = 'descripción', minLength = 5, maxLength = 50, mostrarAlerta = false) {
  const errores = [];
  
  if (!descripcion) {
    errores.push(`La ${campo} es obligatoria`);
  } else if (descripcion.length < minLength) {
    errores.push(`La ${campo} debe tener al menos ${minLength} caracteres`);
  } else if (descripcion.length > maxLength) {
    errores.push(`La ${campo} no puede exceder los ${maxLength} caracteres`);
  } else if (/^\s+$/.test(descripcion)) {
    errores.push(`La ${campo} no puede contener solo espacios en blanco`);
  } else if (!/^[A-Za-zÑñÁÉÍÓÚáéíóú0-9\s\-.,()&]+$/.test(descripcion)) {
    errores.push(`La ${campo} contiene caracteres no permitidos`);
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar precio en pesos chilenos (enteros, mínimo 1 peso)
function validarPrecioChileno(valor, campo = 'precio', min = 1, max = 999999999, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!valor && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (valor) {
    if (isNaN(valor) || parseInt(valor) < min) {
      errores.push(`El ${campo} debe ser un número entero mayor o igual a ${min} peso`);
    } else if (parseInt(valor) > max) {
      errores.push(`El ${campo} no puede exceder ${max.toLocaleString('es-CL')} pesos`);
    } else if (!/^\d+$/.test(valor)) {
      errores.push(`El ${campo} debe ser un número entero (sin decimales)`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar número decimal (para IVA, porcentajes, etc.)
function validarNumeroDecimal(valor, campo = 'valor', min = 0, max = 999999.99, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!valor && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (valor) {
    if (isNaN(valor) || parseFloat(valor) < min) {
      errores.push(`El ${campo} debe ser un número mayor o igual a ${min}`);
    } else if (parseFloat(valor) > max) {
      errores.push(`El ${campo} no puede exceder ${max}`);
    } else if (!/^\d+(\.\d{1,2})?$/.test(valor)) {
      errores.push(`El ${campo} debe tener máximo 2 decimales`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar número entero
function validarNumeroEntero(valor, campo = 'valor', min = 0, max = 99999, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!valor && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (valor) {
    if (isNaN(valor) || parseInt(valor) < min) {
      errores.push(`El ${campo} debe ser un número mayor o igual a ${min}`);
    } else if (parseInt(valor) > max) {
      errores.push(`El ${campo} no puede exceder ${max.toLocaleString('es-CL')}`);
    } else if (!/^\d+$/.test(valor)) {
      errores.push(`El ${campo} debe ser un número entero`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar email
function validarEmail(email, campo = 'email', maxLength = 100, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!email && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (email) {
    if (email.length > maxLength) {
      errores.push(`El ${campo} no puede exceder los ${maxLength} caracteres`);
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        errores.push(`El ${campo} no tiene un formato válido (ejemplo: usuario@dominio.com)`);
      }
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar teléfono chileno (formato flexible)
function validarTelefonoChileno(telefono, campo = 'teléfono', obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!telefono && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (telefono) {
    // Formato chileno: +56 9 1234 5678, 9 1234 5678, 912345678, etc.
    if (!/^[\d\s\+\-\(\)]{8,15}$/.test(telefono)) {
      errores.push(`El ${campo} debe tener entre 8 y 15 dígitos y puede incluir +, -, (, )`);
    } else if (!/[\d]/.test(telefono)) {
      errores.push(`El ${campo} debe contener al menos un dígito`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar teléfono numérico chileno (solo dígitos)
function validarTelefonoNumericoChileno(telefono, campo = 'teléfono', obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!telefono && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (telefono) {
    // Teléfonos chilenos: 9 dígitos (móvil) o 8 dígitos (fijo)
    if (!/^[\d]{8,9}$/.test(telefono)) {
      errores.push(`El ${campo} debe tener 8 o 9 dígitos numéricos`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar fecha (adaptada a Chile)
function validarFecha(fecha, campo = 'fecha', obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  if (!fecha && obligatorio) {
    errores.push(`La ${campo} es obligatoria`);
  } else if (fecha) {
    const hoy = new Date();
    const inicio = new Date(fecha);
    hoy.setHours(0,0,0,0);
    inicio.setHours(0,0,0,0);
    // Calcula 'ayer'
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (inicio < ayer) {
      errores.push(`La ${campo} no puede ser anterior a hoy`);
    }
  }
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  return errores;
}

// Función para validar horario (adaptado a horarios chilenos)
function validarHorario(horario, campo = 'horario', horaMin = 0, horaMax = 23, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!horario && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (horario) {
    const hora = parseInt(horario.split(':')[0]);
    if (hora < horaMin || hora > horaMax) {
      errores.push(`El ${campo} debe ser entre las ${horaMin}:00 y ${horaMax}:59`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar selección
function validarSeleccion(valor, campo = 'campo', obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (obligatorio && (!valor || valor === "" || valor === "0")) {
    errores.push(`Debe seleccionar un ${campo} válido`);
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar RUT chileno (opcional, para futuras implementaciones)
function validarRUT(rut, campo = 'RUT', obligatorio = false, mostrarAlerta = false) {
  const errores = [];
  
  if (!rut && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (rut) {
    // Formato básico de RUT chileno: 12345678-9 o 12345678-9
    const rutRegex = /^[0-9]{7,8}-[0-9kK]$/;
    if (!rutRegex.test(rut)) {
      errores.push(`El ${campo} debe tener el formato 12345678-9`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar dirección chilena
function validarDireccionChilena(direccion, campo = 'dirección', minLength = 5, maxLength = 200, mostrarAlerta = false) {
  const errores = [];
  
  if (!direccion) {
    errores.push(`La ${campo} es obligatoria`);
  } else if (direccion.length < minLength) {
    errores.push(`La ${campo} debe tener al menos ${minLength} caracteres`);
  } else if (direccion.length > maxLength) {
    errores.push(`La ${campo} no puede exceder los ${maxLength} caracteres`);
  } else if (/^\s+$/.test(direccion)) {
    errores.push(`La ${campo} no puede contener solo espacios en blanco`);
  } else if (!/^[A-Za-zÑñÁÉÍÓÚáéíóú0-9\s\-\#\,\.]+$/.test(direccion)) {
    errores.push(`La ${campo} contiene caracteres no permitidos`);
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para formatear precio en pesos chilenos
function formatearPrecioChileno(precio) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(precio);
}

// Función para validar que un valor sea un número entero positivo
function validarEnteroPositivo(valor, campo = 'valor', max = 999999999, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!valor && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (valor) {
    if (isNaN(valor) || parseInt(valor) <= 0) {
      errores.push(`El ${campo} debe ser un número entero positivo`);
    } else if (parseInt(valor) > max) {
      errores.push(`El ${campo} no puede exceder ${max.toLocaleString('es-CL')}`);
    } else if (!/^\d+$/.test(valor)) {
      errores.push(`El ${campo} debe ser un número entero`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar porcentaje (IVA, descuentos, etc.)
function validarPorcentaje(valor, campo = 'porcentaje', min = 0, max = 100, obligatorio = true, mostrarAlerta = false) {
  const errores = [];
  
  if (!valor && obligatorio) {
    errores.push(`El ${campo} es obligatorio`);
  } else if (valor) {
    if (isNaN(valor) || parseFloat(valor) < min) {
      errores.push(`El ${campo} debe ser un número mayor o igual a ${min}%`);
    } else if (parseFloat(valor) > max) {
      errores.push(`El ${campo} no puede exceder el ${max}%`);
    } else if (!/^\d+(\.\d{1,2})?$/.test(valor)) {
      errores.push(`El ${campo} debe tener máximo 2 decimales`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar contraseña (con requisitos de seguridad)
function validarContrasena(contrasena, campo = 'contraseña', minLength = 8, mostrarAlerta = false) {
  const errores = [];
  
  if (!contrasena) {
    errores.push(`La ${campo} es obligatoria`);
  } else {
    if (contrasena.length < minLength) {
      errores.push(`La ${campo} debe tener al menos ${minLength} caracteres`);
    }
    
    if (!/[A-Z]/.test(contrasena)) {
      errores.push(`La ${campo} debe contener al menos una letra mayúscula`);
    }
    
    if (!/[a-z]/.test(contrasena)) {
      errores.push(`La ${campo} debe contener al menos una letra minúscula`);
    }
    
    if (!/\d/.test(contrasena)) {
      errores.push(`La ${campo} debe contener al menos un número`);
    }
    
    if (!/[^A-Za-z0-9]/.test(contrasena)) {
      errores.push(`La ${campo} debe contener al menos un carácter especial`);
    }
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar confirmación de contraseña
function validarConfirmacionContrasena(contrasena, confirmacion, campo = 'confirmación de contraseña', mostrarAlerta = false) {
  const errores = [];
  
  if (!confirmacion) {
    errores.push(`La ${campo} es obligatoria`);
  } else if (contrasena !== confirmacion) {
    errores.push(`Las contraseñas no coinciden`);
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar campos obligatorios
function validarCampoObligatorio(valor, campo = 'campo', mostrarAlerta = false) {
  const errores = [];
  
  if (!valor || valor.trim() === '') {
    errores.push(`El ${campo} es obligatorio`);
  }
  
  if (mostrarAlerta && errores.length > 0) {
    mostrarErroresValidacion(errores, `Error en ${campo}`);
  }
  
  return errores;
}

// Función para validar múltiples campos y mostrar todos los errores juntos
function validarFormulario(validaciones, titulo = 'Errores en el Formulario') {
  const todosLosErrores = [];
  
  validaciones.forEach(validacion => {
    const errores = validacion();
    todosLosErrores.push(...errores);
  });
  
  if (todosLosErrores.length > 0) {
    mostrarErroresValidacion(todosLosErrores, titulo);
    return false;
  }
  
  return true;
} 
