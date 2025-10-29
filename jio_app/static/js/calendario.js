// JavaScript para el calendario de reservas
document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let selectedDate = null;
    
    // Elementos del DOM
    const currentMonthElement = document.getElementById('current-month');
    const calendarioGrid = document.getElementById('calendario-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const reservaFormContainer = document.getElementById('reserva-form-container');
    const fechaSeleccionadaElement = document.getElementById('fecha-seleccionada');
    const formularioReserva = document.getElementById('formulario-reserva');
    const cancelarReservaBtn = document.getElementById('cancelar-reserva');
    
    // Nombres de meses en español
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Inicializar calendario
    initCalendario();
    
    function initCalendario() {
        renderCalendario();
        setupEventListeners();
    }
    
    function setupEventListeners() {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendario();
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendario();
        });
        
        cancelarReservaBtn.addEventListener('click', () => {
            cancelarReserva();
        });
        
        formularioReserva.addEventListener('submit', (e) => {
            e.preventDefault();
            procesarReserva();
        });
    }
    
    function renderCalendario() {
        // Actualizar título del mes
        currentMonthElement.textContent = `${meses[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        // Limpiar grid
        calendarioGrid.innerHTML = '';
        
        // Agregar headers de días de la semana
        diasSemana.forEach(dia => {
            const headerDay = document.createElement('div');
            headerDay.className = 'calendario-day-header';
            headerDay.textContent = dia;
            calendarioGrid.appendChild(headerDay);
        });
        
        // Obtener primer día del mes y número de días
        const primerDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const ultimoDia = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const diasEnMes = ultimoDia.getDate();
        const diaInicioSemana = primerDia.getDay();
        
        // Agregar días vacíos al inicio si es necesario
        for (let i = 0; i < diaInicioSemana; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendario-day';
            calendarioGrid.appendChild(emptyDay);
        }
        
        // Agregar días del mes
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const dayElement = document.createElement('div');
            const fechaActual = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia);
            
            dayElement.className = 'calendario-day';
            dayElement.innerHTML = `
                <div class="calendario-day-number">${dia}</div>
                <div class="calendario-day-status"></div>
            `;
            
            // Determinar estado del día
            if (fechaActual < hoy) {
                dayElement.classList.add('pasado');
                dayElement.querySelector('.calendario-day-status').textContent = 'Pasado';
            } else {
                // Simular disponibilidad (en una implementación real, esto vendría del servidor)
                const esDisponible = Math.random() > 0.3; // 70% de probabilidad de estar disponible
                
                if (esDisponible) {
                    dayElement.classList.add('disponible');
                    dayElement.querySelector('.calendario-day-status').textContent = 'Disponible';
                    dayElement.addEventListener('click', () => seleccionarFecha(fechaActual));
                } else {
                    dayElement.classList.add('ocupado');
                    dayElement.querySelector('.calendario-day-status').textContent = 'Ocupado';
                }
            }
            
            calendarioGrid.appendChild(dayElement);
        }
    }
    
    function seleccionarFecha(fecha) {
        // Remover selección anterior
        const diasAnteriores = calendarioGrid.querySelectorAll('.seleccionado');
        diasAnteriores.forEach(dia => dia.classList.remove('seleccionado'));
        
        // Seleccionar nuevo día
        const diaElement = event.target.closest('.calendario-day');
        diaElement.classList.add('seleccionado');
        
        selectedDate = fecha;
        mostrarFormularioReserva(fecha);
    }
    
    function mostrarFormularioReserva(fecha) {
        const fechaFormateada = `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
        fechaSeleccionadaElement.textContent = `Reserva para: ${fechaFormateada}`;
        
        reservaFormContainer.style.display = 'block';
        
        // Scroll suave al formulario
        reservaFormContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    function cancelarReserva() {
        selectedDate = null;
        reservaFormContainer.style.display = 'none';
        
        // Remover selección del calendario
        const diasSeleccionados = calendarioGrid.querySelectorAll('.seleccionado');
        diasSeleccionados.forEach(dia => dia.classList.remove('seleccionado'));
        
        // Limpiar formulario
        formularioReserva.reset();
    }
    
    function procesarReserva() {
        const formData = new FormData(formularioReserva);
        const datosReserva = {
            fecha: selectedDate.toISOString().split('T')[0],
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            juego: formData.get('juego'),
            horario: formData.get('horario'),
            direccion: formData.get('direccion'),
            comentarios: formData.get('comentarios')
        };
        
        // Validar datos
        if (!validarDatosReserva(datosReserva)) {
            return;
        }
        
        // Simular envío de reserva (en una implementación real, esto sería una llamada AJAX)
        mostrarMensajeExito();
        
        // Limpiar formulario y ocultar
        setTimeout(() => {
            cancelarReserva();
        }, 2000);
    }
    
    function validarDatosReserva(datos) {
        const errores = [];
        
        if (!datos.nombre.trim()) {
            errores.push('El nombre es obligatorio');
        }
        
        if (!datos.email.trim() || !isValidEmail(datos.email)) {
            errores.push('El email es obligatorio y debe ser válido');
        }
        
        if (!datos.telefono.trim()) {
            errores.push('El teléfono es obligatorio');
        }
        
        if (!datos.juego) {
            errores.push('Debe seleccionar un juego');
        }
        
        if (!datos.horario) {
            errores.push('Debe seleccionar un horario');
        }
        
        if (!datos.direccion.trim()) {
            errores.push('La dirección es obligatoria');
        }
        
        if (errores.length > 0) {
            alert('Por favor corrija los siguientes errores:\n' + errores.join('\n'));
            return false;
        }
        
        return true;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function mostrarMensajeExito() {
        // Crear mensaje de éxito
        const mensaje = document.createElement('div');
        mensaje.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2c5530;
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            text-align: center;
            font-size: 1.1rem;
        `;
        mensaje.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">¡Reserva Enviada!</h3>
            <p style="margin: 0;">Nos pondremos en contacto contigo pronto para confirmar tu reserva.</p>
        `;
        
        document.body.appendChild(mensaje);
        
        // Remover mensaje después de 3 segundos
        setTimeout(() => {
            document.body.removeChild(mensaje);
        }, 3000);
    }
});
