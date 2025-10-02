// Requires SweetAlert2 and validaciones.js
(function(){
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  async function onClickEdit(userId, endpoints){
    try {
      const detailRes = await fetch(`${endpoints.detail}${userId}/json/`);
      const detail = await detailRes.json();
      if(!detailRes.ok){
        return mostrarErroresValidacion([detail.error || 'Error al cargar usuario']);
      }

      // Determinar qué modal abrir según el tipo de usuario
      const isRepartidor = detail.tipo_usuario === 'repartidor';
      const modalId = isRepartidor ? 'modalEditRepartidor' : 'modalEditAdmin';
      const modal = document.getElementById(modalId);
      if(!modal) return;

      // Poblar campos según el tipo
      if(isRepartidor){
        // Modal de repartidor
        document.getElementById('editRepartidorId').value = detail.id;
        document.getElementById('editRepartidorFirst').value = detail.first_name || '';
        document.getElementById('editRepartidorLast').value = detail.last_name || '';
        document.getElementById('editRepartidorEmail').value = detail.email || '';
        document.getElementById('editRepartidorTelefono').value = detail.telefono || '';
        
        // Poblar selects específicos de repartidor
        const selLic = document.getElementById('editRepartidorLicencia');
        const selEst = document.getElementById('editRepartidorEstado');
        if(selLic && selEst){
          selLic.length = 1;
          selEst.length = 1;
          (detail.license_types || []).forEach(t=>{
            const opt = document.createElement('option'); opt.value = t; opt.textContent = t; selLic.appendChild(opt);
          });
          (detail.estado_choices || []).forEach(e=>{
            const opt = document.createElement('option'); opt.value = e; opt.textContent = e.replace('_',' '); selEst.appendChild(opt);
          });
          if(detail.repartidor){
            if(detail.repartidor.licencia_conducir){ selLic.value = detail.repartidor.licencia_conducir; }
            if(detail.repartidor.estado){ selEst.value = detail.repartidor.estado; }
            document.getElementById('editRepartidorVehiculo').value = detail.repartidor.vehiculo || '';
          }
        }
      } else {
        // Modal de administrador
        document.getElementById('editAdminId').value = detail.id;
        document.getElementById('editAdminUsername').value = detail.username || '';
        document.getElementById('editAdminFirst').value = detail.first_name || '';
        document.getElementById('editAdminLast').value = detail.last_name || '';
        document.getElementById('editAdminEmail').value = detail.email || '';
        document.getElementById('editAdminTelefono').value = detail.telefono || '';
      }

      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');

      // Bind submit del formulario correspondiente
      const formId = isRepartidor ? 'formEditRepartidor' : 'formEditAdmin';
      const form = document.getElementById(formId);
      const submitHandler = async function(e){
        e.preventDefault();
        
        let username, first_name, last_name, email, telefono, licencia_conducir, vehiculo, estado;
        
        if(isRepartidor){
          first_name = document.getElementById('editRepartidorFirst').value.trim();
          last_name = document.getElementById('editRepartidorLast').value.trim();
          email = document.getElementById('editRepartidorEmail').value.trim();
          telefono = document.getElementById('editRepartidorTelefono').value.trim();
          licencia_conducir = document.getElementById('editRepartidorLicencia').value;
          vehiculo = document.getElementById('editRepartidorVehiculo').value.trim();
          estado = document.getElementById('editRepartidorEstado').value;
        } else {
          username = document.getElementById('editAdminUsername').value.trim();
          first_name = document.getElementById('editAdminFirst').value.trim();
          last_name = document.getElementById('editAdminLast').value.trim();
          email = document.getElementById('editAdminEmail').value.trim();
          telefono = document.getElementById('editAdminTelefono').value.trim();
        }

        const validaciones = [
          ()=> validarNombre(first_name, 'nombre', 2, 30),
          ()=> validarNombre(last_name, 'apellido', 2, 30),
          ()=> validarEmail(email, 'email', 100),
          ()=> (telefono ? validarTelefonoChileno(telefono, 'teléfono', false) : [])
        ];
        
        // Solo validar username para administradores
        if(!isRepartidor){
          validaciones.unshift(()=> (function(){
                const errs = [];
                if(!/^[A-Za-z0-9._-]{3,30}$/.test(username)){
                  errs.push('Usuario inválido. Use 3-30 caracteres: letras, números, . _ -');
                }
                return errs;
              })());
        }
        
        if(isRepartidor){
          validaciones.push(()=> (vehiculo && vehiculo.length > 100 ? ['El vehículo no puede exceder 100 caracteres'] : []));
        }

        const ok = validarFormulario(validaciones, 'Errores al editar usuario');
        if(!ok){ return; }

        const formData = new FormData();
        if(!isRepartidor){
          formData.append('username', username);
        }
        formData.append('first_name', first_name);
        formData.append('last_name', last_name);
        formData.append('email', email);
        formData.append('telefono', telefono);
        if(isRepartidor){
          if(licencia_conducir) formData.append('licencia_conducir', licencia_conducir);
          if(vehiculo) formData.append('vehiculo', vehiculo);
          if(estado) formData.append('estado', estado);
        }
        const csrf = getCookie('csrftoken');
        const updRes = await fetch(`${endpoints.update}${userId}/update/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': csrf },
          body: formData
        });
        const upd = await updRes.json();
        if(!updRes.ok || !upd.success){
          const errs = upd && upd.errors ? upd.errors : ['Error desconocido'];
          return mostrarErroresValidacion(errs, 'No se pudo guardar');
        }
        // Cerrar modal y mostrar éxito
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden','true');
        mostrarExitoValidacion('Usuario actualizado correctamente');
        form.removeEventListener('submit', submitHandler);
      };
      form.addEventListener('submit', submitHandler);

      // Cierre por backdrop/botón
      modal.addEventListener('click', function(ev){
        if(ev.target === modal || ev.target.closest('[data-modal-close]')){
          modal.classList.remove('show');
          modal.setAttribute('aria-hidden','true');
        }
      }, { once: true });

    } catch(e){
      mostrarErroresValidacion(['Error inesperado al editar usuario']);
    }
  }

  async function onClickDelete(userId, endpoints){
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b'
    });
    if(!result.isConfirmed) return;
    const csrf = getCookie('csrftoken');
    const delRes = await fetch(`${endpoints.delete}${userId}/delete/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrf }
    });
    const del = await delRes.json();
    if(!delRes.ok || !del.success){
      const errs = del && del.errors ? del.errors : ['No se pudo eliminar'];
      return mostrarErroresValidacion(errs, 'Error');
    }
    mostrarExitoValidacion('Usuario eliminado');
  }

  async function openShare(role, endpoints){
    try{
      const url = role === 'admin' ? endpoints.shareAdmin : endpoints.shareDelivery;
      const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } });
      const data = await res.json();
      if(!res.ok || !data.invite_url){
        return mostrarErroresValidacion(['No se pudo generar el enlace de invitación']);
      }
      await Swal.fire({
        title: `Compartir ${data.role}`,
        html: `<div class="copy-row"><input id="inviteLink" type="text" value="${data.invite_url}" readonly><button class="btn btn-secondary" id="copyBtn">Copiar</button></div>`,
        showConfirmButton: false,
        didOpen: () => {
          const input = document.getElementById('inviteLink');
          const btn = document.getElementById('copyBtn');
          if(btn && input){
            btn.addEventListener('click', async function(){
              try { await navigator.clipboard.writeText(input.value); btn.textContent = 'Copiado!'; setTimeout(()=>btn.textContent='Copiar', 1500);} catch(e){ input.select(); document.execCommand('copy'); btn.textContent='Copiado!'; setTimeout(()=>btn.textContent='Copiar',1500);} 
            });
          }
        }
      });
    }catch(e){
      mostrarErroresValidacion(['Error inesperado al generar invitación']);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const container = document.getElementById('usersPage');
    if(!container) return;
    const endpoints = {
      detail: container.getAttribute('data-users-base') || '/panel/users/',
      update: container.getAttribute('data-users-base') || '/panel/users/',
      delete: container.getAttribute('data-users-base') || '/panel/users/',
      shareAdmin: container.getAttribute('data-share-admin') || '/panel/admin/share-invite/',
      shareDelivery: container.getAttribute('data-share-delivery') || '/panel/delivery/share-invite/'
    };

    document.addEventListener('click', function(e){
      const editBtn = e.target.closest('[data-edit-user]');
      if(editBtn){ e.preventDefault(); onClickEdit(editBtn.getAttribute('data-edit-user'), endpoints); return; }
      const delBtn = e.target.closest('[data-delete-user]');
      if(delBtn){ e.preventDefault(); onClickDelete(delBtn.getAttribute('data-delete-user'), endpoints); }
    });

    const btnShareAdmin = document.getElementById('btnShareAdmin');
    const btnShareDelivery = document.getElementById('btnShareDelivery');
    if(btnShareAdmin){ btnShareAdmin.addEventListener('click', ()=> openShare('admin', endpoints)); }
    if(btnShareDelivery){ btnShareDelivery.addEventListener('click', ()=> openShare('delivery', endpoints)); }
  });
})();



// Requires SweetAlert2 and validaciones.js
(function(){
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  async function onClickEdit(userId, endpoints){
    try {
      const detailRes = await fetch(`${endpoints.detail}${userId}/json/`);
      const detail = await detailRes.json();
      if(!detailRes.ok){
        return mostrarErroresValidacion([detail.error || 'Error al cargar usuario']);
      }

      // Determinar qué modal abrir según el tipo de usuario
      const isRepartidor = detail.tipo_usuario === 'repartidor';
      const modalId = isRepartidor ? 'modalEditRepartidor' : 'modalEditAdmin';
      const modal = document.getElementById(modalId);
      if(!modal) return;

      // Poblar campos según el tipo
      if(isRepartidor){
        // Modal de repartidor
        document.getElementById('editRepartidorId').value = detail.id;
        document.getElementById('editRepartidorFirst').value = detail.first_name || '';
        document.getElementById('editRepartidorLast').value = detail.last_name || '';
        document.getElementById('editRepartidorEmail').value = detail.email || '';
        document.getElementById('editRepartidorTelefono').value = detail.telefono || '';
        
        // Poblar selects específicos de repartidor
        const selLic = document.getElementById('editRepartidorLicencia');
        const selEst = document.getElementById('editRepartidorEstado');
        if(selLic && selEst){
          selLic.length = 1;
          selEst.length = 1;
          (detail.license_types || []).forEach(t=>{
            const opt = document.createElement('option'); opt.value = t; opt.textContent = t; selLic.appendChild(opt);
          });
          (detail.estado_choices || []).forEach(e=>{
            const opt = document.createElement('option'); opt.value = e; opt.textContent = e.replace('_',' '); selEst.appendChild(opt);
          });
          if(detail.repartidor){
            if(detail.repartidor.licencia_conducir){ selLic.value = detail.repartidor.licencia_conducir; }
            if(detail.repartidor.estado){ selEst.value = detail.repartidor.estado; }
            document.getElementById('editRepartidorVehiculo').value = detail.repartidor.vehiculo || '';
          }
        }
      } else {
        // Modal de administrador
        document.getElementById('editAdminId').value = detail.id;
        document.getElementById('editAdminUsername').value = detail.username || '';
        document.getElementById('editAdminFirst').value = detail.first_name || '';
        document.getElementById('editAdminLast').value = detail.last_name || '';
        document.getElementById('editAdminEmail').value = detail.email || '';
        document.getElementById('editAdminTelefono').value = detail.telefono || '';
      }

      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');

      // Bind submit del formulario correspondiente
      const formId = isRepartidor ? 'formEditRepartidor' : 'formEditAdmin';
      const form = document.getElementById(formId);
      const submitHandler = async function(e){
        e.preventDefault();
        
        let username, first_name, last_name, email, telefono, licencia_conducir, vehiculo, estado;
        
        if(isRepartidor){
          first_name = document.getElementById('editRepartidorFirst').value.trim();
          last_name = document.getElementById('editRepartidorLast').value.trim();
          email = document.getElementById('editRepartidorEmail').value.trim();
          telefono = document.getElementById('editRepartidorTelefono').value.trim();
          licencia_conducir = document.getElementById('editRepartidorLicencia').value;
          vehiculo = document.getElementById('editRepartidorVehiculo').value.trim();
          estado = document.getElementById('editRepartidorEstado').value;
        } else {
          username = document.getElementById('editAdminUsername').value.trim();
          first_name = document.getElementById('editAdminFirst').value.trim();
          last_name = document.getElementById('editAdminLast').value.trim();
          email = document.getElementById('editAdminEmail').value.trim();
          telefono = document.getElementById('editAdminTelefono').value.trim();
        }

        const validaciones = [
          ()=> validarNombre(first_name, 'nombre', 2, 30),
          ()=> validarNombre(last_name, 'apellido', 2, 30),
          ()=> validarEmail(email, 'email', 100),
          ()=> (telefono ? validarTelefonoChileno(telefono, 'teléfono', false) : [])
        ];
        
        // El campo username no se valida en edición (es de solo lectura)
        
        if(isRepartidor){
          validaciones.push(()=> (vehiculo && vehiculo.length > 100 ? ['El vehículo no puede exceder 100 caracteres'] : []));
        }

        const ok = validarFormulario(validaciones, 'Errores al editar usuario');
        if(!ok){ return; }

        const formData = new FormData();
        // El campo username no se envía al servidor (es de solo lectura)
        formData.append('first_name', first_name);
        formData.append('last_name', last_name);
        formData.append('email', email);
        formData.append('telefono', telefono);
        if(isRepartidor){
          if(licencia_conducir) formData.append('licencia_conducir', licencia_conducir);
          if(vehiculo) formData.append('vehiculo', vehiculo);
          if(estado) formData.append('estado', estado);
        }
        const csrf = getCookie('csrftoken');
        const updRes = await fetch(`${endpoints.update}${userId}/update/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': csrf },
          body: formData
        });
        const upd = await updRes.json();
        if(!updRes.ok || !upd.success){
          const errs = upd && upd.errors ? upd.errors : ['Error desconocido'];
          return mostrarErroresValidacion(errs, 'No se pudo guardar');
        }
        // Cerrar modal y mostrar éxito
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden','true');
        mostrarExitoValidacion('Usuario actualizado correctamente');
        form.removeEventListener('submit', submitHandler);
      };
      form.addEventListener('submit', submitHandler);

      // Cierre por backdrop/botón
      modal.addEventListener('click', function(ev){
        if(ev.target === modal || ev.target.closest('[data-modal-close]')){
          modal.classList.remove('show');
          modal.setAttribute('aria-hidden','true');
        }
      }, { once: true });

    } catch(e){
      mostrarErroresValidacion(['Error inesperado al editar usuario']);
    }
  }

  async function onClickDelete(userId, endpoints){
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b'
    });
    if(!result.isConfirmed) return;
    const csrf = getCookie('csrftoken');
    const delRes = await fetch(`${endpoints.delete}${userId}/delete/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrf }
    });
    const del = await delRes.json();
    if(!delRes.ok || !del.success){
      const errs = del && del.errors ? del.errors : ['No se pudo eliminar'];
      return mostrarErroresValidacion(errs, 'Error');
    }
    mostrarExitoValidacion('Usuario eliminado');
  }

  async function openShare(role, endpoints){
    try{
      const url = role === 'admin' ? endpoints.shareAdmin : endpoints.shareDelivery;
      const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } });
      const data = await res.json();
      if(!res.ok || !data.invite_url){
        return mostrarErroresValidacion(['No se pudo generar el enlace de invitación']);
      }
      await Swal.fire({
        title: `Compartir ${data.role}`,
        html: `<div class="copy-row"><input id="inviteLink" type="text" value="${data.invite_url}" readonly><button class="btn btn-secondary" id="copyBtn">Copiar</button></div>`,
        showConfirmButton: false,
        didOpen: () => {
          const input = document.getElementById('inviteLink');
          const btn = document.getElementById('copyBtn');
          if(btn && input){
            btn.addEventListener('click', async function(){
              try { await navigator.clipboard.writeText(input.value); btn.textContent = 'Copiado!'; setTimeout(()=>btn.textContent='Copiar', 1500);} catch(e){ input.select(); document.execCommand('copy'); btn.textContent='Copiado!'; setTimeout(()=>btn.textContent='Copiar',1500);} 
            });
          }
        }
      });
    }catch(e){
      mostrarErroresValidacion(['Error inesperado al generar invitación']);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const container = document.getElementById('usersPage');
    if(!container) return;
    const endpoints = {
      detail: container.getAttribute('data-users-base') || '/panel/users/',
      update: container.getAttribute('data-users-base') || '/panel/users/',
      delete: container.getAttribute('data-users-base') || '/panel/users/',
      shareAdmin: container.getAttribute('data-share-admin') || '/panel/admin/share-invite/',
      shareDelivery: container.getAttribute('data-share-delivery') || '/panel/delivery/share-invite/'
    };

    document.addEventListener('click', function(e){
      const editBtn = e.target.closest('[data-edit-user]');
      if(editBtn){ e.preventDefault(); onClickEdit(editBtn.getAttribute('data-edit-user'), endpoints); return; }
      const delBtn = e.target.closest('[data-delete-user]');
      if(delBtn){ e.preventDefault(); onClickDelete(delBtn.getAttribute('data-delete-user'), endpoints); }
    });

    const btnShareAdmin = document.getElementById('btnShareAdmin');
    const btnShareDelivery = document.getElementById('btnShareDelivery');
    if(btnShareAdmin){ btnShareAdmin.addEventListener('click', ()=> openShare('admin', endpoints)); }
    if(btnShareDelivery){ btnShareDelivery.addEventListener('click', ()=> openShare('delivery', endpoints)); }
  });
})();


