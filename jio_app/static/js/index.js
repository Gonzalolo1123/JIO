// JavaScript para la página principal de JIO

// Función para cambiar slides del carrusel de videos
function cambiarSlide(index) {
    // Remover clase activa de todos los puntos
    document.querySelectorAll('.punto').forEach(punto => {
        punto.classList.remove('activo');
    });
    
    // Remover clase central de todos los videos
    document.querySelectorAll('.video-slide').forEach(slide => {
        slide.classList.remove('central');
        const video = slide.querySelector('video');
        if (video) {
            video.muted = true;
            video.pause();
        }
    });
    
    // Agregar clase activa al punto seleccionado
    document.querySelectorAll('.punto')[index].classList.add('activo');
    
    // Agregar clase central al slide seleccionado
    const slideSeleccionado = document.getElementById(`video${index}`);
    if (slideSeleccionado) {
        slideSeleccionado.classList.add('central');
        const video = slideSeleccionado.querySelector('video');
        if (video) {
            video.muted = false;
            video.play();
        }
    }
}

// Función para scroll suave a las secciones
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Función para mostrar/ocultar modal de login
function toggleLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// Función para cerrar modal
function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Event listeners cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Configurar enlaces de navegación suave
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            if (targetId) {
                scrollToSection(targetId);
            }
        });
    });
    
    // Configurar botón de login
    const loginBtn = document.getElementById('openUserModal');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleLoginModal();
        });
    }
    
    // Configurar botón de cerrar modal
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Cerrar modal al hacer click fuera de él
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Configurar botones del overlay del modal
    const signInBtn = document.getElementById('signIn');
    if (signInBtn) {
        signInBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Aquí puedes agregar lógica adicional si es necesario
        });
    }
    
    // Auto-play del video central al cargar la página
    const videoCentral = document.querySelector('.video-slide.central video');
    if (videoCentral) {
        videoCentral.play().catch(e => {
            console.log('Auto-play no permitido:', e);
        });
    }
    
    // Animación de entrada para los elementos
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observar elementos para animación
    document.querySelectorAll('.juego-box, .persona, .testimonio').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Función para mostrar alerta de reserva (temporal)
function mostrarAlertaReserva() {
    Swal.fire({
        title: '¡Próximamente!',
        text: 'El formulario de reserva estará disponible muy pronto. Mientras tanto, puedes contactarnos directamente.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ff6b6b'
    });
}

// Función para validar formulario de contacto (si se agrega)
function validarFormularioContacto(form) {
    const nombre = form.querySelector('input[name="nombre"]');
    const telefono = form.querySelector('input[name="telefono"]');
    const email = form.querySelector('input[name="email"]');
    
    if (!nombre.value.trim()) {
        Swal.fire('Error', 'Por favor ingresa tu nombre', 'error');
        return false;
    }
    
    if (!telefono.value.trim()) {
        Swal.fire('Error', 'Por favor ingresa tu teléfono', 'error');
        return false;
    }
    
    if (!email.value.trim() || !email.value.includes('@')) {
        Swal.fire('Error', 'Por favor ingresa un email válido', 'error');
        return false;
    }
    
    return true;
}
