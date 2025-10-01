// Navbar dropdown
document.addEventListener('DOMContentLoaded', function() {
  const dropdownBtn = document.querySelector('.dropdown-btn');
  const dropdownContent = document.querySelector('.dropdown-content');
  if (dropdownBtn && dropdownContent) {
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownContent.classList.toggle('show');
    });
    document.addEventListener('click', function() {
      dropdownContent.classList.remove('show');
    });
  }

  // Helper: open/close modal
  function openModal(modal){ if(modal){ modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); } }
  function closeModal(modal){ if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); } }

  // Bind modal openers
  const modalCreateAdmin = document.getElementById('modalCreateAdmin');
  const modalCreateDelivery = document.getElementById('modalCreateDelivery');
  const btnOpenCreateAdmin = document.getElementById('btnOpenCreateAdmin');
  const btnOpenCreateDelivery = document.getElementById('btnOpenCreateDelivery');
  if(btnOpenCreateAdmin){ btnOpenCreateAdmin.addEventListener('click', ()=> openModal(modalCreateAdmin)); }
  if(btnOpenCreateDelivery){ btnOpenCreateDelivery.addEventListener('click', ()=> openModal(modalCreateDelivery)); }

  // Close buttons/backdrop
  document.addEventListener('click', function(e){
    const closeEl = e.target.closest('[data-modal-close]');
    if(closeEl){
      const modal = closeEl.closest('.modal') || (closeEl.classList.contains('modal-backdrop') ? (document.querySelector('.modal.show')) : null);
      if(modal){ closeModal(modal); }
    }
  });

  // AJAX submit helper
  async function handleFormSubmit(form){
    const endpoint = form.getAttribute('data-endpoint');
    const formData = new FormData(form);

    // Validación: password == password_confirm si existe
    const pass = form.querySelector('input[name="password"]');
    const pass2 = form.querySelector('input[name="password_confirm"]');
    if(typeof validarFormulario === 'function'){
      const first = form.querySelector('input[name="first_name"]')?.value?.trim() || '';
      const last = form.querySelector('input[name="last_name"]')?.value?.trim() || '';
      const email = form.querySelector('input[name="email"]')?.value?.trim() || '';
      const telefono = form.querySelector('input[name="telefono"]')?.value?.trim() || '';
      const licencia = form.querySelector('input[name="licencia"]')?.value?.trim() || '';
      const vehiculo = form.querySelector('input[name="vehiculo"]')?.value?.trim() || '';

      const checks = [
        ()=> validarNombre(first, 'nombre', 2, 30),
        ()=> validarNombre(last, 'apellido', 2, 30),
        ()=> validarEmail(email, 'email', 100),
        // Username ya no se pide; se genera en servidor
        ()=> validarContrasena(pass ? pass.value : '', 'contraseña', 8),
        ()=> (pass && pass2 ? validarConfirmacionContrasena(pass.value, pass2.value) : [])
      ];

      // Campos extra solo para repartidor
      if(form.id === 'formCreateDelivery'){
        checks.push(()=> (telefono ? validarTelefonoChileno(telefono, 'teléfono', false) : []));
        if(licencia){ checks.push(()=> validarNombre(licencia, 'licencia', 0, 20, true)); }
        if(vehiculo){ checks.push(()=> validarNombre(vehiculo, 'vehículo', 0, 100, true)); }
      }

      const ok = validarFormulario(checks, 'Errores al crear usuario');
      if(!ok){ return; }
    } else if(pass && pass2 && pass.value !== pass2.value){
      // Fallback mínimo si no está cargado validaciones.js
      alert('Las contraseñas no coinciden');
      return;
    }
    try{
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
      });
      const ct = res.headers.get('Content-Type') || '';
      if(ct.includes('application/json')){
        const data = await res.json();
        if(!res.ok || !data.success){
          const errs = (data && data.errors) ? data.errors : ['No se pudo crear el usuario'];
          if(typeof mostrarErroresValidacion === 'function') mostrarErroresValidacion(errs, 'Errores al crear usuario');
          else alert(errs.join('\n'));
          return;
        }
        if(typeof mostrarExitoValidacion === 'function') await mostrarExitoValidacion(data.message || 'Creado correctamente');
        else alert('Creado correctamente');
        return;
      }
      // Fallback si el servidor respondió HTML/redirect
      if(res.redirected){ window.location.href = res.url; return; }
      window.location.reload();
    }catch(e){
      if(typeof mostrarErroresValidacion === 'function') mostrarErroresValidacion(['Error de red. Intenta nuevamente.'], 'Error');
      else alert('Error de red. Intenta nuevamente.');
    }
  }

  const formAdmin = document.getElementById('formCreateAdmin');
  const formDelivery = document.getElementById('formCreateDelivery');
  if(formAdmin){
    formAdmin.addEventListener('submit', function(e){
      e.preventDefault();
      handleFormSubmit(formAdmin).then(()=>{ closeModal(modalCreateAdmin); });
    });
  }
  if(formDelivery){
    formDelivery.addEventListener('submit', function(e){
      e.preventDefault();
      handleFormSubmit(formDelivery).then(()=>{ closeModal(modalCreateDelivery); });
    });
  }
  // Confirmación de cierre de sesión
  const logoutLink = document.getElementById('logoutLink');
  if(logoutLink){
    logoutLink.addEventListener('click', async function(e){
      e.preventDefault();
      if(typeof Swal !== 'undefined' && Swal.fire){
        const res = await Swal.fire({
          title: '¿Cerrar sesión?',
          text: 'Tendrás que iniciar sesión nuevamente para acceder al panel.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, cerrar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#c0392b'
        });
        if(res.isConfirmed){ window.location.href = logoutLink.getAttribute('href'); }
      } else {
        const ok = confirm('¿Seguro que deseas cerrar sesión?');
        if(ok){ window.location.href = logoutLink.getAttribute('href'); }
      }
    });
  }
});

// Dropdown functionality for admin navbar
document.addEventListener('DOMContentLoaded', function() {
  const dropdownBtn = document.querySelector('.dropdown-btn');
  const dropdownContent = document.querySelector('.dropdown-content');

  if (dropdownBtn && dropdownContent) {
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownContent.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
      dropdownContent.classList.remove('show');
    });
  }
});


