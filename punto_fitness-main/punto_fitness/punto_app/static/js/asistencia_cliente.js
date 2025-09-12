let videoStream = null;
let scanning = false;
let escaneoAutomaticoTimeout = null;

// Función para procesar el QR manualmente
document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('qr-video');
  const canvas = document.getElementById('qr-canvas');
  const btnIniciar = document.getElementById('btn-iniciar-camara');
  const btnDetener = document.getElementById('btn-detener-camara');
  const btnTomarFoto = document.getElementById('btn-tomar-foto');
  const inputManual = document.getElementById('input-codigo-manual');
  const btnEnviarManual = document.getElementById('btn-enviar-manual');
  const btnAbrirModal = document.getElementById('btn-abrir-modal');
  const modalScanner = document.getElementById('modal-scanner');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal');

  // Cargar estado actual
  cargarEstadoActual();

  btnIniciar.addEventListener('click', iniciarCamara);
  btnDetener.addEventListener('click', detenerCamara);
  btnEnviarManual.addEventListener('click', enviarCodigoManual);
  if (btnTomarFoto) {
    btnTomarFoto.disabled = true;
    btnTomarFoto.addEventListener('click', tomarFotoQR);
  }

  // Abrir modal
  btnAbrirModal.addEventListener('click', function() {
    modalScanner.classList.add('active');
    // Resetear controles
    btnIniciar.style.display = 'inline-block';
    btnDetener.style.display = 'none';
    btnTomarFoto.style.display = 'none';
    btnTomarFoto.disabled = true;
    video.srcObject = null;
    video.style.background = '#000';
  });

  // Cerrar modal
  btnCerrarModal.addEventListener('click', function() {
    modalScanner.classList.remove('active');
    detenerCamara();
  });

  // Al cerrar modal con click fuera del contenido
  modalScanner.addEventListener('click', function(e) {
    if (e.target === modalScanner) {
      modalScanner.classList.remove('active');
      detenerCamara();
    }
  });

  function iniciarCamara() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function(stream) {
        videoStream = stream;
        video.srcObject = stream;
        video.style.background = '#000';
        btnIniciar.style.display = 'none';
        btnDetener.style.display = 'inline-block';
        btnTomarFoto.style.display = 'none'; // Ocultar hasta que esté lista
        btnTomarFoto.disabled = true;
        scanning = true;
        // Esperar a que el video esté realmente listo antes de permitir escaneo automático
        function esperarVideoListoYEscanear() {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            btnTomarFoto.style.display = 'inline-block';
            btnTomarFoto.disabled = false;
            escanearQR();
          } else {
            btnTomarFoto.style.display = 'none';
            btnTomarFoto.disabled = true;
            setTimeout(esperarVideoListoYEscanear, 500);
          }
        }
        setTimeout(esperarVideoListoYEscanear, 1200); // Espera inicial antes de chequear
      })
      .catch(function(err) {
        alert('Error al acceder a la cámara: ' + err.message);
      });
  }

  function detenerCamara() {
    if (escaneoAutomaticoTimeout) clearTimeout(escaneoAutomaticoTimeout);
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    video.srcObject = null;
    video.style.background = 'transparent'; // Fondo transparente al detener
    btnIniciar.style.display = 'inline-block';
    btnDetener.style.display = 'none';
    btnTomarFoto.style.display = 'none';
    btnTomarFoto.disabled = true;
    scanning = false;
  }

  async function tomarFotoQR() {
    if (!videoStream) return;
    // Esperar 500ms extra antes de capturar para asegurar que la cámara esté lista
    await new Promise(resolve => setTimeout(resolve, 500));
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      mostrarResultado({ error: 'La cámara aún no está lista. Espera un momento e intenta de nuevo.' });
      return;
    }
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      procesarQR(code.data);
      detenerCamara();
    } else {
      mostrarResultado({ error: 'No se detectó un código QR. Intenta de nuevo.' });
    }
  }

  function procesarQR(qrData) {
    fetch('/escanear-qr/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
      },
      body: JSON.stringify({ qr_code: qrData })
    })
    .then(response => response.json())
    .then(data => {
      mostrarResultado(data);
      cargarEstadoActual();
    })
    .catch(error => {
      mostrarResultado({ error: 'Error al procesar el QR' });
    });
  }

  function mostrarResultado(data) {
    const resultadoSection = document.getElementById('resultado-section');
    const resultadoMensaje = document.getElementById('resultado-mensaje');
    resultadoSection.style.display = 'block';
    if (data.success) {
      const color = data.tipo === 'entrada' ? '#27ae60' : '#e74c3c';
      resultadoMensaje.innerHTML = `
        <div style="color: ${color}; font-weight: bold; font-size: 1.2rem;">
          ${data.mensaje}
        </div>
        <p>Establecimiento: ${data.establecimiento}</p>
      `;
    } else {
      resultadoMensaje.innerHTML = `
        <div style="color: #e74c3c; font-weight: bold;">
          Error: ${data.error}
        </div>
      `;
    }
    setTimeout(() => {
      resultadoSection.style.display = 'none';
    }, 5000);
  }

  function cargarEstadoActual() {
    document.getElementById('estado-actual').innerHTML = `
      <p>Tu estado se actualizará después de escanear el QR o ingresar el código manualmente.</p>
    `;
  }

  function enviarCodigoManual() {
    const codigoManual = inputManual.value.trim();
    if (codigoManual) {
      procesarQR(codigoManual);
      detenerCamara();
    } else {
      alert('Por favor, ingresa un código QR válido.');
    }
  }

  function escanearQR() {
    if (!scanning) return;
    // Solo intentar capturar si el video está listo
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(escanearQR, 500);
      return;
    }
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      procesarQR(code.data);
      detenerCamara();
    } else {
      setTimeout(escanearQR, 500); // Espera 0.5s antes de volver a intentar
    }
  }
});

function cargarHistorialAsistencias() {
  fetch('/asistencia-cliente/historial/')
    .then(response => response.json())
    .then(data => {
      const tbody = document.querySelector('#tabla-historial tbody');
      tbody.innerHTML = '';
      if (data.historial && data.historial.length > 0) {
        data.historial.forEach(item => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${item.fecha}</td>
            <td>${item.hora_entrada}</td>
            <td>${item.hora_salida || '-'}</td>
            <td>${item.establecimiento}</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4">Sin asistencias registradas</td>';
        tbody.appendChild(tr);
      }
    })
    .catch(() => {
      const tbody = document.querySelector('#tabla-historial tbody');
      tbody.innerHTML = '<tr><td colspan="4">Error al cargar historial</td></tr>';
    });
}

// Llamar al cargar la página y después de registrar asistencia
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarHistorialAsistencias);
} else {
  cargarHistorialAsistencias();
}
// Llama también después de mostrarResultado (después de registrar asistencia)
const originalMostrarResultado = mostrarResultado;
mostrarResultado = function(data) {
  originalMostrarResultado(data);
  cargarHistorialAsistencias();
};