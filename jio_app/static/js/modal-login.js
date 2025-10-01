// Modal de Login Simplificado para JIO
console.log("🚀 Cargando modal-login.js...");

document.addEventListener("DOMContentLoaded", function() {
  console.log("📄 DOM cargado, inicializando modal...");
  
  // Buscar elementos
  const loginLink = document.getElementById("openUserModal");
  const authModal = document.getElementById("authModal");
  const closeModal = document.getElementById("closeModal");
  const loginForm = document.getElementById("signInForm");
  
  console.log("🔍 Elementos encontrados:", {
    loginLink: !!loginLink,
    authModal: !!authModal,
    closeModal: !!closeModal,
    loginForm: !!loginForm
  });
  
  // Función para mostrar modal
  function showModal() {
    console.log("👁️ Mostrando modal...");
    if (authModal) {
      authModal.classList.remove("hidden");
      authModal.classList.add("show");
      authModal.style.display = "flex";
      console.log("✅ Modal mostrado");
    }
  }
  
  // Función para ocultar modal
  function hideModal() {
    console.log("🔒 Ocultando modal...");
    if (authModal) {
      authModal.classList.add("hidden");
      authModal.classList.remove("show");
      authModal.style.display = "none";
      console.log("✅ Modal ocultado");
    }
  }
  
  // Event listener para el enlace de login
  if (loginLink) {
    loginLink.addEventListener("click", function(e) {
      console.log("🖱️ Click en loginLink!");
      e.preventDefault();
      showModal();
    });
  }
  
  // Event listener para el botón de cerrar
  if (closeModal) {
    closeModal.addEventListener("click", function(e) {
      console.log("🔒 Click en cerrar!");
      e.preventDefault();
      hideModal();
    });
  }
  
  // Event listener para cerrar al hacer click fuera del modal
  if (authModal) {
    authModal.addEventListener("click", function(e) {
      if (e.target === authModal) {
        console.log("🔒 Click fuera del modal!");
        hideModal();
      }
    });
  }
  
  // Event listener para el formulario de login
  if (loginForm) {
    loginForm.addEventListener("submit", async function(e) {
      console.log("📤 Formulario enviado!");
      e.preventDefault();
      
      const email = loginForm.querySelector('input[name="email"]').value;
      const password = loginForm.querySelector('input[name="password"]').value;
      
      console.log("📧 Email:", email);
      console.log("🔑 Password:", password ? "***" : "vacío");
      
      // Validación básica
      if (!email || !password) {
        Swal.fire({
          title: 'Error',
          text: 'Por favor completa todos los campos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Swal.fire({
          title: 'Error',
          text: 'Por favor ingresa un email válido',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      
      try {
        // Obtener token CSRF
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        // Enviar datos via AJAX
        const response = await fetch("/login_jio/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });
        
        const data = await response.json();
        console.log("📨 Respuesta del servidor:", data);
        
        if (data.success) {
          // Limpiar formulario
          loginForm.reset();
          
          // Cerrar modal
          hideModal();
          
          // Mostrar mensaje de éxito
          Swal.fire({
            title: '¡Éxito!',
            text: data.message || 'Inicio de sesión exitoso',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            timer: 1500,
            timerProgressBar: true
          }).then(() => {
            // Redirigir al panel
            window.location.href = "/panel/";
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: data.error || 'Error en el inicio de sesión',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
        
      } catch (error) {
        console.error("❌ Error en login:", error);
        Swal.fire({
          title: 'Error de Conexión',
          text: 'Error al intentar iniciar sesión',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
  
  console.log("✅ Modal de login inicializado correctamente");
});