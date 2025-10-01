from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from .models import Juego, PrecioTemporada, Usuario
from .forms import UsuarioCreateForm, UsuarioUpdateForm

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
    if request.user.is_authenticated:
        return redirect('jio_app:panel_redirect')

    if request.method == 'POST':
        identifier = request.POST.get('email')  # puede ser email o username
        password = request.POST.get('password')

        if identifier and password:
            user = None
            # Buscar por email o por username
            try:
                user = Usuario.objects.get(email=identifier)
            except Usuario.DoesNotExist:
                try:
                    user = Usuario.objects.get(username=identifier)
                except Usuario.DoesNotExist:
                    user = None

            if not user:
                messages.error(request, 'Usuario no encontrado')
            else:
                password_ok = user.check_password(password)

                # Manejar posible contraseña en texto plano (creada manualmente)
                if not password_ok:
                    raw = user.password or ''
                    is_hashed = raw.startswith('pbkdf2_') or raw.startswith('argon2$') or raw.startswith('bcrypt$') or raw.startswith('scrypt$')
                    if not is_hashed and raw == password:
                        # Primera vez: re-hash y guardar
                        user.set_password(password)
                        user.save(update_fields=['password'])
                        password_ok = True

                if password_ok:
                    # Verificar autorización: superuser o tipo permitido
                    is_admin_like = user.is_superuser or user.tipo_usuario == 'administrador'
                    is_delivery = user.tipo_usuario == 'repartidor'

                    if is_admin_like or is_delivery:
                        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                        if is_admin_like:
                            return redirect('jio_app:admin_panel')
                        return redirect('jio_app:delivery_panel')
                    else:
                        messages.error(request, 'No autorizado para acceder al panel.')
                else:
                    messages.error(request, 'Credenciales incorrectas')

    return render(request, 'jio_app/login_jio.html')

@login_required
def logout_view(request):
    """
    Vista para cerrar sesión
    """
    logout(request)
    messages.success(request, 'Has cerrado sesión correctamente.')
    return redirect('jio_app:index')

def reservar_view(request):
    """
    Vista para el formulario de reserva (próximamente)
    """
    if request.method == 'POST':
        # Aquí se procesará el formulario de reserva cuando esté implementado
        messages.info(request, 'Formulario de reserva en desarrollo. Próximamente disponible.')
        return redirect('jio_app:index')
    
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
        return redirect('jio_app:index')
    
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

# ===== PANELES ADMINISTRATIVOS =====

@login_required
def admin_panel(request):
    """
    Panel de administración principal
    """
    # Verificar que el usuario sea administrador
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este panel.")
    
    # Estadísticas para el dashboard
    stats = {
        'reservas_hoy': 12,  # Esto vendría de la base de datos
        'ingresos_mes': 2400000,
        'juegos_activos': 8,
        'repartidores': 5,
    }
    
    # Reservas recientes (datos de ejemplo)
    reservas_recientes = [
        {
            'id': '#001',
            'cliente': 'María González',
            'juego': 'Castillo 2en1',
            'fecha': '2024-01-15',
            'estado': 'Confirmada'
        },
        {
            'id': '#002',
            'cliente': 'Carlos Pérez',
            'juego': 'Túnel Grande',
            'fecha': '2024-01-16',
            'estado': 'Pendiente'
        }
    ]
    
    # Actividad reciente (datos de ejemplo)
    actividad_reciente = [
        {
            'tipo': 'Nueva reserva creada',
            'descripcion': 'María González reservó Castillo 2en1',
            'tiempo': 'Hace 2 horas',
            'color': 'primary'
        },
        {
            'tipo': 'Juego entregado',
            'descripcion': 'Túnel Grande entregado a Carlos Pérez',
            'tiempo': 'Hace 4 horas',
            'color': 'success'
        },
        {
            'tipo': 'Pago pendiente',
            'descripcion': 'Pago pendiente para reserva #003',
            'tiempo': 'Hace 6 horas',
            'color': 'warning'
        }
    ]
    
    context = {
        'stats': stats,
        'reservas_recientes': reservas_recientes,
        'actividad_reciente': actividad_reciente,
    }
    
    return render(request, 'jio_app/admin_panel.html', context)


@login_required
def usuarios_list(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este panel.")

    query = request.GET.get('q', '').strip()
    usuarios = Usuario.objects.all().order_by('-is_superuser', '-is_staff', 'username')
    if query:
        usuarios = usuarios.filter(username__icontains=query)

    context = {
        'usuarios': usuarios,
        'query': query,
    }
    return render(request, 'jio_app/usuarios/list.html', context)


@login_required
def usuarios_create(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este panel.")

    if request.method == 'POST':
        form = UsuarioCreateForm(request.POST)
        if form.is_valid():
            usuario = form.save()
            messages.success(request, f'Usuario "{usuario.username}" creado correctamente.')
            return redirect('jio_app:usuarios_list')
    else:
        form = UsuarioCreateForm()

    return render(request, 'jio_app/usuarios/form.html', {'form': form, 'is_create': True})


@login_required
def usuarios_update(request, pk):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este panel.")

    usuario = get_object_or_404(Usuario, pk=pk)

    if request.method == 'POST':
        form = UsuarioUpdateForm(request.POST, instance=usuario)
        if form.is_valid():
            form.save()
            messages.success(request, f'Usuario "{usuario.username}" actualizado correctamente.')
            return redirect('jio_app:usuarios_list')
    else:
        form = UsuarioUpdateForm(instance=usuario)

    return render(request, 'jio_app/usuarios/form.html', {'form': form, 'is_create': False, 'usuario': usuario})


@login_required
def usuarios_delete(request, pk):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este panel.")

    usuario = get_object_or_404(Usuario, pk=pk)
    if request.method == 'POST':
        username = usuario.username
        usuario.delete()
        messages.success(request, f'Usuario "{username}" eliminado correctamente.')
        return redirect('jio_app:usuarios_list')

    return render(request, 'jio_app/usuarios/confirm_delete.html', {'usuario': usuario})

@login_required
def delivery_panel(request):
    """
    Panel de repartidor
    """
    # Verificar que el usuario sea repartidor
    if not request.user.tipo_usuario == 'repartidor':
        raise PermissionDenied("Solo los repartidores pueden acceder a este panel.")
    
    # Estadísticas del repartidor
    stats = {
        'estado_actual': 'Disponible',
        'entregas_hoy': 3,
        'pendientes': 2,
        'kilometros_hoy': 45,
    }
    
    # Entregas asignadas (datos de ejemplo)
    entregas_asignadas = [
        {
            'id': '#001',
            'cliente': 'María González',
            'juego': 'Castillo 2en1',
            'direccion': 'Av. Principal 123, Osorno',
            'hora': '14:00',
            'estado': 'En Ruta'
        },
        {
            'id': '#002',
            'cliente': 'Carlos Pérez',
            'juego': 'Túnel Grande',
            'direccion': 'Calle Secundaria 456, Osorno',
            'hora': '16:30',
            'estado': 'Pendiente'
        }
    ]
    
    # Próximas entregas
    proximas_entregas = [
        {
            'cliente': 'María González',
            'juego': 'Castillo 2en1',
            'hora': '14:00'
        },
        {
            'cliente': 'Carlos Pérez',
            'juego': 'Túnel Grande',
            'hora': '16:30'
        }
    ]
    
    context = {
        'stats': stats,
        'entregas_asignadas': entregas_asignadas,
        'proximas_entregas': proximas_entregas,
    }
    
    return render(request, 'jio_app/delivery_panel.html', context)

@login_required
def panel_redirect(request):
    """
    Redirige al panel correspondiente según el tipo de usuario
    """
    if request.user.tipo_usuario == 'administrador':
        return redirect('jio_app:admin_panel')
    elif request.user.tipo_usuario == 'repartidor':
        return redirect('jio_app:delivery_panel')
    else:
        messages.error(request, 'No tienes permisos para acceder a los paneles administrativos.')
        return redirect('jio_app:index')
