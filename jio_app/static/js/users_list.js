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

      const { value: formValues } = await Swal.fire({
        title: 'Editar usuario',
        html:
          `<input id="sw-username" class="swal2-input" placeholder="Usuario" value="${detail.username}">` +
          `<input id="sw-first" class="swal2-input" placeholder="Nombre" value="${detail.first_name}">` +
          `<input id="sw-last" class="swal2-input" placeholder="Apellido" value="${detail.last_name}">` +
          `<input id="sw-email" class="swal2-input" placeholder="Email" value="${detail.email}">` +
          `<select id="sw-tipo" class="swal2-select">
             <option value="administrador" ${detail.tipo_usuario==='administrador'?'selected':''}>Administrador</option>
             <option value="repartidor" ${detail.tipo_usuario==='repartidor'?'selected':''}>Repartidor</option>
           </select>` +
          `<input id="sw-telefono" class="swal2-input" placeholder="Teléfono" value="${detail.telefono||''}">`,
        focusConfirm: false,
        confirmButtonText: 'Guardar',
        showCancelButton: true,
        preConfirm: () => {
          const username = document.getElementById('sw-username').value.trim();
          const first_name = document.getElementById('sw-first').value.trim();
          const last_name = document.getElementById('sw-last').value.trim();
          const email = document.getElementById('sw-email').value.trim();
          const tipo_usuario = document.getElementById('sw-tipo').value;
          const telefono = document.getElementById('sw-telefono').value.trim();

          const ok = validarFormulario([
            ()=> (function(){
                  const errs = [];
                  if(!/^[A-Za-z0-9._-]{3,30}$/.test(username)){
                    errs.push('Usuario inválido. Use 3-30 caracteres: letras, números, . _ -');
                  }
                  return errs;
                })(),
            ()=> validarNombre(first_name, 'nombre', 2, 30),
            ()=> validarNombre(last_name, 'apellido', 2, 30),
            ()=> validarEmail(email, 'email', 100),
            ()=> (telefono ? validarTelefonoChileno(telefono, 'teléfono', false) : [])
          ], 'Errores al editar usuario');
          if(!ok){
            return false;
          }
          return { username, first_name, last_name, email, tipo_usuario, telefono };
        }
      });

      if(!formValues){ return; }

      const formData = new FormData();
      Object.entries(formValues).forEach(([k,v])=> formData.append(k, v));
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
      mostrarExitoValidacion('Usuario actualizado correctamente');
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


