// Panel de Repartidor
(function(){
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  // ===== CAMBIAR ESTADO DEL REPARTIDOR =====
  function openModalCambiarEstadoRepartidor() {
    const modal = document.getElementById('modalCambiarEstadoRepartidor');
    if (!modal) return;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  async function submitCambiarEstadoRepartidor(e) {
    e.preventDefault();
    const form = e.target;
    const nuevoEstado = form.nuevo_estado.value;

    if (!nuevoEstado) {
      mostrarErroresValidacion(['Debe seleccionar un estado']);
      return;
    }

    const formData = new FormData(form);
    const csrf = getCookie('csrftoken');

    try {
      const res = await fetch('/delivery/cambiar-estado/', {
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

      document.getElementById('modalCambiarEstadoRepartidor').classList.remove('show');
      document.getElementById('modalCambiarEstadoRepartidor').setAttribute('aria-hidden', 'true');
      mostrarExitoValidacion(data.message || 'Estado actualizado correctamente');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      mostrarErroresValidacion(['Error de conexión']);
    }
  }

  // ===== VER DETALLE DE INSTALACIÓN =====
  async function verDetalleInstalacion(instalacionId) {
    const modal = document.getElementById('modalDetalleInstalacion');
    const content = document.getElementById('detalleInstalacionContent');
    if (!modal || !content) return;

    try {
      const res = await fetch(`/delivery/instalacion/${instalacionId}/detalle/`);
      const data = await res.json();

      if (!res.ok) {
        mostrarErroresValidacion([data.error || 'Error al cargar detalle']);
        return;
      }

      // Construir HTML simplificado para móvil
      let html = `
        <div style="display:grid; gap:1.25rem; font-size:1rem;">
          
          <!-- HORA -->
          <div style="background:#e8f5e9; padding:1rem; border-radius:8px; text-align:center;">
            <div style="font-size:0.875rem; color:#2E7D32; font-weight:600; margin-bottom:0.25rem;">HORA DE INSTALACIÓN</div>
            <div style="font-size:1.75rem; font-weight:700; color:#1B5E20;">${data.hora}</div>
            <div style="font-size:0.875rem; color:#666; margin-top:0.25rem;">${data.fecha}</div>
          </div>

          <!-- CLIENTE -->
          <div>
            <div style="font-size:0.875rem; color:#2E7D32; font-weight:600; margin-bottom:0.5rem;">👤 CLIENTE</div>
            <div style="font-size:1.125rem; font-weight:600; margin-bottom:0.5rem;">${data.cliente.nombre}</div>
            <a href="tel:${data.cliente.telefono}" style="display:inline-block; background:#2E7D32; color:white; padding:0.75rem 1.5rem; border-radius:8px; text-decoration:none; font-weight:600; font-size:1rem;">
              📞 ${data.cliente.telefono}
            </a>
          </div>

          <!-- DIRECCIÓN -->
          <div>
            <div style="font-size:0.875rem; color:#2E7D32; font-weight:600; margin-bottom:0.5rem;">📍 DIRECCIÓN</div>
            <div style="background:#f5f5f5; padding:0.75rem; border-radius:8px; margin-bottom:0.75rem; line-height:1.5;">
              ${data.direccion}
            </div>
            ${data.mapa_url ? `
            <a href="${data.mapa_url}" target="_blank" style="display:inline-block; background:#1976D2; color:white; padding:0.75rem 1.5rem; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.875rem;">
              🗺️ Ver en Mapa
            </a>
            ` : `
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.direccion)}" target="_blank" style="display:inline-block; background:#1976D2; color:white; padding:0.75rem 1.5rem; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.875rem;">
              🗺️ Ver en Google Maps
            </a>
            `}
          </div>

          <!-- JUEGOS A INSTALAR -->
          <div>
            <div style="font-size:0.875rem; color:#2E7D32; font-weight:600; margin-bottom:0.5rem;">🎈 JUEGOS A INSTALAR</div>
            ${data.juegos.map(j => `
              <div style="background:#f5f5f5; padding:1rem; border-radius:8px; margin-bottom:0.75rem;">
                ${j.imagen_url ? `
                  <img src="${j.imagen_url}" alt="${j.nombre}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:0.75rem;">
                ` : ''}
                <div style="font-weight:600; font-size:1rem; margin-bottom:0.25rem;">${j.nombre}</div>
                <div style="color:#666; font-size:0.875rem;">Cantidad: ${j.cantidad}</div>
              </div>
            `).join('')}
          </div>

          <!-- SUBTOTAL -->
          <div style="background:#fff3e0; padding:1rem; border-radius:8px;">
            <div style="font-size:0.875rem; color:#E65100; font-weight:600; margin-bottom:0.75rem;">💰 DESGLOSE DE PAGO</div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span>Precio Juegos:</span>
              <span style="font-weight:600;">${formatearPrecioChileno(data.precio_juegos || data.total)}</span>
            </div>
            
            ${data.precio_distancia && parseFloat(data.precio_distancia) > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; padding-bottom:0.5rem; border-bottom:1px dashed #ccc;">
              <span style="font-size:0.875rem; color:#666;">Distancia (${data.kilometros || '?'} km × ${formatearPrecioChileno(1000)}):</span>
              <span style="font-weight:600;">${formatearPrecioChileno(data.precio_distancia)}</span>
            </div>
            ` : ''}
            
            <div style="display:flex; justify-content:space-between; font-size:1.25rem; font-weight:700; color:#E65100; padding-top:0.5rem; border-top:2px solid #E65100;">
              <span>TOTAL:</span>
              <span>${formatearPrecioChileno(data.total)}</span>
            </div>
          </div>

          ${data.observaciones ? `
          <!-- OBSERVACIONES -->
          <div>
            <div style="font-size:0.875rem; color:#2E7D32; font-weight:600; margin-bottom:0.5rem;">📝 OBSERVACIONES</div>
            <div style="background:#f5f5f5; padding:0.75rem; border-radius:8px; white-space:pre-wrap; font-size:0.875rem; line-height:1.5;">${data.observaciones}</div>
          </div>
          ` : ''}

        </div>
      `;

      content.innerHTML = html;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    } catch (error) {
      mostrarErroresValidacion(['Error al cargar detalle']);
    }
  }

  // ===== VER DETALLE DE RETIRO =====
  async function verDetalleRetiro(retiroId) {
    const modal = document.getElementById('modalDetalleRetiro');
    const content = document.getElementById('detalleRetiroContent');
    if (!modal || !content) return;

    try {
      const res = await fetch(`/delivery/retiro/${retiroId}/detalle/`);
      const data = await res.json();

      if (!res.ok) {
        mostrarErroresValidacion([data.error || 'Error al cargar detalle']);
        return;
      }

      // Construir HTML del detalle
      let html = `
        <div style="display:grid; gap:1rem;">
          <div>
            <strong>Fecha:</strong> ${data.fecha} a las ${data.hora}<br>
            <strong>Estado:</strong> <span class="badge badge-info">${data.estado_display}</span>
          </div>
          
          <div>
            <h4 style="margin:0 0 0.5rem 0; color:#2E7D32;">Cliente</h4>
            <strong>${data.cliente.nombre}</strong><br>
            Email: ${data.cliente.email}<br>
            Teléfono: ${data.cliente.telefono}
          </div>

          <div>
            <h4 style="margin:0 0 0.5rem 0; color:#2E7D32;">Dirección de Retiro</h4>
            ${data.direccion}
          </div>

          ${data.observaciones ? `
          <div>
            <h4 style="margin:0 0 0.5rem 0; color:#2E7D32;">Observaciones</h4>
            <pre style="white-space:pre-wrap; font-family:inherit; margin:0;">${data.observaciones}</pre>
          </div>
          ` : ''}
        </div>
      `;

      content.innerHTML = html;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    } catch (error) {
      mostrarErroresValidacion(['Error al cargar detalle']);
    }
  }

  // ===== MARCAR COMO REALIZADO =====
  function openModalMarcarRealizado(repartoId, tipoReparto) {
    const modal = document.getElementById('modalMarcarRealizado');
    if (!modal) return;

    document.getElementById('realizadoRepartoId').value = repartoId;
    document.getElementById('realizadoTipoReparto').value = tipoReparto;

    // Mostrar campos de pago solo para instalaciones
    const camposPago = document.getElementById('camposPagoInstalacion');
    const metodoPago = document.getElementById('metodoPago');
    const labelComprobante = document.getElementById('labelComprobante');
    const comprobantePago = document.getElementById('comprobantePago');
    
    if (tipoReparto === 'instalacion') {
      camposPago.style.display = 'block';
      metodoPago.setAttribute('required', 'required');
      // No hacer required el comprobante aquí, se hará dinámicamente
      labelComprobante.style.display = 'none';
      comprobantePago.removeAttribute('required');
    } else {
      camposPago.style.display = 'none';
      metodoPago.removeAttribute('required');
      labelComprobante.style.display = 'none';
      comprobantePago.removeAttribute('required');
    }

    // Limpiar preview
    document.getElementById('previewComprobante').innerHTML = '';
    
    // Resetear form
    const form = document.getElementById('formMarcarRealizado');
    form.reset();
    
    // Limpiar campos específicos
    document.getElementById('metodoPago').value = '';
    document.getElementById('comprobantePago').value = '';
    document.getElementById('horaRetiro').value = '';

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  // Manejar cambio de método de pago
  function handleMetodoPagoChange(e) {
    const metodoPago = e.target.value;
    const labelComprobante = document.getElementById('labelComprobante');
    const comprobantePago = document.getElementById('comprobantePago');
    const previewComprobante = document.getElementById('previewComprobante');

    if (metodoPago === 'transferencia') {
      labelComprobante.style.display = 'block';
      comprobantePago.setAttribute('required', 'required');
    } else {
      labelComprobante.style.display = 'none';
      comprobantePago.removeAttribute('required');
      comprobantePago.value = '';
      previewComprobante.innerHTML = '';
    }
  }

  // Preview de imagen
  function handleComprobanteChange(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('previewComprobante');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%; max-height:200px; border:1px solid #ddd; border-radius:4px;">`;
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = '';
    }
  }

  async function submitMarcarRealizado(e) {
    e.preventDefault();
    const form = e.target;
    const repartoId = form.reparto_id.value;
    const tipoReparto = form.tipo_reparto.value;
    const observaciones = form.observaciones.value;

    // Validaciones para instalación
    if (tipoReparto === 'instalacion') {
      const metodoPago = form.metodo_pago.value;
      const comprobante = form.comprobante_pago.files[0];

      if (!metodoPago) {
        mostrarErroresValidacion(['Debe seleccionar un método de pago']);
        return;
      }

      // Solo validar comprobante si el método es transferencia
      if (metodoPago === 'transferencia' && !comprobante) {
        mostrarErroresValidacion(['Debe adjuntar el comprobante de transferencia']);
        return;
      }
    }

    const formData = new FormData(form);
    const csrf = getCookie('csrftoken');
    const url = `/delivery/${tipoReparto}/${repartoId}/marcar-realizado/`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf },
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errs = data && data.errors ? data.errors : ['Error al marcar como realizado'];
        mostrarErroresValidacion(errs);
        return;
      }

      document.getElementById('modalMarcarRealizado').classList.remove('show');
      document.getElementById('modalMarcarRealizado').setAttribute('aria-hidden', 'true');
      mostrarExitoValidacion(data.message || 'Marcado como realizado correctamente');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      mostrarErroresValidacion(['Error de conexión']);
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
    // Botón cambiar estado del repartidor
    const btnCambiarEstado = document.getElementById('btnCambiarEstado');
    if (btnCambiarEstado) {
      btnCambiarEstado.addEventListener('click', openModalCambiarEstadoRepartidor);
    }

    // Event delegation para botones
    document.addEventListener('click', function(e) {
      // Ver detalle instalación
      const btnDetalleInst = e.target.closest('[data-ver-detalle-instalacion]');
      if (btnDetalleInst) {
        e.preventDefault();
        const id = btnDetalleInst.getAttribute('data-ver-detalle-instalacion');
        verDetalleInstalacion(id);
        return;
      }

      // Ver detalle retiro
      const btnDetalleRet = e.target.closest('[data-ver-detalle-retiro]');
      if (btnDetalleRet) {
        e.preventDefault();
        const id = btnDetalleRet.getAttribute('data-ver-detalle-retiro');
        verDetalleRetiro(id);
        return;
      }

      // Actualizar estado instalación
      const btnEstadoInst = e.target.closest('[data-actualizar-estado-instalacion]');
      if (btnEstadoInst) {
        e.preventDefault();
        const id = btnEstadoInst.getAttribute('data-actualizar-estado-instalacion');
        openModalMarcarRealizado(id, 'instalacion');
        return;
      }

      // Actualizar estado retiro
      const btnEstadoRet = e.target.closest('[data-actualizar-estado-retiro]');
      if (btnEstadoRet) {
        e.preventDefault();
        const id = btnEstadoRet.getAttribute('data-actualizar-estado-retiro');
        openModalMarcarRealizado(id, 'retiro');
        return;
      }

      // Cerrar modales
      if (e.target.closest('[data-modal-close]')) {
        closeModal('modalCambiarEstadoRepartidor');
        closeModal('modalDetalleInstalacion');
        closeModal('modalDetalleRetiro');
        closeModal('modalMarcarRealizado');
      }
    });

    // Form submissions
    const formEstadoRepartidor = document.getElementById('formCambiarEstadoRepartidor');
    if (formEstadoRepartidor) {
      formEstadoRepartidor.addEventListener('submit', submitCambiarEstadoRepartidor);
    }

    const formMarcarRealizado = document.getElementById('formMarcarRealizado');
    if (formMarcarRealizado) {
      formMarcarRealizado.addEventListener('submit', submitMarcarRealizado);
    }

    // Preview de comprobante
    const comprobantePago = document.getElementById('comprobantePago');
    if (comprobantePago) {
      comprobantePago.addEventListener('change', handleComprobanteChange);
    }

    // Cambio de método de pago
    const metodoPago = document.getElementById('metodoPago');
    if (metodoPago) {
      metodoPago.addEventListener('change', handleMetodoPagoChange);
    }
  });
})();

