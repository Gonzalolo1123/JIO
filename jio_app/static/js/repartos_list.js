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

      // Cerrar modales
      if (e.target.closest('[data-modal-close]')) {
        closeModal('modalAsignarRepartidor');
        closeModal('modalCambiarEstado');
        closeModal('modalRegistrarIncidente');
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
  });
})();

