function generarNuevoQR() {
    if (confirm('¿Generar un nuevo código QR? El anterior dejará de funcionar.')) {
      location.reload();
    }
  }