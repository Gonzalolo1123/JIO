document.addEventListener('DOMContentLoaded', function() {
  const userModal = document.getElementById('userModal');
  const modalContent = userModal ? userModal.querySelector('.modal-content') : null;
  const closeUserModal = document.getElementById('closeUserModal');

  // Cerrar sesión
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", function () {
      localStorage.removeItem('cliente_nombre');
      localStorage.removeItem('cliente_correo');
      localStorage.removeItem('cliente_telefono');
    });
  }

  const adminPanelBtn = document.getElementById('adminPanelBtn');
  
  if (adminPanelBtn) {
    adminPanelBtn.addEventListener('click', function() {
      const nivelAcceso = '{{ request.user.nivel_acceso }}';  // Obtiene el nivel de acceso del usuario
      
      if (nivelAcceso === 'superadmin') {
        window.location.href = '/super_admin/';
      } else if (nivelAcceso === 'admin') {
        window.location.href = '/estadisticas/';
      }
    });
  }

  // --- Modal de usuario (abrir/cerrar) ---
  const userBtn = document.getElementById('openUserModal');
  if(userBtn && userModal && closeUserModal) {
    userBtn.addEventListener('click', async function() {
      // Verificar autenticación con fetch a /verificar-sesion/
      try {
        const response = await fetch('/verificar-sesion/', {
          method: 'GET',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'same-origin'
        });
        const data = await response.json();
        if (data.is_authenticated) {
          // Mostrar modal de cuenta
          userModal.classList.remove('hidden');
          userModal.classList.add('active');
        } else {
          // Mostrar modal de login/registro
          const authModal = document.getElementById('authModal');
          if (authModal) {
            authModal.classList.remove('hidden');
          }
        }
      } catch (error) {
        // Si hay error, por defecto mostrar login
        const authModal = document.getElementById('authModal');
        if (authModal) {
          authModal.classList.remove('hidden');
        }
      }
    });
    closeUserModal.addEventListener('click', function() {
      userModal.classList.add('hidden');
      userModal.classList.remove('active');
    });
    window.addEventListener('click', function(e) {
      if(e.target === userModal) {
        userModal.classList.add('hidden');
        userModal.classList.remove('active');
      }
    });
  }
});