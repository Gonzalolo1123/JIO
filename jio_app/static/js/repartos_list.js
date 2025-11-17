// Gestión de Repartos
(function(){
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  // ===== ASIGNAR REPARTIDOR =====
  function openModalAsignarRepartidor(repartoId, tipoReparto) {
    const modal = document.getElementById('modalAsignarRepartidor');
    if (!modal) return;

    document.getElementById('asignarRepartoId').value = repartoId;
    document.getElementById('asignarTipoReparto').value = tipoReparto;
    document.getElementById('formAsignarRepartidor').reset();
    document.getElementById('asignarRepartoId').value = repartoId;
    document.getElementById('asignarTipoReparto').value = tipoReparto;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  async function submitAsignarRepartidor(e) {
    e.preventDefault();
    const form = e.target;
    const repartoId = form.reparto_id.value;
    const tipoReparto = form.tipo_reparto.value;
    const repartidorId = form.repartidor_id.value;
    const observaciones = form.observaciones.value;

    if (!repartidorId) {
      mostrarErroresValidacion(['Debe seleccionar un repartidor']);
      return;
    }

    const formData = new FormData();
    formData.append('repartidor_id', repartidorId);
    formData.append('observaciones', observaciones);

    const csrf = getCookie('csrftoken');
    const url = `/panel/repartos/${tipoReparto}/${repartoId}/asignar/`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf },
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errs = data && data.errors ? data.errors : ['Error al asignar repartidor'];
        mostrarErroresValidacion(errs);
        return;
      }

      document.getElementById('modalAsignarRepartidor').classList.remove('show');
      document.getElementById('modalAsignarRepartidor').setAttribute('aria-hidden', 'true');
      mostrarExitoValidacion(data.message || 'Repartidor asignado correctamente');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      mostrarErroresValidacion(['Error de conexión al asignar repartidor']);
    }
  }

  // ===== CAMBIAR ESTADO =====
  function openModalCambiarEstado(repartoId, tipoReparto) {
    const modal = document.getElementById('modalCambiarEstado');
    if (!modal) return;

    document.getElementById('estadoRepartoId').value = repartoId;
    document.getElementById('estadoTipoReparto').value = tipoReparto;
    
    // Poblar opciones de estado según el tipo
    const selectEstado = document.getElementById('nuevoEstadoSelect');
    selectEstado.innerHTML = '<option value="">Seleccione un estado</option>';

    const estados = tipoReparto === 'instalacion' 
      ? [
          { value: 'programada', label: 'Programada' },
          { value: 'realizada', label: 'Realizada' },
          { value: 'cancelada', label: 'Cancelada' },
          { value: 'pendiente', label: 'Pendiente' }
        ]
      : [
          { value: 'programado', label: 'Programado' },
          { value: 'realizado', label: 'Realizado' },
          { value: 'cancelado', label: 'Cancelado' },
          { value: 'pendiente', label: 'Pendiente' }
        ];

    estados.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.value;
      opt.textContent = e.label;
      selectEstado.appendChild(opt);
    });

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  async function submitCambiarEstado(e) {
    e.preventDefault();
    const form = e.target;
    const repartoId = form.reparto_id.value;
    const tipoReparto = form.tipo_reparto.value;
    const nuevoEstado = form.nuevo_estado.value;
    const observaciones = form.observaciones.value;

    if (!nuevoEstado) {
      mostrarErroresValidacion(['Debe seleccionar un estado']);
      return;
    }

    const formData = new FormData();
    formData.append('nuevo_estado', nuevoEstado);
    formData.append('observaciones', observaciones);

    const csrf = getCookie('csrftoken');
    const url = `/panel/repartos/${tipoReparto}/${repartoId}/cambiar-estado/`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf },
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errs = data && data.errors ? data.errors : ['Error al cambiar estado'];
        mostrarErroresValidacion(errs);
        return;
      }

      document.getElementById('modalCambiarEstado').classList.remove('show');
      document.getElementById('modalCambiarEstado').setAttribute('aria-hidden', 'true');
      mostrarExitoValidacion(data.message || 'Estado actualizado correctamente');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      mostrarErroresValidacion(['Error de conexión al cambiar estado']);
    }
  }

  // ===== REGISTRAR INCIDENTE =====
  function openModalRegistrarIncidente(repartoId, tipoReparto) {
    const modal = document.getElementById('modalRegistrarIncidente');
    if (!modal) return;

    document.getElementById('incidenteRepartoId').value = repartoId;
    document.getElementById('incidenteTipoReparto').value = tipoReparto;
    document.getElementById('formRegistrarIncidente').reset();
    document.getElementById('incidenteRepartoId').value = repartoId;
    document.getElementById('incidenteTipoReparto').value = tipoReparto;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  async function submitRegistrarIncidente(e) {
    e.preventDefault();
    const form = e.target;
    const repartoId = form.reparto_id.value;
    const tipoReparto = form.tipo_reparto.value;
    const tipoIncidente = form.tipo_incidente.value;
    const descripcion = form.descripcion.value.trim();
    const solucion = form.solucion.value.trim();

    if (!tipoIncidente || !descripcion) {
      mostrarErroresValidacion(['Complete todos los campos obligatorios']);
      return;
    }

    const formData = new FormData();
    formData.append('tipo_incidente', tipoIncidente);
    formData.append('descripcion', descripcion);
    formData.append('solucion', solucion);

    const csrf = getCookie('csrftoken');
    const url = `/panel/repartos/${tipoReparto}/${repartoId}/registrar-incidente/`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf },
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errs = data && data.errors ? data.errors : ['Error al registrar incidente'];
        mostrarErroresValidacion(errs);
        return;
      }

      document.getElementById('modalRegistrarIncidente').classList.remove('show');
      document.getElementById('modalRegistrarIncidente').setAttribute('aria-hidden', 'true');
      mostrarExitoValidacion(data.message || 'Incidente registrado correctamente');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      mostrarErroresValidacion(['Error de conexión al registrar incidente']);
    }
  }

  // ===== VER DETALLE DE REPARTO =====
  async function verDetalleReparto(repartoId, tipoReparto) {
    const modal = document.getElementById('modalVerDetalle');
    const content = document.getElementById('modalDetalleContent');
    const titulo = document.getElementById('modalDetalleTitulo');
    
    if (!modal || !content || !titulo) {
      console.error('Modal de detalle no encontrado');
      return;
    }

    // Mostrar loading
    content.innerHTML = '<p style="text-align:center;padding:2rem;">Cargando detalles...</p>';
    titulo.textContent = tipoReparto === 'instalacion' ? 'Detalle de Instalación' : 'Detalle de Retiro';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    try {
      const url = tipoReparto === 'instalacion' 
        ? `/delivery/instalacion/${repartoId}/detalle/`
        : `/delivery/retiro/${repartoId}/detalle/`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar detalle');
      }

      // Construir HTML del detalle
      let html = '<div style="display:grid; gap:1.5rem;">';
      
      // Información básica
      html += `
        <div style="background:#f8f9fa; padding:1rem; border-radius:8px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:0.5rem;">
            <div>
              <strong style="color:#666; font-size:0.875rem;">Fecha:</strong><br>
              <span style="font-size:1.1rem;">${data.fecha}</span>
            </div>
            <div>
              <strong style="color:#666; font-size:0.875rem;">Hora:</strong><br>
              <span style="font-size:1.1rem;">${data.hora}</span>
            </div>
          </div>
          <div>
            <strong style="color:#666; font-size:0.875rem;">Estado:</strong>
            <span class="badge badge-info" style="margin-left:0.5rem;">${data.estado_display}</span>
          </div>
        </div>
      `;
      
      // Cliente
      html += `
        <div>
          <h4 style="margin:0 0 0.75rem 0; color:#2E7D32; font-size:1.1rem; border-bottom:2px solid #2E7D32; padding-bottom:0.5rem;">
            <i class="fas fa-user"></i> Cliente
          </h4>
          <div style="padding-left:1rem;">
            <p style="margin:0.5rem 0;"><strong>${data.cliente.nombre}</strong></p>
            <p style="margin:0.5rem 0; color:#666;"><i class="fas fa-envelope"></i> ${data.cliente.email}</p>
            <p style="margin:0.5rem 0; color:#666;"><i class="fas fa-phone"></i> ${data.cliente.telefono || 'No disponible'}</p>
          </div>
        </div>
      `;
      
      // Dirección
      html += `
        <div>
          <h4 style="margin:0 0 0.75rem 0; color:#2E7D32; font-size:1.1rem; border-bottom:2px solid #2E7D32; padding-bottom:0.5rem;">
            <i class="fas fa-map-marker-alt"></i> Dirección
          </h4>
          <p style="margin:0; padding-left:1rem;">${data.direccion}</p>
        </div>
      `;
      
      // Repartidor
      if (data.repartidor && data.repartidor.nombre !== 'Sin asignar') {
        html += `
          <div>
            <h4 style="margin:0 0 0.75rem 0; color:#2E7D32; font-size:1.1rem; border-bottom:2px solid #2E7D32; padding-bottom:0.5rem;">
              <i class="fas fa-truck"></i> Repartidor
            </h4>
            <p style="margin:0; padding-left:1rem;"><strong>${data.repartidor.nombre}</strong></p>
          </div>
        `;
      }
      
      // Juegos (solo para instalaciones)
      if (tipoReparto === 'instalacion' && data.juegos && data.juegos.length > 0) {
        html += `
          <div>
            <h4 style="margin:0 0 0.75rem 0; color:#2E7D32; font-size:1.1rem; border-bottom:2px solid #2E7D32; padding-bottom:0.5rem;">
              <i class="fas fa-gamepad"></i> Juegos
            </h4>
            <div style="padding-left:1rem;">
        `;
        data.juegos.forEach(juego => {
          html += `
            <div style="margin-bottom:0.75rem; padding:0.75rem; background:#f8f9fa; border-radius:6px;">
              <strong>${juego.nombre}</strong><br>
              <span style="color:#666; font-size:0.875rem;">
                Cantidad: ${juego.cantidad} | Precio: $${parseInt(juego.precio).toLocaleString('es-CL')}
              </span>
            </div>
          `;
        });
        html += `
            </div>
          </div>
        `;
      }
      
      // Precios (solo para instalaciones)
      if (tipoReparto === 'instalacion') {
        html += `
          <div style="background:#fff3e0; padding:1rem; border-radius:8px; border-left:4px solid #ff9800;">
            <h4 style="margin:0 0 0.75rem 0; color:#2E7D32; font-size:1.1rem;">Precios</h4>
            <div style="display:grid; gap:0.5rem;">
              <div style="display:flex; justify-content:space-between;">
                <span>Juegos:</span>
                <strong>$${parseInt(data.precio_juegos || 0).toLocaleString('es-CL')}</strong>
              </div>
              ${data.precio_distancia && parseInt(data.precio_distancia) > 0 ? `
              <div style="display:flex; justify-content:space-between;">
                <span>Distancia (${data.kilometros || 0} km):</span>
                <strong>$${parseInt(data.precio_distancia).toLocaleString('es-CL')}</strong>
              </div>
              ` : ''}
              <div style="display:flex; justify-content:space-between; border-top:2px solid #ff9800; padding-top:0.5rem; margin-top:0.5rem; font-size:1.2rem;">
                <strong>Total:</strong>
                <strong>$${parseInt(data.total || 0).toLocaleString('es-CL')}</strong>
              </div>
            </div>
          </div>
        `;
      }
      
      // Observaciones
      if (data.observaciones) {
        html += `
          <div>
            <h4 style="margin:0 0 0.75rem 0; color:#2E7D32; font-size:1.1rem; border-bottom:2px solid #2E7D32; padding-bottom:0.5rem;">
              <i class="fas fa-sticky-note"></i> Observaciones
            </h4>
            <p style="margin:0; padding-left:1rem; white-space:pre-wrap;">${data.observaciones}</p>
          </div>
        `;
      }
      
      html += '</div>';
      content.innerHTML = html;
      
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      content.innerHTML = `
        <div style="text-align:center; padding:2rem;">
          <p style="color:#d32f2f; margin-bottom:1rem;">
            <i class="fas fa-exclamation-circle"></i> Error al cargar los detalles
          </p>
          <p style="color:#666;">${error.message}</p>
        </div>
      `;
    }
  }

  // ===== CERRAR MODALES =====
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // ===== INICIALIZACIÓN =====
  document.addEventListener('DOMContentLoaded', function() {
    // Event delegation para botones de asignar
    document.addEventListener('click', function(e) {
      const btnAsignarInst = e.target.closest('[data-asignar-instalacion]');
      if (btnAsignarInst) {
        e.preventDefault();
        const id = btnAsignarInst.getAttribute('data-asignar-instalacion');
        openModalAsignarRepartidor(id, 'instalacion');
        return;
      }

      const btnAsignarRet = e.target.closest('[data-asignar-retiro]');
      if (btnAsignarRet) {
        e.preventDefault();
        const id = btnAsignarRet.getAttribute('data-asignar-retiro');
        openModalAsignarRepartidor(id, 'retiro');
        return;
      }

      const btnEstadoInst = e.target.closest('[data-cambiar-estado-instalacion]');
      if (btnEstadoInst) {
        e.preventDefault();
        const id = btnEstadoInst.getAttribute('data-cambiar-estado-instalacion');
        openModalCambiarEstado(id, 'instalacion');
        return;
      }

      const btnEstadoRet = e.target.closest('[data-cambiar-estado-retiro]');
      if (btnEstadoRet) {
        e.preventDefault();
        const id = btnEstadoRet.getAttribute('data-cambiar-estado-retiro');
        openModalCambiarEstado(id, 'retiro');
        return;
      }

      const btnIncidente = e.target.closest('[data-registrar-incidente]');
      if (btnIncidente) {
        e.preventDefault();
        const id = btnIncidente.getAttribute('data-registrar-incidente');
        const tipo = btnIncidente.getAttribute('data-tipo');
        openModalRegistrarIncidente(id, tipo);
        return;
      }

      // Botón ver detalle
      const btnVerDetalle = e.target.closest('[data-ver-detalle]');
      if (btnVerDetalle) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnVerDetalle.getAttribute('data-ver-detalle');
        const tipo = btnVerDetalle.getAttribute('data-tipo');
        verDetalleReparto(id, tipo);
        return;
      }

      // Cerrar modales
      if (e.target.closest('[data-modal-close]')) {
        closeModal('modalAsignarRepartidor');
        closeModal('modalCambiarEstado');
        closeModal('modalRegistrarIncidente');
        closeModal('modalVerDetalle');
      }
    });

    // Form submissions
    const formAsignar = document.getElementById('formAsignarRepartidor');
    if (formAsignar) {
      formAsignar.addEventListener('submit', submitAsignarRepartidor);
    }

    const formEstado = document.getElementById('formCambiarEstado');
    if (formEstado) {
      formEstado.addEventListener('submit', submitCambiarEstado);
    }

    const formIncidente = document.getElementById('formRegistrarIncidente');
    if (formIncidente) {
      formIncidente.addEventListener('submit', submitRegistrarIncidente);
    }

    // ===== NAVEGACIÓN DE AGENDA =====
    // Obtener vista actual desde el botón activo o parámetro URL
    const urlParams = new URLSearchParams(window.location.search);
    let vistaActual = urlParams.get('vista') || document.querySelector('.vista-btn.active')?.dataset?.vista || 'diaria';
    let fechaActual = document.getElementById('fechaSeleccionada')?.value || new Date().toISOString().split('T')[0];

    // Función para cargar agenda
    async function cargarAgenda(vista, fecha) {
      const url = `/panel/repartos/agenda/json/?vista=${vista}&fecha=${fecha}`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar agenda');
        }
        
        renderizarAgenda(data);
        actualizarRangoFechas(data);
        
        // Actualizar URL sin recargar
        const nuevaUrl = new URL(window.location);
        nuevaUrl.searchParams.set('vista', vista);
        nuevaUrl.searchParams.set('fecha', fecha);
        window.history.pushState({}, '', nuevaUrl);
        
      } catch (error) {
        console.error('Error al cargar agenda:', error);
        mostrarErroresValidacion(['Error al cargar la agenda. Por favor, recarga la página.']);
      }
    }

    // Función para renderizar agenda
    function renderizarAgenda(data) {
      const instalacionesContainer = document.getElementById('instalacionesContainer');
      const retirosContainer = document.getElementById('retirosContainer');
      const countInstalaciones = document.getElementById('countInstalaciones');
      const countRetiros = document.getElementById('countRetiros');
      
      if (!instalacionesContainer || !retirosContainer) return;
      
      // Renderizar instalaciones
      if (data.instalaciones.length === 0) {
        instalacionesContainer.innerHTML = '<p style="color:#7f8c8d; text-align:center; padding:1rem;">No hay instalaciones programadas para este período</p>';
      } else {
        instalacionesContainer.innerHTML = data.instalaciones.map(inst => {
          const fechaFormato = new Date(inst.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
          return `
            <div class="agenda-card agenda-instalacion">
              <div class="agenda-time">
                ${fechaFormato}<br>${inst.hora}
              </div>
              <div class="agenda-info">
                <strong>${inst.cliente}</strong>
                <p>${inst.direccion}</p>
                <span class="agenda-repartidor">
                  ${inst.repartidor ? `<i class="fas fa-user"></i> ${inst.repartidor}` : '<i class="fas fa-exclamation-triangle"></i> Sin asignar'}
                </span>
              </div>
              <div class="agenda-actions">
                <button class="btn-icon btn-primary" data-asignar-instalacion="${inst.id}" title="Asignar repartidor">
                  <i class="fas fa-user-plus"></i>
                </button>
                <button class="btn-icon btn-secondary" data-ver-detalle="${inst.id}" data-tipo="instalacion" title="Ver detalle">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
      
      // Renderizar retiros
      if (data.retiros.length === 0) {
        retirosContainer.innerHTML = '<p style="color:#7f8c8d; text-align:center; padding:1rem;">No hay retiros programados para este período</p>';
      } else {
        retirosContainer.innerHTML = data.retiros.map(ret => {
          const fechaFormato = new Date(ret.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
          return `
            <div class="agenda-card agenda-retiro">
              <div class="agenda-time">
                ${fechaFormato}<br>${ret.hora}
              </div>
              <div class="agenda-info">
                <strong>${ret.cliente}</strong>
                <p>${ret.direccion}</p>
                <span class="agenda-repartidor">
                  ${ret.repartidor ? `<i class="fas fa-user"></i> ${ret.repartidor}` : '<i class="fas fa-exclamation-triangle"></i> Sin asignar'}
                </span>
              </div>
              <div class="agenda-actions">
                <button class="btn-icon btn-primary" data-asignar-retiro="${ret.id}" title="Asignar repartidor">
                  <i class="fas fa-user-plus"></i>
                </button>
                <button class="btn-icon btn-secondary" data-ver-detalle="${ret.id}" data-tipo="retiro" title="Ver detalle">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
      
      // Actualizar contadores
      if (countInstalaciones) countInstalaciones.textContent = data.instalaciones.length;
      if (countRetiros) countRetiros.textContent = data.retiros.length;
    }

    // Función para actualizar rango de fechas
    function actualizarRangoFechas(data) {
      const rangoFechas = document.getElementById('rangoFechas');
      if (!rangoFechas) return;
      
      const fechaInicio = new Date(data.fecha_inicio + 'T00:00:00');
      const fechaFin = new Date(data.fecha_fin + 'T00:00:00');
      
      if (data.vista === 'diaria') {
        rangoFechas.textContent = fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else if (data.vista === 'semanal') {
        rangoFechas.textContent = `${fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} - ${fechaFin.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      } else {
        rangoFechas.textContent = fechaInicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }
    }

    // Función para navegar fechas
    function navegarFecha(direccion) {
      const fechaInput = document.getElementById('fechaSeleccionada');
      if (!fechaInput) return;
      
      const fecha = new Date(fechaInput.value + 'T00:00:00');
      let nuevaFecha;
      
      if (vistaActual === 'semanal') {
        nuevaFecha = new Date(fecha);
        nuevaFecha.setDate(fecha.getDate() + (direccion * 7));
      } else if (vistaActual === 'mensual') {
        nuevaFecha = new Date(fecha);
        nuevaFecha.setMonth(fecha.getMonth() + direccion);
      } else {
        nuevaFecha = new Date(fecha);
        nuevaFecha.setDate(fecha.getDate() + direccion);
      }
      
      fechaInput.value = nuevaFecha.toISOString().split('T')[0];
      fechaActual = fechaInput.value;
      cargarAgenda(vistaActual, fechaActual);
    }

    // Event listeners para navegación
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const btnHoy = document.getElementById('btnHoy');
    const fechaInput = document.getElementById('fechaSeleccionada');
    const vistaBtns = document.querySelectorAll('.vista-btn');

    if (btnAnterior) {
      btnAnterior.addEventListener('click', () => navegarFecha(-1));
    }
    
    if (btnSiguiente) {
      btnSiguiente.addEventListener('click', () => navegarFecha(1));
    }
    
    if (btnHoy) {
      btnHoy.addEventListener('click', () => {
        const hoy = new Date().toISOString().split('T')[0];
        if (fechaInput) {
          fechaInput.value = hoy;
          fechaActual = hoy;
          cargarAgenda(vistaActual, fechaActual);
        }
      });
    }
    
    if (fechaInput) {
      fechaInput.addEventListener('change', function() {
        fechaActual = this.value;
        cargarAgenda(vistaActual, fechaActual);
      });
    }

    vistaBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const nuevaVista = this.dataset.vista;
        
        // Actualizar botones activos
        vistaBtns.forEach(b => {
          b.style.background = '';
          b.style.color = '';
        });
        this.style.background = '#2E7D32';
        this.style.color = 'white';
        
        vistaActual = nuevaVista;
        cargarAgenda(vistaActual, fechaActual);
      });
    });
  });
})();

