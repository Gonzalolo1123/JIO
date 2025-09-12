document.addEventListener("DOMContentLoaded", () => {
  cambiarSlide(1); // iniciar en el video central
});

function cambiarSlide(n) {
  const slides = document.querySelectorAll(".video-slide");
  const puntos = document.querySelectorAll(".punto");

  slides.forEach((slide, i) => {
    const video = slide.querySelector("video");

    // Quitar clase central a todos
    slide.classList.remove("central");

    // Detener todos los videos
    video.pause();
    video.currentTime = 0;
    video.removeAttribute("controls");
    video.setAttribute("muted", true);
  });

  // Agregar clase central solo al seleccionado
  slides[n].classList.add("central");

  // Activar video central
  const videoCentral = slides[n].querySelector("video");
  videoCentral.setAttribute("controls", true);
  videoCentral.removeAttribute("muted");

  // Actualizar los puntos indicadores
  puntos.forEach((punto, i) => {
    punto.classList.toggle("activo", i === n);
  });
}

/////////////  CODIGO PARA PLANES ////////////
let indiceActual = 0;

function actualizarCarrusel() {
  const carrusel = document.getElementById("carruselPlanes");
  const planes = carrusel.querySelectorAll(".plan");

  // Asegurarse de que se mueva solo un plan
  const desplazamiento = -(100 * indiceActual); // 100% para cada plan
  carrusel.style.transform = `translateX(${desplazamiento}%)`;
}

function moverCarrusel(direccion) {
  const carrusel = document.getElementById("carruselPlanes");
  const planes = carrusel.querySelectorAll(".plan");

  // Actualizar el índice actual
  indiceActual += direccion;

  // Asegurarse de que el índice se mantenga dentro de los límites
  if (indiceActual < 0) indiceActual = planes.length - 1;
  if (indiceActual >= planes.length) indiceActual = 0;

  // Llamamos a la función para actualizar el carrusel
  actualizarCarrusel();
}

// Iniciar con el primer plan visible
document.addEventListener("DOMContentLoaded", () => {
  actualizarCarrusel();
});

///////////// Codigo para productos ///////////////////

document.addEventListener("DOMContentLoaded", function () {
  const botones = document.querySelectorAll(".filtro-btn");
  const productos = document.querySelectorAll(".producto");

  botones.forEach(boton => {
    boton.addEventListener("click", () => {
      // Eliminar clase activo de todos los botones
      botones.forEach(btn => btn.classList.remove("activo"));
      boton.classList.add("activo");

      const categoria = boton.getAttribute("data-categoria");

      productos.forEach(producto => {
        if (categoria === "todos" || producto.classList.contains(categoria)) {
          producto.style.display = "block";
        } else {
          producto.style.display = "none";
        }
      });
    });
  });
});
