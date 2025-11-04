from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.urls import reverse
from .models import Juego, Usuario, Repartidor, Cliente, Instalacion, Retiro, Reserva, DetalleReserva
from django.views.decorators.http import require_http_methods
from django.core import signing
from django.utils import timezone
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.text import slugify
from django.conf import settings
import re
import secrets
import string

# Create your views here.

def index(request):
    """
    Vista para la página principal del sitio público
    """
    # Obtener todos los juegos habilitados ordenados por categoría y nombre
    juegos_disponibles = Juego.objects.filter(estado__iexact='habilitado').order_by('categoria', 'nombre')
    
    context = {
        'juegos_disponibles': juegos_disponibles,
    }
    return render(request, 'jio_app/index.html', context)

def calendario_reservas(request):
    """
    Vista para el calendario de reservas
    """
    # Obtener todos los juegos disponibles (estado='disponible')
    juegos_disponibles = Juego.objects.filter(estado='disponible')
    
    context = {
        'juegos_disponibles': juegos_disponibles,
    }
    return render(request, 'jio_app/calendario_reservas.html', context)


@require_http_methods(["GET"])
def disponibilidad_fecha_json(request):
    """
    Obtiene la disponibilidad de juegos para una fecha específica (público)
    """
    try:
        fecha_str = request.GET.get('fecha', '').strip()
        
        if not fecha_str:
            return JsonResponse({'error': 'Fecha requerida'}, status=400)
        
        try:
            from datetime import datetime
            fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'error': 'Formato de fecha inválido'}, status=400)
        
        # Verificar que la fecha no sea pasada
        hoy = timezone.now().date()
        if fecha_obj < hoy:
            return JsonResponse({
                'disponible': False,
                'juegos_disponibles': [],
                'mensaje': 'No se pueden hacer reservas para fechas pasadas',
                'fecha': fecha_str,
            })
        
        # Obtener todos los juegos disponibles (estado='disponible')
        try:
            todos_juegos = Juego.objects.filter(estado='disponible').order_by('nombre')
            total_juegos_sistema = Juego.objects.count()  # Para debugging
            juegos_disponibles_count = todos_juegos.count()
        except Exception as e:
            return JsonResponse({
                'error': f'Error al obtener juegos: {str(e)}',
                'disponible': False,
                'juegos_disponibles': []
            }, status=500)
        
        # Si no hay juegos disponibles, el día no está disponible
        if not todos_juegos.exists():
            # Información adicional para debugging
            estados_existentes = Juego.objects.values_list('estado', flat=True).distinct()
            return JsonResponse({
                'disponible': False,
                'juegos_disponibles': [],
                'mensaje': 'No hay juegos disponibles en el sistema',
                'fecha': fecha_str,
                'debug_info': {
                    'total_juegos_sistema': total_juegos_sistema,
                    'juegos_disponibles_count': juegos_disponibles_count,
                    'estados_existentes': list(estados_existentes) if estados_existentes else []
                }
            })
        
        # Obtener reservas confirmadas o pendientes para esa fecha
        # IMPORTANTE: Buscar por fecha_evento y estados válidos
        try:
            reservas_fecha = Reserva.objects.filter(
                fecha_evento=fecha_obj,
                estado__in=['pendiente', 'confirmada']
            ).select_related('cliente').prefetch_related('detalles__juego')
            
            # Debug: verificar cuántas reservas se encontraron
            num_reservas = reservas_fecha.count()
            print(f"🔍 DEBUG - Reservas encontradas para {fecha_obj}: {num_reservas}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'error': f'Error al obtener reservas: {str(e)}',
                'disponible': False,
                'juegos_disponibles': []
            }, status=500)
        
        # Obtener IDs de juegos ocupados ese día
        # Iterar sobre todas las reservas y sus detalles para identificar juegos ocupados
        juegos_ocupados = set()
        reservas_info = []  # Para debugging
        
        try:
            for reserva in reservas_fecha:
                reserva_info = {
                    'id': reserva.id,
                    'estado': reserva.estado,
                    'fecha': str(reserva.fecha_evento),
                    'juegos': []
                }
                
                # Obtener todos los detalles de esta reserva
                detalles = reserva.detalles.all()
                print(f"  📋 Reserva #{reserva.id} (estado: {reserva.estado}) tiene {detalles.count()} detalles")
                
                for detalle in detalles:
                    if detalle.juego:
                        juego_id = detalle.juego.id
                        juego_nombre = detalle.juego.nombre
                        juegos_ocupados.add(juego_id)
                        reserva_info['juegos'].append({
                            'id': juego_id,
                            'nombre': juego_nombre,
                            'cantidad': detalle.cantidad
                        })
                        print(f"    🎮 Juego ocupado: ID {juego_id} - {juego_nombre} (cantidad: {detalle.cantidad})")
                
                if reserva_info['juegos']:
                    reservas_info.append(reserva_info)
            
            print(f"✅ Total de juegos ocupados encontrados: {len(juegos_ocupados)} (IDs: {list(juegos_ocupados)})")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'error': f'Error al procesar reservas: {str(e)}',
                'disponible': False,
                'juegos_disponibles': []
            }, status=500)
        
        # Filtrar juegos disponibles (no ocupados)
        # Si hay juegos ocupados, excluirlos; si no hay ninguno ocupado, todos están disponibles
        if juegos_ocupados:
            # Excluir los juegos ocupados de la lista de disponibles
            juegos_disponibles = todos_juegos.exclude(id__in=juegos_ocupados)
            # Obtener los juegos ocupados de la tabla Juego para mostrarlos
            juegos_ocupados_list = todos_juegos.filter(id__in=juegos_ocupados)
            print(f"📊 Juegos disponibles: {juegos_disponibles.count()}, Juegos ocupados: {juegos_ocupados_list.count()}")
        else:
            juegos_disponibles = todos_juegos
            juegos_ocupados_list = []
            print(f"📊 No hay juegos ocupados. Todos los {todos_juegos.count()} juegos están disponibles")
        
        # Construir lista de juegos disponibles
        juegos_data = []
        try:
            for juego in juegos_disponibles:
                juegos_data.append({
                    'id': juego.id,
                    'nombre': juego.nombre,
                    'precio': int(juego.precio_base) if juego.precio_base else 0,
                    'categoria': juego.get_categoria_display() if hasattr(juego, 'get_categoria_display') else juego.categoria,
                    'disponible': True
                })
        except Exception as e:
            return JsonResponse({
                'error': f'Error al procesar juegos: {str(e)}',
                'disponible': False,
                'juegos_disponibles': []
            }, status=500)
        
        # Construir lista de juegos ocupados (para mostrarlos como no disponibles)
        juegos_ocupados_data = []
        try:
            for juego in juegos_ocupados_list:
                juego_data = {
                    'id': juego.id,
                    'nombre': juego.nombre,
                    'precio': int(juego.precio_base) if juego.precio_base else 0,
                    'categoria': juego.get_categoria_display() if hasattr(juego, 'get_categoria_display') else juego.categoria,
                    'disponible': False
                }
                juegos_ocupados_data.append(juego_data)
                print(f"  ✅ Juego ocupado agregado a respuesta: ID {juego.id} - {juego.nombre}")
            
            print(f"📦 Total juegos ocupados en respuesta: {len(juegos_ocupados_data)}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'error': f'Error al procesar juegos ocupados: {str(e)}',
                'disponible': False,
                'juegos_disponibles': []
            }, status=500)
        
        # Un día está disponible si hay AL MENOS un juego disponible
        respuesta = {
            'disponible': len(juegos_data) > 0,
            'juegos_disponibles': juegos_data,
            'juegos_ocupados_list': juegos_ocupados_data,  # Lista de juegos ocupados para mostrar
            'total_disponibles': len(juegos_data),
            'total_juegos': todos_juegos.count(),
            'juegos_ocupados': len(juegos_ocupados),
            'fecha': fecha_str,
            'debug_info': {
                'total_juegos_sistema': todos_juegos.count(),
                'ids_juegos_ocupados': list(juegos_ocupados),
                'ids_juegos_disponibles': [j['id'] for j in juegos_data],
                'reservas_encontradas': reservas_info,
                'num_reservas': len(reservas_info)
            }
        }
        
        print(f"📤 Enviando respuesta para {fecha_str}:")
        print(f"   - Disponible: {respuesta['disponible']}")
        print(f"   - Juegos disponibles: {len(juegos_data)}")
        print(f"   - Juegos ocupados: {len(juegos_ocupados_data)}")
        print(f"   - IDs ocupados: {list(juegos_ocupados)}")
        
        return JsonResponse(respuesta)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': f'Error inesperado: {str(e)}',
            'disponible': False,
            'juegos_disponibles': []
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def crear_reserva_publica(request):
    """
    Crea una reserva desde el calendario público (sin autenticación)
    """
    import json
    
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()
    except:
        data = request.POST.dict()
    
    # Extraer datos del formulario
    nombre_completo = data.get('nombre', '').strip()
    email = data.get('email', '').strip()
    telefono = data.get('telefono', '').strip()
    juego_id = data.get('juego', '').strip()
    fecha_evento = data.get('fecha', '').strip()
    horario = data.get('horario', '').strip()
    direccion = data.get('direccion', '').strip()
    comentarios = data.get('comentarios', '').strip()
    distancia_km = data.get('distancia_km', '0').strip()
    
    errors = []
    
    # Validaciones básicas
    if not nombre_completo:
        errors.append('El nombre es obligatorio')
    elif len(nombre_completo) < 3:
        errors.append('El nombre debe tener al menos 3 caracteres')
    
    # Separar nombre y apellido
    partes_nombre = nombre_completo.split(' ', 1)
    first_name = partes_nombre[0]
    last_name = partes_nombre[1] if len(partes_nombre) > 1 else ''
    
    if not email:
        errors.append('El email es obligatorio')
    else:
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_regex.match(email):
            errors.append('Email inválido')
    
    if not telefono:
        errors.append('El teléfono es obligatorio')
    
    if not juego_id:
        errors.append('Debe seleccionar un juego')
    
    if not fecha_evento:
        errors.append('La fecha es obligatoria')
    else:
        try:
            from datetime import datetime
            fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
            hoy = timezone.now().date()
            if fecha_obj < hoy:
                errors.append('No se pueden hacer reservas para fechas pasadas')
        except ValueError:
            errors.append('Formato de fecha inválido')
    
    if not horario:
        errors.append('Debe seleccionar un horario')
    else:
        # Convertir horario a hora_instalacion y hora_retiro
        horarios_map = {
            '09:00-13:00': ('09:00', '13:00'),
            '14:00-18:00': ('14:00', '18:00'),
            '09:00-18:00': ('09:00', '18:00'),
        }
        if horario in horarios_map:
            hora_instalacion_str, hora_retiro_str = horarios_map[horario]
            try:
                hora_inst_obj = datetime.strptime(hora_instalacion_str, '%H:%M').time()
                hora_ret_obj = datetime.strptime(hora_retiro_str, '%H:%M').time()
            except ValueError:
                errors.append('Error en el formato de horario')
        else:
            errors.append('Horario inválido')
    
    if not direccion:
        errors.append('La dirección es obligatoria')
    elif len(direccion) > 300:
        errors.append('La dirección no puede exceder 300 caracteres')
    
    # Validar distancia
    distancia_km_int = 0
    if distancia_km:
        try:
            distancia_km_int = int(distancia_km)
            if distancia_km_int < 0:
                errors.append('La distancia no puede ser negativa')
        except ValueError:
            errors.append('La distancia debe ser un número válido')
    
    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    # Verificar que el juego existe y está disponible
    try:
        juego = Juego.objects.get(id=int(juego_id), estado='disponible')
    except (Juego.DoesNotExist, ValueError):
        errors.append('Juego no encontrado o no disponible')
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    # Verificar disponibilidad del juego en la fecha
    reservas_fecha = Reserva.objects.filter(
        fecha_evento=fecha_obj,
        estado__in=['pendiente', 'confirmada']
    ).prefetch_related('detalles__juego')
    
    juego_ocupado = False
    for reserva in reservas_fecha:
        for detalle in reserva.detalles.all():
            if detalle.juego.id == juego.id:
                juego_ocupado = True
                break
        if juego_ocupado:
            break
    
    if juego_ocupado:
        errors.append('El juego seleccionado ya está reservado para esa fecha')
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    # Buscar o crear cliente
    try:
        # Buscar por email primero
        usuario = Usuario.objects.filter(email=email, tipo_usuario='cliente').first()
        
        if usuario:
            cliente = usuario.cliente
            # Actualizar datos si es necesario
            if usuario.first_name != first_name or usuario.last_name != last_name:
                usuario.first_name = first_name
                usuario.last_name = last_name
                usuario.save()
            if telefono and usuario.telefono != telefono:
                usuario.telefono = telefono
                usuario.save()
        else:
            # Crear nuevo usuario y cliente
            base_username = slugify(f"{first_name}_{last_name}").lower()[:24] or slugify(first_name).lower() or 'cliente'
            username = base_username
            counter = 1
            while Usuario.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
            
            random_password = secrets.token_urlsafe(12)
            usuario = Usuario.objects.create_user(
                username=username,
                email=email,
                password=random_password,
                first_name=first_name,
                last_name=last_name,
                tipo_usuario='cliente',
                is_active=True,
                telefono=telefono or None,
            )
            
            # Generar RUT ficticio si no existe (para clientes sin RUT)
            rut_ficticio = f"{counter}{secrets.randbelow(10000000)}-{secrets.randbelow(10)}"
            while Cliente.objects.filter(rut=rut_ficticio).exists():
                rut_ficticio = f"{counter}{secrets.randbelow(10000000)}-{secrets.randbelow(10)}"
            
            cliente = Cliente.objects.create(
                usuario=usuario,
                rut=rut_ficticio,
                tipo_cliente='particular',
            )
    except Exception as e:
        return JsonResponse({
            'success': False,
            'errors': [f'Error al crear/buscar cliente: {str(e)}']
        }, status=500)
    
    # Calcular precio por distancia ($1.000 por km)
    PRECIO_POR_KM = 1000
    precio_distancia = distancia_km_int * PRECIO_POR_KM
    
    # Calcular total
    total_final = juego.precio_base + precio_distancia
    
    try:
        # Crear reserva
        reserva = Reserva.objects.create(
            cliente=cliente,
            fecha_evento=fecha_obj,
            hora_instalacion=hora_inst_obj,
            hora_retiro=hora_ret_obj,
            direccion_evento=direccion,
            distancia_km=distancia_km_int,
            precio_distancia=precio_distancia,
            estado='pendiente',
            observaciones=comentarios or None,
            total_reserva=total_final,
        )
        
        # Crear detalle de reserva
        DetalleReserva.objects.create(
            reserva=reserva,
            juego=juego,
            cantidad=1,
            precio_unitario=juego.precio_base,
            subtotal=juego.precio_base,
        )
        
        return JsonResponse({
            'success': True,
            'message': '¡Reserva creada exitosamente! Nos pondremos en contacto contigo pronto para confirmar.',
            'reserva_id': reserva.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'errors': [f'Error al crear la reserva: {str(e)}']
        }, status=500)

def login_view(request):
    """
    Vista para el login de administradores y repartidores
    """
    # Verificar si es una petición AJAX
    is_ajax = request.headers.get('Content-Type') == 'application/json'
    
    if request.user.is_authenticated:
        if is_ajax:
            # Si ya está autenticado, redirigir al panel correspondiente
            return JsonResponse({
                'success': True,
                'message': f'¡Bienvenido de nuevo, {request.user.get_full_name()}!',
                'redirect_url': reverse('jio_app:panel_redirect')
            })
        return redirect('jio_app:panel_redirect')
    
    if request.method == 'POST':
        # Obtener datos según el tipo de petición
        if is_ajax:
            import json
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
        else:
            email = request.POST.get('email')
            password = request.POST.get('password')
        
        if email and password:
            try:
                user = Usuario.objects.get(email=email)
                user = authenticate(request, username=user.username, password=password)
                
                if user is not None:
                    if user.tipo_usuario in ['administrador', 'repartidor']:
                        login(request, user)
                        if is_ajax:
                            return JsonResponse({
                                'success': True,
                                'message': f'¡Bienvenido, {user.get_full_name()}!',
                                'redirect_url': reverse('jio_app:panel_redirect')
                            })
                        else:
                            messages.success(request, f'¡Bienvenido, {user.get_full_name()}!')
                            return redirect('jio_app:panel_redirect')
                    else:
                        error_msg = 'Acceso denegado. Solo administradores y repartidores pueden acceder.'
                        if is_ajax:
                            return JsonResponse({'success': False, 'error': error_msg})
                        else:
                            messages.error(request, error_msg)
                else:
                    error_msg = 'Correo electrónico o contraseña incorrectos.'
                    if is_ajax:
                        return JsonResponse({'success': False, 'error': error_msg})
                    else:
                        messages.error(request, error_msg)
            except Usuario.DoesNotExist:
                error_msg = 'Correo electrónico no encontrado.'
                if is_ajax:
                    return JsonResponse({'success': False, 'error': error_msg})
                else:
                    messages.error(request, error_msg)
        else:
            error_msg = 'Por favor completa todos los campos.'
            if is_ajax:
                return JsonResponse({'success': False, 'error': error_msg})
            else:
                messages.error(request, error_msg)
    
    # Si es una petición GET o hay errores en POST no-AJAX, mostrar el formulario
    if is_ajax:
        return JsonResponse({'success': False, 'error': 'Método no permitido'})
    return render(request, 'jio_app/login_jio.html')

def logout_view(request):
    """
    Vista para cerrar sesión
    """
    logout(request)
    messages.success(request, 'Has cerrado sesión correctamente.')
    # Redirigir a index con parámetros para limpiar cache
    response = redirect('jio_app:index')
    # Limpiar cookies de sesión
    response.delete_cookie('sessionid')
    response.delete_cookie('csrftoken')
    return response

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

@login_required
def admin_panel(request):
    """
    Panel de administración principal
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este panel.")
    
    context = {
        'user': request.user,
    }
    return render(request, 'jio_app/admin_panel.html', context)

@login_required
def delivery_panel(request):
    """
    Panel de repartidor - Ver sus repartos asignados
    """
    if not request.user.tipo_usuario == 'repartidor':
        raise PermissionDenied("Solo los repartidores pueden acceder a este panel.")
    
    from datetime import date
    fecha_hoy = date.today()
    
    # Obtener el repartidor actual
    try:
        repartidor = request.user.repartidor
    except:
        raise PermissionDenied("Usuario no tiene perfil de repartidor.")
    
    # Instalaciones asignadas al repartidor
    instalaciones_hoy = Instalacion.objects.filter(
        repartidor=repartidor,
        fecha_instalacion=fecha_hoy
    ).select_related('reserva__cliente__usuario').order_by('hora_instalacion')
    
    instalaciones_todas = Instalacion.objects.filter(
        repartidor=repartidor
    ).select_related('reserva__cliente__usuario').order_by('-fecha_instalacion', '-hora_instalacion')[:20]
    
    # Retiros asignados al repartidor
    retiros_hoy = Retiro.objects.filter(
        repartidor=repartidor,
        fecha_retiro=fecha_hoy
    ).select_related('reserva__cliente__usuario').order_by('hora_retiro')
    
    retiros_todos = Retiro.objects.filter(
        repartidor=repartidor
    ).select_related('reserva__cliente__usuario').order_by('-fecha_retiro', '-hora_retiro')[:20]
    
    context = {
        'user': request.user,
        'fecha_hoy': fecha_hoy,
        'instalaciones_hoy': instalaciones_hoy,
        'instalaciones_todas': instalaciones_todas,
        'retiros_hoy': retiros_hoy,
        'retiros_todos': retiros_todos,
    }
    return render(request, 'jio_app/delivery_panel.html', context)


# --------- Creación de usuarios protegida (solo administrador) ---------

@login_required
@require_http_methods(["GET", "POST"])
def create_admin(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    if request.method == 'POST':
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', '')
        first_name = (request.POST.get('first_name') or '').strip()
        last_name = (request.POST.get('last_name') or '').strip()
        email = (request.POST.get('email') or '').strip()
        password = request.POST.get('password') or ''

        errors = []
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

        if not all([first_name, last_name, email, password]):
            errors.append('Completa todos los campos.')
        if len(first_name) < 2 or len(first_name) > 30:
            errors.append('El nombre debe tener entre 2 y 30 caracteres.')
        if len(last_name) < 2 or len(last_name) > 30:
            errors.append('El apellido debe tener entre 2 y 30 caracteres.')
        if not email_regex.match(email) or len(email) > 100:
            errors.append('Email inválido o demasiado largo (máx 100).')
        if len(password) < 8:
            errors.append('La contraseña debe tener al menos 8 caracteres.')
        if Usuario.objects.filter(email=email).exists():
            errors.append('Ya existe un usuario con ese email.')
        # Generar username único basado en nombre y apellido
        base_username = slugify(f"{first_name}.{last_name}").replace('-', '.')[:24] or slugify(first_name) or 'user'
        candidate = base_username
        suffix = 1
        while Usuario.objects.filter(username=candidate).exists():
            candidate = f"{base_username}.{suffix}"
            suffix += 1

        if errors:
            if is_ajax:
                return JsonResponse({'success': False, 'errors': errors}, status=400)
            for e in errors:
                messages.error(request, e)
        else:
            user = Usuario.objects.create_user(
                username=candidate,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                tipo_usuario='administrador',
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            if is_ajax:
                return JsonResponse({'success': True, 'message': f'Administrador {user.get_full_name()} creado correctamente.'})
            messages.success(request, f'Administrador {user.get_full_name()} creado correctamente.')
            return redirect('jio_app:admin_panel')

    return redirect('jio_app:users_list')


@login_required
@require_http_methods(["GET", "POST"])
def create_delivery(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    if request.method == 'POST':
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', '')
        first_name = (request.POST.get('first_name') or '').strip()
        last_name = (request.POST.get('last_name') or '').strip()
        email = (request.POST.get('email') or '').strip()
        password = request.POST.get('password') or ''
        telefono = (request.POST.get('telefono') or '').strip()
        licencia = (request.POST.get('licencia') or '').strip()
        vehiculo = (request.POST.get('vehiculo') or '').strip()

        errors = []
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        telefono_regex = re.compile(r'^[\d\s\+\-\(\)]{8,15}$')

        if not all([first_name, last_name, email, password]):
            errors.append('Completa todos los campos obligatorios.')
        if len(first_name) < 2 or len(first_name) > 30:
            errors.append('El nombre debe tener entre 2 y 30 caracteres.')
        if len(last_name) < 2 or len(last_name) > 30:
            errors.append('El apellido debe tener entre 2 y 30 caracteres.')
        if not email_regex.match(email) or len(email) > 100:
            errors.append('Email inválido o demasiado largo (máx 100).')
        if len(password) < 8:
            errors.append('La contraseña debe tener al menos 8 caracteres.')
        if telefono and telefono_regex.match(telefono) is None:
            errors.append('El teléfono no tiene un formato válido (8-15 dígitos, puede incluir +, -, (), espacios).')
        if len(licencia) > 20:
            errors.append('La licencia no puede exceder 20 caracteres.')
        if len(vehiculo) > 100:
            errors.append('El vehículo no puede exceder 100 caracteres.')
        if Usuario.objects.filter(email=email).exists():
            errors.append('Ya existe un usuario con ese email.')
        # Generar username único basado en nombre y apellido
        base_username = slugify(f"{first_name}.{last_name}").replace('-', '.')[:24] or slugify(first_name) or 'user'
        candidate = base_username
        suffix = 1
        while Usuario.objects.filter(username=candidate).exists():
            candidate = f"{base_username}.{suffix}"
            suffix += 1

        if errors:
            if is_ajax:
                return JsonResponse({'success': False, 'errors': errors}, status=400)
            for e in errors:
                messages.error(request, e)
        else:
            user = Usuario.objects.create_user(
                username=candidate,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                tipo_usuario='repartidor',
                is_active=True,
            )
            if telefono:
                user.telefono = telefono
                user.save(update_fields=['telefono'])
            Repartidor.objects.create(
                usuario=user,
                licencia_conducir=licencia or None,
                vehiculo=vehiculo or None,
                estado='disponible',
            )
            if is_ajax:
                return JsonResponse({'success': True, 'message': f'Repartidor {user.get_full_name()} creado correctamente.'})
            messages.success(request, f'Repartidor {user.get_full_name()} creado correctamente.')
            return redirect('jio_app:admin_panel')

    return redirect('jio_app:users_list')


@login_required
def create_cliente(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    if request.method == 'POST':
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', '')
        first_name = (request.POST.get('first_name') or '').strip()
        last_name = (request.POST.get('last_name') or '').strip()
        email = (request.POST.get('email') or '').strip()
        telefono = (request.POST.get('telefono') or '').strip()
        rut = (request.POST.get('rut') or '').strip()
        tipo_cliente = (request.POST.get('tipo_cliente') or '').strip()

        errors = []
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        telefono_regex = re.compile(r'^[\d\s\+\-\(\)]{8,15}$')
        rut_regex = re.compile(r'^\d{7,8}-[\dkK]$')

        if not all([first_name, last_name, email, rut, tipo_cliente]):
            errors.append('Completa todos los campos obligatorios.')
        if len(first_name) < 2 or len(first_name) > 30:
            errors.append('El nombre debe tener entre 2 y 30 caracteres.')
        if len(last_name) < 2 or len(last_name) > 30:
            errors.append('El apellido debe tener entre 2 y 30 caracteres.')
        if not email_regex.match(email) or len(email) > 100:
            errors.append('Email inválido o demasiado largo (máx 100).')
        if telefono and telefono_regex.match(telefono) is None:
            errors.append('El teléfono no tiene un formato válido (8-15 dígitos, puede incluir +, -, (), espacios).')
        if not rut_regex.match(rut):
            errors.append('El RUT debe tener el formato 12345678-9 o 1234567-K.')
        if tipo_cliente not in ['particular', 'empresa']:
            errors.append('Tipo de cliente inválido.')
        if Usuario.objects.filter(email=email).exists():
            errors.append('Ya existe un usuario con ese email.')
        if Cliente.objects.filter(rut=rut).exists():
            errors.append('Ya existe un cliente con ese RUT.')
        
        # Generar username único basado en nombre y apellido
        base_username = slugify(f"{first_name}.{last_name}").replace('-', '.')[:24] or slugify(first_name) or 'user'
        candidate = base_username
        suffix = 1
        while Usuario.objects.filter(username=candidate).exists():
            candidate = f"{base_username}.{suffix}"
            suffix += 1
        
        # Generar contraseña aleatoria segura (el cliente no tendrá acceso al sistema)
        alphabet = string.ascii_letters + string.digits + string.punctuation
        random_password = ''.join(secrets.choice(alphabet) for _ in range(16))

        if errors:
            if is_ajax:
                return JsonResponse({'success': False, 'errors': errors}, status=400)
            for e in errors:
                messages.error(request, e)
        else:
            user = Usuario.objects.create_user(
                username=candidate,
                email=email,
                password=random_password,
                first_name=first_name,
                last_name=last_name,
                tipo_usuario='cliente',
                is_active=True,
            )
            if telefono:
                user.telefono = telefono
                user.save(update_fields=['telefono'])
            Cliente.objects.create(
                usuario=user,
                rut=rut,
                tipo_cliente=tipo_cliente,
            )
            if is_ajax:
                return JsonResponse({'success': True, 'message': f'Cliente {user.get_full_name()} creado correctamente.'})
            messages.success(request, f'Cliente {user.get_full_name()} creado correctamente.')
            return redirect('jio_app:admin_panel')

    return redirect('jio_app:users_list')


# --------- Invitaciones compartibles con token firmado ---------

INVITE_SALT = 'jio-app-invite'
INVITE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # 7 días


@login_required
def share_admin_invite(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")
    payload = {
        'role': 'administrador',
        'inviter_id': request.user.id,
        'ts': int(timezone.now().timestamp()),
    }
    token = signing.dumps(payload, salt=INVITE_SALT)
    invite_url = request.build_absolute_uri(reverse('jio_app:invite_signup') + f'?token={token}')
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', ''):
        return JsonResponse({'invite_url': invite_url, 'role': 'administrador'})
    return render(request, 'jio_app/share_invite.html', {
        'invite_url': invite_url,
        'role_label': 'administrador',
    })


@login_required
def share_delivery_invite(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")
    payload = {
        'role': 'repartidor',
        'inviter_id': request.user.id,
        'ts': int(timezone.now().timestamp()),
    }
    token = signing.dumps(payload, salt=INVITE_SALT)
    invite_url = request.build_absolute_uri(reverse('jio_app:invite_signup') + f'?token={token}')
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', ''):
        return JsonResponse({'invite_url': invite_url, 'role': 'repartidor'})
    return render(request, 'jio_app/share_invite.html', {
        'invite_url': invite_url,
        'role_label': 'repartidor',
    })


@require_http_methods(["GET", "POST"])
def invite_signup(request):
    token = request.GET.get('token') or request.POST.get('token')
    if not token:
        messages.error(request, 'Falta el token de invitación.')
        return redirect('jio_app:index')
    try:
        data = signing.loads(token, salt=INVITE_SALT, max_age=INVITE_MAX_AGE_SECONDS)
    except signing.BadSignature:
        messages.error(request, 'Invitación inválida.')
        return redirect('jio_app:index')
    except signing.SignatureExpired:
        messages.error(request, 'La invitación ha expirado.')
        return redirect('jio_app:index')

    role = data.get('role')
    if role not in ['administrador', 'repartidor']:
        messages.error(request, 'Invitación inválida.')
        return redirect('jio_app:index')

    if request.method == 'POST':
        first_name = (request.POST.get('first_name') or '').strip()
        last_name = (request.POST.get('last_name') or '').strip()
        email = (request.POST.get('email') or '').strip()
        username = (request.POST.get('username') or '').strip()
        password = request.POST.get('password') or ''
        telefono = (request.POST.get('telefono') or '').strip()
        licencia = (request.POST.get('licencia') or '').strip()
        vehiculo = (request.POST.get('vehiculo') or '').strip()

        errors = []
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        username_regex = re.compile(r'^[A-Za-z0-9._-]{3,30}$')
        telefono_regex = re.compile(r'^[\d\s\+\-\(\)]{8,15}$')

        if not all([first_name, last_name, email, username, password]):
            errors.append('Completa todos los campos obligatorios.')
        if len(first_name) < 2 or len(first_name) > 30:
            errors.append('El nombre debe tener entre 2 y 30 caracteres.')
        if len(last_name) < 2 or len(last_name) > 30:
            errors.append('El apellido debe tener entre 2 y 30 caracteres.')
        if not email_regex.match(email) or len(email) > 100:
            errors.append('Email inválido o demasiado largo (máx 100).')
        if not username_regex.match(username):
            errors.append('Usuario inválido. Use 3-30 caracteres: letras, números, . _ -')
        if len(password) < 8:
            errors.append('La contraseña debe tener al menos 8 caracteres.')
        if role == 'repartidor':
            if telefono and telefono_regex.match(telefono) is None:
                errors.append('El teléfono no tiene un formato válido (8-15 dígitos, puede incluir +, -, (), espacios).')
            if len(licencia) > 20:
                errors.append('La licencia no puede exceder 20 caracteres.')
            if len(vehiculo) > 100:
                errors.append('El vehículo no puede exceder 100 caracteres.')
        if Usuario.objects.filter(email=email).exists():
            errors.append('Ya existe un usuario con ese email.')
        if Usuario.objects.filter(username=username).exists():
            errors.append('Ya existe un usuario con ese username.')

        if errors:
            for e in errors:
                messages.error(request, e)
        else:
            if role == 'administrador':
                user = Usuario.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    tipo_usuario='administrador',
                    is_staff=True,
                    is_superuser=True,
                    is_active=True,
                )
            else:
                user = Usuario.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    tipo_usuario='repartidor',
                    is_active=True,
                )
                if telefono:
                    user.telefono = telefono
                    user.save(update_fields=['telefono'])
                Repartidor.objects.create(
                    usuario=user,
                    licencia_conducir=licencia or None,
                    vehiculo=vehiculo or None,
                    estado='disponible',
                )
            messages.success(request, 'Cuenta creada correctamente. Ya puedes iniciar sesión.')
            return redirect('jio_app:login_jio')

    template = 'jio_app/invite_signup_admin.html' if role == 'administrador' else 'jio_app/invite_signup_delivery.html'
    return render(request, template, { 'token': token })


# --------- Listado de usuarios (solo administrador) ---------

@login_required
def users_list(request):
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    base_qs = Usuario.objects.all().order_by('date_joined')
    if query:
        base_qs = base_qs.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(tipo_usuario__icontains=query)
        )

    administradores = base_qs.filter(tipo_usuario='administrador')
    repartidores = base_qs.filter(tipo_usuario='repartidor').select_related('repartidor')
    clientes = base_qs.filter(tipo_usuario='cliente').select_related('cliente')

    return render(request, 'jio_app/users_list.html', {
        'administradores': administradores,
        'repartidores': repartidores,
        'clientes': clientes,
        'query': query,
    })


# --------- Endpoints JSON para editar/eliminar usuarios (solo admin) ---------

@login_required
@require_http_methods(["GET"])
def user_detail_json(request, user_id: int):
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    try:
        u = Usuario.objects.get(id=user_id)
        LICENSE_TYPES = ['A1','A2','A3','A4','A5','B','C','D','E','F']
        repartidor_data = None
        cliente_data = None
        estado_choices = []
        if hasattr(u, 'repartidor'):
            repartidor_data = {
                'licencia_conducir': u.repartidor.licencia_conducir or '',
                'vehiculo': u.repartidor.vehiculo or '',
                'estado': u.repartidor.estado,
                'estado_display': u.repartidor.get_estado_display(),
            }
            estado_choices = [key for key, _ in u.repartidor._meta.get_field('estado').choices]
        if hasattr(u, 'cliente'):
            cliente_data = {
                'rut': u.cliente.rut,
                'tipo_cliente': u.cliente.tipo_cliente,
                'tipo_cliente_display': u.cliente.get_tipo_cliente_display(),
            }
        return JsonResponse({
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'tipo_usuario': u.tipo_usuario,
            'telefono': u.telefono or '',
            'repartidor': repartidor_data,
            'cliente': cliente_data,
            'license_types': LICENSE_TYPES,
            'estado_choices': estado_choices,
        })
    except Usuario.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def user_update_json(request, user_id: int):
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    try:
        u = Usuario.objects.get(id=user_id)
    except Usuario.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)

    username = request.POST.get('username', '').strip()
    first_name = request.POST.get('first_name', '').strip()
    last_name = request.POST.get('last_name', '').strip()
    email = request.POST.get('email', '').strip()
    tipo_usuario = (request.POST.get('tipo_usuario') or u.tipo_usuario).strip()
    telefono = request.POST.get('telefono', '').strip()
    licencia_conducir = request.POST.get('licencia_conducir', '').strip()
    vehiculo = request.POST.get('vehiculo', '').strip()
    estado = request.POST.get('estado', '').strip()
    rut = request.POST.get('rut', '').strip()
    tipo_cliente = request.POST.get('tipo_cliente', '').strip()

    # Validaciones básicas del lado servidor
    errors = []
    # El campo username no se valida en edición (se mantiene el existente)
    if not first_name: errors.append('El nombre es obligatorio')
    if not last_name: errors.append('El apellido es obligatorio')
    if not email: errors.append('El email es obligatorio')
    if tipo_usuario not in ['administrador', 'repartidor', 'cliente']:
        tipo_usuario = u.tipo_usuario
    # Solo validar username si se proporciona (para compatibilidad)
    if username and Usuario.objects.exclude(id=u.id).filter(username=username).exists():
        errors.append('El nombre de usuario ya existe')
    if Usuario.objects.exclude(id=u.id).filter(email=email).exists():
        errors.append('El email ya existe')

    # Validaciones extra para repartidor
    if u.tipo_usuario == 'repartidor':
        LICENSE_TYPES = ['A1','A2','A3','A4','A5','B','C','D','E','F']
        if licencia_conducir and licencia_conducir not in LICENSE_TYPES:
            errors.append('Tipo de licencia inválido')
        if len(vehiculo) > 100:
            errors.append('El vehículo no puede exceder 100 caracteres')
        estado_choices = [key for key, _ in Repartidor._meta.get_field('estado').choices]
        if estado and estado not in estado_choices:
            errors.append('Estado de repartidor inválido')

    # Validaciones extra para cliente
    if u.tipo_usuario == 'cliente':
        if rut:
            import re
            rut_regex = re.compile(r'^\d{7,8}-[\dkK]$')
            if not rut_regex.match(rut):
                errors.append('El RUT debe tener el formato 12345678-9 o 1234567-K')
            # Validar que el RUT no esté en uso por otro cliente
            if Cliente.objects.exclude(usuario_id=u.id).filter(rut=rut).exists():
                errors.append('Ya existe un cliente con ese RUT')
        if tipo_cliente and tipo_cliente not in ['particular', 'empresa']:
            errors.append('Tipo de cliente inválido')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    # El username no se actualiza (se mantiene el existente)
    u.first_name = first_name
    u.last_name = last_name
    u.email = email
    u.tipo_usuario = tipo_usuario
    u.telefono = telefono or None
    u.save()
    if u.tipo_usuario == 'repartidor':
        r = getattr(u, 'repartidor', None)
        if r is not None:
            r.licencia_conducir = licencia_conducir or None
            r.vehiculo = vehiculo or None
            if estado:
                r.estado = estado
            r.save()
    elif u.tipo_usuario == 'cliente':
        c = getattr(u, 'cliente', None)
        if c is not None:
            if rut:
                c.rut = rut
            if tipo_cliente:
                c.tipo_cliente = tipo_cliente
            c.save()
    return JsonResponse({'success': True})


@login_required
@require_http_methods(["POST"])
def user_delete_json(request, user_id: int):
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    try:
        u = Usuario.objects.get(id=user_id)
    except Usuario.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)

    # Evitar que un admin se elimine a sí mismo por accidente
    if u.id == request.user.id:
        return JsonResponse({'success': False, 'errors': ['No puedes eliminar tu propia cuenta.']}, status=400)

    u.delete()
    return JsonResponse({'success': True})


# --------- Gestión de Repartos (solo administrador) ---------

@login_required
def repartos_list(request):
    """Vista principal para gestión de repartos"""
    if request.user.tipo_usuario != 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    # Obtener fecha de hoy
    from datetime import date
    fecha_hoy = date.today()
    
    # Filtrar instalaciones
    instalaciones_qs = Instalacion.objects.select_related(
        'reserva__cliente__usuario', 'repartidor__usuario'
    ).order_by('fecha_instalacion', 'hora_instalacion')
    
    if query:
        instalaciones_qs = instalaciones_qs.filter(
            Q(reserva__cliente__usuario__first_name__icontains=query) |
            Q(reserva__cliente__usuario__last_name__icontains=query) |
            Q(repartidor__usuario__first_name__icontains=query) |
            Q(repartidor__usuario__last_name__icontains=query) |
            Q(direccion_instalacion__icontains=query)
        )
    
    if estado_filter:
        instalaciones_qs = instalaciones_qs.filter(estado_instalacion=estado_filter)
    
    # Filtrar retiros
    retiros_qs = Retiro.objects.select_related(
        'reserva__cliente__usuario', 'repartidor__usuario'
    ).order_by('fecha_retiro', 'hora_retiro')
    
    if query:
        retiros_qs = retiros_qs.filter(
            Q(reserva__cliente__usuario__first_name__icontains=query) |
            Q(reserva__cliente__usuario__last_name__icontains=query) |
            Q(repartidor__usuario__first_name__icontains=query) |
            Q(repartidor__usuario__last_name__icontains=query)
        )
    
    if estado_filter:
        # Mapear estados (instalacion usa _instalacion, retiro usa _retiro)
        estado_map = {
            'programada': 'programado',
            'realizada': 'realizado',
            'cancelada': 'cancelado'
        }
        estado_retiro = estado_map.get(estado_filter, estado_filter)
        retiros_qs = retiros_qs.filter(estado_retiro=estado_retiro)
    
    # Agenda de hoy
    instalaciones_hoy = instalaciones_qs.filter(fecha_instalacion=fecha_hoy)
    retiros_hoy = retiros_qs.filter(fecha_retiro=fecha_hoy)
    
    # Repartidores disponibles
    repartidores_disponibles = Usuario.objects.filter(
        tipo_usuario='repartidor',
        is_active=True
    ).select_related('repartidor')
    
    context = {
        'query': query,
        'estado_filter': estado_filter,
        'fecha_hoy': fecha_hoy,
        'instalaciones': instalaciones_qs[:50],  # Limitar resultados
        'retiros': retiros_qs[:50],
        'instalaciones_hoy': instalaciones_hoy,
        'retiros_hoy': retiros_hoy,
        'repartidores_disponibles': repartidores_disponibles,
    }
    
    return render(request, 'jio_app/repartos_list.html', context)


@login_required
@require_http_methods(["POST"])
def asignar_repartidor(request, tipo_reparto: str, reparto_id: int):
    """Asignar un repartidor a una instalación o retiro"""
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    repartidor_id = request.POST.get('repartidor_id')
    observaciones = request.POST.get('observaciones', '')
    
    if not repartidor_id:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un repartidor']}, status=400)
    
    try:
        repartidor = Repartidor.objects.get(usuario_id=repartidor_id)
    except Repartidor.DoesNotExist:
        return JsonResponse({'success': False, 'errors': ['Repartidor no encontrado']}, status=404)
    
    try:
        if tipo_reparto == 'instalacion':
            instalacion = Instalacion.objects.get(id=reparto_id)
            instalacion.repartidor = repartidor
            if observaciones:
                instalacion.observaciones_instalacion = observaciones
            instalacion.save()
            message = f'Repartidor {repartidor.usuario.get_full_name()} asignado a la instalación'
        elif tipo_reparto == 'retiro':
            retiro = Retiro.objects.get(id=reparto_id)
            retiro.repartidor = repartidor
            if observaciones:
                retiro.observaciones_retiro = observaciones
            retiro.save()
            message = f'Repartidor {repartidor.usuario.get_full_name()} asignado al retiro'
        else:
            return JsonResponse({'success': False, 'errors': ['Tipo de reparto inválido']}, status=400)
        
        return JsonResponse({'success': True, 'message': message})
    
    except (Instalacion.DoesNotExist, Retiro.DoesNotExist):
        return JsonResponse({'success': False, 'errors': ['Reparto no encontrado']}, status=404)


# --------- Endpoints para Repartidores ---------

@login_required
@require_http_methods(["POST"])
def cambiar_estado_repartidor(request):
    """Cambiar el estado del repartidor actual"""
    if request.user.tipo_usuario != 'repartidor':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    nuevo_estado = request.POST.get('nuevo_estado')
    
    if not nuevo_estado:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un estado']}, status=400)
    
    try:
        repartidor = request.user.repartidor
        # Validar estado
        estados_validos = [choice[0] for choice in repartidor._meta.get_field('estado').choices]
        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
        
        repartidor.estado = nuevo_estado
        repartidor.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Estado actualizado a: {repartidor.get_estado_display()}'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'errors': [str(e)]}, status=400)


@login_required
@require_http_methods(["GET"])
def detalle_instalacion_json(request, instalacion_id: int):
    """Obtener detalles de una instalación"""
    if request.user.tipo_usuario not in ['administrador', 'repartidor']:
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        instalacion = Instalacion.objects.select_related(
            'reserva__cliente__usuario',
            'repartidor__usuario'
        ).get(id=instalacion_id)
        
        # Si es repartidor, solo puede ver sus propias instalaciones
        if request.user.tipo_usuario == 'repartidor' and instalacion.repartidor != request.user.repartidor:
            return JsonResponse({'error': 'No autorizado'}, status=403)
        
        # Obtener juegos de la reserva
        juegos = []
        precio_juegos_total = 0.0
        for detalle in instalacion.reserva.detalles.all():
            subtotal_juego = float(detalle.cantidad * detalle.precio_unitario)
            precio_juegos_total += subtotal_juego
            
            # Intentar obtener URL de imagen del juego
            imagen_url = None
            if detalle.juego.foto:
                imagen_url = detalle.juego.foto
            
            juegos.append({
                'nombre': detalle.juego.nombre,
                'cantidad': detalle.cantidad,
                'precio': str(detalle.precio_unitario),
                'imagen_url': imagen_url
            })
        
        # Calcular precio de distancia (total - precio juegos)
        total_reserva = float(instalacion.reserva.total_reserva)
        precio_distancia = total_reserva - precio_juegos_total
        kilometros = None
        
        # Si hay precio de distancia, calcular kilómetros ($1.000 por km)
        if precio_distancia > 0:
            kilometros = int(precio_distancia / 1000)
        
        data = {
            'id': instalacion.id,
            'fecha': instalacion.fecha_instalacion.strftime('%d/%m/%Y'),
            'hora': instalacion.hora_instalacion.strftime('%H:%M'),
            'direccion': instalacion.direccion_instalacion,
            'telefono': instalacion.telefono_cliente,
            'estado': instalacion.estado_instalacion,
            'estado_display': instalacion.get_estado_instalacion_display(),
            'observaciones': instalacion.observaciones_instalacion or '',
            'cliente': {
                'nombre': instalacion.reserva.cliente.usuario.get_full_name(),
                'email': instalacion.reserva.cliente.usuario.email,
                'telefono': instalacion.reserva.cliente.usuario.telefono or instalacion.telefono_cliente,
            },
            'repartidor': {
                'nombre': instalacion.repartidor.usuario.get_full_name() if instalacion.repartidor else 'Sin asignar'
            },
            'juegos': juegos,
            'precio_juegos': str(int(precio_juegos_total)),
            'precio_distancia': str(int(precio_distancia)) if precio_distancia > 0 else '0',
            'kilometros': kilometros,
            'total': str(int(total_reserva)),
            'mapa_url': None  # Puede agregarse en el futuro si se guarda en el modelo
        }
        
        return JsonResponse(data)
    except Instalacion.DoesNotExist:
        return JsonResponse({'error': 'Instalación no encontrada'}, status=404)


@login_required
@require_http_methods(["GET"])
def detalle_retiro_json(request, retiro_id: int):
    """Obtener detalles de un retiro"""
    if request.user.tipo_usuario not in ['administrador', 'repartidor']:
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        retiro = Retiro.objects.select_related(
            'reserva__cliente__usuario',
            'repartidor__usuario'
        ).get(id=retiro_id)
        
        # Si es repartidor, solo puede ver sus propios retiros
        if request.user.tipo_usuario == 'repartidor' and retiro.repartidor != request.user.repartidor:
            return JsonResponse({'error': 'No autorizado'}, status=403)
        
        data = {
            'id': retiro.id,
            'fecha': retiro.fecha_retiro.strftime('%d/%m/%Y'),
            'hora': retiro.hora_retiro.strftime('%H:%M'),
            'direccion': retiro.reserva.direccion_evento,
            'estado': retiro.estado_retiro,
            'estado_display': retiro.get_estado_retiro_display(),
            'observaciones': retiro.observaciones_retiro or '',
            'cliente': {
                'nombre': retiro.reserva.cliente.usuario.get_full_name(),
                'email': retiro.reserva.cliente.usuario.email,
                'telefono': retiro.reserva.cliente.usuario.telefono or '-',
            },
            'repartidor': {
                'nombre': retiro.repartidor.usuario.get_full_name() if retiro.repartidor else 'Sin asignar'
            }
        }
        
        return JsonResponse(data)
    except Retiro.DoesNotExist:
        return JsonResponse({'error': 'Retiro no encontrado'}, status=404)

# --------- CRUD de Juegos Inflables (solo administrador) ---------

@login_required
def juegos_list(request):
    """
    Lista todos los juegos inflables con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    categoria_filter = request.GET.get('categoria', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    # Parámetros de ordenamiento
    order_by = request.GET.get('order_by', 'nombre').strip()
    direction = request.GET.get('direction', 'asc').strip()
    
    # Campos válidos para ordenar
    valid_order_fields = {
        'id': 'id',
        'nombre': 'nombre',
        'categoria': 'categoria',
        'capacidad_personas': 'capacidad_personas',
        'precio_base': 'precio_base',
        'estado': 'estado',
    }
    
    # Validar campo de ordenamiento
    if order_by not in valid_order_fields:
        order_by = 'nombre'
    
    # Validar dirección
    if direction not in ['asc', 'desc']:
        direction = 'asc'
    
    # Aplicar ordenamiento
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Juego.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(nombre__icontains=query) |
            Q(descripcion__icontains=query) |
            Q(categoria__icontains=query)
        )
    
    if categoria_filter:
        base_qs = base_qs.filter(categoria=categoria_filter)
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)

    return render(request, 'jio_app/juegos_list.html', {
        'juegos': base_qs,
        'query': query,
        'categoria_filter': categoria_filter,
        'estado_filter': estado_filter,
        'order_by': order_by,
        'direction': direction,
        'categoria_choices': Juego.CATEGORIA_CHOICES,
        'estado_choices': Juego.ESTADO_CHOICES,
    })


@login_required
@require_http_methods(["GET"])
def juego_detail_json(request, juego_id: int):
    """
    Obtiene los detalles de un juego en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        juego = Juego.objects.get(id=juego_id)
        # Obtener URL completa de la imagen si existe
        foto_url = request.build_absolute_uri(juego.foto.url) if juego.foto else ''
        
        return JsonResponse({
            'id': juego.id,
            'nombre': juego.nombre,
            'descripcion': juego.descripcion or '',
            'categoria': juego.categoria,
            'dimension_largo': float(juego.dimension_largo),
            'dimension_ancho': float(juego.dimension_ancho),
            'dimension_alto': float(juego.dimension_alto),
            'dimensiones': juego.dimensiones,  # Para compatibilidad
            'capacidad_personas': juego.capacidad_personas,
            'peso_maximo': juego.peso_maximo,
            'precio_base': int(juego.precio_base),
            'foto': foto_url,
            'estado': juego.estado,
            'categoria_choices': Juego.CATEGORIA_CHOICES,
            'estado_choices': Juego.ESTADO_CHOICES,
        })
    except Juego.DoesNotExist:
        return JsonResponse({'error': 'Juego no encontrado'}, status=404)



@login_required
@require_http_methods(["POST"])
def juego_create_json(request):
    """
    Crea un nuevo juego inflable
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    nombre = request.POST.get('nombre', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    categoria = request.POST.get('categoria', '').strip()
    dimension_largo = request.POST.get('dimension_largo', '').strip()
    dimension_ancho = request.POST.get('dimension_ancho', '').strip()
    dimension_alto = request.POST.get('dimension_alto', '').strip()
    capacidad_personas = request.POST.get('capacidad_personas', '').strip()
    peso_maximo = request.POST.get('peso_maximo', '').strip()
    precio_base = request.POST.get('precio_base', '').strip()
    foto = request.FILES.get('foto')  # Cambio: Ahora recibimos un archivo
    estado = request.POST.get('estado', 'habilitado').strip()

    errors = []
    capacidad = None
    peso = None
    precio = None
    largo = None
    ancho = None
    alto = None
    
    # Validaciones
    if not nombre:
        errors.append('El nombre es obligatorio')
    elif len(nombre) > 100:
        errors.append('El nombre no puede exceder 100 caracteres')
    
    if len(descripcion) > 1000:
        errors.append('La descripción no puede exceder 1000 caracteres')
    
    if not categoria or categoria not in [choice[0] for choice in Juego.CATEGORIA_CHOICES]:
        errors.append('Categoría inválida o no seleccionada')
    
    # Validar dimensiones
    if not dimension_largo:
        errors.append('El largo es obligatorio')
    else:
        try:
            largo = float(dimension_largo)
            if largo <= 0:
                errors.append('El largo debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El largo debe ser un número válido')
    
    if not dimension_ancho:
        errors.append('El ancho es obligatorio')
    else:
        try:
            ancho = float(dimension_ancho)
            if ancho <= 0:
                errors.append('El ancho debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El ancho debe ser un número válido')
    
    if not dimension_alto:
        errors.append('El alto es obligatorio')
    else:
        try:
            alto = float(dimension_alto)
            if alto <= 0:
                errors.append('El alto debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El alto debe ser un número válido')
    
    if not capacidad_personas:
        errors.append('La capacidad de personas es obligatoria')
    else:
        try:
            capacidad = int(capacidad_personas)
            if capacidad <= 0:
                errors.append('La capacidad debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('La capacidad debe ser un número válido')
    
    if not peso_maximo:
        errors.append('El peso máximo es obligatorio')
    else:
        try:
            peso = int(peso_maximo)
            if peso <= 0:
                errors.append('El peso máximo debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El peso máximo debe ser un número válido')
    
    if not precio_base:
        errors.append('El precio base es obligatorio')
    else:
        try:
            precio = int(precio_base)
            if precio < 1:
                errors.append('El precio base debe ser un número entero mayor a 0')
        except (ValueError, TypeError):
            errors.append('El precio base debe ser un número entero válido')
    
    # Validar foto si se proporciona
    if foto:
        # Validar tamaño (máximo 5MB)
        if foto.size > 5 * 1024 * 1024:
            errors.append('La imagen no puede exceder 5MB')
        
        # Validar tipo de archivo
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if foto.content_type not in allowed_types:
            errors.append('Formato de imagen no válido. Use JPG, PNG, GIF o WEBP')
    
    if estado not in [choice[0] for choice in Juego.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    if Juego.objects.filter(nombre=nombre).exists():
        errors.append('Ya existe un juego con ese nombre')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        juego = Juego.objects.create(
            nombre=nombre,
            descripcion=descripcion or None,
            categoria=categoria,
            dimension_largo=largo,
            dimension_ancho=ancho,
            dimension_alto=alto,
            capacidad_personas=capacidad,
            peso_maximo=peso,
            precio_base=precio,
            foto=foto if foto else None,
            estado=estado,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Juego "{juego.nombre}" creado correctamente.',
            'juego_id': juego.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el juego: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def cambiar_estado_reparto(request, tipo_reparto: str, reparto_id: int):
    """Cambiar el estado de una instalación o retiro"""
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    nuevo_estado = request.POST.get('nuevo_estado')
    observaciones = request.POST.get('observaciones', '')
    
    if not nuevo_estado:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un estado']}, status=400)
    
    try:
        if tipo_reparto == 'instalacion':
            instalacion = Instalacion.objects.get(id=reparto_id)
            # Validar estado
            estados_validos = [choice[0] for choice in instalacion._meta.get_field('estado_instalacion').choices]
            if nuevo_estado not in estados_validos:
                return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
            
            instalacion.estado_instalacion = nuevo_estado
            if observaciones:
                obs_actual = instalacion.observaciones_instalacion or ''
                instalacion.observaciones_instalacion = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] {observaciones}".strip()
            instalacion.save()
            message = 'Estado de instalación actualizado correctamente'
            
        elif tipo_reparto == 'retiro':
            retiro = Retiro.objects.get(id=reparto_id)
            # Validar estado
            estados_validos = [choice[0] for choice in retiro._meta.get_field('estado_retiro').choices]
            if nuevo_estado not in estados_validos:
                return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
            
            retiro.estado_retiro = nuevo_estado
            if observaciones:
                obs_actual = retiro.observaciones_retiro or ''
                retiro.observaciones_retiro = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] {observaciones}".strip()
            retiro.save()
            message = 'Estado de retiro actualizado correctamente'
        else:
            return JsonResponse({'success': False, 'errors': ['Tipo de reparto inválido']}, status=400)
        
        return JsonResponse({'success': True, 'message': message})
    
    except (Instalacion.DoesNotExist, Retiro.DoesNotExist):
        return JsonResponse({'success': False, 'errors': ['Reparto no encontrado']}, status=404)


# --------- Endpoints para Repartidores ---------

@login_required
@require_http_methods(["POST"])
def cambiar_estado_repartidor(request):
    """Cambiar el estado del repartidor actual"""
    if request.user.tipo_usuario != 'repartidor':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    nuevo_estado = request.POST.get('nuevo_estado')
    
    if not nuevo_estado:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un estado']}, status=400)
    
    try:
        repartidor = request.user.repartidor
        # Validar estado
        estados_validos = [choice[0] for choice in repartidor._meta.get_field('estado').choices]
        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
        
        repartidor.estado = nuevo_estado
        repartidor.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Estado actualizado a: {repartidor.get_estado_display()}'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'errors': [str(e)]}, status=400)


@login_required
@require_http_methods(["GET"])
def detalle_instalacion_json(request, instalacion_id: int):
    """Obtener detalles de una instalación"""
    if request.user.tipo_usuario not in ['administrador', 'repartidor']:
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        instalacion = Instalacion.objects.select_related(
            'reserva__cliente__usuario',
            'repartidor__usuario'
        ).get(id=instalacion_id)
        
        # Si es repartidor, solo puede ver sus propias instalaciones
        if request.user.tipo_usuario == 'repartidor' and instalacion.repartidor != request.user.repartidor:
            return JsonResponse({'error': 'No autorizado'}, status=403)
        
        # Obtener juegos de la reserva
        juegos = []
        precio_juegos_total = 0.0
        for detalle in instalacion.reserva.detalles.all():
            subtotal_juego = float(detalle.cantidad * detalle.precio_unitario)
            precio_juegos_total += subtotal_juego
            
            # Intentar obtener URL de imagen del juego
            imagen_url = None
            if detalle.juego.foto:
                imagen_url = detalle.juego.foto
            
            juegos.append({
                'nombre': detalle.juego.nombre,
                'cantidad': detalle.cantidad,
                'precio': str(detalle.precio_unitario),
                'imagen_url': imagen_url
            })
        
        # Calcular precio de distancia (total - precio juegos)
        total_reserva = float(instalacion.reserva.total_reserva)
        precio_distancia = total_reserva - precio_juegos_total
        kilometros = None
        
        # Si hay precio de distancia, calcular kilómetros ($1.000 por km)
        if precio_distancia > 0:
            kilometros = int(precio_distancia / 1000)
        
        data = {
            'id': instalacion.id,
            'fecha': instalacion.fecha_instalacion.strftime('%d/%m/%Y'),
            'hora': instalacion.hora_instalacion.strftime('%H:%M'),
            'direccion': instalacion.direccion_instalacion,
            'telefono': instalacion.telefono_cliente,
            'estado': instalacion.estado_instalacion,
            'estado_display': instalacion.get_estado_instalacion_display(),
            'observaciones': instalacion.observaciones_instalacion or '',
            'cliente': {
                'nombre': instalacion.reserva.cliente.usuario.get_full_name(),
                'email': instalacion.reserva.cliente.usuario.email,
                'telefono': instalacion.reserva.cliente.usuario.telefono or instalacion.telefono_cliente,
            },
            'repartidor': {
                'nombre': instalacion.repartidor.usuario.get_full_name() if instalacion.repartidor else 'Sin asignar'
            },
            'juegos': juegos,
            'precio_juegos': str(int(precio_juegos_total)),
            'precio_distancia': str(int(precio_distancia)) if precio_distancia > 0 else '0',
            'kilometros': kilometros,
            'total': str(int(total_reserva)),
            'mapa_url': None  # Puede agregarse en el futuro si se guarda en el modelo
        }
        
        return JsonResponse(data)
    except Instalacion.DoesNotExist:
        return JsonResponse({'error': 'Instalación no encontrada'}, status=404)


@login_required
@require_http_methods(["GET"])
def detalle_retiro_json(request, retiro_id: int):
    """Obtener detalles de un retiro"""
    if request.user.tipo_usuario not in ['administrador', 'repartidor']:
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        retiro = Retiro.objects.select_related(
            'reserva__cliente__usuario',
            'repartidor__usuario'
        ).get(id=retiro_id)
        
        # Si es repartidor, solo puede ver sus propios retiros
        if request.user.tipo_usuario == 'repartidor' and retiro.repartidor != request.user.repartidor:
            return JsonResponse({'error': 'No autorizado'}, status=403)
        
        data = {
            'id': retiro.id,
            'fecha': retiro.fecha_retiro.strftime('%d/%m/%Y'),
            'hora': retiro.hora_retiro.strftime('%H:%M'),
            'direccion': retiro.reserva.direccion_evento,
            'estado': retiro.estado_retiro,
            'estado_display': retiro.get_estado_retiro_display(),
            'observaciones': retiro.observaciones_retiro or '',
            'cliente': {
                'nombre': retiro.reserva.cliente.usuario.get_full_name(),
                'email': retiro.reserva.cliente.usuario.email,
                'telefono': retiro.reserva.cliente.usuario.telefono or '-',
            },
            'repartidor': {
                'nombre': retiro.repartidor.usuario.get_full_name() if retiro.repartidor else 'Sin asignar'
            }
        }
        
        return JsonResponse(data)
    except Retiro.DoesNotExist:
        return JsonResponse({'error': 'Retiro no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def actualizar_estado_reparto_repartidor(request, tipo_reparto: str, reparto_id: int):
    """Actualizar estado de reparto por el repartidor"""
    if request.user.tipo_usuario != 'repartidor':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    nuevo_estado = request.POST.get('nuevo_estado')
    observaciones = request.POST.get('observaciones', '')
    
    if not nuevo_estado:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un estado']}, status=400)
    
    try:
        if tipo_reparto == 'instalacion':
            instalacion = Instalacion.objects.get(id=reparto_id)
            
            # Verificar que el repartidor sea el asignado
            if instalacion.repartidor != request.user.repartidor:
                return JsonResponse({'success': False, 'errors': ['No autorizado para actualizar esta instalación']}, status=403)
            
            # Validar estado
            estados_validos = [choice[0] for choice in instalacion._meta.get_field('estado_instalacion').choices]
            if nuevo_estado not in estados_validos:
                return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
            
            instalacion.estado_instalacion = nuevo_estado
            if observaciones:
                obs_actual = instalacion.observaciones_instalacion or ''
                instalacion.observaciones_instalacion = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] {observaciones}".strip()
            instalacion.save()
            message = 'Estado de instalación actualizado'
            
        elif tipo_reparto == 'retiro':
            retiro = Retiro.objects.get(id=reparto_id)
            
            # Verificar que el repartidor sea el asignado
            if retiro.repartidor != request.user.repartidor:
                return JsonResponse({'success': False, 'errors': ['No autorizado para actualizar este retiro']}, status=403)
            
            # Validar estado
            estados_validos = [choice[0] for choice in retiro._meta.get_field('estado_retiro').choices]
            if nuevo_estado not in estados_validos:
                return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
            
            retiro.estado_retiro = nuevo_estado
            if observaciones:
                obs_actual = retiro.observaciones_retiro or ''
                retiro.observaciones_retiro = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] {observaciones}".strip()
            retiro.save()
            message = 'Estado de retiro actualizado'
        else:
            return JsonResponse({'success': False, 'errors': ['Tipo de reparto inválido']}, status=400)
        
        return JsonResponse({'success': True, 'message': message})
    
    except (Instalacion.DoesNotExist, Retiro.DoesNotExist):
        return JsonResponse({'success': False, 'errors': ['Reparto no encontrado']}, status=404)


@login_required
@require_http_methods(["POST"])
def marcar_reparto_realizado(request, tipo_reparto: str, reparto_id: int):
    """Marcar reparto como realizado con información de pago (solo repartidores)"""
    if request.user.tipo_usuario != 'repartidor':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    observaciones = request.POST.get('observaciones', '')
    
    try:
        if tipo_reparto == 'instalacion':
            instalacion = Instalacion.objects.get(id=reparto_id)
            
            # Verificar que el repartidor sea el asignado
            if instalacion.repartidor != request.user.repartidor:
                return JsonResponse({'success': False, 'errors': ['No autorizado para actualizar esta instalación']}, status=403)
            
            # Validar campos de pago (requeridos para instalación)
            metodo_pago = request.POST.get('metodo_pago')
            comprobante_pago = request.FILES.get('comprobante_pago')
            hora_retiro = request.POST.get('hora_retiro')
            
            if not metodo_pago:
                return JsonResponse({'success': False, 'errors': ['Debe seleccionar un método de pago']}, status=400)
            
            # Solo requerir comprobante si el método de pago es transferencia
            if metodo_pago == 'transferencia' and not comprobante_pago:
                return JsonResponse({'success': False, 'errors': ['Debe adjuntar el comprobante de transferencia']}, status=400)
            
            # Actualizar instalación
            instalacion.estado_instalacion = 'realizada'
            instalacion.metodo_pago = metodo_pago
            if comprobante_pago:
                instalacion.comprobante_pago = comprobante_pago
            
            # Actualizar hora de retiro si se proporcionó
            if hora_retiro:
                try:
                    # Buscar el retiro asociado a esta reserva
                    retiro = Retiro.objects.filter(reserva=instalacion.reserva).first()
                    if retiro:
                        from datetime import datetime
                        hora_obj = datetime.strptime(hora_retiro, '%H:%M').time()
                        retiro.hora_retiro = hora_obj
                        retiro.save()
                        obs_adicional = f"\nHora de retiro actualizada: {hora_retiro}"
                    else:
                        obs_adicional = f"\nHora de retiro solicitada: {hora_retiro} (retiro no encontrado)"
                except Exception as e:
                    obs_adicional = f"\nError al actualizar hora de retiro: {str(e)}"
            else:
                obs_adicional = ""
            
            if observaciones:
                obs_actual = instalacion.observaciones_instalacion or ''
                instalacion.observaciones_instalacion = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] Realizado por {request.user.get_full_name()}\nMétodo de pago: {instalacion.get_metodo_pago_display()}\n{observaciones}{obs_adicional}".strip()
            else:
                obs_actual = instalacion.observaciones_instalacion or ''
                instalacion.observaciones_instalacion = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] Realizado por {request.user.get_full_name()}\nMétodo de pago: {instalacion.get_metodo_pago_display()}{obs_adicional}".strip()
            
            instalacion.save()
            message = 'Instalación marcada como realizada'
            if hora_retiro:
                message += f'. Hora de retiro actualizada: {hora_retiro}'
            
        elif tipo_reparto == 'retiro':
            retiro = Retiro.objects.get(id=reparto_id)
            
            # Verificar que el repartidor sea el asignado
            if retiro.repartidor != request.user.repartidor:
                return JsonResponse({'success': False, 'errors': ['No autorizado para actualizar este retiro']}, status=403)
            
            # Actualizar retiro
            retiro.estado_retiro = 'realizado'
            
            if observaciones:
                obs_actual = retiro.observaciones_retiro or ''
                retiro.observaciones_retiro = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] Realizado por {request.user.get_full_name()}\n{observaciones}".strip()
            else:
                obs_actual = retiro.observaciones_retiro or ''
                retiro.observaciones_retiro = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] Realizado por {request.user.get_full_name()}".strip()
            
            retiro.save()
            message = 'Retiro marcado como realizado'
        else:
            return JsonResponse({'success': False, 'errors': ['Tipo de reparto inválido']}, status=400)
        
        return JsonResponse({'success': True, 'message': message})
    
    except (Instalacion.DoesNotExist, Retiro.DoesNotExist):
        return JsonResponse({'success': False, 'errors': ['Reparto no encontrado']}, status=404)


@login_required
@require_http_methods(["POST"])
def registrar_incidente(request, tipo_reparto: str, reparto_id: int):
    """Registrar un incidente en una instalación o retiro"""
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    tipo_incidente = request.POST.get('tipo_incidente')
    descripcion = request.POST.get('descripcion', '').strip()
    solucion = request.POST.get('solucion', '').strip()
    
    if not tipo_incidente or not descripcion:
        return JsonResponse({'success': False, 'errors': ['Complete todos los campos obligatorios']}, status=400)
    
    # Formatear el incidente
    timestamp = timezone.now().strftime('%d/%m/%Y %H:%M')
    incidente_texto = f"\n--- INCIDENTE [{timestamp}] ---\nTipo: {tipo_incidente}\nDescripción: {descripcion}"
    if solucion:
        incidente_texto += f"\nSolución: {solucion}"
    incidente_texto += "\n"
    
    try:
        if tipo_reparto == 'instalacion':
            instalacion = Instalacion.objects.get(id=reparto_id)
            obs_actual = instalacion.observaciones_instalacion or ''
            instalacion.observaciones_instalacion = (obs_actual + incidente_texto).strip()
            instalacion.save()
            message = 'Incidente registrado en la instalación'
            
        elif tipo_reparto == 'retiro':
            retiro = Retiro.objects.get(id=reparto_id)
            obs_actual = retiro.observaciones_retiro or ''
            retiro.observaciones_retiro = (obs_actual + incidente_texto).strip()
            retiro.save()
            message = 'Incidente registrado en el retiro'
        else:
            return JsonResponse({'success': False, 'errors': ['Tipo de reparto inválido']}, status=400)
        
        return JsonResponse({'success': True, 'message': message})
    
    except (Instalacion.DoesNotExist, Retiro.DoesNotExist):
        return JsonResponse({'success': False, 'errors': ['Reparto no encontrado']}, status=404)


# --------- Endpoints para Repartidores ---------

@login_required
@require_http_methods(["POST"])
def cambiar_estado_repartidor(request):
    """Cambiar el estado del repartidor actual"""
    if request.user.tipo_usuario != 'repartidor':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    nuevo_estado = request.POST.get('nuevo_estado')
    
    if not nuevo_estado:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un estado']}, status=400)
    
    try:
        repartidor = request.user.repartidor
        # Validar estado
        estados_validos = [choice[0] for choice in repartidor._meta.get_field('estado').choices]
        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
        
        repartidor.estado = nuevo_estado
        repartidor.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Estado actualizado a: {repartidor.get_estado_display()}'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'errors': [str(e)]}, status=400)


@login_required
@require_http_methods(["GET"])
def detalle_instalacion_json(request, instalacion_id: int):
    """Obtener detalles de una instalación"""
    if request.user.tipo_usuario not in ['administrador', 'repartidor']:
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        instalacion = Instalacion.objects.select_related(
            'reserva__cliente__usuario',
            'repartidor__usuario'
        ).get(id=instalacion_id)
        
        # Si es repartidor, solo puede ver sus propias instalaciones
        if request.user.tipo_usuario == 'repartidor' and instalacion.repartidor != request.user.repartidor:
            return JsonResponse({'error': 'No autorizado'}, status=403)
        
        # Obtener juegos de la reserva
        juegos = []
        precio_juegos_total = 0.0
        for detalle in instalacion.reserva.detalles.all():
            subtotal_juego = float(detalle.cantidad * detalle.precio_unitario)
            precio_juegos_total += subtotal_juego
            
            # Intentar obtener URL de imagen del juego
            imagen_url = None
            if detalle.juego.foto:
                imagen_url = detalle.juego.foto
            
            juegos.append({
                'nombre': detalle.juego.nombre,
                'cantidad': detalle.cantidad,
                'precio': str(detalle.precio_unitario),
                'imagen_url': imagen_url
            })
        
        # Calcular precio de distancia (total - precio juegos)
        total_reserva = float(instalacion.reserva.total_reserva)
        precio_distancia = total_reserva - precio_juegos_total
        kilometros = None
        
        # Si hay precio de distancia, calcular kilómetros ($1.000 por km)
        if precio_distancia > 0:
            kilometros = int(precio_distancia / 1000)
        
        data = {
            'id': instalacion.id,
            'fecha': instalacion.fecha_instalacion.strftime('%d/%m/%Y'),
            'hora': instalacion.hora_instalacion.strftime('%H:%M'),
            'direccion': instalacion.direccion_instalacion,
            'telefono': instalacion.telefono_cliente,
            'estado': instalacion.estado_instalacion,
            'estado_display': instalacion.get_estado_instalacion_display(),
            'observaciones': instalacion.observaciones_instalacion or '',
            'cliente': {
                'nombre': instalacion.reserva.cliente.usuario.get_full_name(),
                'email': instalacion.reserva.cliente.usuario.email,
                'telefono': instalacion.reserva.cliente.usuario.telefono or instalacion.telefono_cliente,
            },
            'repartidor': {
                'nombre': instalacion.repartidor.usuario.get_full_name() if instalacion.repartidor else 'Sin asignar'
            },
            'juegos': juegos,
            'precio_juegos': str(int(precio_juegos_total)),
            'precio_distancia': str(int(precio_distancia)) if precio_distancia > 0 else '0',
            'kilometros': kilometros,
            'total': str(int(total_reserva)),
            'mapa_url': None  # Puede agregarse en el futuro si se guarda en el modelo
        }
        
        return JsonResponse(data)
    except Instalacion.DoesNotExist:
        return JsonResponse({'error': 'Instalación no encontrada'}, status=404)


@login_required
@require_http_methods(["GET"])
def detalle_retiro_json(request, retiro_id: int):
    """Obtener detalles de un retiro"""
    if request.user.tipo_usuario not in ['administrador', 'repartidor']:
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        retiro = Retiro.objects.select_related(
            'reserva__cliente__usuario',
            'repartidor__usuario'
        ).get(id=retiro_id)
        
        # Si es repartidor, solo puede ver sus propios retiros
        if request.user.tipo_usuario == 'repartidor' and retiro.repartidor != request.user.repartidor:
            return JsonResponse({'error': 'No autorizado'}, status=403)
        
        data = {
            'id': retiro.id,
            'fecha': retiro.fecha_retiro.strftime('%d/%m/%Y'),
            'hora': retiro.hora_retiro.strftime('%H:%M'),
            'direccion': retiro.reserva.direccion_evento,
            'estado': retiro.estado_retiro,
            'estado_display': retiro.get_estado_retiro_display(),
            'observaciones': retiro.observaciones_retiro or '',
            'cliente': {
                'nombre': retiro.reserva.cliente.usuario.get_full_name(),
                'email': retiro.reserva.cliente.usuario.email,
                'telefono': retiro.reserva.cliente.usuario.telefono or '-',
            },
            'repartidor': {
                'nombre': retiro.repartidor.usuario.get_full_name() if retiro.repartidor else 'Sin asignar'
            }
        }
        
        return JsonResponse(data)
    except Retiro.DoesNotExist:
        return JsonResponse({'error': 'Retiro no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def actualizar_estado_reparto_repartidor(request, tipo_reparto: str, reparto_id: int):
    """Actualizar estado de reparto por el repartidor"""
    if request.user.tipo_usuario != 'repartidor':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    nuevo_estado = request.POST.get('nuevo_estado')
    observaciones = request.POST.get('observaciones', '')
    
    if not nuevo_estado:
        return JsonResponse({'success': False, 'errors': ['Debe seleccionar un estado']}, status=400)
    
    try:
        if tipo_reparto == 'instalacion':
            instalacion = Instalacion.objects.get(id=reparto_id)
            
            # Verificar que el repartidor sea el asignado
            if instalacion.repartidor != request.user.repartidor:
                return JsonResponse({'success': False, 'errors': ['No autorizado para actualizar esta instalación']}, status=403)
            
            # Validar estado
            estados_validos = [choice[0] for choice in instalacion._meta.get_field('estado_instalacion').choices]
            if nuevo_estado not in estados_validos:
                return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
            
            instalacion.estado_instalacion = nuevo_estado
            if observaciones:
                obs_actual = instalacion.observaciones_instalacion or ''
                instalacion.observaciones_instalacion = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] {observaciones}".strip()
            instalacion.save()
            message = 'Estado de instalación actualizado'
            
        elif tipo_reparto == 'retiro':
            retiro = Retiro.objects.get(id=reparto_id)
            
            # Verificar que el repartidor sea el asignado
            if retiro.repartidor != request.user.repartidor:
                return JsonResponse({'success': False, 'errors': ['No autorizado para actualizar este retiro']}, status=403)
            
            # Validar estado
            estados_validos = [choice[0] for choice in retiro._meta.get_field('estado_retiro').choices]
            if nuevo_estado not in estados_validos:
                return JsonResponse({'success': False, 'errors': ['Estado inválido']}, status=400)
            
            retiro.estado_retiro = nuevo_estado
            if observaciones:
                obs_actual = retiro.observaciones_retiro or ''
                retiro.observaciones_retiro = f"{obs_actual}\n[{timezone.now().strftime('%d/%m/%Y %H:%M')}] {observaciones}".strip()
            retiro.save()
            message = 'Estado de retiro actualizado'
        else:
            return JsonResponse({'success': False, 'errors': ['Tipo de reparto inválido']}, status=400)
        
        return JsonResponse({'success': True, 'message': message})
    
    except (Instalacion.DoesNotExist, Retiro.DoesNotExist):
        return JsonResponse({'success': False, 'errors': ['Reparto no encontrado']}, status=404)
def juego_update_json(request, juego_id: int):
    """
    Actualiza un juego inflable existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        juego = Juego.objects.get(id=juego_id)
    except Juego.DoesNotExist:
        return JsonResponse({'error': 'Juego no encontrado'}, status=404)

    nombre = request.POST.get('nombre', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    categoria = request.POST.get('categoria', '').strip()
    dimension_largo = request.POST.get('dimension_largo', '').strip()
    dimension_ancho = request.POST.get('dimension_ancho', '').strip()
    dimension_alto = request.POST.get('dimension_alto', '').strip()
    capacidad_personas = request.POST.get('capacidad_personas', '').strip()
    peso_maximo = request.POST.get('peso_maximo', '').strip()
    precio_base = request.POST.get('precio_base', '').strip()
    foto = request.FILES.get('foto')  # Cambio: Ahora recibimos un archivo
    eliminar_foto = request.POST.get('eliminar_foto') == 'true'  # Para eliminar foto existente
    estado = request.POST.get('estado', '').strip()

    errors = []
    largo = None
    ancho = None
    alto = None
    
    # Validaciones
    if not nombre:
        errors.append('El nombre es obligatorio')
    elif len(nombre) > 100:
        errors.append('El nombre no puede exceder 100 caracteres')
    
    if len(descripcion) > 1000:
        errors.append('La descripción no puede exceder 1000 caracteres')
    
    if not categoria:
        errors.append('La categoría es obligatoria')
    elif categoria not in [choice[0] for choice in Juego.CATEGORIA_CHOICES]:
        errors.append('Categoría inválida')
    
    # Validar dimensiones
    if not dimension_largo:
        errors.append('El largo es obligatorio')
    else:
        try:
            largo = float(dimension_largo)
            if largo <= 0:
                errors.append('El largo debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El largo debe ser un número válido')
    
    if not dimension_ancho:
        errors.append('El ancho es obligatorio')
    else:
        try:
            ancho = float(dimension_ancho)
            if ancho <= 0:
                errors.append('El ancho debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El ancho debe ser un número válido')
    
    if not dimension_alto:
        errors.append('El alto es obligatorio')
    else:
        try:
            alto = float(dimension_alto)
            if alto <= 0:
                errors.append('El alto debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El alto debe ser un número válido')
    
    try:
        capacidad = int(capacidad_personas)
        if capacidad <= 0:
            errors.append('La capacidad debe ser mayor a 0')
    except (ValueError, TypeError):
        errors.append('La capacidad debe ser un número válido')
    
    try:
        peso = int(peso_maximo)
        if peso <= 0:
            errors.append('El peso máximo debe ser mayor a 0')
    except (ValueError, TypeError):
        errors.append('El peso máximo debe ser un número válido')
    
    try:
        precio = int(precio_base)
        if precio < 1:
            errors.append('El precio base debe ser un número entero mayor a 0')
    except (ValueError, TypeError):
        errors.append('El precio base debe ser un número entero válido')
    
    # Validar foto si se proporciona una nueva
    if foto:
        # Validar tamaño (máximo 5MB)
        if foto.size > 5 * 1024 * 1024:
            errors.append('La imagen no puede exceder 5MB')
        
        # Validar tipo de archivo
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if foto.content_type not in allowed_types:
            errors.append('Formato de imagen no válido. Use JPG, PNG, GIF o WEBP')
    
    if not estado:
        errors.append('El estado es obligatorio')
    elif estado not in [choice[0] for choice in Juego.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    if nombre != juego.nombre and Juego.objects.filter(nombre=nombre).exists():
        errors.append('Ya existe un juego con ese nombre')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        juego.nombre = nombre
        juego.descripcion = descripcion or None
        juego.categoria = categoria
        juego.dimension_largo = largo
        juego.dimension_ancho = ancho
        juego.dimension_alto = alto
        juego.capacidad_personas = capacidad
        juego.peso_maximo = peso
        juego.precio_base = precio
        
        # Manejar la foto
        if foto:
            # Si hay una foto anterior, eliminarla
            if juego.foto:
                juego.foto.delete(save=False)
            juego.foto = foto
        elif eliminar_foto:
            # Eliminar la foto si se solicitó
            if juego.foto:
                juego.foto.delete(save=False)
            juego.foto = None
        # Si no hay foto nueva ni se solicita eliminar, mantener la existente
        
        juego.estado = estado
        juego.save()
        
        return JsonResponse({
            'success': True, 
            'message': f'Juego "{juego.nombre}" actualizado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el juego: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def juego_delete_json(request, juego_id: int):
    """
    Elimina un juego inflable
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        juego = Juego.objects.get(id=juego_id)
    except Juego.DoesNotExist:
        return JsonResponse({'error': 'Juego no encontrado'}, status=404)

    try:
        nombre_juego = juego.nombre
        juego.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Juego "{nombre_juego}" eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el juego: {str(e)}']
        }, status=500)

@login_required
def estadisticas(request):
    """
    Muestra las estadísticas de la aplicación
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")
    
    from datetime import datetime, timedelta
    from collections import defaultdict
    import json
    from django.db.models import Sum, Count, Q
    
    # Obtener reservas confirmadas y completadas (no canceladas)
    reservas = Reserva.objects.filter(
        Q(estado='Confirmada') | Q(estado='confirmada') | Q(estado='completada')
    ).select_related('cliente__usuario').prefetch_related('detalles__juego')
    
    hoy = datetime.now().date()
    
    # ========== VENTAS SEMANALES ==========
    ventas_semanales = defaultdict(float)
    ventas_semanales_labels = []
    
    # Últimas 8 semanas
    for i in range(7, -1, -1):
        semana_inicio = hoy - timedelta(days=hoy.weekday() + (i * 7))
        semana_fin = semana_inicio + timedelta(days=6)
        semana_key = semana_inicio.strftime('%d/%m')
        
        total_semana = reservas.filter(
            fecha_evento__gte=semana_inicio,
            fecha_evento__lte=semana_fin
        ).aggregate(total=Sum('total_reserva'))['total'] or 0
        
        ventas_semanales[semana_key] = float(total_semana)
        ventas_semanales_labels.append(semana_key)
    
    ventas_semanales_data = [ventas_semanales[label] for label in ventas_semanales_labels]
    
    # ========== VENTAS MENSUALES ==========
    # Mapeo de meses en español
    meses_espanol = {
        1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
        7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
    }
    
    ventas_mensuales = defaultdict(float)
    ventas_mensuales_labels = []
    
    # Últimos 12 meses
    for i in range(11, -1, -1):
        fecha = hoy - timedelta(days=i * 30)
        mes_nombre = meses_espanol[fecha.month]
        mes_key = f'{mes_nombre} {fecha.year}'
        
        # Filtrar reservas del mes
        total_mes = reservas.filter(
            fecha_evento__year=fecha.year,
            fecha_evento__month=fecha.month
        ).aggregate(total=Sum('total_reserva'))['total'] or 0
        
        ventas_mensuales[mes_key] = float(total_mes)
        ventas_mensuales_labels.append(mes_key)
    
    ventas_mensuales_data = [ventas_mensuales[label] for label in ventas_mensuales_labels]
    
    # ========== VENTAS ANUALES ==========
    ventas_anuales = defaultdict(float)
    ventas_anuales_labels = []
    
    # Últimos 5 años
    año_actual = hoy.year
    for i in range(4, -1, -1):
        año = año_actual - i
        año_key = str(año)
        
        total_año = reservas.filter(
            fecha_evento__year=año
        ).aggregate(total=Sum('total_reserva'))['total'] or 0
        
        ventas_anuales[año_key] = float(total_año)
        ventas_anuales_labels.append(año_key)
    
    ventas_anuales_data = [ventas_anuales[label] for label in ventas_anuales_labels]
    
    # ========== VENTAS POR CATEGORÍA ==========
    # Obtener categorías ordenadas según el modelo
    categorias_orden = ['Pequeño', 'Mediano', 'Grande']
    categorias_db = Juego.objects.values_list('categoria', flat=True).distinct()
    # Ordenar las categorías según el orden definido, agregando las que no estén en la lista
    categorias_unicas = []
    for cat in categorias_orden:
        if cat in categorias_db:
            categorias_unicas.append(cat)
    # Agregar cualquier categoría que no esté en la lista ordenada
    for cat in categorias_db:
        if cat not in categorias_unicas:
            categorias_unicas.append(cat)
    
    # Ventas por categoría - DIARIAS (últimos 7 días)
    ventas_categoria_diarias = defaultdict(lambda: defaultdict(float))
    for i in range(6, -1, -1):
        fecha = hoy - timedelta(days=i)
        reservas_dia = reservas.filter(fecha_evento=fecha)
        
        for reserva in reservas_dia:
            for detalle in reserva.detalles.all():
                categoria = detalle.juego.categoria
                ventas_categoria_diarias[categoria][fecha.strftime('%d/%m')] += float(detalle.subtotal)
    
    ventas_categoria_diarias_data = []
    for categoria in categorias_unicas:
        if categoria in ventas_categoria_diarias:
            total_cat = sum(ventas_categoria_diarias[categoria].values())
            ventas_categoria_diarias_data.append(total_cat)
        else:
            ventas_categoria_diarias_data.append(0)
    
    # Ventas por categoría - SEMANALES (últimas 4 semanas)
    ventas_categoria_semanales = defaultdict(float)
    semana_inicio = hoy - timedelta(days=hoy.weekday() + (3 * 7))
    semana_fin = hoy
    reservas_semana = reservas.filter(fecha_evento__gte=semana_inicio, fecha_evento__lte=semana_fin)
    
    for reserva in reservas_semana:
        for detalle in reserva.detalles.all():
            categoria = detalle.juego.categoria
            ventas_categoria_semanales[categoria] += float(detalle.subtotal)
    
    ventas_categoria_semanales_data = [
        ventas_categoria_semanales.get(cat, 0) for cat in categorias_unicas
    ]
    
    # Ventas por categoría - MENSUALES (últimos 6 meses)
    ventas_categoria_mensuales = defaultdict(float)
    fecha_inicio = hoy - timedelta(days=180)
    reservas_mes = reservas.filter(fecha_evento__gte=fecha_inicio)
    
    for reserva in reservas_mes:
        for detalle in reserva.detalles.all():
            categoria = detalle.juego.categoria
            ventas_categoria_mensuales[categoria] += float(detalle.subtotal)
    
    ventas_categoria_mensuales_data = [
        ventas_categoria_mensuales.get(cat, 0) for cat in categorias_unicas
    ]
    
    # Ventas por categoría - ANUALES (último año)
    ventas_categoria_anuales = defaultdict(float)
    año_inicio = hoy - timedelta(days=365)
    reservas_año = reservas.filter(fecha_evento__gte=año_inicio)
    
    for reserva in reservas_año:
        for detalle in reserva.detalles.all():
            categoria = detalle.juego.categoria
            ventas_categoria_anuales[categoria] += float(detalle.subtotal)
    
    ventas_categoria_anuales_data = [
        ventas_categoria_anuales.get(cat, 0) for cat in categorias_unicas
    ]
    
    # ========== DÍAS CON MAYOR DEMANDA ==========
    dias_semana_nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    
    # Semanal - Últimas 4 semanas
    demanda_semanal = defaultdict(int)
    semana_inicio = hoy - timedelta(days=hoy.weekday() + (3 * 7))
    reservas_semana_dias = reservas.filter(fecha_evento__gte=semana_inicio, fecha_evento__lte=hoy)
    
    for reserva in reservas_semana_dias:
        dia_semana = reserva.fecha_evento.weekday()
        demanda_semanal[dias_semana_nombres[dia_semana]] += 1
    
    dias_semana_semanales_labels = dias_semana_nombres
    dias_semana_semanales_data = [demanda_semanal.get(dia, 0) for dia in dias_semana_nombres]
    
    # Mensual - Últimos 3 meses
    demanda_mensual = defaultdict(int)
    fecha_inicio = hoy - timedelta(days=90)
    reservas_mes_dias = reservas.filter(fecha_evento__gte=fecha_inicio)
    
    for reserva in reservas_mes_dias:
        dia_semana = reserva.fecha_evento.weekday()
        demanda_mensual[dias_semana_nombres[dia_semana]] += 1
    
    dias_semana_mensuales_labels = dias_semana_nombres
    dias_semana_mensuales_data = [demanda_mensual.get(dia, 0) for dia in dias_semana_nombres]
    
    # Anual - Último año
    demanda_anual = defaultdict(int)
    año_inicio = hoy - timedelta(days=365)
    reservas_año_dias = reservas.filter(fecha_evento__gte=año_inicio)
    
    for reserva in reservas_año_dias:
        dia_semana = reserva.fecha_evento.weekday()
        demanda_anual[dias_semana_nombres[dia_semana]] += 1
    
    dias_semana_anuales_labels = dias_semana_nombres
    dias_semana_anuales_data = [demanda_anual.get(dia, 0) for dia in dias_semana_nombres]
    
    # Preparar contexto con datos JSON
    context = {
        'ventas_semanales_labels': json.dumps(ventas_semanales_labels),
        'ventas_semanales_data': json.dumps(ventas_semanales_data),
        'ventas_mensuales_labels': json.dumps(ventas_mensuales_labels),
        'ventas_mensuales_data': json.dumps(ventas_mensuales_data),
        'ventas_anuales_labels': json.dumps(ventas_anuales_labels),
        'ventas_anuales_data': json.dumps(ventas_anuales_data),
        'ventas_categoria_diarias_data': json.dumps(ventas_categoria_diarias_data),
        'ventas_categoria_semanales_data': json.dumps(ventas_categoria_semanales_data),
        'ventas_categoria_mensuales_data': json.dumps(ventas_categoria_mensuales_data),
        'ventas_categoria_anuales_data': json.dumps(ventas_categoria_anuales_data),
        'categorias_unicas': json.dumps(categorias_unicas),
        'dias_semana_semanales_labels': json.dumps(dias_semana_semanales_labels),
        'dias_semana_semanales_data': json.dumps(dias_semana_semanales_data),
        'dias_semana_mensuales_labels': json.dumps(dias_semana_mensuales_labels),
        'dias_semana_mensuales_data': json.dumps(dias_semana_mensuales_data),
        'dias_semana_anuales_labels': json.dumps(dias_semana_anuales_labels),
        'dias_semana_anuales_data': json.dumps(dias_semana_anuales_data),
    }
    
    return render(request, 'jio_app/estadisticas.html', context)


# --------- CRUD de Arriendos (solo administrador) ---------

@login_required
def arriendos_list(request):
    """
    Lista todos los arriendos (reservas) con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    fecha_desde = request.GET.get('fecha_desde', '').strip()
    fecha_hasta = request.GET.get('fecha_hasta', '').strip()
    
    # Parámetros de ordenamiento
    order_by = request.GET.get('order_by', '-fecha_creacion').strip()
    direction = request.GET.get('direction', 'desc').strip()
    
    # Campos válidos para ordenar
    valid_order_fields = {
        'id': 'id',
        'fecha_creacion': 'fecha_creacion',
        'fecha_evento': 'fecha_evento',
        'total_reserva': 'total_reserva',
        'estado': 'estado',
        'cliente': 'cliente__usuario__last_name',
    }
    
    # Validar campo de ordenamiento
    if order_by.lstrip('-') not in valid_order_fields:
        order_by = '-fecha_creacion'
    
    # Validar dirección
    if direction not in ['asc', 'desc']:
        direction = 'desc'
    
    # Aplicar ordenamiento
    order_field = valid_order_fields.get(order_by.lstrip('-'), 'fecha_creacion')
    if order_by.startswith('-'):
        order_field = '-' + order_field
    elif direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Reserva.objects.all().select_related('cliente__usuario').prefetch_related('detalles__juego').order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(cliente__usuario__first_name__icontains=query) |
            Q(cliente__usuario__last_name__icontains=query) |
            Q(cliente__usuario__email__icontains=query) |
            Q(direccion_evento__icontains=query) |
            Q(id__icontains=query)
        )
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)
    
    if fecha_desde:
        try:
            from datetime import datetime
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            base_qs = base_qs.filter(fecha_evento__gte=fecha_desde_obj)
        except ValueError:
            pass
    
    if fecha_hasta:
        try:
            from datetime import datetime
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            base_qs = base_qs.filter(fecha_evento__lte=fecha_hasta_obj)
        except ValueError:
            pass

    # Obtener clientes y juegos para los modales
    clientes = Cliente.objects.select_related('usuario').all().order_by('usuario__last_name', 'usuario__first_name')
    juegos_disponibles = Juego.objects.filter(estado='disponible').order_by('nombre')

    return render(request, 'jio_app/arriendos_list.html', {
        'arriendos': base_qs,
        'query': query,
        'estado_filter': estado_filter,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'order_by': order_by.lstrip('-'),
        'direction': direction,
        'estado_choices': Reserva.ESTADO_CHOICES,
        'clientes': clientes,
        'juegos_disponibles': juegos_disponibles,
    })


@login_required
@require_http_methods(["GET"])
def juegos_disponibles_fecha_json(request):
    """
    Obtiene los juegos disponibles para una fecha específica
    Si se proporciona arriendo_id, excluye ese arriendo del cálculo (para edición)
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    fecha_str = request.GET.get('fecha', '').strip()
    arriendo_id = request.GET.get('arriendo_id', '').strip()  # Para excluir el arriendo actual al editar
    
    if not fecha_str:
        return JsonResponse({'error': 'Fecha requerida'}, status=400)
    
    try:
        from datetime import datetime
        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Formato de fecha inválido'}, status=400)
    
    # Obtener todos los juegos habilitados
    todos_juegos = Juego.objects.filter(estado='disponible').order_by('nombre')
    
    # Obtener reservas confirmadas para esa fecha (excluyendo el arriendo actual si se está editando)
    reservas_fecha = Reserva.objects.filter(
        fecha_evento=fecha_obj,
        estado__in=['Pendiente', 'Confirmada', 'confirmada']
    )
    
    # Si se está editando, excluir el arriendo actual
    if arriendo_id:
        try:
            reservas_fecha = reservas_fecha.exclude(id=int(arriendo_id))
        except (ValueError, TypeError):
            pass
    
    reservas_fecha = reservas_fecha.prefetch_related('detalles__juego')
    
    # Obtener IDs de juegos ocupados ese día
    juegos_ocupados = set()
    for reserva in reservas_fecha:
        for detalle in reserva.detalles.all():
            juegos_ocupados.add(detalle.juego.id)
    
    # Si se está editando, agregar los juegos del arriendo actual a disponibles
    juegos_arriendo_actual = set()
    if arriendo_id:
        try:
            reserva_actual = Reserva.objects.get(id=int(arriendo_id))
            for detalle in reserva_actual.detalles.all():
                juegos_arriendo_actual.add(detalle.juego.id)
                # Remover de ocupados si están ahí (para que aparezcan disponibles)
                juegos_ocupados.discard(detalle.juego.id)
        except (Reserva.DoesNotExist, ValueError, TypeError):
            pass
    
    # Filtrar juegos disponibles (no ocupados)
    juegos_disponibles = todos_juegos.exclude(id__in=juegos_ocupados)
    
    juegos_data = []
    for juego in juegos_disponibles:
        juegos_data.append({
            'id': juego.id,
            'nombre': juego.nombre,
            'precio': juego.precio_base,
            'categoria': juego.get_categoria_display(),
        })
    
    return JsonResponse({
        'juegos': juegos_data,
        'fecha': fecha_str,
        'total_disponibles': len(juegos_data),
    })


@login_required
@require_http_methods(["GET"])
def arriendo_detail_json(request, arriendo_id: int):
    """
    Obtiene los detalles de un arriendo en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        reserva = Reserva.objects.select_related('cliente__usuario').prefetch_related('detalles__juego').get(id=arriendo_id)
        
        detalles = []
        for detalle in reserva.detalles.all():
            detalles.append({
                'juego_id': detalle.juego.id,
                'juego_nombre': detalle.juego.nombre,
                'cantidad': detalle.cantidad,
                'precio_unitario': float(detalle.precio_unitario),
                'subtotal': float(detalle.subtotal),
            })
        
        return JsonResponse({
            'id': reserva.id,
            'cliente_id': reserva.cliente.id,
            'cliente_nombre': reserva.cliente.usuario.get_full_name(),
            'cliente_email': reserva.cliente.usuario.email,
            'cliente_telefono': reserva.cliente.usuario.telefono or '',
            'cliente_rut': reserva.cliente.rut,
            'cliente_tipo': reserva.cliente.get_tipo_cliente_display(),
            'fecha_evento': reserva.fecha_evento.strftime('%Y-%m-%d'),
            'hora_instalacion': reserva.hora_instalacion.strftime('%H:%M'),
            'hora_retiro': reserva.hora_retiro.strftime('%H:%M'),
            'direccion_evento': reserva.direccion_evento,
            'distancia_km': reserva.distancia_km,
            'precio_distancia': float(reserva.precio_distancia),
            'estado': reserva.estado,
            'observaciones': reserva.observaciones or '',
            'total_reserva': float(reserva.total_reserva),
            'detalles': detalles,
        })
    except Reserva.DoesNotExist:
        return JsonResponse({'error': 'Arriendo no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def arriendo_create_json(request):
    """
    Crea un nuevo arriendo (reserva)
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    # Datos del cliente (ingresados manualmente)
    cliente_first_name = request.POST.get('cliente_first_name', '').strip()
    cliente_last_name = request.POST.get('cliente_last_name', '').strip()
    cliente_email = request.POST.get('cliente_email', '').strip()
    cliente_telefono = request.POST.get('cliente_telefono', '').strip()
    cliente_rut = request.POST.get('cliente_rut', '').strip()
    cliente_tipo = request.POST.get('cliente_tipo', 'particular').strip()
    
    fecha_evento = request.POST.get('fecha_evento', '').strip()
    hora_instalacion = request.POST.get('hora_instalacion', '').strip()
    hora_retiro = request.POST.get('hora_retiro', '').strip()
    direccion_evento = request.POST.get('direccion_evento', '').strip()
    distancia_km = request.POST.get('distancia_km', '0').strip()
    estado = request.POST.get('estado', 'Pendiente').strip()
    observaciones = request.POST.get('observaciones', '').strip()
    
    # Detalles de juegos (JSON string)
    juegos_json = request.POST.get('juegos', '[]')
    
    errors = []
    
    # Validaciones de cliente
    if not all([cliente_first_name, cliente_last_name, cliente_email, cliente_rut]):
        errors.append('Todos los datos del cliente son obligatorios')
    
    # Validar formato RUT
    rut_regex = re.compile(r'^\d{7,8}-[\dkK]$')
    if cliente_rut and not rut_regex.match(cliente_rut):
        errors.append('El RUT debe tener el formato 12345678-9 o 1234567-K')
    
    # Validar email
    email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if cliente_email and not email_regex.match(cliente_email):
        errors.append('Email inválido')
    
    if cliente_tipo not in ['particular', 'empresa']:
        errors.append('Tipo de cliente inválido')
    
    # Buscar o crear cliente
    cliente = None
    if not errors:
        try:
            # Buscar por RUT (único)
            cliente = Cliente.objects.get(rut=cliente_rut)
            # Actualizar datos si es necesario
            if cliente.usuario.email != cliente_email:
                cliente.usuario.email = cliente_email
            if cliente_first_name and cliente.usuario.first_name != cliente_first_name:
                cliente.usuario.first_name = cliente_first_name
            if cliente_last_name and cliente.usuario.last_name != cliente_last_name:
                cliente.usuario.last_name = cliente_last_name
            if cliente_telefono:
                cliente.usuario.telefono = cliente_telefono
            cliente.usuario.save()
        except Cliente.DoesNotExist:
            # Crear nuevo cliente
            try:
                # Verificar si el email ya existe
                if Usuario.objects.filter(email=cliente_email).exists():
                    errors.append('Ya existe un usuario con ese email')
                else:
                    # Generar username único
                    base_username = slugify(f"{cliente_first_name}_{cliente_last_name}")
                    username = base_username
                    counter = 1
                    while Usuario.objects.filter(username=username).exists():
                        username = f"{base_username}_{counter}"
                        counter += 1
                    
                    # Crear usuario con password aleatorio
                    random_password = secrets.token_urlsafe(12)
                    usuario = Usuario.objects.create_user(
                        username=username,
                        email=cliente_email,
                        password=random_password,
                        first_name=cliente_first_name,
                        last_name=cliente_last_name,
                        tipo_usuario='cliente',
                        is_active=True,
                    )
                    if cliente_telefono:
                        usuario.telefono = cliente_telefono
                        usuario.save(update_fields=['telefono'])
                    
                    cliente = Cliente.objects.create(
                        usuario=usuario,
                        rut=cliente_rut,
                        tipo_cliente=cliente_tipo,
                    )
            except Exception as e:
                errors.append(f'Error al crear cliente: {str(e)}')
    
    if not fecha_evento:
        errors.append('La fecha del evento es obligatoria')
    else:
        try:
            from datetime import datetime
            fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Formato de fecha inválido (use YYYY-MM-DD)')
    
    if not hora_instalacion:
        errors.append('La hora de instalación es obligatoria')
    else:
        try:
            hora_inst_obj = datetime.strptime(hora_instalacion, '%H:%M').time()
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    if not hora_retiro:
        errors.append('La hora de retiro es obligatoria')
    else:
        try:
            hora_ret_obj = datetime.strptime(hora_retiro, '%H:%M').time()
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    if not direccion_evento:
        errors.append('La dirección del evento es obligatoria')
    elif len(direccion_evento) > 300:
        errors.append('La dirección no puede exceder 300 caracteres')
    
    # Validar distancia
    distancia_km_int = 0
    if distancia_km:
        try:
            distancia_km_int = int(distancia_km)
            if distancia_km_int < 0:
                errors.append('La distancia no puede ser negativa')
        except ValueError:
            errors.append('La distancia debe ser un número válido')
    
    # Calcular precio por distancia ($1.000 por km)
    PRECIO_POR_KM = 1000
    precio_distancia = distancia_km_int * PRECIO_POR_KM
    
    if estado not in [choice[0] for choice in Reserva.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    # Validar y procesar juegos
    try:
        import json
        if isinstance(juegos_json, str):
            juegos_data = json.loads(juegos_json)
        else:
            juegos_data = juegos_json
        
        if not juegos_data or len(juegos_data) == 0:
            errors.append('Debe seleccionar al menos un juego')
        
        juegos_validos = []
        total = 0
        for juego_item in juegos_data:
            juego_id = juego_item.get('juego_id') or juego_item.get('id')
            
            if not juego_id:
                errors.append('Juego inválido en los detalles')
                continue
            
            try:
                juego = Juego.objects.get(id=int(juego_id), estado='disponible')
                # Cantidad siempre es 1
                cantidad_int = 1
                precio_unitario = juego.precio_base
                subtotal = cantidad_int * precio_unitario
                total += subtotal
                
                juegos_validos.append({
                    'juego': juego,
                    'cantidad': cantidad_int,
                    'precio_unitario': precio_unitario,
                    'subtotal': subtotal,
                })
            except (ValueError, Juego.DoesNotExist):
                errors.append(f'Juego con ID {juego_id} no encontrado o no disponible')
    except json.JSONDecodeError:
        errors.append('Formato de juegos inválido')
    
    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    # Total incluye juegos + distancia
    total_final = total + precio_distancia
    
    try:
        reserva = Reserva.objects.create(
            cliente=cliente,
            fecha_evento=fecha_obj,
            hora_instalacion=hora_inst_obj,
            hora_retiro=hora_ret_obj,
            direccion_evento=direccion_evento,
            distancia_km=distancia_km_int,
            precio_distancia=precio_distancia,
            estado=estado,
            observaciones=observaciones or None,
            total_reserva=total_final,
        )
        
        # Crear detalles de reserva
        for juego_item in juegos_validos:
            DetalleReserva.objects.create(
                reserva=reserva,
                juego=juego_item['juego'],
                cantidad=juego_item['cantidad'],
                precio_unitario=juego_item['precio_unitario'],
                subtotal=juego_item['subtotal'],
            )
        
        return JsonResponse({
            'success': True, 
            'message': f'Arriendo #{reserva.id} creado correctamente.',
            'arriendo_id': reserva.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el arriendo: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def arriendo_update_json(request, arriendo_id: int):
    """
    Actualiza un arriendo existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        reserva = Reserva.objects.get(id=arriendo_id)
    except Reserva.DoesNotExist:
        return JsonResponse({'error': 'Arriendo no encontrado'}, status=404)
    
    cliente_id = request.POST.get('cliente_id', '').strip()
    fecha_evento = request.POST.get('fecha_evento', '').strip()
    hora_instalacion = request.POST.get('hora_instalacion', '').strip()
    hora_retiro = request.POST.get('hora_retiro', '').strip()
    direccion_evento = request.POST.get('direccion_evento', '').strip()
    distancia_km = request.POST.get('distancia_km', '0').strip()
    estado = request.POST.get('estado', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()
    
    # Detalles de juegos (JSON string)
    juegos_json = request.POST.get('juegos', '[]')
    
    errors = []
    
    # Validaciones
    if cliente_id:
        try:
            cliente = Cliente.objects.get(id=int(cliente_id))
            reserva.cliente = cliente
        except (ValueError, Cliente.DoesNotExist):
            errors.append('Cliente no válido')
    
    if fecha_evento:
        try:
            from datetime import datetime
            reserva.fecha_evento = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Formato de fecha inválido (use YYYY-MM-DD)')
    
    if hora_instalacion:
        try:
            from datetime import datetime
            reserva.hora_instalacion = datetime.strptime(hora_instalacion, '%H:%M').time()
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    if hora_retiro:
        try:
            from datetime import datetime
            reserva.hora_retiro = datetime.strptime(hora_retiro, '%H:%M').time()
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    if direccion_evento:
        if len(direccion_evento) > 300:
            errors.append('La dirección no puede exceder 300 caracteres')
        else:
            reserva.direccion_evento = direccion_evento
    
    # Validar y actualizar distancia
    if distancia_km:
        try:
            distancia_km_int = int(distancia_km)
            if distancia_km_int < 0:
                errors.append('La distancia no puede ser negativa')
            else:
                PRECIO_POR_KM = 1000
                reserva.distancia_km = distancia_km_int
                reserva.precio_distancia = distancia_km_int * PRECIO_POR_KM
        except ValueError:
            errors.append('La distancia debe ser un número válido')
    
    if estado:
        if estado not in [choice[0] for choice in Reserva.ESTADO_CHOICES]:
            errors.append('Estado inválido')
        else:
            reserva.estado = estado
    
    if observaciones is not None:
        reserva.observaciones = observaciones.strip() or None
    
    # Validar y procesar juegos
    try:
        import json
        if isinstance(juegos_json, str):
            juegos_data = json.loads(juegos_json)
        else:
            juegos_data = juegos_json
        
        if juegos_data and len(juegos_data) > 0:
            juegos_validos = []
            total = 0
            
            for juego_item in juegos_data:
                juego_id = juego_item.get('juego_id') or juego_item.get('id')
                
                if not juego_id:
                    errors.append('Juego inválido en los detalles')
                    continue
                
                try:
                    juego = Juego.objects.get(id=int(juego_id), estado='disponible')
                    # Cantidad siempre es 1
                    cantidad_int = 1
                    precio_unitario = juego.precio_base
                    subtotal = cantidad_int * precio_unitario
                    total += subtotal
                    
                    juegos_validos.append({
                        'juego': juego,
                        'cantidad': cantidad_int,
                        'precio_unitario': precio_unitario,
                        'subtotal': subtotal,
                    })
                except (ValueError, Juego.DoesNotExist):
                    errors.append(f'Juego con ID {juego_id} no encontrado o no disponible')
            
            if not errors:
                # Eliminar detalles antiguos y crear nuevos
                reserva.detalles.all().delete()
                # Total incluye juegos + distancia
                total_final = total + reserva.precio_distancia
                reserva.total_reserva = total_final
                
                for juego_item in juegos_validos:
                    DetalleReserva.objects.create(
                        reserva=reserva,
                        juego=juego_item['juego'],
                        cantidad=juego_item['cantidad'],
                        precio_unitario=juego_item['precio_unitario'],
                        subtotal=juego_item['subtotal'],
                    )
    except json.JSONDecodeError:
        errors.append('Formato de juegos inválido')
    
    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    try:
        reserva.save()
        return JsonResponse({
            'success': True, 
            'message': f'Arriendo #{reserva.id} actualizado correctamente.',
            'arriendo_id': reserva.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el arriendo: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def arriendo_delete_json(request, arriendo_id: int):
    """
    Elimina un arriendo (reserva)
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        reserva = Reserva.objects.get(id=arriendo_id)
    except Reserva.DoesNotExist:
        return JsonResponse({'error': 'Arriendo no encontrado'}, status=404)

    try:
        arriendo_id_str = str(reserva.id)
        reserva.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Arriendo #{arriendo_id_str} eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el arriendo: {str(e)}']
        }, status=500)