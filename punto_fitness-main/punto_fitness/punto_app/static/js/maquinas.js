document.addEventListener("DOMContentLoaded", function () {
  const carrusel = document.querySelector(".carrusel-maquinas");
  const btnIzq = document.querySelector(".flecha.izquierda");
  const btnDer = document.querySelector(".flecha.derecha");

  let scrollAmount = 0;
  const scrollStep = 260; // ancho de una tarjeta + gap

  btnIzq.addEventListener("click", () => {
    scrollAmount = Math.max(0, scrollAmount - scrollStep);
    carrusel.scrollTo({ left: scrollAmount, behavior: "smooth" });
  });

  btnDer.addEventListener("click", () => {
    scrollAmount += scrollStep;
    carrusel.scrollTo({ left: scrollAmount, behavior: "smooth" });
  });
});

const rutinas = {
  fullbody: [
    ["Sentadillas", "4", "12", "60s", "Ver video"],
    ["Press de banca", "3", "10", "60s", "Ver video"]
  ],
  pectoral: [
    ["Press plano", "4", "12", "60s", "Ver video"],
    ["Aperturas", "3", "15", "45s", "Ver video"]
  ],
  espalda: [
    ["Dominadas", "4", "10", "60s", "Ver video"],
    ["Remo", "3", "12", "60s", "Ver video"]
  ],
  cuadriceps: [
    ["Prensa", "4", "10", "60s", "Ver video"],
    ["Sentadilla frontal", "3", "12", "60s", "Ver video"]
  ],
  gluteos: [
    ["Hip Thrust", "4", "15", "60s", "Ver video"],
    ["Puente glúteo", "3", "20", "45s", "Ver video"]
  ]
};

document.querySelectorAll('.filtro-rutina').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-rutina').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const zona = btn.dataset.zona;
    mostrarZona(zona);
    cargarRutina(zona);
  });
});

function mostrarZona(zona) {
  document.querySelectorAll('.highlight').forEach(el => el.style.display = 'none');
  const zonaHighlight = document.getElementById(`zona-${zona}`);
  if (zonaHighlight) zonaHighlight.style.display = 'block';
}

function cargarRutina(zona) {
  const tabla = document.getElementById('tabla-ejercicios');
  tabla.innerHTML = '';
  rutinas[zona].forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tabla.appendChild(tr);
  });
}

// Mostrar por defecto Full Body
mostrarZona('fullbody');
cargarRutina('fullbody');

// Carrusel de máquinas (3 a la vez, 360°)
document.addEventListener('DOMContentLoaded', function() {
  const carrusel = document.getElementById('maquinasCarrusel');
  const prevBtn = document.getElementById('prevMaquina');
  const nextBtn = document.getElementById('nextMaquina');
  if (!carrusel || !prevBtn || !nextBtn) return;
  const cards = carrusel.querySelectorAll('.maquina-card');
  function getCardsPerView() {
    if (window.innerWidth < 700) return 1;
    if (window.innerWidth < 1000) return 2;
    return 3;
  }
  let cardsPerView = getCardsPerView();
  let currentIndex = 0;

  function updateCarrusel() {
    cardsPerView = getCardsPerView();
    const cardWidth = cards[0].offsetWidth + 32; // 32px gap
    carrusel.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
  }

  prevBtn.addEventListener('click', function() {
    if (currentIndex > 0) {
      currentIndex--;
    } else {
      currentIndex = cards.length - cardsPerView;
    }
    updateCarrusel();
  });

  nextBtn.addEventListener('click', function() {
    if (currentIndex < cards.length - cardsPerView) {
      currentIndex++;
    } else {
      currentIndex = 0;
    }
    updateCarrusel();
  });

  window.addEventListener('resize', function() {
    updateCarrusel();
  });

  updateCarrusel();
});
