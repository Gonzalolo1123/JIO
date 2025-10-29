document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM cargado, configurando modal de login...");
  
  const signUpButton = document.getElementById("signUp");
  const signInButton = document.getElementById("signIn");
  const container = document.getElementById("container");

  const usuarioBtn = document.getElementById("usuarioBtn");
  const loginLink = document.getElementById("loginLink");
  const authModal = document.getElementById("authModal");
  const closeModal = document.getElementById("closeModal");

  console.log("🔍 Elementos encontrados:");
  console.log("  - loginLink:", loginLink);
  console.log("  - authModal:", authModal);
  console.log("  - closeModal:", closeModal);

  signUpButton?.addEventListener("click", function () {
    container.classList.add("right-panel-active");
  });

  signInButton?.addEventListener("click", function () {
    container.classList.remove("right-panel-active");
  });

  usuarioBtn?.addEventListener("click", () => {
    authModal.classList.remove("hidden");
  });

  // Nuevo event listener para el enlace de login en el menú
  if (loginLink) {
    console.log("✅ Configurando event listener para loginLink");
    loginLink.addEventListener("click", (e) => {
      console.log("🖱️ Click en loginLink detectado");
      e.preventDefault();
      if (authModal) {
        console.log("👁️ Mostrando modal...");
        authModal.classList.remove("hidden");
        authModal.classList.add("show");
        console.log("📊 Estado del modal:", {
          hidden: authModal.classList.contains("hidden"),
          show: authModal.classList.contains("show"),
          display: window.getComputedStyle(authModal).display
        });
      } else {
        console.error("❌ authModal no encontrado");
      }
    });
  } else {
    console.error("❌ loginLink no encontrado");
  }

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      console.log("🔒 Cerrando modal...");
      authModal.classList.add("hidden");
      authModal.classList.remove("show");
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === authModal) {
      console.log("🔒 Cerrando modal (click fuera)...");
      authModal.classList.add("hidden");
      authModal.classList.remove("show");
    }
  });
});

//Registro 
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM cargado, configurando formulario de registro...");
  
  const form = document.getElementById("signUpForm");
  console.log("📝 Formulario encontrado:", form);
  
  let userDataForVerification = null; // Variable para almacenar datos del usuario

  form.addEventListener("submit", async function (e) {
    console.log("📤 Formulario de registro enviado");
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const apellido = document.getElementById("apellido").value;
    const correo = document.getElementById("correo").value;
    const telefono = document.getElementById("telefono").value;
    const contrasena = document.getElementById("contrasena").value;
    const confirmContrasena = document.getElementById("Confirmcontrasena").value;
    const estado = "Activo";

    console.log("📋 Datos del formulario:", { nombre, apellido, correo, telefono, estado });

    //###################Validaciones usando funciones de validaciones.js######################
    const errores = [];
    
    // Validar nombre
    errores.push(...validarNombre(nombre, 'nombre', 3, 30, false));
    
    // Validar apellido
    errores.push(...validarNombre(apellido, 'apellido', 3, 30, false));
    
    // Validar correo
    errores.push(...validarEmail(correo, 'correo electrónico', 100, true));
    
    // Validar teléfono (opcional pero si se ingresa debe ser válido)
    if (telefono) {
      errores.push(...validarTelefonoNumericoChileno(telefono, 'teléfono', false));
    }
    
    // Validar contraseña
    errores.push(...validarContrasena(contrasena, 'contraseña', 8));
    
    // Validar confirmación de contraseña
    errores.push(...validarConfirmacionContrasena(contrasena, confirmContrasena, 'confirmación de contraseña'));
    
    // Si hay errores, mostrarlos y detener el proceso
    if (errores.length > 0) {
      console.log("❌ Errores de validación encontrados:", errores);
      mostrarErroresValidacion(errores, 'Errores en el Formulario de Registro');
      
      // Enfocar el primer campo con error
      if (errores.some(e => e.includes('nombre'))) {
        document.getElementById("nombre").focus();
      } else if (errores.some(e => e.includes('apellido'))) {
        document.getElementById("apellido").focus();
      } else if (errores.some(e => e.includes('correo'))) {
        document.getElementById("correo").focus();
      } else if (errores.some(e => e.includes('teléfono'))) {
        document.getElementById("telefono").focus();
      } else if (errores.some(e => e.includes('contraseña'))) {
        document.getElementById("contrasena").focus();
      } else if (errores.some(e => e.includes('confirmación'))) {
        document.getElementById("Confirmcontrasena").focus();
      }
      return;
    }

    console.log("✅ Todas las validaciones pasaron");

    // Obtener el token CSRF
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    console.log("🔐 Token CSRF obtenido:", csrfToken ? "Sí" : "No");

    // Verificar si el correo ya existe
    try {
      console.log("🔍 Verificando si el correo existe...");
      const verificarResponse = await fetch("/verificar-correo/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ correo: correo })
      });

      const verificarData = await verificarResponse.json();
      console.log("📧 Respuesta de verificación:", verificarData);

      if (verificarData.existe) {
        console.log("❌ Correo ya existe");
        showErrorAlert("El correo ya está registrado. Por favor, utiliza otro correo");
        return;
      }

      console.log("✅ Correo disponible, procediendo con verificación");

      // Si el correo no existe, proceder con la verificación
      userDataForVerification = {
        nombre: nombre,
        apellido: apellido,
        correo: correo,
        telefono: telefono,
        contrasena: contrasena,
        estado: estado,
        nivel_acceso: "cliente"
      };

      console.log("📋 Datos guardados para verificación:", userDataForVerification);

      // Mostrar modal de verificación
      console.log("🔄 Mostrando modal de verificación...");
      mostrarModalVerificacion(correo);

    } catch (error) {
      console.error("💥 Error en el proceso:", error);
      showErrorAlert("Ocurrió un error: " + error.message);
    }
  });

  // Función para depurar el modal
  function debugModal(modal, action) {
    console.log(`🔍 Debug Modal - ${action}:`);
    console.log("  - Element:", modal);
    console.log("  - Classes:", modal.className);
    console.log("  - Hidden class:", modal.classList.contains("hidden"));
    console.log("  - Display:", window.getComputedStyle(modal).display);
    console.log("  - Visibility:", window.getComputedStyle(modal).visibility);
    console.log("  - Z-index:", window.getComputedStyle(modal).zIndex);
    console.log("  - Position:", window.getComputedStyle(modal).position);
    console.log("  - Top:", window.getComputedStyle(modal).top);
    console.log("  - Left:", window.getComputedStyle(modal).left);
    console.log("  - Width:", window.getComputedStyle(modal).width);
    console.log("  - Height:", window.getComputedStyle(modal).height);
  }

  // Función para mostrar modal de verificación
  function mostrarModalVerificacion(correo) {
    console.log("🔄 Iniciando mostrarModalVerificacion para:", correo);
    
    const authModal = document.getElementById("authModal");
    const emailVerificationModal = document.getElementById("emailVerificationModal");
    const verificationEmail = document.getElementById("verificationEmail");
    
    console.log("🔍 Elementos encontrados:");
    console.log("  - authModal:", authModal);
    console.log("  - emailVerificationModal:", emailVerificationModal);
    console.log("  - verificationEmail:", verificationEmail);
    
    if (!authModal || !emailVerificationModal || !verificationEmail) {
      console.error("❌ No se encontraron todos los elementos necesarios");
      showErrorAlert("Error: No se pudo mostrar el modal de verificación");
      return;
    }
    
    // Ocultar modal de autenticación
    console.log("👁️ Ocultando modal de autenticación...");
    authModal.classList.add("hidden");
    authModal.style.display = "none";
    
    // Configurar email en el modal
    console.log("📧 Configurando email en el modal:", correo);
    verificationEmail.textContent = correo;
    
    // Mostrar modal de verificación con mejor configuración
    console.log("👁️ Mostrando modal de verificación...");
    emailVerificationModal.classList.remove("hidden");
    emailVerificationModal.classList.add("show");
    
    // Usar requestAnimationFrame para asegurar que las transiciones CSS funcionen
    requestAnimationFrame(() => {
      emailVerificationModal.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 10000 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.7) !important;
        backdrop-filter: blur(5px) !important;
        justify-content: center !important;
        align-items: center !important;
      `;
    });
    
    // Enfocar el campo de código después de que las transiciones terminen
    setTimeout(() => {
      const codeInput = document.getElementById("verificationCode");
      if (codeInput) {
        codeInput.focus();
      }
    }, 800);
    
    // Verificar que se mostró
    setTimeout(() => {
      const isVisible = window.getComputedStyle(emailVerificationModal).display !== "none";
      console.log("✅ Modal visible:", isVisible);
      console.log("📊 Estado final del modal:");
      console.log("  - Display:", window.getComputedStyle(emailVerificationModal).display);
      console.log("  - Visibility:", window.getComputedStyle(emailVerificationModal).visibility);
      console.log("  - Z-index:", window.getComputedStyle(emailVerificationModal).zIndex);
      console.log("  - Opacity:", window.getComputedStyle(emailVerificationModal).opacity);
      
      if (!isVisible) {
        console.error("❌ Modal aún no visible, forzando nuevamente...");
        emailVerificationModal.style.cssText = `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 10000 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(5px) !important;
          justify-content: center !important;
          align-items: center !important;
        `;
      }
    }, 100);
    
    console.log("📤 Enviando código de verificación...");
    // Enviar código de verificación
    enviarCodigoVerificacion(correo);
  }

  // Función para enviar código de verificación
  async function enviarCodigoVerificacion(correo) {
    console.log("📤 Iniciando enviarCodigoVerificacion para:", correo);
    
    try {
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
      console.log("🔐 Token CSRF para envío:", csrfToken ? "Sí" : "No");
      
      console.log("🌐 Enviando petición a /enviar-codigo-verificacion/");
      const response = await fetch("/enviar-codigo-verificacion/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ correo: correo })
      });

      console.log("📨 Respuesta recibida:", response.status, response.statusText);
      const data = await response.json();
      console.log("📋 Datos de respuesta:", data);

      if (response.ok) {
        console.log("✅ Código de verificación enviado exitosamente");
        showSuccessAlert("Código de verificación enviado a tu correo");
      } else {
        console.error("❌ Error en la respuesta:", data);
        throw new Error(data.error || "Error al enviar código de verificación");
      }
    } catch (error) {
      console.error("💥 Error al enviar código:", error);
      showErrorAlert("Error al enviar código de verificación: " + error.message);
    }
  }

  // Event listeners para el modal de verificación
  const closeEmailVerificationModal = document.getElementById("closeEmailVerificationModal");
  const emailVerificationForm = document.getElementById("emailVerificationForm");
  const resendCode = document.getElementById("resendCode");
  const backToSignUp = document.getElementById("backToSignUp");

  // Cerrar modal de verificación
  if (closeEmailVerificationModal) {
    closeEmailVerificationModal.addEventListener("click", function() {
      const emailVerificationModal = document.getElementById("emailVerificationModal");
      emailVerificationModal.classList.add("hidden");
      emailVerificationModal.classList.remove("show");
      emailVerificationModal.style.cssText = `
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      `;
      // Volver al modal de autenticación
      const authModal = document.getElementById("authModal");
      authModal.classList.remove("hidden");
    });
  }

  // Manejar envío del formulario de verificación
  if (emailVerificationForm) {
    console.log("📝 Formulario de verificación configurado");
    emailVerificationForm.addEventListener("submit", async function(e) {
      console.log("📤 Formulario de verificación enviado");
      e.preventDefault();
      
      const codigo = document.getElementById("verificationCode").value;
      console.log("🔢 Código ingresado:", codigo);
      
      if (!codigo) {
        console.log("❌ Código vacío");
        showErrorAlert("Por favor, ingrese el código de verificación");
        return;
      }

      try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        console.log("🔐 Token CSRF para verificación:", csrfToken ? "Sí" : "No");
        
        console.log("🔍 Verificando código...");
        // Verificar código
        const response = await fetch("/verificar-codigo/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
          body: JSON.stringify({ 
            correo: userDataForVerification.correo,
            codigo: codigo 
          })
        });

        console.log("📨 Respuesta de verificación:", response.status, response.statusText);
        const data = await response.json();
        console.log("📋 Datos de verificación:", data);

        if (response.ok && data.verificado) {
          console.log("✅ Código verificado, procediendo con registro");
          // Código verificado, proceder con el registro usando crearUsuarioConValidacion
          try {
            console.log("📤 Creando usuario...");
            await crearUsuarioConValidacion(userDataForVerification);
            
            console.log("✅ Usuario creado exitosamente");
            showSuccessAlert("Cuenta creada correctamente");
            emailVerificationForm.reset();
            
            // Cerrar modal de verificación
            const emailVerificationModal = document.getElementById("emailVerificationModal");
            emailVerificationModal.classList.add("hidden");
            
            // Cambiar a la vista de inicio de sesión
            const container = document.getElementById("container");
            if (container) {
              container.classList.remove("right-panel-active");
            }
            
            // Limpiar formulario de registro
            const signUpForm = document.getElementById("signUpForm");
            if (signUpForm) signUpForm.reset();
            
            // Limpiar formulario de inicio de sesión
            const signInForm = document.getElementById("signInForm");
            if (signInForm) signInForm.reset();
            
            // Reiniciar barra de fortaleza de contraseña
            const strengthFill = document.getElementById("password-strength-fill");
            if (strengthFill) strengthFill.style.width = "0%";
            
            userDataForVerification = null; // Limpiar datos temporales
            console.log("🧹 Datos temporales limpiados");
            
          } catch (error) {
            console.error("💥 Error al crear usuario:", error);
            showErrorAlert("Error al crear la cuenta: " + error.message);
          }
        } else {
          console.error("❌ Código no verificado:", data);
          throw new Error(data.error || "Código de verificación incorrecto");
        }
      } catch (error) {
        console.error("💥 Error en verificación:", error);
        showErrorAlert(error.message);
      }
    });
  } else {
    console.error("❌ No se encontró el formulario de verificación");
  }

  // Reenviar código
  if (resendCode) {
    resendCode.addEventListener("click", function(e) {
      e.preventDefault();
      if (userDataForVerification) {
        enviarCodigoVerificacion(userDataForVerification.correo);
        showSuccessAlert("Código reenviado");
      }
    });
  }

  // Volver al registro
  if (backToSignUp) {
    backToSignUp.addEventListener("click", function(e) {
      e.preventDefault();
      const emailVerificationModal = document.getElementById("emailVerificationModal");
      const authModal = document.getElementById("authModal");
      
      emailVerificationModal.classList.add("hidden");
      authModal.classList.remove("hidden");
      
      // Limpiar datos temporales
      userDataForVerification = null;
    });
  }

  // Event listeners para cerrar el modal
  const closeButton = emailVerificationModal.querySelector('.close');
  if (closeButton) {
    closeButton.addEventListener('click', closeEmailVerificationModal);
  }

  // Cerrar al hacer clic fuera del modal
  emailVerificationModal.addEventListener('click', function(event) {
    if (event.target === emailVerificationModal) {
      closeEmailVerificationModal();
    }
  });

  // Cerrar con la tecla Escape
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && !emailVerificationModal.classList.contains('hidden')) {
      closeEmailVerificationModal();
    }
  });
});

// 🆕 Función alternativa para crear usuario con validación de email y SweetAlert
function crearUsuarioConValidacion(formData) {
  console.log('📤 Enviando datos para crear usuario (con validación):', formData);

  // Validar email antes de continuar usando la función de validaciones.js
  const erroresEmail = validarEmail(formData.correo, 'correo electrónico', 100, true);
  if (erroresEmail.length > 0) {
      console.warn('⚠️ Email inválido:', formData.correo);
      mostrarErroresValidacion(erroresEmail, 'Email Inválido');
      return Promise.reject(new Error('Correo electrónico no válido'));
  }

  // Obtener el token CSRF
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

  return fetch("/registro/", {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
      },
      body: JSON.stringify(formData)
  })
  .then(response => {
      if (!response.ok) {
          return response.json().then(errorData => {
              throw new Error(errorData.error || errorData.message || `Error HTTP: ${response.status}`);
          }).catch(() => {
              throw new Error(`Error HTTP: ${response.status}`);
          });
      }
      return response.json();
  })
  .then(data => {
      console.log('✅ Usuario creado correctamente:', data);
      return data;
  })
  .catch(error => {
      console.error('💥 Error al crear usuario:', error);
      throw error;
  });
}

//Inicio de Sesion - COMENTADO PARA USAR MODAL-LOGIN.JS
/*
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signInForm");

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const correo = form.querySelector('input[name="email"]').value;
      const contrasena = form.querySelector('input[name="password"]').value;

    //###################Validaciones usando funciones de validaciones.js######################
    const errores = [];
    
    // Validar que los campos no estén vacíos
    errores.push(...validarCampoObligatorio(correo, 'correo electrónico'));
    errores.push(...validarCampoObligatorio(contrasena, 'contraseña'));
    
    // Validar formato de correo
    if (correo) {
      errores.push(...validarEmail(correo, 'correo electrónico', 100, true));
    }
    
    // Si hay errores, mostrarlos y detener el proceso
    if (errores.length > 0) {
      console.log("❌ Errores de validación encontrados:", errores);
      mostrarErroresValidacion(errores, 'Errores en el Inicio de Sesión');
      
      // Enfocar el primer campo con error
      if (errores.some(e => e.includes('correo'))) {
        form.querySelector('input[name="email"]').focus();
      } else if (errores.some(e => e.includes('contraseña'))) {
        form.querySelector('input[name="password"]').focus();
      }
      return;
    }

    try {
      // Obtener el token CSRF
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
      if (!csrfToken) {
        console.error("No se pudo obtener el token CSRF");
        showErrorAlert("Error de seguridad. Por favor, recargue la página e intente nuevamente.");
        return;
      }

      const datos = {
        email: correo,
        password: contrasena,
      };

      const response = await fetch("/login_jio/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(datos)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error en el inicio de sesión");
      }

      if (data.success) {
        showSuccessAlert(data.message || "Inicio de sesión exitoso");
        // Limpiar el formulario
        form.reset();
        // Cerrar el modal
        const authModal = document.getElementById("authModal");
        if (authModal) {
          authModal.classList.add("hidden");
          authModal.classList.remove("show");
        }
        
        // Esperar un momento para asegurar que la sesión se haya establecido
        setTimeout(() => {
          // Redirigir al panel correspondiente
          window.location.href = "/panel/";
        }, 500);
      } else {
        showErrorAlert(data.error || "Error en el inicio de sesión");
      }
    } catch (error) {
      console.error("Error en inicio de sesión:", error);
      showErrorAlert(error.message || "Error al intentar iniciar sesión. Por favor, intente nuevamente.");
    }
    });
  }
});
*/

function showCustomAlert(message, type = 'info') {
  // Verificar si SweetAlert2 está disponible
  if (typeof Swal !== 'undefined' && Swal.fire) {
    const config = {
      title: type === 'success' ? '¡Éxito!' : 
             type === 'error' ? 'Error' : 
             type === 'warning' ? 'Advertencia' : 'Información',
      text: message,
      icon: type,
      confirmButtonColor: type === 'success' ? '#28a745' : 
                         type === 'error' ? '#dc3545' : 
                         type === 'warning' ? '#ffc107' : '#007bff',
      confirmButtonText: 'Aceptar',
      timer: type === 'success' ? 3000 : undefined,
      timerProgressBar: type === 'success',
      showConfirmButton: type !== 'success'
    };
    
    Swal.fire(config);
  } else {
    // Fallback si SweetAlert2 no está disponible
    alert(message);
  }
}

// Función específica para mostrar errores
function showErrorAlert(message) {
  showCustomAlert(message, 'error');
}

// Función específica para mostrar éxitos
function showSuccessAlert(message) {
  showCustomAlert(message, 'success');
}

// Función específica para mostrar advertencias
function showWarningAlert(message) {
  showCustomAlert(message, 'warning');
}

document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("contrasena");
  const strengthFill = document.getElementById("password-strength-fill");
  const strengthText = document.getElementById("password-strength-text");

  if (passwordInput && strengthFill && strengthText) {
    passwordInput.addEventListener("input", function () {
      const value = passwordInput.value;
      let score = 0;

      // Validaciones
      if (value.length >= 8) score++;
      if (/[A-Z]/.test(value)) score++;
      if (/[a-z]/.test(value)) score++;
      if (/\d/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;

      // Actualiza barra y texto
      const percent = (score / 5) * 100;
      strengthFill.style.width = percent + "%";

      let text = "Muy débil";
      if (score === 2);
      if (score === 3);
      if (score === 4);
      if (score === 5);
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Elementos de los formularios
  const signInContainer = document.querySelector('.sign-in-container');
  const signUpContainer = document.querySelector('.sign-up-container');
  const forgotContainer = document.querySelector('.forgot-password-container');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const volverLogin = document.getElementById("volverLogin");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const authModal = document.getElementById("authModal");

  // Mostrar formulario de recuperación
  if (forgotPasswordLink && forgotContainer && signInContainer) {
    forgotPasswordLink.addEventListener("click", function(e) {
      e.preventDefault();
      signInContainer.style.display = "none";
      forgotContainer.style.display = "block";
    });
  }

  // Volver al login
  if (volverLogin && forgotContainer && signInContainer) {
    volverLogin.addEventListener("click", function(e) {
      e.preventDefault();
      forgotContainer.style.display = "none";
      signInContainer.style.display = "block";
    });
  }

  // Manejar envío del formulario de recuperación de contraseña
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      
      const correo = document.getElementById("forgotCorreo").value;
      
      //###################Validaciones usando funciones de validaciones.js######################
      const errores = [];
      
      // Validar que el correo no esté vacío
      errores.push(...validarCampoObligatorio(correo, 'correo electrónico'));
      
      // Validar formato de correo
      if (correo) {
        errores.push(...validarEmail(correo, 'correo electrónico', 100, true));
      }
      
      // Si hay errores, mostrarlos y detener el proceso
      if (errores.length > 0) {
        console.log("❌ Errores de validación encontrados:", errores);
        mostrarErroresValidacion(errores, 'Errores en Recuperación de Contraseña');
        document.getElementById("forgotCorreo").focus();
        return;
      }

      try {
        // Obtener el token CSRF
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        const response = await fetch("/recuperar-contrasena/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
          body: JSON.stringify({ correo: correo })
        });

        const data = await response.json();

        if (response.ok) {
          showSuccessAlert(data.message || "Se ha enviado un enlace de recuperación a su correo electrónico");
          forgotPasswordForm.reset();
          // Volver al formulario de login
          forgotContainer.style.display = "none";
          signInContainer.style.display = "block";
        } else {
          throw new Error(data.error || "Error al procesar la solicitud");
        }
      } catch (error) {
        console.error("Error:", error);
        showErrorAlert(error.message || "Error al enviar la solicitud de recuperación");
      }
    });
  }
});

document.getElementById('usuarioBtn')?.addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('authModal').classList.remove('hidden');
});

// Cerrar modal de login/registro
document.getElementById('closeAuthModal')?.addEventListener('click', function() {
  document.getElementById('authModal').classList.add('hidden');
});

// Botón de prueba para el modal de verificación de email
document.getElementById('testEmailModal')?.addEventListener('click', function(e) {
  e.preventDefault();
  console.log("🧪 Abriendo modal de verificación de email para pruebas...");
  
  const emailVerificationModal = document.getElementById("emailVerificationModal");
  const verificationEmail = document.getElementById("verificationEmail");
  
  if (!emailVerificationModal) {
    console.error("❌ Modal de verificación no encontrado");
    showErrorAlert("Modal de verificación no encontrado");
    return;
  }
  
  // Configurar email de prueba
  if (verificationEmail) {
    verificationEmail.textContent = "usuario@ejemplo.com";
  }
  
  // Mostrar modal
  emailVerificationModal.classList.remove("hidden");
  emailVerificationModal.classList.add("show");
  
  // Usar requestAnimationFrame para asegurar que las transiciones CSS funcionen
  requestAnimationFrame(() => {
    emailVerificationModal.style.cssText = `
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 10000 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.7) !important;
      backdrop-filter: blur(5px) !important;
      justify-content: center !important;
      align-items: center !important;
    `;
  });
  
  // Enfocar el campo de código después de que las transiciones terminen
  setTimeout(() => {
    const codeInput = document.getElementById("verificationCode");
    if (codeInput) {
      codeInput.focus();
    }
  }, 800);
  
  console.log("✅ Modal de verificación abierto para pruebas");
});

// Función global para probar el modal (ejecutar desde consola)
window.testModal = function() {
  console.log("🧪 Probando modal de verificación...");
  const modal = document.getElementById("emailVerificationModal");
  const email = document.getElementById("verificationEmail");
  
  if (!modal) {
    console.error("❌ Modal no encontrado");
    return;
  }
  
  if (email) {
    email.textContent = "test@example.com";
  }
  
  // Forzar mostrar
  modal.classList.remove("hidden");
  modal.classList.add("show");
  modal.style.cssText = `
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 9999 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background-color: rgba(0, 0, 0, 0.5) !important;
  `;
  
  console.log("✅ Modal forzado a mostrar");
  console.log("📊 Estado:", {
    display: window.getComputedStyle(modal).display,
    visibility: window.getComputedStyle(modal).visibility,
    zIndex: window.getComputedStyle(modal).zIndex,
    classes: modal.className
  });
};

// Función global para ocultar el modal
window.hideModal = function() {
  const modal = document.getElementById("emailVerificationModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("show");
    modal.style.display = "none";
    console.log("✅ Modal ocultado");
  }
};

  // Función para cerrar el modal con transición suave
function closeEmailVerificationModal() {
  console.log("🔒 Cerrando modal de verificación...");
  
  // Agregar clase para transición de cierre
  emailVerificationModal.classList.add("closing");
  
  // Después de la transición, ocultar completamente
  setTimeout(() => {
    emailVerificationModal.classList.add("hidden");
    emailVerificationModal.classList.remove("show", "closing");
    emailVerificationModal.style.cssText = `
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    `;
    
    console.log("✅ Modal de verificación cerrado");
  }, 300);
}

// Función de prueba para el modal de login
function testModal() {
  console.log("🧪 Probando modal de login...");
  const authModal = document.getElementById("authModal");
  const loginLink = document.getElementById("loginLink");
  
  if (!authModal) {
    console.error("❌ Modal no encontrado");
    alert("Modal no encontrado");
    return;
  }
  
  if (!loginLink) {
    console.error("❌ Login link no encontrado");
    alert("Login link no encontrado");
    return;
  }
  
  console.log("✅ Elementos encontrados, mostrando modal...");
  authModal.classList.remove("hidden");
  authModal.classList.add("show");
  
  // Forzar estilos inline para asegurar que se muestre
  authModal.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 9999 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background-color: rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(5px) !important;
    justify-content: center !important;
    align-items: center !important;
  `;
  
  console.log("✅ Modal forzado a mostrar");
  console.log("📊 Estado del modal:", {
    display: window.getComputedStyle(authModal).display,
    visibility: window.getComputedStyle(authModal).visibility,
    zIndex: window.getComputedStyle(authModal).zIndex,
    classes: authModal.className
  });
}