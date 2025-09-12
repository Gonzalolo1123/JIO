// Función para verificar el estado de la sesión
async function verificarSesion() {
    try {
        const response = await fetch('/verificar-sesion/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin' // Importante para enviar las cookies
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Obtener referencias a los elementos
        const cuentaBtn = document.getElementById('cuentaBtn');
        const usuarioBtn = document.getElementById('usuarioBtn');
        const userModal = document.getElementById('userModal');
        
        if (data.is_authenticated && data.cliente_nombre) {
            // Usuario está autenticado - mostrar cuentaBtn, ocultar usuarioBtn
            if (cuentaBtn) {
                cuentaBtn.innerHTML = `Hola, ${data.cliente_nombre}`;
                cuentaBtn.style.display = 'block';
                // Asegurar que el href se mantenga
                if (!cuentaBtn.getAttribute('href')) {
                    cuentaBtn.setAttribute('href', '#');
                }
            }
            if (usuarioBtn) {
                usuarioBtn.style.display = 'none';
            }
            
            // Actualizar información en el modal de usuario si existe
            if (userModal) {
                const nombreElement = userModal.querySelector('p:nth-child(2)');
                const emailElement = userModal.querySelector('p:nth-child(3)');
                const telefonoElement = userModal.querySelector('p:nth-child(4)');
                const rolElement = userModal.querySelector('p:nth-child(5)');
                const adminButtons = userModal.querySelector('.admin-buttons');
                const superadminBtn = userModal.querySelector('.superadmin-btn');
                const adminBtn = userModal.querySelector('.admin-btn:not(.superadmin-btn)');
                
                if (nombreElement) nombreElement.innerHTML = `<strong>Nombre:</strong> ${data.cliente_nombre}`;
                if (emailElement) emailElement.innerHTML = `<strong>Correo:</strong> ${data.cliente_email || 'No disponible'}`;
                if (telefonoElement) telefonoElement.innerHTML = `<strong>Teléfono:</strong> ${data.cliente_telefono || 'No disponible'}`;
                if (rolElement) rolElement.innerHTML = `<strong>Rol:</strong> ${data.nivel_acceso || 'Cliente'}`;
                
                // Mostrar botones de admin según el nivel de acceso
                if (adminButtons) {
                    const nivelAcceso = data.nivel_acceso || 'cliente';
                    
                    if (nivelAcceso === 'superadmin') {
                        adminButtons.style.display = 'block';
                        if (superadminBtn) superadminBtn.style.display = 'inline-block';
                        if (adminBtn) adminBtn.style.display = 'inline-block';
                    } else if (nivelAcceso === 'admin') {
                        adminButtons.style.display = 'block';
                        if (superadminBtn) superadminBtn.style.display = 'none';
                        if (adminBtn) adminBtn.style.display = 'inline-block';
                    } else {
                        adminButtons.style.display = 'none';
                    }
                }
            }
        } else {
            // Usuario no está autenticado - ocultar cuentaBtn, mostrar usuarioBtn
            if (cuentaBtn) {
                cuentaBtn.style.display = 'none';
            }
            if (usuarioBtn) {
                usuarioBtn.style.display = 'block';
                // Asegurar que el href se mantenga
                if (!usuarioBtn.getAttribute('href')) {
                    usuarioBtn.setAttribute('href', '#');
                }
            }
            // Si estamos en una página que requiere autenticación, redirigir al login
            if (data.requires_auth) {
                window.location.replace('/');
            }
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        // En caso de error, mostrar el botón de usuario por defecto
        const cuentaBtn = document.getElementById('cuentaBtn');
        const usuarioBtn = document.getElementById('usuarioBtn');
        
        if (cuentaBtn) cuentaBtn.style.display = 'none';
        if (usuarioBtn) usuarioBtn.style.display = 'block';
    }
}

// Verificar sesión cada 30 segundos
setInterval(verificarSesion, 30000);

// Verificar sesión inmediatamente al cargar la página
document.addEventListener('DOMContentLoaded', verificarSesion);

// Verificar sesión cuando la ventana recupera el foco
window.addEventListener('focus', verificarSesion);

// Verificar sesión cuando se detecta actividad del usuario
document.addEventListener('click', () => {
    // Solo verificar si han pasado al menos 5 segundos desde la última verificación
    const now = Date.now();
    if (!window.lastSessionCheck || now - window.lastSessionCheck > 5000) {
        window.lastSessionCheck = now;
        verificarSesion();
    }
}); 