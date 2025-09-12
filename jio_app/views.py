from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Juego, PrecioTemporada

# Create your views here.

def index(request):
    """
    Vista para la página principal del sitio público
    """
    # Obtener algunos juegos destacados para mostrar
    juegos_destacados = Juego.objects.filter(estado='disponible')[:6]
    
    context = {
        'juegos_destacados': juegos_destacados,
    }
    return render(request, 'jio_app/index.html', context)

def login_view(request):
    """
    Vista para el login de administradores y repartidores
    """
    if request.user.is_authenticated:
        # Si ya está autenticado, redirigir al admin
        return redirect('admin:index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        if username and password:
            user = authenticate(request, username=username, password=password)
            if user is not None:
                # Verificar que el usuario sea administrador o repartidor
                if user.tipo_usuario in ['administrador', 'repartidor']:
                    login(request, user)
                    messages.success(request, f'¡Bienvenido, {user.get_full_name()}!')
                    return redirect('admin:index')
                else:
                    messages.error(request, 'Acceso denegado. Solo administradores y repartidores pueden acceder.')
            else:
                messages.error(request, 'Usuario o contraseña incorrectos.')
        else:
            messages.error(request, 'Por favor completa todos los campos.')
    
    return render(request, 'jio_app/login.html')

@login_required
def logout_view(request):
    """
    Vista para cerrar sesión
    """
    logout(request)
    messages.success(request, 'Has cerrado sesión correctamente.')
    return redirect('index')

def reservar_view(request):
    """
    Vista para el formulario de reserva (próximamente)
    """
    if request.method == 'POST':
        # Aquí se procesará el formulario de reserva cuando esté implementado
        messages.info(request, 'Formulario de reserva en desarrollo. Próximamente disponible.')
        return redirect('index')
    
    # Obtener todos los juegos disponibles
    juegos_disponibles = Juego.objects.filter(estado='disponible')
    
    context = {
        'juegos_disponibles': juegos_disponibles,
    }
    return render(request, 'jio_app/reservar.html', context)

def juegos_view(request):
    """
    Vista para mostrar todos los juegos disponibles
    """
    juegos = Juego.objects.filter(estado='disponible').order_by('categoria', 'nombre')
    
    # Agrupar por categoría
    categorias = {}
    for juego in juegos:
        categoria = juego.get_categoria_display()
        if categoria not in categorias:
            categorias[categoria] = []
        categorias[categoria].append(juego)
    
    context = {
        'categorias': categorias,
    }
    return render(request, 'jio_app/juegos.html', context)

def contacto_view(request):
    """
    Vista para la página de contacto
    """
    if request.method == 'POST':
        # Aquí se procesará el formulario de contacto cuando esté implementado
        messages.success(request, '¡Gracias por tu mensaje! Te contactaremos pronto.')
        return redirect('index')
    
    return render(request, 'jio_app/contacto.html')

def api_juegos(request):
    """
    API para obtener información de juegos (para futuras funcionalidades)
    """
    juegos = Juego.objects.filter(estado='disponible')
    data = []
    
    for juego in juegos:
        data.append({
            'id': juego.id,
            'nombre': juego.nombre,
            'categoria': juego.get_categoria_display(),
            'dimensiones': juego.dimensiones,
            'capacidad': juego.capacidad_personas,
            'peso_maximo': juego.peso_maximo,
            'precio_base': float(juego.precio_base),
            'foto': juego.foto.url if juego.foto else None,
        })
    
    return JsonResponse({'juegos': data})
