from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.urls import reverse
from .models import Juego, Usuario, Repartidor, Cliente, Instalacion, Retiro, Reserva, DetalleReserva, Vehiculo, GastoOperativo, Promocion, Evaluacion, PrecioTemporada, MantenimientoVehiculo, Proveedor, Material
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
        
        # Obtener todos los juegos disponibles (aceptar tanto 'Habilitado' como 'disponible')
        try:
            todos_juegos = Juego.objects.filter(
                Q(estado='Habilitado') | Q(estado='disponible')
            ).order_by('nombre')
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
        
        # Obtener reservas confirmadas, pendientes o completadas para esa fecha
        # IMPORTANTE: Buscar por fecha_evento y estados válidos (usar valores exactos del modelo)
        try:
            # Primero, verificar qué estados existen realmente en la base de datos para esta fecha
            reservas_fecha_crudas = Reserva.objects.filter(fecha_evento=fecha_obj)
            estados_existentes_fecha = reservas_fecha_crudas.values_list('estado', flat=True).distinct()
            print(f"🔍 DEBUG - Estados de reservas para {fecha_obj}: {list(estados_existentes_fecha)}")
            print(f"🔍 DEBUG - Total reservas para {fecha_obj} (sin filtrar estado): {reservas_fecha_crudas.count()}")
            
            # Buscar con todos los posibles estados (usar Q para case-insensitive)
            reservas_fecha = Reserva.objects.filter(
                fecha_evento=fecha_obj
            ).filter(
                Q(estado__iexact='Pendiente') | 
                Q(estado__iexact='Confirmada') | 
                Q(estado__iexact='completada')
            ).select_related('cliente').prefetch_related('detalles__juego')
            
            # Debug: verificar cuántas reservas se encontraron
            num_reservas = reservas_fecha.count()
            print(f"🔍 DEBUG - Reservas encontradas con filtro de estado: {num_reservas}")
            
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
            juegos_ocupados_queryset = todos_juegos.filter(id__in=juegos_ocupados)
            print(f"📊 Juegos disponibles: {juegos_disponibles.count()}, Juegos ocupados: {juegos_ocupados_queryset.count()}")
        else:
            juegos_disponibles = todos_juegos
            juegos_ocupados_queryset = Juego.objects.none()  # QuerySet vacío
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
            # Asegurar que siempre iteramos sobre un QuerySet o lista
            for juego in juegos_ocupados_queryset:
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
        print(f"   - Juegos ocupados en data: {len(juegos_ocupados_data)}")
        print(f"   - juegos_ocupados_list en respuesta: {'SÍ' if 'juegos_ocupados_list' in respuesta else 'NO'}")
        print(f"   - Tipo de juegos_ocupados_list: {type(respuesta.get('juegos_ocupados_list'))}")
        print(f"   - IDs ocupados: {list(juegos_ocupados)}")
        print(f"   - Total juegos sistema: {respuesta['total_juegos']}")
        
        # Verificar que la respuesta tenga todos los campos necesarios
        import json
        respuesta_json = json.dumps(respuesta, default=str)
        print(f"   - Respuesta JSON (primeros 500 chars): {respuesta_json[:500]}")
        
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
    
    # Extraer datos del formulario (nuevos campos)
    nombre = data.get('nombre', '').strip()
    apellido = data.get('apellido', '').strip()
    email = data.get('email', '').strip()
    telefono = data.get('telefono', '').strip()
    fecha_evento = data.get('fecha', '').strip()
    hora_instalacion = data.get('hora_instalacion', '').strip()
    hora_retiro = data.get('hora_retiro', '').strip()
    direccion = data.get('direccion', '').strip()
    observaciones = data.get('observaciones', '').strip()
    distancia_km = data.get('distancia_km', '0').strip()
    juegos_data = data.get('juegos', [])  # Array de juegos
    
    # Debug: imprimir datos recibidos
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"📥 Datos recibidos: nombre={nombre}, apellido={apellido}, hora_instalacion={hora_instalacion}, hora_retiro={hora_retiro}, juegos={juegos_data}")
    
    # Si juegos_data es string, intentar parsearlo
    if isinstance(juegos_data, str):
        try:
            juegos_data = json.loads(juegos_data)
        except:
            juegos_data = []
    
    # Compatibilidad con formulario antiguo (si viene nombre completo)
    if not nombre and data.get('nombre_completo'):
        nombre_completo = data.get('nombre_completo', '').strip()
        partes_nombre = nombre_completo.split(' ', 1)
        nombre = partes_nombre[0]
        apellido = partes_nombre[1] if len(partes_nombre) > 1 else ''
    
    errors = []
    
    # Validaciones básicas
    if not nombre:
        errors.append('El nombre es obligatorio')
    elif len(nombre) < 2:
        errors.append('El nombre debe tener al menos 2 caracteres')
    
    if not apellido:
        errors.append('El apellido es obligatorio')
    elif len(apellido) < 2:
        errors.append('El apellido debe tener al menos 2 caracteres')
    
    first_name = nombre
    last_name = apellido
    
    if not email:
        errors.append('El email es obligatorio')
    else:
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_regex.match(email):
            errors.append('Email inválido')
    
    # Teléfono es opcional (no validamos si está vacío)
    
    if not fecha_evento:
        errors.append('La fecha es obligatoria')
    else:
        try:
            from datetime import datetime, timedelta
            fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
            hoy = timezone.now().date()
            if fecha_obj < hoy:
                errors.append('No se pueden hacer reservas para fechas pasadas')
            # Validar que la fecha no sea más de 1 año en el futuro
            fecha_maxima = hoy + timedelta(days=365)
            if fecha_obj > fecha_maxima:
                errors.append('La fecha del evento no puede ser más de 1 año desde la fecha actual')
        except ValueError:
            errors.append('Formato de fecha inválido')
    
    # Validar horas de instalación y retiro
    hora_inst_obj = None
    hora_ret_obj = None
    if not hora_instalacion:
        errors.append('La hora de instalación es obligatoria')
    else:
        try:
            from datetime import datetime
            hora_inst_obj = datetime.strptime(hora_instalacion, '%H:%M').time()
            # Validar que la hora de instalación sea desde las 9:00 AM
            hora_minima = datetime.strptime('09:00', '%H:%M').time()
            if hora_inst_obj < hora_minima:
                errors.append('Las instalaciones solo están disponibles desde las 9:00 AM')
        except ValueError:
            errors.append('Formato de hora de instalación inválido (debe ser HH:MM)')
    
    if not hora_retiro:
        errors.append('La hora de retiro es obligatoria')
    else:
        try:
            from datetime import datetime
            hora_ret_obj = datetime.strptime(hora_retiro, '%H:%M').time()
            # Validar que la hora de retiro sea antes de las 00:00 (23:59 máximo)
            hora_maxima = datetime.strptime('23:59', '%H:%M').time()
            if hora_ret_obj > hora_maxima:
                errors.append('La hora de retiro debe ser antes de las 00:00')
        except ValueError:
            errors.append('Formato de hora de retiro inválido (debe ser HH:MM)')
    
    # Validar que hora_retiro sea después de hora_instalacion
    if hora_inst_obj and hora_ret_obj:
        if hora_ret_obj <= hora_inst_obj:
            errors.append('La hora de retiro debe ser posterior a la hora de instalación')
    
    # Validar juegos
    if not juegos_data:
        errors.append('Debe agregar al menos un juego')
    elif not isinstance(juegos_data, list):
        try:
            juegos_data = json.loads(juegos_data) if isinstance(juegos_data, str) else []
        except:
            errors.append('Formato de juegos inválido')
            juegos_data = []
    
    if not juegos_data or len(juegos_data) == 0:
        errors.append('Debe agregar al menos un juego')
    
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
    
    # Validar y verificar juegos
    juegos_validos = []
    total_juegos = 0
    
    for juego_item in juegos_data:
        juego_id = juego_item.get('juego_id') or juego_item.get('id')
        cantidad = juego_item.get('cantidad', 1)
        
        if not juego_id:
            errors.append('Uno de los juegos no tiene ID válido')
            continue
        
        try:
            juego = Juego.objects.get(id=int(juego_id))
            
            # Verificar estado del juego
            if juego.estado not in ['disponible', 'Habilitado']:
                errors.append(f'El juego "{juego.nombre}" no está disponible')
                continue
            
            # Verificar disponibilidad en la fecha
            reservas_fecha = Reserva.objects.filter(
                fecha_evento=fecha_obj,
                estado__in=['pendiente', 'confirmada', 'Pendiente', 'Confirmada']
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
                errors.append(f'El juego "{juego.nombre}" ya está reservado para esa fecha')
                continue
            
            precio_unitario = juego.precio_base
            subtotal = precio_unitario * cantidad
            
            juegos_validos.append({
                'juego': juego,
                'cantidad': cantidad,
                'precio_unitario': precio_unitario,
                'subtotal': subtotal
            })
            total_juegos += subtotal
            
        except (Juego.DoesNotExist, ValueError) as e:
            errors.append(f'Juego con ID {juego_id} no encontrado')
            continue
    
    if not juegos_validos:
        errors.append('No hay juegos válidos para la reserva')
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    if errors:
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
    
    # Calcular horas extra y su precio
    horas_extra = 0
    precio_horas_extra = 0
    if hora_inst_obj and hora_ret_obj:
        from datetime import timedelta
        # Convertir horas a datetime para calcular diferencia
        fecha_base = datetime(2000, 1, 1).date()
        datetime_inst = datetime.combine(fecha_base, hora_inst_obj)
        datetime_ret = datetime.combine(fecha_base, hora_ret_obj)
        
        # Si la hora de retiro es menor que la de instalación, asumir que es al día siguiente
        if datetime_ret < datetime_inst:
            datetime_ret += timedelta(days=1)
        
        # Calcular diferencia en minutos
        diferencia = datetime_ret - datetime_inst
        diferencia_minutos = diferencia.total_seconds() / 60
        
        # Calcular horas base (6 horas = 360 minutos)
        minutos_base = 6 * 60
        
        # Calcular horas extra (solo si excede las 6 horas base)
        if diferencia_minutos > minutos_base:
            minutos_extra = diferencia_minutos - minutos_base
            # Redondear hacia arriba (si hay al menos 1 minuto extra, cuenta como 1 hora)
            horas_extra = int((minutos_extra + 59) // 60)  # Redondear hacia arriba
        
        # Calcular precio (10.000 pesos por hora extra)
        PRECIO_POR_HORA_EXTRA = 10000
        precio_horas_extra = horas_extra * PRECIO_POR_HORA_EXTRA
    
    # Calcular total (suma de todos los juegos + precio por distancia + horas extra)
    total_final = total_juegos + precio_distancia + precio_horas_extra
    
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
            horas_extra=horas_extra,
            precio_horas_extra=precio_horas_extra,
            estado='pendiente',
            observaciones=observaciones or None,
            total_reserva=total_final,
        )
        
        # Crear detalles de reserva para cada juego
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

    # Obtener fecha base
    from datetime import date, timedelta, datetime
    from calendar import monthrange
    from django.utils import timezone
    
    fecha_hoy = date.today()
    
    # Cancelar automáticamente instalaciones fuera de fecha que no están realizadas ni canceladas
    instalaciones_vencidas = Instalacion.objects.filter(
        fecha_instalacion__lt=fecha_hoy,
        estado_instalacion__in=['programada', 'pendiente']
    )
    count_instalaciones_canceladas = 0
    for instalacion in instalaciones_vencidas:
        obs_actual = instalacion.observaciones_instalacion or ''
        nueva_obs = f"[{timezone.now().strftime('%d/%m/%Y %H:%M')}] Cancelada automáticamente por estar fuera de fecha y no haber sido realizada."
        instalacion.observaciones_instalacion = f"{obs_actual}\n{nueva_obs}".strip() if obs_actual else nueva_obs
        instalacion.estado_instalacion = 'cancelada'
        instalacion.save()
        count_instalaciones_canceladas += 1
    
    # Cancelar automáticamente retiros fuera de fecha que no están realizados ni cancelados
    retiros_vencidos = Retiro.objects.filter(
        fecha_retiro__lt=fecha_hoy,
        estado_retiro__in=['programado', 'pendiente']
    )
    count_retiros_cancelados = 0
    for retiro in retiros_vencidos:
        obs_actual = retiro.observaciones_retiro or ''
        nueva_obs = f"[{timezone.now().strftime('%d/%m/%Y %H:%M')}] Cancelado automáticamente por estar fuera de fecha y no haber sido realizado."
        retiro.observaciones_retiro = f"{obs_actual}\n{nueva_obs}".strip() if obs_actual else nueva_obs
        retiro.estado_retiro = 'cancelado'
        retiro.save()
        count_retiros_cancelados += 1

    query = request.GET.get('q', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    # Parámetros de ordenamiento para instalaciones
    order_by_inst = request.GET.get('order_by_inst', 'fecha_instalacion').strip()
    direction_inst = request.GET.get('direction_inst', 'asc').strip()
    
    # Parámetros de ordenamiento para retiros
    order_by_ret = request.GET.get('order_by_ret', 'fecha_retiro').strip()
    direction_ret = request.GET.get('direction_ret', 'asc').strip()
    
    # Obtener parámetros de vista
    vista = request.GET.get('vista', 'diaria').strip()  # diaria, semanal, mensual
    fecha_seleccionada = request.GET.get('fecha', '').strip()
    
    # Determinar rango de fechas según la vista
    if fecha_seleccionada:
        try:
            fecha_base = datetime.strptime(fecha_seleccionada, '%Y-%m-%d').date()
        except ValueError:
            fecha_base = fecha_hoy
    else:
        fecha_base = fecha_hoy
    
    if vista == 'semanal':
        # Semana: lunes a domingo
        # Obtener el lunes de la semana
        dias_desde_lunes = fecha_base.weekday()
        fecha_inicio = fecha_base - timedelta(days=dias_desde_lunes)
        fecha_fin = fecha_inicio + timedelta(days=6)
        rango_fechas = (fecha_inicio, fecha_fin)
    elif vista == 'mensual':
        # Mes: primer día al último día del mes
        primer_dia = fecha_base.replace(day=1)
        ultimo_dia_num = monthrange(fecha_base.year, fecha_base.month)[1]
        ultimo_dia = fecha_base.replace(day=ultimo_dia_num)
        fecha_inicio = primer_dia
        fecha_fin = ultimo_dia
        rango_fechas = (fecha_inicio, fecha_fin)
    else:  # diaria
        fecha_inicio = fecha_base
        fecha_fin = fecha_base
        rango_fechas = (fecha_inicio, fecha_fin)
    
    # Filtrar instalaciones
    instalaciones_qs = Instalacion.objects.select_related(
        'reserva__cliente__usuario', 'repartidor__usuario'
    )
    
    # Campos válidos para ordenar instalaciones
    valid_order_fields_inst = {
        'id': 'id',
        'fecha_instalacion': 'fecha_instalacion',
        'hora_instalacion': 'hora_instalacion',
        'cliente': 'reserva__cliente__usuario__last_name',
        'direccion': 'direccion_instalacion',
        'estado': 'estado_instalacion',
    }
    
    # Validar y aplicar ordenamiento de instalaciones
    if order_by_inst not in valid_order_fields_inst:
        order_by_inst = 'fecha_instalacion'
    if direction_inst not in ['asc', 'desc']:
        direction_inst = 'asc'
    
    order_field_inst = valid_order_fields_inst[order_by_inst]
    if direction_inst == 'desc':
        order_field_inst = '-' + order_field_inst
    
    instalaciones_qs = instalaciones_qs.order_by(order_field_inst)
    
    # Filtrar solo instalaciones posteriores o iguales a la fecha actual
    instalaciones_qs = instalaciones_qs.filter(fecha_instalacion__gte=fecha_hoy)
    
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
    )
    
    # Campos válidos para ordenar retiros
    valid_order_fields_ret = {
        'id': 'id',
        'fecha_retiro': 'fecha_retiro',
        'hora_retiro': 'hora_retiro',
        'cliente': 'reserva__cliente__usuario__last_name',
        'direccion': 'reserva__direccion_evento',
        'estado': 'estado_retiro',
    }
    
    # Validar y aplicar ordenamiento de retiros
    if order_by_ret not in valid_order_fields_ret:
        order_by_ret = 'fecha_retiro'
    if direction_ret not in ['asc', 'desc']:
        direction_ret = 'asc'
    
    order_field_ret = valid_order_fields_ret[order_by_ret]
    if direction_ret == 'desc':
        order_field_ret = '-' + order_field_ret
    
    retiros_qs = retiros_qs.order_by(order_field_ret)
    
    # Filtrar solo retiros posteriores o iguales a la fecha actual
    retiros_qs = retiros_qs.filter(fecha_retiro__gte=fecha_hoy)
    
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
    
    # Agenda según vista seleccionada (solo futuros o del día actual)
    # Asegurar que la fecha_inicio sea al menos la fecha de hoy
    fecha_inicio_efectiva = max(fecha_inicio, fecha_hoy)
    
    instalaciones_agenda = instalaciones_qs.filter(
        fecha_instalacion__gte=fecha_inicio_efectiva,
        fecha_instalacion__lte=fecha_fin
    )
    retiros_agenda = retiros_qs.filter(
        fecha_retiro__gte=fecha_inicio_efectiva,
        fecha_retiro__lte=fecha_fin
    )
    
    # Repartidores disponibles
    repartidores_disponibles = Usuario.objects.filter(
        tipo_usuario='repartidor',
        is_active=True
    ).select_related('repartidor')
    
    context = {
        'query': query,
        'estado_filter': estado_filter,
        'vista': vista,
        'fecha_base': fecha_base,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
        'fecha_hoy': fecha_hoy,
        'order_by_inst': order_by_inst,
        'direction_inst': direction_inst,
        'order_by_ret': order_by_ret,
        'direction_ret': direction_ret,
        'instalaciones': instalaciones_qs[:50],  # Limitar resultados
        'retiros': retiros_qs[:50],
        'instalaciones_agenda': instalaciones_agenda,
        'retiros_agenda': retiros_agenda,
        'repartidores_disponibles': repartidores_disponibles,
    }
    
    return render(request, 'jio_app/repartos_list.html', context)


@login_required
@require_http_methods(["GET"])
def agenda_repartos_json(request):
    """Endpoint JSON para obtener agenda de repartos por rango de fechas"""
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    vista = request.GET.get('vista', 'diaria').strip()
    fecha_seleccionada = request.GET.get('fecha', '').strip()
    
    from datetime import date, timedelta, datetime
    from calendar import monthrange
    
    fecha_hoy = date.today()
    
    if fecha_seleccionada:
        try:
            fecha_base = datetime.strptime(fecha_seleccionada, '%Y-%m-%d').date()
        except ValueError:
            fecha_base = fecha_hoy
    else:
        fecha_base = fecha_hoy
    
    if vista == 'semanal':
        dias_desde_lunes = fecha_base.weekday()
        fecha_inicio = fecha_base - timedelta(days=dias_desde_lunes)
        fecha_fin = fecha_inicio + timedelta(days=6)
    elif vista == 'mensual':
        primer_dia = fecha_base.replace(day=1)
        ultimo_dia_num = monthrange(fecha_base.year, fecha_base.month)[1]
        ultimo_dia = fecha_base.replace(day=ultimo_dia_num)
        fecha_inicio = primer_dia
        fecha_fin = ultimo_dia
    else:  # diaria
        fecha_inicio = fecha_base
        fecha_fin = fecha_base
    
    # Obtener instalaciones (solo futuras o del día actual)
    # Asegurar que la fecha_inicio sea al menos la fecha de hoy
    fecha_inicio_efectiva = max(fecha_inicio, fecha_hoy)
    
    instalaciones = Instalacion.objects.filter(
        fecha_instalacion__gte=fecha_inicio_efectiva,
        fecha_instalacion__lte=fecha_fin
    ).select_related(
        'reserva__cliente__usuario', 'repartidor__usuario'
    ).order_by('fecha_instalacion', 'hora_instalacion')
    
    # Obtener retiros (solo futuros o del día actual)
    retiros = Retiro.objects.filter(
        fecha_retiro__gte=fecha_inicio_efectiva,
        fecha_retiro__lte=fecha_fin
    ).select_related(
        'reserva__cliente__usuario', 'repartidor__usuario'
    ).order_by('fecha_retiro', 'hora_retiro')
    
    # Serializar instalaciones
    instalaciones_data = []
    for inst in instalaciones:
        instalaciones_data.append({
            'id': inst.id,
            'fecha': inst.fecha_instalacion.strftime('%Y-%m-%d'),
            'hora': inst.hora_instalacion.strftime('%H:%M'),
            'cliente': inst.reserva.cliente.usuario.get_full_name(),
            'direccion': inst.direccion_instalacion,
            'repartidor': inst.repartidor.usuario.get_full_name() if inst.repartidor else None,
            'estado': inst.estado_instalacion,
        })
    
    # Serializar retiros
    retiros_data = []
    for ret in retiros:
        retiros_data.append({
            'id': ret.id,
            'fecha': ret.fecha_retiro.strftime('%Y-%m-%d'),
            'hora': ret.hora_retiro.strftime('%H:%M'),
            'cliente': ret.reserva.cliente.usuario.get_full_name(),
            'direccion': ret.reserva.direccion_evento,
            'repartidor': ret.repartidor.usuario.get_full_name() if ret.repartidor else None,
            'estado': ret.estado_retiro,
        })
    
    return JsonResponse({
        'vista': vista,
        'fecha_base': fecha_base.strftime('%Y-%m-%d'),
        'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
        'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
        'instalaciones': instalaciones_data,
        'retiros': retiros_data,
    })


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
                try:
                    imagen_url = request.build_absolute_uri(detalle.juego.foto.url)
                except:
                    imagen_url = None
            
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
            'edad_minima': juego.edad_minima,
            'edad_maxima': juego.edad_maxima,
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



# Función auxiliar para obtener límites según categoría
def obtener_limites_categoria(categoria):
    """
    Retorna los límites esperados para cada categoría de juego
    """
    limites = {
        'Pequeño': {
            'edad_minima': 3,
            'edad_maxima': 8,
            'capacidad_maxima': 10,
            'peso_maximo': 300
        },
        'Mediano': {
            'edad_minima': 4,
            'edad_maxima': 12,
            'capacidad_maxima': 20,
            'peso_maximo': 400
        },
        'Grande': {
            'edad_minima': 4,
            'edad_maxima': 12,
            'capacidad_maxima': 30,
            'peso_maximo': 600
        }
    }
    return limites.get(categoria, {})

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
    edad_minima = request.POST.get('edad_minima', '').strip()
    edad_maxima = request.POST.get('edad_maxima', '').strip()
    dimension_largo = request.POST.get('dimension_largo', '').strip()
    dimension_ancho = request.POST.get('dimension_ancho', '').strip()
    dimension_alto = request.POST.get('dimension_alto', '').strip()
    capacidad_personas = request.POST.get('capacidad_personas', '').strip()
    peso_maximo = request.POST.get('peso_maximo', '').strip()
    precio_base = request.POST.get('precio_base', '').strip()
    foto = request.FILES.get('foto')  # Cambio: Ahora recibimos un archivo
    estado = request.POST.get('estado', 'habilitado').strip()
    peso_excedido_confirmado = request.POST.get('peso_excedido_confirmado', 'false').strip().lower() == 'true'

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
    
    # Obtener límites según categoría
    limites = obtener_limites_categoria(categoria) if categoria else {}
    
    # Validar edades
    edad_min = None
    edad_max = None
    if not edad_minima:
        if limites:
            edad_min = limites.get('edad_minima', 3)
        else:
            errors.append('La edad mínima es obligatoria')
    else:
        try:
            edad_min = int(edad_minima)
            if edad_min < 1:
                errors.append('La edad mínima debe ser mayor a 0')
            elif limites and edad_min != limites.get('edad_minima'):
                errors.append(f'Para la categoría {categoria}, la edad mínima debe ser {limites.get("edad_minima")} años')
        except (ValueError, TypeError):
            errors.append('La edad mínima debe ser un número válido')
    
    if not edad_maxima:
        if limites:
            edad_max = limites.get('edad_maxima', 12)
        else:
            errors.append('La edad máxima es obligatoria')
    else:
        try:
            edad_max = int(edad_maxima)
            if edad_max < 1:
                errors.append('La edad máxima debe ser mayor a 0')
            elif edad_min and edad_max < edad_min:
                errors.append('La edad máxima debe ser mayor o igual a la edad mínima')
            elif limites and edad_max != limites.get('edad_maxima'):
                errors.append(f'Para la categoría {categoria}, la edad máxima debe ser {limites.get("edad_maxima")} años')
        except (ValueError, TypeError):
            errors.append('La edad máxima debe ser un número válido')
    
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
            elif capacidad > 100:
                errors.append('La capacidad de personas no puede exceder 100')
            elif limites and capacidad != limites.get('capacidad_maxima'):
                errors.append(f'Para la categoría {categoria}, la capacidad máxima debe ser {limites.get("capacidad_maxima")} personas')
        except (ValueError, TypeError):
            errors.append('La capacidad debe ser un número válido')
    
    peso_excedido = False
    if not peso_maximo:
        errors.append('El peso máximo es obligatorio')
    else:
        try:
            peso = int(peso_maximo)
            if peso <= 0:
                errors.append('El peso máximo debe ser mayor a 0')
            elif limites:
                peso_max_categoria = limites.get('peso_maximo', 0)
                if peso > peso_max_categoria:
                    peso_excedido = True
                    if not peso_excedido_confirmado:
                        errors.append(f'El peso máximo ({peso} kg) excede el límite de la categoría {categoria} ({peso_max_categoria} kg). Debe confirmar que está seguro de este valor.')
        except (ValueError, TypeError):
            errors.append('El peso máximo debe ser un número válido')
    
    if not precio_base:
        errors.append('El precio base es obligatorio')
    else:
        try:
            precio = int(precio_base)
            if precio < 1:
                errors.append('El precio base debe ser un número entero mayor a 0')
            elif precio > 1000000:
                errors.append('El precio base no puede exceder 1.000.000 pesos')
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
        from django.utils import timezone
        juego = Juego.objects.create(
            nombre=nombre,
            descripcion=descripcion or None,
            categoria=categoria,
            edad_minima=edad_min,
            edad_maxima=edad_max,
            dimension_largo=largo,
            dimension_ancho=ancho,
            dimension_alto=alto,
            capacidad_personas=capacidad,
            peso_maximo=peso,
            precio_base=precio,
            foto=foto if foto else None,
            estado=estado,
            peso_excedido=peso_excedido,
            peso_excedido_por=request.user if peso_excedido else None,
            peso_excedido_fecha=timezone.now() if peso_excedido else None,
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
            
            # Validar que solo se puede marcar como "realizado" el día que está agendada
            if nuevo_estado == 'realizada':
                from datetime import date
                fecha_hoy = date.today()
                if instalacion.fecha_instalacion != fecha_hoy:
                    return JsonResponse({
                        'success': False, 
                        'errors': [f'Solo se puede marcar como realizado el día agendado ({instalacion.fecha_instalacion.strftime("%d/%m/%Y")}). Hoy es {fecha_hoy.strftime("%d/%m/%Y")}']
                    }, status=400)
            
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
            
            # Validar que solo se puede marcar como "realizado" el día que está agendado
            if nuevo_estado == 'realizado':
                from datetime import date
                fecha_hoy = date.today()
                if retiro.fecha_retiro != fecha_hoy:
                    return JsonResponse({
                        'success': False, 
                        'errors': [f'Solo se puede marcar como realizado el día agendado ({retiro.fecha_retiro.strftime("%d/%m/%Y")}). Hoy es {fecha_hoy.strftime("%d/%m/%Y")}']
                    }, status=400)
            
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
                try:
                    imagen_url = request.build_absolute_uri(detalle.juego.foto.url)
                except:
                    imagen_url = None
            
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
            
            # Validar que solo se puede marcar como realizado el día que está agendada
            from datetime import date
            fecha_hoy = date.today()
            if instalacion.fecha_instalacion != fecha_hoy:
                return JsonResponse({
                    'success': False, 
                    'errors': [f'Solo se puede marcar como realizado el día agendado ({instalacion.fecha_instalacion.strftime("%d/%m/%Y")}). Hoy es {fecha_hoy.strftime("%d/%m/%Y")}']
                }, status=400)
            
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
            
            # Validar que solo se puede marcar como realizado el día que está agendado
            from datetime import date
            fecha_hoy = date.today()
            if retiro.fecha_retiro != fecha_hoy:
                return JsonResponse({
                    'success': False, 
                    'errors': [f'Solo se puede marcar como realizado el día agendado ({retiro.fecha_retiro.strftime("%d/%m/%Y")}). Hoy es {fecha_hoy.strftime("%d/%m/%Y")}']
                }, status=400)
            
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
                try:
                    imagen_url = request.build_absolute_uri(detalle.juego.foto.url)
                except:
                    imagen_url = None
            
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
    edad_minima = request.POST.get('edad_minima', '').strip()
    edad_maxima = request.POST.get('edad_maxima', '').strip()
    dimension_largo = request.POST.get('dimension_largo', '').strip()
    dimension_ancho = request.POST.get('dimension_ancho', '').strip()
    dimension_alto = request.POST.get('dimension_alto', '').strip()
    capacidad_personas = request.POST.get('capacidad_personas', '').strip()
    peso_maximo = request.POST.get('peso_maximo', '').strip()
    precio_base = request.POST.get('precio_base', '').strip()
    foto = request.FILES.get('foto')  # Cambio: Ahora recibimos un archivo
    eliminar_foto = request.POST.get('eliminar_foto') == 'true'  # Para eliminar foto existente
    estado = request.POST.get('estado', '').strip()
    peso_excedido_confirmado = request.POST.get('peso_excedido_confirmado', 'false').strip().lower() == 'true'

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
    
    # Obtener límites según categoría
    limites = obtener_limites_categoria(categoria) if categoria else {}
    
    # Validar edades
    edad_min = None
    edad_max = None
    if not edad_minima:
        if limites:
            edad_min = limites.get('edad_minima', 3)
        else:
            errors.append('La edad mínima es obligatoria')
    else:
        try:
            edad_min = int(edad_minima)
            if edad_min < 1:
                errors.append('La edad mínima debe ser mayor a 0')
            elif limites and edad_min != limites.get('edad_minima'):
                errors.append(f'Para la categoría {categoria}, la edad mínima debe ser {limites.get("edad_minima")} años')
        except (ValueError, TypeError):
            errors.append('La edad mínima debe ser un número válido')
    
    if not edad_maxima:
        if limites:
            edad_max = limites.get('edad_maxima', 12)
        else:
            errors.append('La edad máxima es obligatoria')
    else:
        try:
            edad_max = int(edad_maxima)
            if edad_max < 1:
                errors.append('La edad máxima debe ser mayor a 0')
            elif edad_min and edad_max < edad_min:
                errors.append('La edad máxima debe ser mayor o igual a la edad mínima')
            elif limites and edad_max != limites.get('edad_maxima'):
                errors.append(f'Para la categoría {categoria}, la edad máxima debe ser {limites.get("edad_maxima")} años')
        except (ValueError, TypeError):
            errors.append('La edad máxima debe ser un número válido')
    
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
        elif capacidad > 100:
            errors.append('La capacidad de personas no puede exceder 100')
        elif limites and capacidad != limites.get('capacidad_maxima'):
            errors.append(f'Para la categoría {categoria}, la capacidad máxima debe ser {limites.get("capacidad_maxima")} personas')
    except (ValueError, TypeError):
        errors.append('La capacidad debe ser un número válido')
    
    peso_excedido = False
    try:
        peso = int(peso_maximo)
        if peso <= 0:
            errors.append('El peso máximo debe ser mayor a 0')
        elif limites:
            peso_max_categoria = limites.get('peso_maximo', 0)
            if peso > peso_max_categoria:
                peso_excedido = True
                if not peso_excedido_confirmado:
                    errors.append(f'El peso máximo ({peso} kg) excede el límite de la categoría {categoria} ({peso_max_categoria} kg). Debe confirmar que está seguro de este valor.')
    except (ValueError, TypeError):
        errors.append('El peso máximo debe ser un número válido')
    
    try:
        precio = int(precio_base)
        if precio < 1:
            errors.append('El precio base debe ser un número entero mayor a 0')
        elif precio > 1000000:
            errors.append('El precio base no puede exceder 1.000.000 pesos')
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
        from django.utils import timezone
        juego.nombre = nombre
        juego.descripcion = descripcion or None
        juego.categoria = categoria
        juego.edad_minima = edad_min
        juego.edad_maxima = edad_max
        juego.dimension_largo = largo
        juego.dimension_ancho = ancho
        juego.dimension_alto = alto
        juego.capacidad_personas = capacidad
        juego.peso_maximo = peso
        juego.precio_base = precio
        juego.peso_excedido = peso_excedido
        if peso_excedido:
            juego.peso_excedido_por = request.user
            juego.peso_excedido_fecha = timezone.now()
        elif not peso_excedido and juego.peso_excedido:
            # Si ya no excede, limpiar los campos
            juego.peso_excedido = False
            juego.peso_excedido_por = None
            juego.peso_excedido_fecha = None
        
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
    
    from datetime import datetime, timedelta, date
    from collections import defaultdict
    import json
    from calendar import monthrange
    from django.db.models import Sum, Count, Q
    
    # Obtener fecha actual
    hoy = datetime.now().date()
    
    # Obtener parámetros de mes y año (si existen) para el período a analizar
    año_seleccionado = request.GET.get('year', hoy.year)
    mes_seleccionado = request.GET.get('month', hoy.month)
    
    try:
        año_seleccionado = int(año_seleccionado)
        mes_seleccionado = int(mes_seleccionado)
        # Validar rango
        if mes_seleccionado < 1 or mes_seleccionado > 12:
            mes_seleccionado = hoy.month
        if año_seleccionado < 2000 or año_seleccionado > 2100:
            año_seleccionado = hoy.year
    except (ValueError, TypeError):
        año_seleccionado = hoy.year
        mes_seleccionado = hoy.month
    
    # Mapeo de meses en español
    meses_espanol = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
        7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }
    
    # Obtener reservas confirmadas y completadas (no canceladas)
    # Usar __iexact para hacer búsqueda case-insensitive
    reservas = Reserva.objects.filter(
        Q(estado__iexact='Confirmada') | Q(estado__iexact='completada')
    ).select_related('cliente__usuario').prefetch_related('detalles__juego')
    
    # ========== VENTAS ==========
    # Obtener parámetros para ventas
    ventas_periodo = request.GET.get('ventas_periodo', 'weekly').strip()
    ventas_semana = request.GET.get('ventas_semana', '').strip()
    ventas_mes = request.GET.get('ventas_mes', '').strip()
    ventas_año = request.GET.get('ventas_año', '').strip()
    
    # Si el período es mensual o anual pero no hay parámetros específicos, usar valores del dashboard
    if ventas_periodo == 'monthly' and not ventas_mes:
        ventas_mes = str(mes_seleccionado)
    if ventas_periodo == 'yearly' and not ventas_año:
        ventas_año = str(año_seleccionado)
        # Para el período yearly, limpiar ventas_mes para que no interfiera
        ventas_mes = ''
    elif ventas_periodo == 'monthly' and not ventas_año:
        ventas_año = str(año_seleccionado)
    
    # Ventas semanales - Últimas 8 semanas o semana específica
    ventas_semanales = defaultdict(float)
    ventas_semanales_labels = []
    
    if ventas_semana:
        try:
            if 'W' in ventas_semana:
                año_semana, semana_num = ventas_semana.split('-W')
                año_semana = int(año_semana)
                semana_num = int(semana_num)
                fecha_base = date(año_semana, 1, 4)
                lunes_semana1 = fecha_base - timedelta(days=fecha_base.weekday())
                semana_inicio = lunes_semana1 + timedelta(weeks=semana_num - 1)
                semana_fin = semana_inicio + timedelta(days=6)
            else:
                fecha_semana = datetime.strptime(ventas_semana, '%Y-%m-%d').date()
                semana_inicio = fecha_semana - timedelta(days=fecha_semana.weekday())
                semana_fin = semana_inicio + timedelta(days=6)
            semana_inicio_str = semana_inicio.strftime('%d/%m/%Y')
            semana_fin_str = semana_fin.strftime('%d/%m/%Y')
            semanas_a_mostrar = [(semana_inicio + timedelta(days=i)) for i in range(7)]
        except:
            semana_inicio = hoy - timedelta(days=hoy.weekday())
            semana_fin = semana_inicio + timedelta(days=6)
            semana_inicio_str = semana_inicio.strftime('%d/%m/%Y')
            semana_fin_str = semana_fin.strftime('%d/%m/%Y')
            semanas_a_mostrar = [(hoy - timedelta(days=hoy.weekday() + (i * 7))) for i in range(7, -1, -1)]
    else:
        # Últimas 8 semanas
        semana_inicio = hoy - timedelta(days=hoy.weekday() + (7 * 7))
        semana_fin = hoy
        semana_inicio_str = semana_inicio.strftime('%d/%m/%Y')
        semana_fin_str = semana_fin.strftime('%d/%m/%Y')
        semanas_a_mostrar = [(hoy - timedelta(days=hoy.weekday() + (i * 7))) for i in range(7, -1, -1)]
    
    for semana_inicio_item in semanas_a_mostrar:
        semana_fin_item = semana_inicio_item + timedelta(days=6)
        semana_key = semana_inicio_item.strftime('%d/%m')
        
        total_semana = reservas.filter(
            fecha_evento__gte=semana_inicio_item,
            fecha_evento__lte=semana_fin_item
        ).aggregate(total=Sum('total_reserva'))['total'] or 0
        
        ventas_semanales[semana_key] = float(total_semana)
        ventas_semanales_labels.append(semana_key)
    
    ventas_semanales_data = [ventas_semanales[label] for label in ventas_semanales_labels]
    ventas_semanales_rango = f"{semana_inicio_str} - {semana_fin_str}"
    
    # Ventas mensuales - Últimos 12 meses o mes específico
    meses_espanol_short = {
        1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
        7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
    }
    
    ventas_mensuales = defaultdict(float)
    ventas_mensuales_labels = []
    
    # Determinar mes y año a analizar
    mes_a_analizar = None
    año_a_analizar = None
    
    if ventas_mes and ventas_año:
        try:
            mes_a_analizar = int(ventas_mes)
            año_a_analizar = int(ventas_año)
            if not (1 <= mes_a_analizar <= 12):
                raise ValueError
        except:
            mes_a_analizar = None
            año_a_analizar = None
    elif ventas_periodo == 'monthly':
        # Si el período es mensual pero no hay parámetros específicos, usar mes y año del dashboard
        mes_a_analizar = mes_seleccionado
        año_a_analizar = año_seleccionado
    
    if mes_a_analizar and año_a_analizar:
        # Mostrar días del mes seleccionado
        fecha_inicio = date(año_a_analizar, mes_a_analizar, 1)
        ultimo_dia_num = monthrange(año_a_analizar, mes_a_analizar)[1]
        fecha_fin = date(año_a_analizar, mes_a_analizar, ultimo_dia_num)
        fecha_inicio_str = fecha_inicio.strftime('%d/%m/%Y')
        fecha_fin_str = fecha_fin.strftime('%d/%m/%Y')
        
        # Generar lista de todos los días del mes
        dias_del_mes = []
        for dia in range(1, ultimo_dia_num + 1):
            dias_del_mes.append(date(año_a_analizar, mes_a_analizar, dia))
        
        # Calcular ventas por día
        for fecha_dia in dias_del_mes:
            dia_key = str(fecha_dia.day)
            total_dia = reservas.filter(
                fecha_evento=fecha_dia
            ).aggregate(total=Sum('total_reserva'))['total'] or 0
            ventas_mensuales[dia_key] = float(total_dia)
            ventas_mensuales_labels.append(dia_key)
    else:
        # Últimos 12 meses (cuando no hay mes específico)
        fecha_inicio = hoy - timedelta(days=330)
        fecha_fin = hoy
        fecha_inicio_str = fecha_inicio.strftime('%d/%m/%Y')
        fecha_fin_str = fecha_fin.strftime('%d/%m/%Y')
        meses_a_mostrar = [(hoy - timedelta(days=i * 30)) for i in range(11, -1, -1)]
        
        for fecha in meses_a_mostrar:
            mes_nombre = meses_espanol_short[fecha.month]
            mes_key = f'{mes_nombre} {fecha.year}'
            
            total_mes = reservas.filter(
                fecha_evento__year=fecha.year,
                fecha_evento__month=fecha.month
            ).aggregate(total=Sum('total_reserva'))['total'] or 0
            
            ventas_mensuales[mes_key] = float(total_mes)
            ventas_mensuales_labels.append(mes_key)
    
    ventas_mensuales_data = [ventas_mensuales[label] for label in ventas_mensuales_labels]
    ventas_mensuales_rango = f"{fecha_inicio_str} - {fecha_fin_str}"
    
    # Ventas anuales - Últimos 5 años o año específico
    ventas_anuales = defaultdict(float)
    ventas_anuales_labels = []
    
    # Determinar año a analizar
    año_a_analizar = None
    
    if ventas_año and not ventas_mes:
        try:
            año_a_analizar = int(ventas_año)
        except:
            año_a_analizar = None
    elif ventas_periodo == 'yearly':
        # Si el período es anual pero no hay parámetro específico, usar año del dashboard
        año_a_analizar = año_seleccionado
    
    if año_a_analizar:
        # Mostrar meses del año seleccionado
        año_inicio = date(año_a_analizar, 1, 1)
        año_fin = date(año_a_analizar, 12, 31)
        año_inicio_str = año_inicio.strftime('%d/%m/%Y')
        año_fin_str = año_fin.strftime('%d/%m/%Y')
        
        # Calcular ventas por mes del año
        for mes_num in range(1, 13):
            mes_nombre = meses_espanol_short[mes_num]
            mes_key = mes_nombre
            
            total_mes = reservas.filter(
                fecha_evento__year=año_a_analizar,
                fecha_evento__month=mes_num
            ).aggregate(total=Sum('total_reserva'))['total'] or 0
            
            ventas_anuales[mes_key] = float(total_mes)
            ventas_anuales_labels.append(mes_key)
    else:
        # Últimos 5 años (cuando no hay año específico)
        año_actual = hoy.year
        años_a_mostrar = [(año_actual - i) for i in range(4, -1, -1)]
        año_inicio = date(años_a_mostrar[0], 1, 1)
        año_fin = date(años_a_mostrar[-1], 12, 31)
        año_inicio_str = año_inicio.strftime('%d/%m/%Y')
        año_fin_str = año_fin.strftime('%d/%m/%Y')
        
        for año in años_a_mostrar:
            año_key = str(año)
            
            total_año = reservas.filter(
                fecha_evento__year=año
            ).aggregate(total=Sum('total_reserva'))['total'] or 0
            
            ventas_anuales[año_key] = float(total_año)
            ventas_anuales_labels.append(año_key)
    
    ventas_anuales_data = [ventas_anuales[label] for label in ventas_anuales_labels]
    ventas_anuales_rango = f"{año_inicio_str} - {año_fin_str}"
    
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
    
    # ========== VENTAS POR CATEGORÍA ==========
    # Obtener parámetros para ventas por categoría
    categoria_periodo = request.GET.get('categoria_periodo', 'weekly').strip()
    categoria_semana = request.GET.get('categoria_semana', '').strip()
    categoria_mes = request.GET.get('categoria_mes', '').strip()
    categoria_año = request.GET.get('categoria_año', '').strip()
    
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
    
    # Ventas por categoría - SEMANALES (últimas 4 semanas o semana específica)
    ventas_categoria_semanales = defaultdict(float)
    if categoria_semana:
        try:
            if 'W' in categoria_semana:
                año_semana, semana_num = categoria_semana.split('-W')
                año_semana = int(año_semana)
                semana_num = int(semana_num)
                fecha_base = date(año_semana, 1, 4)
                lunes_semana1 = fecha_base - timedelta(days=fecha_base.weekday())
                semana_inicio_cat = lunes_semana1 + timedelta(weeks=semana_num - 1)
                semana_fin_cat = semana_inicio_cat + timedelta(days=6)
            else:
                fecha_semana = datetime.strptime(categoria_semana, '%Y-%m-%d').date()
                semana_inicio_cat = fecha_semana - timedelta(days=fecha_semana.weekday())
                semana_fin_cat = semana_inicio_cat + timedelta(days=6)
            semana_inicio_cat_str = semana_inicio_cat.strftime('%d/%m/%Y')
            semana_fin_cat_str = semana_fin_cat.strftime('%d/%m/%Y')
        except:
            semana_inicio_cat = hoy - timedelta(days=hoy.weekday() + (3 * 7))
            semana_fin_cat = hoy
            semana_inicio_cat_str = semana_inicio_cat.strftime('%d/%m/%Y')
            semana_fin_cat_str = semana_fin_cat.strftime('%d/%m/%Y')
    else:
        # Últimas 4 semanas
        semana_inicio_cat = hoy - timedelta(days=hoy.weekday() + (3 * 7))
        semana_fin_cat = hoy
        semana_inicio_cat_str = semana_inicio_cat.strftime('%d/%m/%Y')
        semana_fin_cat_str = semana_fin_cat.strftime('%d/%m/%Y')
    
    reservas_semana_cat = reservas.filter(fecha_evento__gte=semana_inicio_cat, fecha_evento__lte=semana_fin_cat)
    
    for reserva in reservas_semana_cat:
        for detalle in reserva.detalles.all():
            categoria = detalle.juego.categoria
            ventas_categoria_semanales[categoria] += float(detalle.subtotal)
    
    ventas_categoria_semanales_data = [
        ventas_categoria_semanales.get(cat, 0) for cat in categorias_unicas
    ]
    ventas_categoria_semanales_rango = f"{semana_inicio_cat_str} - {semana_fin_cat_str}"
    
    # Ventas por categoría - MENSUALES (últimos 6 meses o mes específico)
    ventas_categoria_mensuales = defaultdict(float)
    if categoria_mes and categoria_año:
        try:
            mes_num = int(categoria_mes)
            año_num = int(categoria_año)
            if 1 <= mes_num <= 12:
                fecha_inicio_cat = date(año_num, mes_num, 1)
                ultimo_dia_num = monthrange(año_num, mes_num)[1]
                fecha_fin_cat = date(año_num, mes_num, ultimo_dia_num)
                fecha_inicio_cat_str = fecha_inicio_cat.strftime('%d/%m/%Y')
                fecha_fin_cat_str = fecha_fin_cat.strftime('%d/%m/%Y')
            else:
                raise ValueError
        except:
            fecha_inicio_cat = hoy - timedelta(days=180)
            fecha_fin_cat = hoy
            fecha_inicio_cat_str = fecha_inicio_cat.strftime('%d/%m/%Y')
            fecha_fin_cat_str = fecha_fin_cat.strftime('%d/%m/%Y')
    else:
        # Últimos 6 meses
        fecha_inicio_cat = hoy - timedelta(days=180)
        fecha_fin_cat = hoy
        fecha_inicio_cat_str = fecha_inicio_cat.strftime('%d/%m/%Y')
        fecha_fin_cat_str = fecha_fin_cat.strftime('%d/%m/%Y')
    
    reservas_mes_cat = reservas.filter(fecha_evento__gte=fecha_inicio_cat, fecha_evento__lte=fecha_fin_cat)
    
    for reserva in reservas_mes_cat:
        for detalle in reserva.detalles.all():
            categoria = detalle.juego.categoria
            ventas_categoria_mensuales[categoria] += float(detalle.subtotal)
    
    ventas_categoria_mensuales_data = [
        ventas_categoria_mensuales.get(cat, 0) for cat in categorias_unicas
    ]
    ventas_categoria_mensuales_rango = f"{fecha_inicio_cat_str} - {fecha_fin_cat_str}"
    
    # Ventas por categoría - ANUALES (último año o año específico)
    ventas_categoria_anuales = defaultdict(float)
    if categoria_año and not categoria_mes:
        try:
            año_num = int(categoria_año)
            año_inicio_cat = date(año_num, 1, 1)
            año_fin_cat = date(año_num, 12, 31)
            año_inicio_cat_str = año_inicio_cat.strftime('%d/%m/%Y')
            año_fin_cat_str = año_fin_cat.strftime('%d/%m/%Y')
        except:
            año_inicio_cat = hoy - timedelta(days=365)
            año_fin_cat = hoy
            año_inicio_cat_str = año_inicio_cat.strftime('%d/%m/%Y')
            año_fin_cat_str = año_fin_cat.strftime('%d/%m/%Y')
    else:
        # Último año
        año_inicio_cat = hoy - timedelta(days=365)
        año_fin_cat = hoy
        año_inicio_cat_str = año_inicio_cat.strftime('%d/%m/%Y')
        año_fin_cat_str = año_fin_cat.strftime('%d/%m/%Y')
    
    reservas_año_cat = reservas.filter(fecha_evento__gte=año_inicio_cat, fecha_evento__lte=año_fin_cat)
    
    for reserva in reservas_año_cat:
        for detalle in reserva.detalles.all():
            categoria = detalle.juego.categoria
            ventas_categoria_anuales[categoria] += float(detalle.subtotal)
    
    ventas_categoria_anuales_data = [
        ventas_categoria_anuales.get(cat, 0) for cat in categorias_unicas
    ]
    ventas_categoria_anuales_rango = f"{año_inicio_cat_str} - {año_fin_cat_str}"
    
    # ========== DÍAS CON MAYOR DEMANDA ==========
    dias_semana_nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    
    # Obtener parámetros para días con mayor demanda
    demanda_periodo = request.GET.get('demanda_periodo', 'weekly').strip()
    demanda_semana = request.GET.get('demanda_semana', '').strip()
    demanda_mes = request.GET.get('demanda_mes', '').strip()
    demanda_año = request.GET.get('demanda_año', '').strip()
    
    # Semanal - Últimas 4 semanas o semana específica
    demanda_semanal = defaultdict(int)
    if demanda_semana:
        try:
            # Formato input type="week" es "YYYY-Www" (ej: "2024-W15")
            if 'W' in demanda_semana:
                año_semana, semana_num = demanda_semana.split('-W')
                año_semana = int(año_semana)
                semana_num = int(semana_num)
                # Calcular el primer día de la semana ISO (lunes)
                # 4 de enero siempre está en la semana 1
                fecha_base = date(año_semana, 1, 4)
                # Obtener el lunes de la semana 1
                lunes_semana1 = fecha_base - timedelta(days=fecha_base.weekday())
                # Calcular el lunes de la semana solicitada
                semana_inicio = lunes_semana1 + timedelta(weeks=semana_num - 1)
                semana_fin = semana_inicio + timedelta(days=6)
            else:
                # Si no es formato semana, usar fecha directa
                fecha_semana = datetime.strptime(demanda_semana, '%Y-%m-%d').date()
                semana_inicio = fecha_semana - timedelta(days=fecha_semana.weekday())
                semana_fin = semana_inicio + timedelta(days=6)
            semana_inicio_str = semana_inicio.strftime('%d/%m/%Y')
            semana_fin_str = semana_fin.strftime('%d/%m/%Y')
        except Exception as e:
            # Si hay error, usar última semana
            semana_inicio = hoy - timedelta(days=hoy.weekday())
            semana_fin = semana_inicio + timedelta(days=6)
            semana_inicio_str = semana_inicio.strftime('%d/%m/%Y')
            semana_fin_str = semana_fin.strftime('%d/%m/%Y')
    else:
        # Últimas 4 semanas desde hoy (rango acumulado)
        semana_inicio = hoy - timedelta(days=hoy.weekday() + (3 * 7))
        semana_fin = hoy
        semana_inicio_str = semana_inicio.strftime('%d/%m/%Y')
        semana_fin_str = semana_fin.strftime('%d/%m/%Y')
    
    reservas_semana_dias = reservas.filter(fecha_evento__gte=semana_inicio, fecha_evento__lte=semana_fin)
    
    for reserva in reservas_semana_dias:
        dia_semana = reserva.fecha_evento.weekday()
        demanda_semanal[dias_semana_nombres[dia_semana]] += 1
    
    dias_semana_semanales_labels = dias_semana_nombres
    dias_semana_semanales_data = [demanda_semanal.get(dia, 0) for dia in dias_semana_nombres]
    dias_semana_semanales_rango = f"{semana_inicio_str} - {semana_fin_str}"
    
    # Mensual - Mes específico o últimos 3 meses
    demanda_mensual = defaultdict(int)
    if demanda_mes and demanda_año:
        try:
            mes_num = int(demanda_mes)
            año_num = int(demanda_año)
            if 1 <= mes_num <= 12:
                fecha_inicio = date(año_num, mes_num, 1)
                ultimo_dia_num = monthrange(año_num, mes_num)[1]
                fecha_fin = date(año_num, mes_num, ultimo_dia_num)
                fecha_inicio_str = fecha_inicio.strftime('%d/%m/%Y')
                fecha_fin_str = fecha_fin.strftime('%d/%m/%Y')
            else:
                raise ValueError
        except:
            fecha_inicio = hoy - timedelta(days=90)
            fecha_fin = hoy
            fecha_inicio_str = fecha_inicio.strftime('%d/%m/%Y')
            fecha_fin_str = fecha_fin.strftime('%d/%m/%Y')
    else:
        # Últimos 3 meses
        fecha_inicio = hoy - timedelta(days=90)
        fecha_fin = hoy
        fecha_inicio_str = fecha_inicio.strftime('%d/%m/%Y')
        fecha_fin_str = fecha_fin.strftime('%d/%m/%Y')
    
    reservas_mes_dias = reservas.filter(fecha_evento__gte=fecha_inicio, fecha_evento__lte=fecha_fin)
    
    for reserva in reservas_mes_dias:
        dia_semana = reserva.fecha_evento.weekday()
        demanda_mensual[dias_semana_nombres[dia_semana]] += 1
    
    dias_semana_mensuales_labels = dias_semana_nombres
    dias_semana_mensuales_data = [demanda_mensual.get(dia, 0) for dia in dias_semana_nombres]
    dias_semana_mensuales_rango = f"{fecha_inicio_str} - {fecha_fin_str}"
    
    # Anual - Año específico o último año
    demanda_anual = defaultdict(int)
    if demanda_año and not demanda_mes:
        try:
            año_num = int(demanda_año)
            año_inicio = date(año_num, 1, 1)
            año_fin = date(año_num, 12, 31)
            año_inicio_str = año_inicio.strftime('%d/%m/%Y')
            año_fin_str = año_fin.strftime('%d/%m/%Y')
        except:
            año_inicio = hoy - timedelta(days=365)
            año_fin = hoy
            año_inicio_str = año_inicio.strftime('%d/%m/%Y')
            año_fin_str = año_fin.strftime('%d/%m/%Y')
    else:
        # Último año
        año_inicio = hoy - timedelta(days=365)
        año_fin = hoy
        año_inicio_str = año_inicio.strftime('%d/%m/%Y')
        año_fin_str = año_fin.strftime('%d/%m/%Y')
    
    reservas_año_dias = reservas.filter(fecha_evento__gte=año_inicio, fecha_evento__lte=año_fin)
    
    for reserva in reservas_año_dias:
        dia_semana = reserva.fecha_evento.weekday()
        demanda_anual[dias_semana_nombres[dia_semana]] += 1
    
    dias_semana_anuales_labels = dias_semana_nombres
    dias_semana_anuales_data = [demanda_anual.get(dia, 0) for dia in dias_semana_nombres]
    dias_semana_anuales_rango = f"{año_inicio_str} - {año_fin_str}"
    
    # ========== KPIs Y MÉTRICAS CLAVE ==========
    from jio_app.models import Pago
    
    # Total de reservas del mes seleccionado
    reservas_mes_seleccionado = reservas.filter(
        fecha_evento__year=año_seleccionado,
        fecha_evento__month=mes_seleccionado
    )
    total_reservas_mes = reservas_mes_seleccionado.count()
    
    # Total de reservas del mes anterior al seleccionado
    if mes_seleccionado == 1:
        mes_anterior_num = 12
        año_anterior_num = año_seleccionado - 1
    else:
        mes_anterior_num = mes_seleccionado - 1
        año_anterior_num = año_seleccionado
    
    reservas_mes_anterior = reservas.filter(
        fecha_evento__year=año_anterior_num,
        fecha_evento__month=mes_anterior_num
    )
    total_reservas_mes_anterior = reservas_mes_anterior.count()
    
    # Cálculo de crecimiento de reservas (mes vs mes anterior)
    if total_reservas_mes_anterior > 0:
        crecimiento_reservas = ((total_reservas_mes - total_reservas_mes_anterior) / total_reservas_mes_anterior) * 100
    else:
        crecimiento_reservas = 100.0 if total_reservas_mes > 0 else 0.0
    
    # Ventas del mes seleccionado
    ventas_mes_seleccionado = reservas_mes_seleccionado.aggregate(total=Sum('total_reserva'))['total'] or 0
    ventas_mes_seleccionado = float(ventas_mes_seleccionado)
    
    # Ventas del mes anterior
    ventas_mes_anterior = reservas_mes_anterior.aggregate(total=Sum('total_reserva'))['total'] or 0
    ventas_mes_anterior = float(ventas_mes_anterior)
    
    # Crecimiento de ventas
    if ventas_mes_anterior > 0:
        crecimiento_ventas = ((ventas_mes_seleccionado - ventas_mes_anterior) / ventas_mes_anterior) * 100
    else:
        crecimiento_ventas = 100.0 if ventas_mes_seleccionado > 0 else 0.0
    
    # Clientes nuevos vs recurrentes (mes seleccionado)
    clientes_mes_seleccionado = Cliente.objects.filter(
        reservas__fecha_evento__year=año_seleccionado,
        reservas__fecha_evento__month=mes_seleccionado
    ).distinct()
    
    clientes_nuevos = 0
    clientes_recurrentes = 0
    
    fecha_inicio_mes_seleccionado = datetime(año_seleccionado, mes_seleccionado, 1).date()
    
    for cliente in clientes_mes_seleccionado:
        reservas_anteriores = Reserva.objects.filter(
            cliente=cliente,
            fecha_evento__lt=fecha_inicio_mes_seleccionado
        ).exists()
        if reservas_anteriores:
            clientes_recurrentes += 1
        else:
            clientes_nuevos += 1
    
    total_clientes_mes = clientes_mes_seleccionado.count()
    
    # ========== COMPARACIONES AÑO A AÑO ==========
    # Ventas del año seleccionado
    ventas_año_seleccionado = reservas.filter(
        fecha_evento__year=año_seleccionado
    ).aggregate(total=Sum('total_reserva'))['total'] or 0
    ventas_año_seleccionado = float(ventas_año_seleccionado)
    
    # Ventas del año anterior
    ventas_año_anterior = reservas.filter(
        fecha_evento__year=año_seleccionado - 1
    ).aggregate(total=Sum('total_reserva'))['total'] or 0
    ventas_año_anterior = float(ventas_año_anterior)
    
    # Crecimiento año a año
    if ventas_año_anterior > 0:
        crecimiento_año = ((ventas_año_seleccionado - ventas_año_anterior) / ventas_año_anterior) * 100
    else:
        crecimiento_año = 100.0 if ventas_año_seleccionado > 0 else 0.0
    
    # Reservas del año seleccionado
    reservas_año_seleccionado = reservas.filter(fecha_evento__year=año_seleccionado).count()
    
    # Reservas del año anterior
    reservas_año_anterior = reservas.filter(fecha_evento__year=año_seleccionado - 1).count()
    
    # Crecimiento de reservas año a año
    if reservas_año_anterior > 0:
        crecimiento_reservas_año = ((reservas_año_seleccionado - reservas_año_anterior) / reservas_año_anterior) * 100
    else:
        crecimiento_reservas_año = 100.0 if reservas_año_seleccionado > 0 else 0.0
    
    # Generar lista de años disponibles (desde 2020 hasta el año actual)
    años_disponibles = list(range(2020, hoy.year + 1))
    
    # Meses anteriores y siguientes para navegación
    if mes_seleccionado == 1:
        mes_anterior_nav = 12
        año_anterior_nav = año_seleccionado - 1
    else:
        mes_anterior_nav = mes_seleccionado - 1
        año_anterior_nav = año_seleccionado
    
    if mes_seleccionado == 12:
        mes_siguiente_nav = 1
        año_siguiente_nav = año_seleccionado + 1
    else:
        mes_siguiente_nav = mes_seleccionado + 1
        año_siguiente_nav = año_seleccionado
    
    # Verificar si hay meses futuros (no permitir ir más allá del mes actual)
    puede_avanzar = (año_siguiente_nav < hoy.year) or (año_siguiente_nav == hoy.year and mes_siguiente_nav <= hoy.month)
    
    # Preparar contexto con datos JSON
    context = {
        # Parámetros de selección
        'mes_seleccionado': mes_seleccionado,
        'año_seleccionado': año_seleccionado,
        'mes_nombre': meses_espanol[mes_seleccionado],
        'mes_anterior_nav': mes_anterior_nav,
        'año_anterior_nav': año_anterior_nav,
        'mes_siguiente_nav': mes_siguiente_nav,
        'año_siguiente_nav': año_siguiente_nav,
        'puede_avanzar': puede_avanzar,
        'meses_espanol': meses_espanol,
        'años_disponibles': años_disponibles,
        # Comparaciones mes a mes
        'mes_anterior_nombre': meses_espanol[mes_anterior_num],
        'año_anterior_num': año_anterior_num,
        # KPIs
        'total_reservas_mes': total_reservas_mes,
        'total_reservas_mes_anterior': total_reservas_mes_anterior,
        'crecimiento_reservas': crecimiento_reservas,
        'ventas_mes_actual': ventas_mes_seleccionado,
        'ventas_mes_anterior': ventas_mes_anterior,
        'crecimiento_ventas': crecimiento_ventas,
        'clientes_nuevos': clientes_nuevos,
        'clientes_recurrentes': clientes_recurrentes,
        'total_clientes_mes': total_clientes_mes,
        # Comparaciones año a año
        'ventas_año_actual': ventas_año_seleccionado,
        'ventas_año_anterior': ventas_año_anterior,
        'crecimiento_año': crecimiento_año,
        'reservas_año_actual': reservas_año_seleccionado,
        'reservas_año_anterior': reservas_año_anterior,
        'crecimiento_reservas_año': crecimiento_reservas_año,
        # Datos de gráficos
        'ventas_semanales_labels': json.dumps(ventas_semanales_labels),
        'ventas_semanales_data': json.dumps(ventas_semanales_data),
        'ventas_semanales_rango': ventas_semanales_rango,
        'ventas_mensuales_labels': json.dumps(ventas_mensuales_labels),
        'ventas_mensuales_data': json.dumps(ventas_mensuales_data),
        'ventas_mensuales_rango': ventas_mensuales_rango,
        'ventas_anuales_labels': json.dumps(ventas_anuales_labels),
        'ventas_anuales_data': json.dumps(ventas_anuales_data),
        'ventas_anuales_rango': ventas_anuales_rango,
        'ventas_periodo': ventas_periodo,
        'ventas_semana': ventas_semana,
        'ventas_mes': ventas_mes if ventas_mes else '',
        'ventas_año': ventas_año if ventas_año else '',
        'ventas_categoria_diarias_data': json.dumps(ventas_categoria_diarias_data),
        'ventas_categoria_semanales_data': json.dumps(ventas_categoria_semanales_data),
        'ventas_categoria_semanales_rango': ventas_categoria_semanales_rango,
        'ventas_categoria_mensuales_data': json.dumps(ventas_categoria_mensuales_data),
        'ventas_categoria_mensuales_rango': ventas_categoria_mensuales_rango,
        'ventas_categoria_anuales_data': json.dumps(ventas_categoria_anuales_data),
        'ventas_categoria_anuales_rango': ventas_categoria_anuales_rango,
        'categoria_periodo': categoria_periodo,
        'categoria_semana': categoria_semana,
        'categoria_mes': categoria_mes if categoria_mes else '',
        'categoria_año': categoria_año if categoria_año else '',
        'categorias_unicas': json.dumps(categorias_unicas),
        'dias_semana_semanales_labels': json.dumps(dias_semana_semanales_labels),
        'dias_semana_semanales_data': json.dumps(dias_semana_semanales_data),
        'dias_semana_semanales_rango': dias_semana_semanales_rango,
        'dias_semana_mensuales_labels': json.dumps(dias_semana_mensuales_labels),
        'dias_semana_mensuales_data': json.dumps(dias_semana_mensuales_data),
        'dias_semana_mensuales_rango': dias_semana_mensuales_rango,
        'dias_semana_anuales_labels': json.dumps(dias_semana_anuales_labels),
        'dias_semana_anuales_data': json.dumps(dias_semana_anuales_data),
        'dias_semana_anuales_rango': dias_semana_anuales_rango,
        'demanda_periodo': demanda_periodo,
        'demanda_semana': demanda_semana,
        'demanda_mes': demanda_mes if demanda_mes else '',
        'demanda_año': demanda_año if demanda_año else '',
    }
    
    return render(request, 'jio_app/estadisticas.html', context)


@login_required
def contabilidad(request):
    """
    Vista de contabilidad con ingresos, egresos y calendario mensual
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")
    
    from datetime import datetime, timedelta
    from collections import defaultdict
    from calendar import monthrange
    from django.db.models import Sum, Q
    
    # Obtener parámetros de mes y año (si existen)
    hoy = datetime.now().date()
    año_seleccionado = request.GET.get('year', hoy.year)
    mes_seleccionado = request.GET.get('month', hoy.month)
    
    try:
        año_seleccionado = int(año_seleccionado)
        mes_seleccionado = int(mes_seleccionado)
        # Validar rango
        if mes_seleccionado < 1 or mes_seleccionado > 12:
            mes_seleccionado = hoy.month
        if año_seleccionado < 2000 or año_seleccionado > 2100:
            año_seleccionado = hoy.year
    except (ValueError, TypeError):
        año_seleccionado = hoy.year
        mes_seleccionado = hoy.month
    
    # ========== CALENDARIO MENSUAL CON ESTADÍSTICAS ==========
    meses_espanol = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
        7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }
    
    # Calcular primer y último día del mes seleccionado
    primer_dia_mes = datetime(año_seleccionado, mes_seleccionado, 1).date()
    ultimo_dia_mes = datetime(año_seleccionado, mes_seleccionado, monthrange(año_seleccionado, mes_seleccionado)[1]).date()
    
    # ========== INGRESOS (Pagos recibidos) ==========
    from jio_app.models import Pago, Reserva
    
    # Obtener pagos pagados del mes seleccionado
    pagos_mes = Pago.objects.filter(
        estado='pagado',
        fecha_pago__year=año_seleccionado,
        fecha_pago__month=mes_seleccionado
    )
    
    # También incluir pagos sin fecha_pago pero de reservas del mes
    reservas_mes = Reserva.objects.filter(
        fecha_evento__year=año_seleccionado,
        fecha_evento__month=mes_seleccionado
    )
    
    pagos_sin_fecha = Pago.objects.filter(
        estado='pagado',
        reserva__in=reservas_mes,
        fecha_pago__isnull=True
    )
    
    # Calcular ingresos por día del mes
    ingresos_por_dia = defaultdict(float)
    pagos_por_dia = defaultdict(int)
    
    # Ingresos de pagos con fecha_pago
    for pago in pagos_mes:
        if pago.fecha_pago:
            dia = pago.fecha_pago.day
            ingresos_por_dia[dia] += float(pago.monto)
            pagos_por_dia[dia] += 1
    
    # Ingresos de pagos sin fecha_pago pero de reservas del mes
    for pago in pagos_sin_fecha:
        dia = pago.reserva.fecha_evento.day
        ingresos_por_dia[dia] += float(pago.monto)
        pagos_por_dia[dia] += 1
    
    # Total de ingresos del mes
    total_ingresos_mes = sum(ingresos_por_dia.values())
    total_pagos_mes = sum(pagos_por_dia.values())
    
    # ========== EGRESOS (Por ahora vacío, se puede expandir después) ==========
    egresos_por_dia = defaultdict(float)
    total_egresos_mes = 0.0
    
    # ========== CALENDARIO ==========
    # Crear estructura de calendario
    calendario_datos = []
    primer_dia_semana = primer_dia_mes.weekday()  # 0 = Lunes, 6 = Domingo
    
    # Días de la semana en español
    dias_semana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
    # Llenar días vacíos al inicio del mes
    for i in range(primer_dia_semana):
        calendario_datos.append({
            'dia': None,
            'ingresos': 0,
            'egresos': 0,
            'saldo': 0,
            'pagos': 0,
            'es_hoy': False
        })
    
    # Llenar días del mes
    for dia in range(1, ultimo_dia_mes.day + 1):
        fecha_dia = datetime(año_seleccionado, mes_seleccionado, dia).date()
        es_hoy = (fecha_dia == hoy and mes_seleccionado == hoy.month and año_seleccionado == hoy.year)
        
        ingresos_dia = ingresos_por_dia.get(dia, 0)
        egresos_dia = egresos_por_dia.get(dia, 0)
        saldo_dia = ingresos_dia - egresos_dia
        
        calendario_datos.append({
            'dia': dia,
            'ingresos': ingresos_dia,
            'egresos': egresos_dia,
            'saldo': saldo_dia,
            'pagos': pagos_por_dia.get(dia, 0),
            'es_hoy': es_hoy,
            'fecha': fecha_dia.strftime('%Y-%m-%d')
        })
    
    # Meses anteriores y siguientes para navegación
    if mes_seleccionado == 1:
        mes_anterior = 12
        año_anterior = año_seleccionado - 1
    else:
        mes_anterior = mes_seleccionado - 1
        año_anterior = año_seleccionado
    
    if mes_seleccionado == 12:
        mes_siguiente = 1
        año_siguiente = año_seleccionado + 1
    else:
        mes_siguiente = mes_seleccionado + 1
        año_siguiente = año_seleccionado
    
    # Verificar si hay meses futuros (no permitir ir más allá del mes actual)
    puede_avanzar = (año_siguiente < hoy.year) or (año_siguiente == hoy.year and mes_siguiente <= hoy.month)
    
    # Generar lista de años disponibles (desde 2020 hasta el año actual)
    años_disponibles = list(range(2020, hoy.year + 1))
    
    # Calcular saldo neto del mes
    saldo_neto_mes = total_ingresos_mes - total_egresos_mes
    
    context = {
        # Datos del calendario mensual
        'mes_seleccionado': mes_seleccionado,
        'año_seleccionado': año_seleccionado,
        'mes_nombre': meses_espanol[mes_seleccionado],
        'calendario_datos': calendario_datos,
        'dias_semana': dias_semana,
        'total_ingresos_mes': total_ingresos_mes,
        'total_egresos_mes': total_egresos_mes,
        'saldo_neto_mes': saldo_neto_mes,
        'total_pagos_mes': total_pagos_mes,
        'mes_anterior': mes_anterior,
        'año_anterior': año_anterior,
        'mes_siguiente': mes_siguiente,
        'año_siguiente': año_siguiente,
        'puede_avanzar': puede_avanzar,
        'meses_espanol': meses_espanol,
        'años_disponibles': años_disponibles,
    }
    
    return render(request, 'jio_app/contabilidad.html', context)


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
            # Buscar por RUT (único) - Si existe, usar ese cliente directamente
            cliente = Cliente.objects.get(rut=cliente_rut)
            # Actualizar solo datos que no causen conflictos (no el email si ya existe en otro usuario)
            # Solo actualizar si el email proporcionado es el mismo que tiene el cliente actual
            if cliente.usuario.email == cliente_email:
                # Si el email coincide, podemos actualizar otros campos
                if cliente_first_name and cliente.usuario.first_name != cliente_first_name:
                    cliente.usuario.first_name = cliente_first_name
                if cliente_last_name and cliente.usuario.last_name != cliente_last_name:
                    cliente.usuario.last_name = cliente_last_name
                if cliente_telefono:
                    cliente.usuario.telefono = cliente_telefono
                cliente.usuario.save()
            else:
                # Si el email es diferente, verificar si podemos actualizarlo
                # Solo actualizar si no existe otro usuario con ese email
                if not Usuario.objects.filter(email=cliente_email).exclude(id=cliente.usuario.id).exists():
                    # El email no existe en otro usuario, podemos actualizarlo
                    cliente.usuario.email = cliente_email
                    if cliente_first_name:
                        cliente.usuario.first_name = cliente_first_name
                    if cliente_last_name:
                        cliente.usuario.last_name = cliente_last_name
                    if cliente_telefono:
                        cliente.usuario.telefono = cliente_telefono
                    cliente.usuario.save()
                else:
                    # El email existe en otro usuario, solo actualizar otros campos
                    if cliente_first_name:
                        cliente.usuario.first_name = cliente_first_name
                    if cliente_last_name:
                        cliente.usuario.last_name = cliente_last_name
                    if cliente_telefono:
                        cliente.usuario.telefono = cliente_telefono
                    cliente.usuario.save()
        except Cliente.DoesNotExist:
            # No existe cliente con ese RUT, verificar si el email ya existe
            if Usuario.objects.filter(email=cliente_email).exists():
                # El email ya existe, buscar si ese usuario tiene un cliente asociado
                usuario_existente = Usuario.objects.get(email=cliente_email)
                if hasattr(usuario_existente, 'cliente'):
                    # Si el usuario tiene cliente, usar ese cliente directamente
                    # No intentar cambiar el RUT ya que es único y podría causar conflictos
                    cliente = usuario_existente.cliente
                    # Actualizar solo datos no conflictivos
                    if cliente_first_name:
                        cliente.usuario.first_name = cliente_first_name
                    if cliente_last_name:
                        cliente.usuario.last_name = cliente_last_name
                    if cliente_telefono:
                        cliente.usuario.telefono = cliente_telefono
                    cliente.usuario.save()
                    # No actualizar el RUT ni el tipo_cliente para evitar conflictos
                else:
                    # El usuario existe pero no tiene cliente asociado
                    # No crear cliente automáticamente, solo devolver error
                    errors.append('Ya existe un usuario con ese email. Use el RUT correcto para ese cliente.')
            else:
                # El email no existe, crear nuevo cliente
                try:
                    # Verificar que el RUT no esté ya en uso
                    if Cliente.objects.filter(rut=cliente_rut).exists():
                        errors.append(f'Ya existe un cliente con el RUT {cliente_rut}')
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
            from datetime import datetime, date, timedelta
            fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
            hoy = date.today()
            # Permitir el día actual y días futuros, solo rechazar días pasados
            if fecha_obj < hoy:
                errors.append('La fecha del evento no puede ser anterior al día actual')
            # Validar que la fecha no sea más de 1 año en el futuro
            fecha_maxima = hoy + timedelta(days=365)
            if fecha_obj > fecha_maxima:
                errors.append('La fecha del evento no puede ser más de 1 año desde la fecha actual')
        except ValueError:
            errors.append('Formato de fecha inválido (use YYYY-MM-DD)')
    
    if not hora_instalacion:
        errors.append('La hora de instalación es obligatoria')
    else:
        try:
            hora_inst_obj = datetime.strptime(hora_instalacion, '%H:%M').time()
            # Validar que la hora de instalación sea desde las 9:00 AM
            hora_minima = datetime.strptime('09:00', '%H:%M').time()
            if hora_inst_obj < hora_minima:
                errors.append('Las instalaciones solo están disponibles desde las 9:00 AM')
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    if not hora_retiro:
        errors.append('La hora de retiro es obligatoria')
    else:
        try:
            hora_ret_obj = datetime.strptime(hora_retiro, '%H:%M').time()
            # Validar que la hora de retiro sea antes de las 00:00 (23:59 máximo)
            hora_maxima = datetime.strptime('23:59', '%H:%M').time()
            if hora_ret_obj > hora_maxima:
                errors.append('La hora de retiro debe ser antes de las 00:00')
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
    
    # Calcular horas extra y su precio
    horas_extra = 0
    precio_horas_extra = 0
    if hora_inst_obj and hora_ret_obj:
        from datetime import timedelta
        # Convertir horas a datetime para calcular diferencia
        fecha_base = datetime(2000, 1, 1).date()
        datetime_inst = datetime.combine(fecha_base, hora_inst_obj)
        datetime_ret = datetime.combine(fecha_base, hora_ret_obj)
        
        # Si la hora de retiro es menor que la de instalación, asumir que es al día siguiente
        if datetime_ret < datetime_inst:
            datetime_ret += timedelta(days=1)
        
        # Calcular diferencia en minutos
        diferencia = datetime_ret - datetime_inst
        diferencia_minutos = diferencia.total_seconds() / 60
        
        # Calcular horas base (6 horas = 360 minutos)
        minutos_base = 6 * 60
        
        # Calcular horas extra (solo si excede las 6 horas base)
        if diferencia_minutos > minutos_base:
            minutos_extra = diferencia_minutos - minutos_base
            # Redondear hacia arriba (si hay al menos 1 minuto extra, cuenta como 1 hora)
            horas_extra = int((minutos_extra + 59) // 60)  # Redondear hacia arriba
        
        # Calcular precio (10.000 pesos por hora extra)
        PRECIO_POR_HORA_EXTRA = 10000
        precio_horas_extra = horas_extra * PRECIO_POR_HORA_EXTRA
    
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
                juego = Juego.objects.get(id=int(juego_id))
                # Verificar que el juego esté habilitado
                if juego.estado != 'Habilitado':
                    errors.append(f'Juego con ID {juego_id} no está habilitado (estado: {juego.estado})')
                    continue
                
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
                errors.append(f'Juego con ID {juego_id} no encontrado')
    except json.JSONDecodeError:
        errors.append('Formato de juegos inválido')
    
    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)
    
    # Total incluye juegos + distancia + horas extra
    total_final = total + precio_distancia + precio_horas_extra
    
    try:
        reserva = Reserva.objects.create(
            cliente=cliente,
            fecha_evento=fecha_obj,
            hora_instalacion=hora_inst_obj,
            hora_retiro=hora_ret_obj,
            direccion_evento=direccion_evento,
            distancia_km=distancia_km_int,
            precio_distancia=precio_distancia,
            horas_extra=horas_extra,
            precio_horas_extra=precio_horas_extra,
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
        
        # Crear instalación automáticamente si no existe
        try:
            instalacion = Instalacion.objects.get(reserva=reserva)
            # Actualizar si ya existe
            instalacion.fecha_instalacion = fecha_obj
            instalacion.hora_instalacion = hora_inst_obj
            instalacion.direccion_instalacion = direccion_evento
            if cliente.usuario.telefono:
                instalacion.telefono_cliente = cliente.usuario.telefono
            if observaciones:
                instalacion.observaciones_instalacion = observaciones
            instalacion.save()
        except Instalacion.DoesNotExist:
            Instalacion.objects.create(
                reserva=reserva,
                fecha_instalacion=fecha_obj,
                hora_instalacion=hora_inst_obj,
                direccion_instalacion=direccion_evento,
                telefono_cliente=cliente.usuario.telefono or '',
                estado_instalacion='programada',
                observaciones_instalacion=observaciones or None,
            )
        
        # Crear retiro automáticamente si no existe
        try:
            retiro = Retiro.objects.get(reserva=reserva)
            # Actualizar si ya existe
            retiro.fecha_retiro = fecha_obj
            retiro.hora_retiro = hora_ret_obj
            if observaciones:
                retiro.observaciones_retiro = observaciones
            retiro.save()
        except Retiro.DoesNotExist:
            Retiro.objects.create(
                reserva=reserva,
                fecha_retiro=fecha_obj,
                hora_retiro=hora_ret_obj,
                estado_retiro='programado',
                observaciones_retiro=observaciones or None,
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
    cliente_nombre = request.POST.get('cliente_nombre', '').strip()
    cliente_apellido = request.POST.get('cliente_apellido', '').strip()
    cliente_rut = request.POST.get('cliente_rut', '').strip()
    cliente_email = request.POST.get('cliente_email', '').strip()
    cliente_telefono = request.POST.get('cliente_telefono', '').strip()
    cliente_tipo = request.POST.get('cliente_tipo', '').strip()
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
    
    # Actualizar datos del cliente
    if cliente_id:
        try:
            cliente = Cliente.objects.get(id=int(cliente_id))
            reserva.cliente = cliente
            
            # Actualizar datos del cliente si se proporcionan
            if cliente_nombre:
                cliente.usuario.first_name = cliente_nombre
            if cliente_apellido:
                cliente.usuario.last_name = cliente_apellido
            if cliente_email:
                cliente.usuario.email = cliente_email
            if cliente_telefono:
                cliente.usuario.telefono = cliente_telefono
            if cliente_rut:
                cliente.rut = cliente_rut
            if cliente_tipo:
                cliente.tipo_cliente = cliente_tipo
            
            # Guardar cambios del usuario y cliente
            cliente.usuario.save()
            cliente.save()
            
        except (ValueError, Cliente.DoesNotExist):
            errors.append('Cliente no válido')
    
    if fecha_evento:
        try:
            from datetime import datetime, date, timedelta
            fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
            hoy = date.today()
            # Permitir el día actual y días futuros, solo rechazar días pasados
            if fecha_obj < hoy:
                errors.append('La fecha del evento no puede ser anterior al día actual')
            # Validar que la fecha no sea más de 1 año en el futuro
            fecha_maxima = hoy + timedelta(days=365)
            if fecha_obj > fecha_maxima:
                errors.append('La fecha del evento no puede ser más de 1 año desde la fecha actual')
            else:
                reserva.fecha_evento = fecha_obj
        except ValueError:
            errors.append('Formato de fecha inválido (use YYYY-MM-DD)')
    
    if hora_instalacion:
        try:
            from datetime import datetime
            hora_inst_obj = datetime.strptime(hora_instalacion, '%H:%M').time()
            # Validar que la hora de instalación sea desde las 9:00 AM
            hora_minima = datetime.strptime('09:00', '%H:%M').time()
            if hora_inst_obj < hora_minima:
                errors.append('Las instalaciones solo están disponibles desde las 9:00 AM')
            else:
                reserva.hora_instalacion = hora_inst_obj
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    if hora_retiro:
        try:
            from datetime import datetime
            hora_ret_obj = datetime.strptime(hora_retiro, '%H:%M').time()
            # Validar que la hora de retiro sea antes de las 00:00 (23:59 máximo)
            hora_maxima = datetime.strptime('23:59', '%H:%M').time()
            if hora_ret_obj > hora_maxima:
                errors.append('La hora de retiro debe ser antes de las 00:00')
            else:
                reserva.hora_retiro = hora_ret_obj
        except ValueError:
            errors.append('Formato de hora inválido (use HH:MM)')
    
    # Calcular horas extra y su precio después de actualizar las horas
    horas_extra = 0
    precio_horas_extra = 0
    if reserva.hora_instalacion and reserva.hora_retiro:
        from datetime import timedelta
        # Convertir horas a datetime para calcular diferencia
        fecha_base = datetime(2000, 1, 1).date()
        datetime_inst = datetime.combine(fecha_base, reserva.hora_instalacion)
        datetime_ret = datetime.combine(fecha_base, reserva.hora_retiro)
        
        # Si la hora de retiro es menor que la de instalación, asumir que es al día siguiente
        if datetime_ret < datetime_inst:
            datetime_ret += timedelta(days=1)
        
        # Calcular diferencia en minutos
        diferencia = datetime_ret - datetime_inst
        diferencia_minutos = diferencia.total_seconds() / 60
        
        # Calcular horas base (6 horas = 360 minutos)
        minutos_base = 6 * 60
        
        # Calcular horas extra (solo si excede las 6 horas base)
        if diferencia_minutos > minutos_base:
            minutos_extra = diferencia_minutos - minutos_base
            # Redondear hacia arriba (si hay al menos 1 minuto extra, cuenta como 1 hora)
            horas_extra = int((minutos_extra + 59) // 60)  # Redondear hacia arriba
        
        # Calcular precio (10.000 pesos por hora extra)
        PRECIO_POR_HORA_EXTRA = 10000
        precio_horas_extra = horas_extra * PRECIO_POR_HORA_EXTRA
    
    reserva.horas_extra = horas_extra
    reserva.precio_horas_extra = precio_horas_extra
    
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
                    juego = Juego.objects.get(id=int(juego_id))
                    # Verificar que el juego esté habilitado
                    if juego.estado != 'Habilitado':
                        errors.append(f'Juego con ID {juego_id} no está habilitado (estado: {juego.estado})')
                        continue
                    
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
                    errors.append(f'Juego con ID {juego_id} no encontrado')
            
            if not errors:
                # Eliminar detalles antiguos y crear nuevos
                reserva.detalles.all().delete()
                # Total incluye juegos + distancia + horas extra
                total_final = total + reserva.precio_distancia + reserva.precio_horas_extra
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
        
        # Actualizar o crear instalación
        try:
            instalacion = Instalacion.objects.get(reserva=reserva)
            # Actualizar si ya existe
            if fecha_evento:
                from datetime import datetime
                fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
                instalacion.fecha_instalacion = fecha_obj
            if hora_instalacion:
                from datetime import datetime
                hora_inst_obj = datetime.strptime(hora_instalacion, '%H:%M').time()
                instalacion.hora_instalacion = hora_inst_obj
            if direccion_evento:
                instalacion.direccion_instalacion = direccion_evento
            if cliente_telefono:
                instalacion.telefono_cliente = cliente_telefono
            if observaciones is not None:
                instalacion.observaciones_instalacion = observaciones.strip() or None
            instalacion.save()
        except Instalacion.DoesNotExist:
            # Crear instalación si no existe
            from datetime import datetime
            fecha_obj_inst = datetime.strptime(fecha_evento, '%Y-%m-%d').date() if fecha_evento else reserva.fecha_evento
            hora_inst_obj_inst = datetime.strptime(hora_instalacion, '%H:%M').time() if hora_instalacion else reserva.hora_instalacion
            direccion_inst = direccion_evento if direccion_evento else reserva.direccion_evento
            telefono_inst = cliente_telefono if cliente_telefono else (reserva.cliente.usuario.telefono or '')
            
            Instalacion.objects.create(
                reserva=reserva,
                fecha_instalacion=fecha_obj_inst,
                hora_instalacion=hora_inst_obj_inst,
                direccion_instalacion=direccion_inst,
                telefono_cliente=telefono_inst,
                estado_instalacion='programada',
                observaciones_instalacion=observaciones.strip() if observaciones else None,
            )
        
        # Actualizar o crear retiro
        try:
            retiro = Retiro.objects.get(reserva=reserva)
            # Actualizar si ya existe
            if fecha_evento:
                from datetime import datetime
                fecha_obj = datetime.strptime(fecha_evento, '%Y-%m-%d').date()
                retiro.fecha_retiro = fecha_obj
            if hora_retiro:
                from datetime import datetime
                hora_ret_obj = datetime.strptime(hora_retiro, '%H:%M').time()
                retiro.hora_retiro = hora_ret_obj
            if observaciones is not None:
                retiro.observaciones_retiro = observaciones.strip() or None
            retiro.save()
        except Retiro.DoesNotExist:
            # Crear retiro si no existe
            from datetime import datetime
            fecha_obj_ret = datetime.strptime(fecha_evento, '%Y-%m-%d').date() if fecha_evento else reserva.fecha_evento
            hora_ret_obj_ret = datetime.strptime(hora_retiro, '%H:%M').time() if hora_retiro else reserva.hora_retiro
            
            Retiro.objects.create(
                reserva=reserva,
                fecha_retiro=fecha_obj_ret,
                hora_retiro=hora_ret_obj_ret,
                estado_retiro='programado',
                observaciones_retiro=observaciones.strip() if observaciones else None,
            )
        
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


# ========== CRUD DE VEHÍCULOS ==========

@login_required
def vehiculos_list(request):
    """
    Lista todos los vehículos con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    tipo_filter = request.GET.get('tipo', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    order_by = request.GET.get('order_by', 'patente').strip()
    direction = request.GET.get('direction', 'asc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'patente': 'patente',
        'marca': 'marca',
        'modelo': 'modelo',
        'año': 'año',
        'estado': 'estado',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'patente'
    
    if direction not in ['asc', 'desc']:
        direction = 'asc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Vehiculo.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(patente__icontains=query) |
            Q(marca__icontains=query) |
            Q(modelo__icontains=query)
        )
    
    if tipo_filter:
        base_qs = base_qs.filter(tipo=tipo_filter)
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)

    return render(request, 'jio_app/vehiculos_list.html', {
        'vehiculos': base_qs,
        'query': query,
        'tipo_filter': tipo_filter,
        'estado_filter': estado_filter,
        'order_by': order_by,
        'direction': direction,
        'tipo_choices': Vehiculo.TIPO_CHOICES,
        'estado_choices': Vehiculo.ESTADO_CHOICES,
    })


@login_required
@require_http_methods(["GET"])
def vehiculo_detail_json(request, vehiculo_id: int):
    """
    Obtiene los detalles de un vehículo en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        
        return JsonResponse({
            'id': vehiculo.id,
            'patente': vehiculo.patente,
            'tipo': vehiculo.tipo,
            'marca': vehiculo.marca,
            'modelo': vehiculo.modelo,
            'año': vehiculo.año,
            'color': vehiculo.color or '',
            'kilometraje_actual': vehiculo.kilometraje_actual,
            'estado': vehiculo.estado,
            'fecha_ultimo_mantenimiento': vehiculo.fecha_ultimo_mantenimiento.strftime('%Y-%m-%d') if vehiculo.fecha_ultimo_mantenimiento else '',
            'proximo_mantenimiento_km': vehiculo.proximo_mantenimiento_km or 0,
            'seguro_vencimiento': vehiculo.seguro_vencimiento.strftime('%Y-%m-%d') if vehiculo.seguro_vencimiento else '',
            'observaciones': vehiculo.observaciones or '',
            'tipo_choices': Vehiculo.TIPO_CHOICES,
            'estado_choices': Vehiculo.ESTADO_CHOICES,
        })
    except Vehiculo.DoesNotExist:
        return JsonResponse({'error': 'Vehículo no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def vehiculo_create_json(request):
    """
    Crea un nuevo vehículo
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    patente = request.POST.get('patente', '').strip().upper()
    tipo = request.POST.get('tipo', '').strip()
    marca = request.POST.get('marca', '').strip()
    modelo = request.POST.get('modelo', '').strip()
    año = request.POST.get('año', '').strip()
    color = request.POST.get('color', '').strip()
    kilometraje_actual = request.POST.get('kilometraje_actual', '0').strip()
    estado = request.POST.get('estado', 'disponible').strip()
    fecha_ultimo_mantenimiento = request.POST.get('fecha_ultimo_mantenimiento', '').strip()
    proximo_mantenimiento_km = request.POST.get('proximo_mantenimiento_km', '').strip()
    seguro_vencimiento = request.POST.get('seguro_vencimiento', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if not patente:
        errors.append('La patente es obligatoria')
    elif Vehiculo.objects.filter(patente=patente).exists():
        errors.append('Ya existe un vehículo con esa patente')
    
    if not tipo or tipo not in [choice[0] for choice in Vehiculo.TIPO_CHOICES]:
        errors.append('Tipo de vehículo inválido')
    
    if not marca:
        errors.append('La marca es obligatoria')
    
    if not modelo:
        errors.append('El modelo es obligatorio')
    
    año_int = None
    if not año:
        errors.append('El año es obligatorio')
    else:
        try:
            año_int = int(año)
            año_actual = timezone.now().year
            if año_int < 1900 or año_int > año_actual + 1:
                errors.append(f'El año debe estar entre 1900 y {año_actual + 1}')
        except (ValueError, TypeError):
            errors.append('El año debe ser un número válido')
    
    kilometraje = 0
    if kilometraje_actual:
        try:
            kilometraje = int(kilometraje_actual)
            if kilometraje < 0:
                errors.append('El kilometraje no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El kilometraje debe ser un número válido')
    
    if estado not in [choice[0] for choice in Vehiculo.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    fecha_mant = None
    if fecha_ultimo_mantenimiento:
        try:
            from datetime import datetime
            fecha_mant = datetime.strptime(fecha_ultimo_mantenimiento, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de último mantenimiento inválida')
    
    prox_mant_km = None
    if proximo_mantenimiento_km:
        try:
            prox_mant_km = int(proximo_mantenimiento_km)
            if prox_mant_km < 0:
                errors.append('El próximo mantenimiento en km no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El próximo mantenimiento en km debe ser un número válido')
    
    seguro_venc = None
    if seguro_vencimiento:
        try:
            from datetime import datetime
            seguro_venc = datetime.strptime(seguro_vencimiento, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de vencimiento de seguro inválida')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        vehiculo = Vehiculo.objects.create(
            patente=patente,
            tipo=tipo,
            marca=marca,
            modelo=modelo,
            año=año_int,
            color=color or None,
            kilometraje_actual=kilometraje,
            estado=estado,
            fecha_ultimo_mantenimiento=fecha_mant,
            proximo_mantenimiento_km=prox_mant_km,
            seguro_vencimiento=seguro_venc,
            observaciones=observaciones or None,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Vehículo "{vehiculo.patente}" creado correctamente.',
            'vehiculo_id': vehiculo.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el vehículo: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def vehiculo_update_json(request, vehiculo_id: int):
    """
    Actualiza un vehículo existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
    except Vehiculo.DoesNotExist:
        return JsonResponse({'error': 'Vehículo no encontrado'}, status=404)

    patente = request.POST.get('patente', '').strip().upper()
    tipo = request.POST.get('tipo', '').strip()
    marca = request.POST.get('marca', '').strip()
    modelo = request.POST.get('modelo', '').strip()
    año = request.POST.get('año', '').strip()
    color = request.POST.get('color', '').strip()
    kilometraje_actual = request.POST.get('kilometraje_actual', '').strip()
    estado = request.POST.get('estado', '').strip()
    fecha_ultimo_mantenimiento = request.POST.get('fecha_ultimo_mantenimiento', '').strip()
    proximo_mantenimiento_km = request.POST.get('proximo_mantenimiento_km', '').strip()
    seguro_vencimiento = request.POST.get('seguro_vencimiento', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if patente and patente != vehiculo.patente:
        if Vehiculo.objects.filter(patente=patente).exists():
            errors.append('Ya existe un vehículo con esa patente')
    
    if tipo and tipo not in [choice[0] for choice in Vehiculo.TIPO_CHOICES]:
        errors.append('Tipo de vehículo inválido')
    
    if estado and estado not in [choice[0] for choice in Vehiculo.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    año_int = None
    if año:
        try:
            año_int = int(año)
            año_actual = timezone.now().year
            if año_int < 1900 or año_int > año_actual + 1:
                errors.append(f'El año debe estar entre 1900 y {año_actual + 1}')
        except (ValueError, TypeError):
            errors.append('El año debe ser un número válido')
    
    kilometraje = None
    if kilometraje_actual:
        try:
            kilometraje = int(kilometraje_actual)
            if kilometraje < 0:
                errors.append('El kilometraje no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El kilometraje debe ser un número válido')
    
    fecha_mant = None
    if fecha_ultimo_mantenimiento:
        try:
            from datetime import datetime
            fecha_mant = datetime.strptime(fecha_ultimo_mantenimiento, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de último mantenimiento inválida')
    
    prox_mant_km = None
    if proximo_mantenimiento_km:
        try:
            prox_mant_km = int(proximo_mantenimiento_km)
            if prox_mant_km < 0:
                errors.append('El próximo mantenimiento en km no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El próximo mantenimiento en km debe ser un número válido')
    
    seguro_venc = None
    if seguro_vencimiento:
        try:
            from datetime import datetime
            seguro_venc = datetime.strptime(seguro_vencimiento, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de vencimiento de seguro inválida')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        if patente:
            vehiculo.patente = patente
        if tipo:
            vehiculo.tipo = tipo
        if marca:
            vehiculo.marca = marca
        if modelo:
            vehiculo.modelo = modelo
        if año_int:
            vehiculo.año = año_int
        if color is not None:
            vehiculo.color = color or None
        if kilometraje is not None:
            vehiculo.kilometraje_actual = kilometraje
        if estado:
            vehiculo.estado = estado
        if fecha_mant is not None:
            vehiculo.fecha_ultimo_mantenimiento = fecha_mant
        if proximo_mantenimiento_km is not None:
            vehiculo.proximo_mantenimiento_km = prox_mant_km if prox_mant_km else None
        if seguro_vencimiento is not None:
            vehiculo.seguro_vencimiento = seguro_venc if seguro_venc else None
        if observaciones is not None:
            vehiculo.observaciones = observaciones or None
        
        vehiculo.save()
        
        return JsonResponse({
            'success': True, 
            'message': f'Vehículo "{vehiculo.patente}" actualizado correctamente.',
            'vehiculo_id': vehiculo.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el vehículo: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def vehiculo_delete_json(request, vehiculo_id: int):
    """
    Elimina un vehículo
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
    except Vehiculo.DoesNotExist:
        return JsonResponse({'error': 'Vehículo no encontrado'}, status=404)

    try:
        patente = vehiculo.patente
        vehiculo.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Vehículo "{patente}" eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el vehículo: {str(e)}']
        }, status=500)


# ========== CRUD DE GASTOS OPERATIVOS ==========

@login_required
def gastos_list(request):
    """
    Lista todos los gastos operativos con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    categoria_filter = request.GET.get('categoria', '').strip()
    fecha_desde = request.GET.get('fecha_desde', '').strip()
    fecha_hasta = request.GET.get('fecha_hasta', '').strip()
    
    order_by = request.GET.get('order_by', 'fecha_gasto').strip()
    direction = request.GET.get('direction', 'desc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'fecha_gasto': 'fecha_gasto',
        'monto': 'monto',
        'categoria': 'categoria',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'fecha_gasto'
    
    if direction not in ['asc', 'desc']:
        direction = 'desc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = GastoOperativo.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(descripcion__icontains=query) |
            Q(observaciones__icontains=query)
        )
    
    if categoria_filter:
        base_qs = base_qs.filter(categoria=categoria_filter)
    
    if fecha_desde:
        try:
            from datetime import datetime
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            base_qs = base_qs.filter(fecha_gasto__gte=fecha_desde_obj)
        except ValueError:
            pass
    
    if fecha_hasta:
        try:
            from datetime import datetime
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            base_qs = base_qs.filter(fecha_gasto__lte=fecha_hasta_obj)
        except ValueError:
            pass

    # Calcular totales
    from django.db.models import Sum
    total_gastos = base_qs.aggregate(total=Sum('monto'))['total'] or 0

    return render(request, 'jio_app/gastos_list.html', {
        'gastos': base_qs,
        'query': query,
        'categoria_filter': categoria_filter,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'order_by': order_by,
        'direction': direction,
        'total_gastos': total_gastos,
        'categoria_choices': GastoOperativo.CATEGORIA_CHOICES,
        'metodo_pago_choices': GastoOperativo.METODO_PAGO_CHOICES,
        'vehiculos': Vehiculo.objects.all(),
        'reservas': Reserva.objects.all()[:100],  # Limitar para no sobrecargar
    })


@login_required
@require_http_methods(["GET"])
def gasto_detail_json(request, gasto_id: int):
    """
    Obtiene los detalles de un gasto en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        gasto = GastoOperativo.objects.get(id=gasto_id)
        comprobante_url = request.build_absolute_uri(gasto.comprobante.url) if gasto.comprobante else ''
        
        return JsonResponse({
            'id': gasto.id,
            'categoria': gasto.categoria,
            'descripcion': gasto.descripcion,
            'monto': float(gasto.monto),
            'fecha_gasto': gasto.fecha_gasto.strftime('%Y-%m-%d'),
            'metodo_pago': gasto.metodo_pago,
            'comprobante': comprobante_url,
            'vehiculo_id': gasto.vehiculo.id if gasto.vehiculo else None,
            'reserva_id': gasto.reserva.id if gasto.reserva else None,
            'observaciones': gasto.observaciones or '',
            'categoria_choices': GastoOperativo.CATEGORIA_CHOICES,
            'metodo_pago_choices': GastoOperativo.METODO_PAGO_CHOICES,
        })
    except GastoOperativo.DoesNotExist:
        return JsonResponse({'error': 'Gasto no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def gasto_create_json(request):
    """
    Crea un nuevo gasto operativo
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    categoria = request.POST.get('categoria', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    monto = request.POST.get('monto', '').strip()
    fecha_gasto = request.POST.get('fecha_gasto', '').strip()
    metodo_pago = request.POST.get('metodo_pago', '').strip()
    comprobante = request.FILES.get('comprobante')
    vehiculo_id = request.POST.get('vehiculo_id', '').strip()
    reserva_id = request.POST.get('reserva_id', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if not categoria or categoria not in [choice[0] for choice in GastoOperativo.CATEGORIA_CHOICES]:
        errors.append('Categoría inválida o no seleccionada')
    
    if not descripcion:
        errors.append('La descripción es obligatoria')
    elif len(descripcion) > 200:
        errors.append('La descripción no puede exceder 200 caracteres')
    
    monto_decimal = None
    if not monto:
        errors.append('El monto es obligatorio')
    else:
        try:
            monto_decimal = Decimal(monto)
            if monto_decimal <= 0:
                errors.append('El monto debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El monto debe ser un número válido')
    
    fecha_obj = None
    if not fecha_gasto:
        errors.append('La fecha del gasto es obligatoria')
    else:
        try:
            from datetime import datetime
            fecha_obj = datetime.strptime(fecha_gasto, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha inválida. Use el formato YYYY-MM-DD')
    
    if not metodo_pago or metodo_pago not in [choice[0] for choice in GastoOperativo.METODO_PAGO_CHOICES]:
        errors.append('Método de pago inválido o no seleccionado')
    
    vehiculo = None
    if vehiculo_id:
        try:
            vehiculo = Vehiculo.objects.get(id=int(vehiculo_id))
        except (Vehiculo.DoesNotExist, ValueError):
            errors.append('Vehículo no encontrado')
    
    reserva = None
    if reserva_id:
        try:
            reserva = Reserva.objects.get(id=int(reserva_id))
        except (Reserva.DoesNotExist, ValueError):
            errors.append('Reserva no encontrada')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        gasto = GastoOperativo.objects.create(
            categoria=categoria,
            descripcion=descripcion,
            monto=monto_decimal,
            fecha_gasto=fecha_obj,
            metodo_pago=metodo_pago,
            comprobante=comprobante if comprobante else None,
            vehiculo=vehiculo,
            reserva=reserva,
            observaciones=observaciones or None,
            registrado_por=request.user,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Gasto operativo creado correctamente.',
            'gasto_id': gasto.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el gasto: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def gasto_update_json(request, gasto_id: int):
    """
    Actualiza un gasto operativo existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        gasto = GastoOperativo.objects.get(id=gasto_id)
    except GastoOperativo.DoesNotExist:
        return JsonResponse({'error': 'Gasto no encontrado'}, status=404)

    categoria = request.POST.get('categoria', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    monto = request.POST.get('monto', '').strip()
    fecha_gasto = request.POST.get('fecha_gasto', '').strip()
    metodo_pago = request.POST.get('metodo_pago', '').strip()
    comprobante = request.FILES.get('comprobante')
    eliminar_comprobante = request.POST.get('eliminar_comprobante', 'false').lower() == 'true'
    vehiculo_id = request.POST.get('vehiculo_id', '').strip()
    reserva_id = request.POST.get('reserva_id', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if categoria and categoria not in [choice[0] for choice in GastoOperativo.CATEGORIA_CHOICES]:
        errors.append('Categoría inválida')
    
    if descripcion and len(descripcion) > 200:
        errors.append('La descripción no puede exceder 200 caracteres')
    
    monto_decimal = None
    if monto:
        try:
            monto_decimal = Decimal(monto)
            if monto_decimal <= 0:
                errors.append('El monto debe ser mayor a 0')
        except (ValueError, TypeError):
            errors.append('El monto debe ser un número válido')
    
    fecha_obj = None
    if fecha_gasto:
        try:
            from datetime import datetime
            fecha_obj = datetime.strptime(fecha_gasto, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha inválida. Use el formato YYYY-MM-DD')
    
    if metodo_pago and metodo_pago not in [choice[0] for choice in GastoOperativo.METODO_PAGO_CHOICES]:
        errors.append('Método de pago inválido')
    
    vehiculo = None
    if vehiculo_id:
        try:
            vehiculo = Vehiculo.objects.get(id=int(vehiculo_id))
        except (Vehiculo.DoesNotExist, ValueError):
            errors.append('Vehículo no encontrado')
    elif vehiculo_id == '':
        vehiculo = None
    
    reserva = None
    if reserva_id:
        try:
            reserva = Reserva.objects.get(id=int(reserva_id))
        except (Reserva.DoesNotExist, ValueError):
            errors.append('Reserva no encontrada')
    elif reserva_id == '':
        reserva = None

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        if categoria:
            gasto.categoria = categoria
        if descripcion:
            gasto.descripcion = descripcion
        if monto_decimal is not None:
            gasto.monto = monto_decimal
        if fecha_obj:
            gasto.fecha_gasto = fecha_obj
        if metodo_pago:
            gasto.metodo_pago = metodo_pago
        if comprobante:
            gasto.comprobante = comprobante
        if eliminar_comprobante and gasto.comprobante:
            gasto.comprobante.delete()
            gasto.comprobante = None
        if vehiculo_id is not None:
            gasto.vehiculo = vehiculo
        if reserva_id is not None:
            gasto.reserva = reserva
        if observaciones is not None:
            gasto.observaciones = observaciones or None
        
        gasto.save()
        
        return JsonResponse({
            'success': True, 
            'message': f'Gasto operativo actualizado correctamente.',
            'gasto_id': gasto.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el gasto: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def gasto_delete_json(request, gasto_id: int):
    """
    Elimina un gasto operativo
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        gasto = GastoOperativo.objects.get(id=gasto_id)
    except GastoOperativo.DoesNotExist:
        return JsonResponse({'error': 'Gasto no encontrado'}, status=404)

    try:
        gasto_id_str = str(gasto.id)
        gasto.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Gasto #{gasto_id_str} eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el gasto: {str(e)}']
        }, status=500)


# ========== CRUD DE PROMOCIONES ==========

@login_required
def promociones_list(request):
    """
    Lista todas las promociones con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    order_by = request.GET.get('order_by', 'fecha_creacion').strip()
    direction = request.GET.get('direction', 'desc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'codigo': 'codigo',
        'nombre': 'nombre',
        'fecha_inicio': 'fecha_inicio',
        'fecha_fin': 'fecha_fin',
        'estado': 'estado',
        'fecha_creacion': 'fecha_creacion',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'fecha_creacion'
    
    if direction not in ['asc', 'desc']:
        direction = 'desc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Promocion.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(codigo__icontains=query) |
            Q(nombre__icontains=query) |
            Q(descripcion__icontains=query)
        )
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)

    return render(request, 'jio_app/promociones_list.html', {
        'promociones': base_qs,
        'query': query,
        'estado_filter': estado_filter,
        'order_by': order_by,
        'direction': direction,
        'tipo_descuento_choices': Promocion.TIPO_DESCUENTO_CHOICES,
        'estado_choices': Promocion.ESTADO_CHOICES,
        'juegos': Juego.objects.filter(estado='Habilitado'),
    })


@login_required
@require_http_methods(["GET"])
def promocion_detail_json(request, promocion_id: int):
    """
    Obtiene los detalles de una promoción en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        promocion = Promocion.objects.get(id=promocion_id)
        juegos_ids = list(promocion.juegos.values_list('id', flat=True))
        
        return JsonResponse({
            'id': promocion.id,
            'codigo': promocion.codigo,
            'nombre': promocion.nombre,
            'descripcion': promocion.descripcion or '',
            'tipo_descuento': promocion.tipo_descuento,
            'valor_descuento': float(promocion.valor_descuento),
            'fecha_inicio': promocion.fecha_inicio.strftime('%Y-%m-%d'),
            'fecha_fin': promocion.fecha_fin.strftime('%Y-%m-%d'),
            'juegos_ids': juegos_ids,
            'monto_minimo': float(promocion.monto_minimo),
            'limite_usos': promocion.limite_usos,
            'usos_actuales': promocion.usos_actuales,
            'estado': promocion.estado,
            'tipo_descuento_choices': Promocion.TIPO_DESCUENTO_CHOICES,
            'estado_choices': Promocion.ESTADO_CHOICES,
        })
    except Promocion.DoesNotExist:
        return JsonResponse({'error': 'Promoción no encontrada'}, status=404)


@login_required
@require_http_methods(["POST"])
def promocion_create_json(request):
    """
    Crea una nueva promoción
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    codigo = request.POST.get('codigo', '').strip().upper()
    nombre = request.POST.get('nombre', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    tipo_descuento = request.POST.get('tipo_descuento', '').strip()
    valor_descuento = request.POST.get('valor_descuento', '').strip()
    fecha_inicio = request.POST.get('fecha_inicio', '').strip()
    fecha_fin = request.POST.get('fecha_fin', '').strip()
    juegos_ids = request.POST.getlist('juegos_ids[]') or request.POST.getlist('juegos_ids')
    monto_minimo = request.POST.get('monto_minimo', '0').strip()
    limite_usos = request.POST.get('limite_usos', '0').strip()
    estado = request.POST.get('estado', 'activa').strip()

    errors = []
    
    if not codigo:
        errors.append('El código es obligatorio')
    elif Promocion.objects.filter(codigo=codigo).exists():
        errors.append('Ya existe una promoción con ese código')
    
    if not nombre:
        errors.append('El nombre es obligatorio')
    elif len(nombre) > 100:
        errors.append('El nombre no puede exceder 100 caracteres')
    
    if not tipo_descuento or tipo_descuento not in [choice[0] for choice in Promocion.TIPO_DESCUENTO_CHOICES]:
        errors.append('Tipo de descuento inválido o no seleccionado')
    
    valor_decimal = None
    if not valor_descuento:
        errors.append('El valor del descuento es obligatorio')
    else:
        try:
            valor_decimal = Decimal(valor_descuento)
            if valor_decimal < 0:
                errors.append('El valor del descuento no puede ser negativo')
            if tipo_descuento == 'porcentaje' and valor_decimal > 100:
                errors.append('El porcentaje no puede ser mayor a 100%')
        except (ValueError, TypeError):
            errors.append('El valor del descuento debe ser un número válido')
    
    fecha_inicio_obj = None
    if not fecha_inicio:
        errors.append('La fecha de inicio es obligatoria')
    else:
        try:
            from datetime import datetime
            fecha_inicio_obj = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de inicio inválida. Use el formato YYYY-MM-DD')
    
    fecha_fin_obj = None
    if not fecha_fin:
        errors.append('La fecha de fin es obligatoria')
    else:
        try:
            from datetime import datetime
            fecha_fin_obj = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de fin inválida. Use el formato YYYY-MM-DD')
    
    if fecha_inicio_obj and fecha_fin_obj and fecha_fin_obj < fecha_inicio_obj:
        errors.append('La fecha de fin debe ser posterior a la fecha de inicio')
    
    monto_min_decimal = Decimal('0')
    if monto_minimo:
        try:
            monto_min_decimal = Decimal(monto_minimo)
            if monto_min_decimal < 0:
                errors.append('El monto mínimo no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El monto mínimo debe ser un número válido')
    
    limite_usos_int = 0
    if limite_usos:
        try:
            limite_usos_int = int(limite_usos)
            if limite_usos_int < 0:
                errors.append('El límite de usos no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El límite de usos debe ser un número válido')
    
    if estado not in [choice[0] for choice in Promocion.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    juegos_validos = []
    if juegos_ids:
        for juego_id in juegos_ids:
            try:
                juego = Juego.objects.get(id=int(juego_id))
                juegos_validos.append(juego)
            except (Juego.DoesNotExist, ValueError):
                errors.append(f'Juego con ID {juego_id} no encontrado')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        promocion = Promocion.objects.create(
            codigo=codigo,
            nombre=nombre,
            descripcion=descripcion or None,
            tipo_descuento=tipo_descuento,
            valor_descuento=valor_decimal,
            fecha_inicio=fecha_inicio_obj,
            fecha_fin=fecha_fin_obj,
            monto_minimo=monto_min_decimal,
            limite_usos=limite_usos_int,
            estado=estado,
        )
        
        # Asignar juegos si se proporcionaron
        if juegos_validos:
            promocion.juegos.set(juegos_validos)
        
        return JsonResponse({
            'success': True, 
            'message': f'Promoción "{promocion.codigo}" creada correctamente.',
            'promocion_id': promocion.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear la promoción: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def promocion_update_json(request, promocion_id: int):
    """
    Actualiza una promoción existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        promocion = Promocion.objects.get(id=promocion_id)
    except Promocion.DoesNotExist:
        return JsonResponse({'error': 'Promoción no encontrada'}, status=404)

    codigo = request.POST.get('codigo', '').strip().upper()
    nombre = request.POST.get('nombre', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    tipo_descuento = request.POST.get('tipo_descuento', '').strip()
    valor_descuento = request.POST.get('valor_descuento', '').strip()
    fecha_inicio = request.POST.get('fecha_inicio', '').strip()
    fecha_fin = request.POST.get('fecha_fin', '').strip()
    juegos_ids = request.POST.getlist('juegos_ids[]') or request.POST.getlist('juegos_ids')
    monto_minimo = request.POST.get('monto_minimo', '').strip()
    limite_usos = request.POST.get('limite_usos', '').strip()
    estado = request.POST.get('estado', '').strip()

    errors = []
    
    if codigo and codigo != promocion.codigo:
        if Promocion.objects.filter(codigo=codigo).exists():
            errors.append('Ya existe una promoción con ese código')
    
    if nombre and len(nombre) > 100:
        errors.append('El nombre no puede exceder 100 caracteres')
    
    if tipo_descuento and tipo_descuento not in [choice[0] for choice in Promocion.TIPO_DESCUENTO_CHOICES]:
        errors.append('Tipo de descuento inválido')
    
    valor_decimal = None
    if valor_descuento:
        try:
            valor_decimal = Decimal(valor_descuento)
            if valor_decimal < 0:
                errors.append('El valor del descuento no puede ser negativo')
            tipo_desc = tipo_descuento or promocion.tipo_descuento
            if tipo_desc == 'porcentaje' and valor_decimal > 100:
                errors.append('El porcentaje no puede ser mayor a 100%')
        except (ValueError, TypeError):
            errors.append('El valor del descuento debe ser un número válido')
    
    fecha_inicio_obj = None
    if fecha_inicio:
        try:
            from datetime import datetime
            fecha_inicio_obj = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de inicio inválida. Use el formato YYYY-MM-DD')
    
    fecha_fin_obj = None
    if fecha_fin:
        try:
            from datetime import datetime
            fecha_fin_obj = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de fin inválida. Use el formato YYYY-MM-DD')
    
    if fecha_inicio_obj and fecha_fin_obj and fecha_fin_obj < fecha_inicio_obj:
        errors.append('La fecha de fin debe ser posterior a la fecha de inicio')
    
    monto_min_decimal = None
    if monto_minimo:
        try:
            monto_min_decimal = Decimal(monto_minimo)
            if monto_min_decimal < 0:
                errors.append('El monto mínimo no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El monto mínimo debe ser un número válido')
    
    limite_usos_int = None
    if limite_usos:
        try:
            limite_usos_int = int(limite_usos)
            if limite_usos_int < 0:
                errors.append('El límite de usos no puede ser negativo')
        except (ValueError, TypeError):
            errors.append('El límite de usos debe ser un número válido')
    
    if estado and estado not in [choice[0] for choice in Promocion.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    juegos_validos = []
    if juegos_ids:
        for juego_id in juegos_ids:
            try:
                juego = Juego.objects.get(id=int(juego_id))
                juegos_validos.append(juego)
            except (Juego.DoesNotExist, ValueError):
                errors.append(f'Juego con ID {juego_id} no encontrado')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        if codigo:
            promocion.codigo = codigo
        if nombre:
            promocion.nombre = nombre
        if descripcion is not None:
            promocion.descripcion = descripcion or None
        if tipo_descuento:
            promocion.tipo_descuento = tipo_descuento
        if valor_decimal is not None:
            promocion.valor_descuento = valor_decimal
        if fecha_inicio_obj:
            promocion.fecha_inicio = fecha_inicio_obj
        if fecha_fin_obj:
            promocion.fecha_fin = fecha_fin_obj
        if monto_min_decimal is not None:
            promocion.monto_minimo = monto_min_decimal
        if limite_usos_int is not None:
            promocion.limite_usos = limite_usos_int
        if estado:
            promocion.estado = estado
        
        promocion.save()
        
        # Actualizar juegos si se proporcionaron
        # Si juegos_ids es una lista vacía o contiene solo strings vacíos, limpiar
        if juegos_ids is not None:
            juegos_ids_clean = [j for j in juegos_ids if j and j.strip()]
            if juegos_ids_clean and juegos_validos:
                promocion.juegos.set(juegos_validos)
            elif not juegos_ids_clean:
                promocion.juegos.clear()
        
        return JsonResponse({
            'success': True, 
            'message': f'Promoción "{promocion.codigo}" actualizada correctamente.',
            'promocion_id': promocion.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar la promoción: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def promocion_delete_json(request, promocion_id: int):
    """
    Elimina una promoción
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        promocion = Promocion.objects.get(id=promocion_id)
    except Promocion.DoesNotExist:
        return JsonResponse({'error': 'Promoción no encontrada'}, status=404)

    try:
        codigo = promocion.codigo
        promocion.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Promoción "{codigo}" eliminada correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar la promoción: {str(e)}']
        }, status=500)


# ========== CRUD DE EVALUACIONES ==========

@login_required
def evaluaciones_list(request):
    """
    Lista todas las evaluaciones con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    calificacion_filter = request.GET.get('calificacion', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    order_by = request.GET.get('order_by', 'fecha_evaluacion').strip()
    direction = request.GET.get('direction', 'desc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'fecha_evaluacion': 'fecha_evaluacion',
        'calificacion': 'calificacion',
        'estado': 'estado',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'fecha_evaluacion'
    
    if direction not in ['asc', 'desc']:
        direction = 'desc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Evaluacion.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(cliente__usuario__first_name__icontains=query) |
            Q(cliente__usuario__last_name__icontains=query) |
            Q(comentario__icontains=query)
        )
    
    if calificacion_filter:
        try:
            base_qs = base_qs.filter(calificacion=int(calificacion_filter))
        except ValueError:
            pass
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)

    # Calcular promedio
    from django.db.models import Avg
    promedio = base_qs.aggregate(avg=Avg('calificacion'))['avg'] or 0

    return render(request, 'jio_app/evaluaciones_list.html', {
        'evaluaciones': base_qs,
        'query': query,
        'calificacion_filter': calificacion_filter,
        'estado_filter': estado_filter,
        'order_by': order_by,
        'direction': direction,
        'promedio': round(promedio, 2),
        'calificacion_choices': Evaluacion.CALIFICACION_CHOICES,
        'estado_choices': Evaluacion.ESTADO_CHOICES,
        'reservas': Reserva.objects.all()[:100],  # Limitar para no sobrecargar
    })


@login_required
@require_http_methods(["GET"])
def evaluacion_detail_json(request, evaluacion_id: int):
    """
    Obtiene los detalles de una evaluación en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        evaluacion = Evaluacion.objects.get(id=evaluacion_id)
        
        return JsonResponse({
            'id': evaluacion.id,
            'reserva_id': evaluacion.reserva.id,
            'cliente_id': evaluacion.cliente.id,
            'cliente_nombre': evaluacion.cliente.usuario.get_full_name(),
            'calificacion': evaluacion.calificacion,
            'comentario': evaluacion.comentario or '',
            'estado': evaluacion.estado,
            'respuesta_admin': evaluacion.respuesta_admin or '',
            'calificacion_choices': Evaluacion.CALIFICACION_CHOICES,
            'estado_choices': Evaluacion.ESTADO_CHOICES,
        })
    except Evaluacion.DoesNotExist:
        return JsonResponse({'error': 'Evaluación no encontrada'}, status=404)


@login_required
@require_http_methods(["POST"])
def evaluacion_create_json(request):
    """
    Crea una nueva evaluación
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    reserva_id = request.POST.get('reserva_id', '').strip()
    cliente_id = request.POST.get('cliente_id', '').strip()
    calificacion = request.POST.get('calificacion', '').strip()
    comentario = request.POST.get('comentario', '').strip()
    estado = request.POST.get('estado', 'pendiente').strip()

    errors = []
    
    if not reserva_id:
        errors.append('La reserva es obligatoria')
    else:
        try:
            reserva = Reserva.objects.get(id=int(reserva_id))
        except (Reserva.DoesNotExist, ValueError):
            errors.append('Reserva no encontrada')
    
    if not cliente_id:
        errors.append('El cliente es obligatorio')
    else:
        try:
            cliente = Cliente.objects.get(id=int(cliente_id))
        except (Cliente.DoesNotExist, ValueError):
            errors.append('Cliente no encontrado')
    
    calificacion_int = None
    if not calificacion:
        errors.append('La calificación es obligatoria')
    else:
        try:
            calificacion_int = int(calificacion)
            if calificacion_int < 1 or calificacion_int > 5:
                errors.append('La calificación debe estar entre 1 y 5')
        except (ValueError, TypeError):
            errors.append('La calificación debe ser un número válido')
    
    if estado not in [choice[0] for choice in Evaluacion.ESTADO_CHOICES]:
        errors.append('Estado inválido')
    
    # Verificar que no exista ya una evaluación para esta reserva y cliente
    if reserva_id and cliente_id:
        try:
            reserva = Reserva.objects.get(id=int(reserva_id))
            cliente = Cliente.objects.get(id=int(cliente_id))
            if Evaluacion.objects.filter(reserva=reserva, cliente=cliente).exists():
                errors.append('Ya existe una evaluación para esta reserva y cliente')
        except (Reserva.DoesNotExist, Cliente.DoesNotExist):
            pass

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        reserva = Reserva.objects.get(id=int(reserva_id))
        cliente = Cliente.objects.get(id=int(cliente_id))
        
        evaluacion = Evaluacion.objects.create(
            reserva=reserva,
            cliente=cliente,
            calificacion=calificacion_int,
            comentario=comentario or None,
            estado=estado,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Evaluación creada correctamente.',
            'evaluacion_id': evaluacion.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear la evaluación: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def evaluacion_update_json(request, evaluacion_id: int):
    """
    Actualiza una evaluación existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        evaluacion = Evaluacion.objects.get(id=evaluacion_id)
    except Evaluacion.DoesNotExist:
        return JsonResponse({'error': 'Evaluación no encontrada'}, status=404)

    calificacion = request.POST.get('calificacion', '').strip()
    comentario = request.POST.get('comentario', '').strip()
    estado = request.POST.get('estado', '').strip()
    respuesta_admin = request.POST.get('respuesta_admin', '').strip()

    errors = []
    
    calificacion_int = None
    if calificacion:
        try:
            calificacion_int = int(calificacion)
            if calificacion_int < 1 or calificacion_int > 5:
                errors.append('La calificación debe estar entre 1 y 5')
        except (ValueError, TypeError):
            errors.append('La calificación debe ser un número válido')
    
    if estado and estado not in [choice[0] for choice in Evaluacion.ESTADO_CHOICES]:
        errors.append('Estado inválido')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        if calificacion_int is not None:
            evaluacion.calificacion = calificacion_int
        if comentario is not None:
            evaluacion.comentario = comentario or None
        if estado:
            evaluacion.estado = estado
        if respuesta_admin is not None:
            evaluacion.respuesta_admin = respuesta_admin or None
        
        evaluacion.save()
        
        return JsonResponse({
            'success': True, 
            'message': f'Evaluación actualizada correctamente.',
            'evaluacion_id': evaluacion.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar la evaluación: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def evaluacion_delete_json(request, evaluacion_id: int):
    """
    Elimina una evaluación
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        evaluacion = Evaluacion.objects.get(id=evaluacion_id)
    except Evaluacion.DoesNotExist:
        return JsonResponse({'error': 'Evaluación no encontrada'}, status=404)

    try:
        evaluacion_id_str = str(evaluacion.id)
        evaluacion.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Evaluación #{evaluacion_id_str} eliminada correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar la evaluación: {str(e)}']
        }, status=500)


# ========== CRUD DE MANTENIMIENTO DE VEHÍCULOS ==========

@login_required
def mantenimientos_list(request):
    """
    Lista todos los mantenimientos con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    vehiculo_filter = request.GET.get('vehiculo', '').strip()
    tipo_filter = request.GET.get('tipo', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    order_by = request.GET.get('order_by', 'fecha_programada').strip()
    direction = request.GET.get('direction', 'desc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'fecha_programada': 'fecha_programada',
        'fecha_realizada': 'fecha_realizada',
        'costo': 'costo',
        'tipo_mantenimiento': 'tipo_mantenimiento',
        'estado': 'estado',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'fecha_programada'
    
    if direction not in ['asc', 'desc']:
        direction = 'desc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = MantenimientoVehiculo.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(descripcion__icontains=query) |
            Q(observaciones__icontains=query) |
            Q(vehiculo__patente__icontains=query)
        )
    
    if vehiculo_filter:
        try:
            base_qs = base_qs.filter(vehiculo_id=int(vehiculo_filter))
        except ValueError:
            pass
    
    if tipo_filter:
        base_qs = base_qs.filter(tipo_mantenimiento=tipo_filter)
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)

    return render(request, 'jio_app/mantenimientos_list.html', {
        'mantenimientos': base_qs,
        'query': query,
        'vehiculo_filter': vehiculo_filter,
        'tipo_filter': tipo_filter,
        'estado_filter': estado_filter,
        'order_by': order_by,
        'direction': direction,
        'tipo_choices': MantenimientoVehiculo.TIPO_MANTENIMIENTO_CHOICES,
        'estado_choices': MantenimientoVehiculo.ESTADO_CHOICES,
        'vehiculos': Vehiculo.objects.all().order_by('patente'),
        'proveedores': Proveedor.objects.filter(activo=True).order_by('nombre'),
    })


@login_required
@require_http_methods(["GET"])
def mantenimiento_detail_json(request, mantenimiento_id: int):
    """
    Obtiene los detalles de un mantenimiento en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        mantenimiento = MantenimientoVehiculo.objects.get(id=mantenimiento_id)
        
        return JsonResponse({
            'id': mantenimiento.id,
            'vehiculo_id': mantenimiento.vehiculo.id,
            'tipo_mantenimiento': mantenimiento.tipo_mantenimiento,
            'fecha_programada': mantenimiento.fecha_programada.strftime('%Y-%m-%d'),
            'fecha_realizada': mantenimiento.fecha_realizada.strftime('%Y-%m-%d') if mantenimiento.fecha_realizada else '',
            'kilometraje': mantenimiento.kilometraje,
            'descripcion': mantenimiento.descripcion,
            'costo': str(mantenimiento.costo),
            'proveedor_id': mantenimiento.proveedor.id if mantenimiento.proveedor else None,
            'observaciones': mantenimiento.observaciones or '',
            'estado': mantenimiento.estado,
            'realizado_por_id': mantenimiento.realizado_por.id if mantenimiento.realizado_por else None,
            'tipo_choices': MantenimientoVehiculo.TIPO_MANTENIMIENTO_CHOICES,
            'estado_choices': MantenimientoVehiculo.ESTADO_CHOICES,
        })
    except MantenimientoVehiculo.DoesNotExist:
        return JsonResponse({'error': 'Mantenimiento no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def mantenimiento_create_json(request):
    """
    Crea un nuevo mantenimiento
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    vehiculo_id = request.POST.get('vehiculo_id', '').strip()
    tipo_mantenimiento = request.POST.get('tipo_mantenimiento', '').strip()
    fecha_programada = request.POST.get('fecha_programada', '').strip()
    fecha_realizada = request.POST.get('fecha_realizada', '').strip()
    kilometraje = request.POST.get('kilometraje', '0').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    costo = request.POST.get('costo', '0').strip()
    proveedor_id = request.POST.get('proveedor_id', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()
    estado = request.POST.get('estado', 'programado').strip()

    errors = []
    
    if not vehiculo_id:
        errors.append('El vehículo es obligatorio')
    else:
        try:
            vehiculo = Vehiculo.objects.get(id=int(vehiculo_id))
        except (ValueError, Vehiculo.DoesNotExist):
            errors.append('Vehículo no válido')
    
    if not tipo_mantenimiento or tipo_mantenimiento not in [choice[0] for choice in MantenimientoVehiculo.TIPO_MANTENIMIENTO_CHOICES]:
        errors.append('Tipo de mantenimiento inválido')
    
    if not fecha_programada:
        errors.append('La fecha programada es obligatoria')
    
    if not descripcion:
        errors.append('La descripción es obligatoria')
    
    kilometraje_int = 0
    if kilometraje:
        try:
            kilometraje_int = int(kilometraje)
            if kilometraje_int < 0:
                errors.append('El kilometraje debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Kilometraje inválido')
    
    costo_decimal = 0
    if costo:
        try:
            costo_decimal = float(costo)
            if costo_decimal < 0:
                errors.append('El costo debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Costo inválido')
    
    fecha_prog = None
    if fecha_programada:
        try:
            from datetime import datetime
            fecha_prog = datetime.strptime(fecha_programada, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha programada inválida')
    
    fecha_real = None
    if fecha_realizada:
        try:
            from datetime import datetime
            fecha_real = datetime.strptime(fecha_realizada, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha realizada inválida')
    
    proveedor_obj = None
    if proveedor_id:
        try:
            proveedor_obj = Proveedor.objects.get(id=int(proveedor_id))
        except (ValueError, Proveedor.DoesNotExist):
            pass

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        mantenimiento = MantenimientoVehiculo.objects.create(
            vehiculo=vehiculo,
            tipo_mantenimiento=tipo_mantenimiento,
            fecha_programada=fecha_prog,
            fecha_realizada=fecha_real,
            kilometraje=kilometraje_int,
            descripcion=descripcion,
            costo=costo_decimal,
            proveedor=proveedor_obj,
            observaciones=observaciones or None,
            estado=estado,
            realizado_por=request.user,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Mantenimiento #{mantenimiento.id} creado correctamente.',
            'mantenimiento_id': mantenimiento.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el mantenimiento: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def mantenimiento_update_json(request, mantenimiento_id: int):
    """
    Actualiza un mantenimiento existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        mantenimiento = MantenimientoVehiculo.objects.get(id=mantenimiento_id)
    except MantenimientoVehiculo.DoesNotExist:
        return JsonResponse({'error': 'Mantenimiento no encontrado'}, status=404)

    vehiculo_id = request.POST.get('vehiculo_id', '').strip()
    tipo_mantenimiento = request.POST.get('tipo_mantenimiento', '').strip()
    fecha_programada = request.POST.get('fecha_programada', '').strip()
    fecha_realizada = request.POST.get('fecha_realizada', '').strip()
    kilometraje = request.POST.get('kilometraje', '0').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    costo = request.POST.get('costo', '0').strip()
    proveedor_id = request.POST.get('proveedor_id', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()
    estado = request.POST.get('estado', 'programado').strip()

    errors = []
    
    if vehiculo_id:
        try:
            vehiculo = Vehiculo.objects.get(id=int(vehiculo_id))
            mantenimiento.vehiculo = vehiculo
        except (ValueError, Vehiculo.DoesNotExist):
            errors.append('Vehículo no válido')
    
    if tipo_mantenimiento and tipo_mantenimiento in [choice[0] for choice in MantenimientoVehiculo.TIPO_MANTENIMIENTO_CHOICES]:
        mantenimiento.tipo_mantenimiento = tipo_mantenimiento
    
    if fecha_programada:
        try:
            from datetime import datetime
            mantenimiento.fecha_programada = datetime.strptime(fecha_programada, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha programada inválida')
    
    if fecha_realizada:
        try:
            from datetime import datetime
            mantenimiento.fecha_realizada = datetime.strptime(fecha_realizada, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha realizada inválida')
    
    if kilometraje:
        try:
            kilometraje_int = int(kilometraje)
            if kilometraje_int >= 0:
                mantenimiento.kilometraje = kilometraje_int
            else:
                errors.append('El kilometraje debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Kilometraje inválido')
    
    if descripcion:
        mantenimiento.descripcion = descripcion
    
    if costo:
        try:
            costo_decimal = float(costo)
            if costo_decimal >= 0:
                mantenimiento.costo = costo_decimal
            else:
                errors.append('El costo debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Costo inválido')
    
    if proveedor_id:
        try:
            mantenimiento.proveedor = Proveedor.objects.get(id=int(proveedor_id))
        except (ValueError, Proveedor.DoesNotExist):
            mantenimiento.proveedor = None
    elif proveedor_id == '':
        mantenimiento.proveedor = None
    
    if observaciones is not None:
        mantenimiento.observaciones = observaciones or None
    
    if estado and estado in [choice[0] for choice in MantenimientoVehiculo.ESTADO_CHOICES]:
        mantenimiento.estado = estado

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        mantenimiento.save()
        return JsonResponse({
            'success': True, 
            'message': f'Mantenimiento #{mantenimiento.id} actualizado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el mantenimiento: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def mantenimiento_delete_json(request, mantenimiento_id: int):
    """
    Elimina un mantenimiento
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        mantenimiento = MantenimientoVehiculo.objects.get(id=mantenimiento_id)
    except MantenimientoVehiculo.DoesNotExist:
        return JsonResponse({'error': 'Mantenimiento no encontrado'}, status=404)

    try:
        mantenimiento_id_str = str(mantenimiento.id)
        mantenimiento.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Mantenimiento #{mantenimiento_id_str} eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el mantenimiento: {str(e)}']
        }, status=500)


# ========== CRUD DE PRECIOS POR TEMPORADA ==========

@login_required
def precios_temporada_list(request):
    """
    Lista todos los precios por temporada con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    juego_filter = request.GET.get('juego', '').strip()
    temporada_filter = request.GET.get('temporada', '').strip()
    
    order_by = request.GET.get('order_by', 'fecha_inicio').strip()
    direction = request.GET.get('direction', 'desc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'fecha_inicio': 'fecha_inicio',
        'fecha_fin': 'fecha_fin',
        'precio_arriendo': 'precio_arriendo',
        'temporada': 'temporada',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'fecha_inicio'
    
    if direction not in ['asc', 'desc']:
        direction = 'desc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = PrecioTemporada.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(juego__nombre__icontains=query)
        )
    
    if juego_filter:
        try:
            base_qs = base_qs.filter(juego_id=int(juego_filter))
        except ValueError:
            pass
    
    if temporada_filter:
        base_qs = base_qs.filter(temporada=temporada_filter)

    return render(request, 'jio_app/precios_temporada_list.html', {
        'precios_temporada': base_qs,
        'query': query,
        'juego_filter': juego_filter,
        'temporada_filter': temporada_filter,
        'order_by': order_by,
        'direction': direction,
        'temporada_choices': PrecioTemporada.TEMPORADA_CHOICES,
        'juegos': Juego.objects.filter(estado='Habilitado').order_by('nombre'),
    })


@login_required
@require_http_methods(["GET"])
def precio_temporada_detail_json(request, precio_id: int):
    """
    Obtiene los detalles de un precio por temporada en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        precio = PrecioTemporada.objects.get(id=precio_id)
        
        return JsonResponse({
            'id': precio.id,
            'juego_id': precio.juego.id,
            'temporada': precio.temporada,
            'precio_arriendo': str(precio.precio_arriendo),
            'fecha_inicio': precio.fecha_inicio.strftime('%Y-%m-%d'),
            'fecha_fin': precio.fecha_fin.strftime('%Y-%m-%d'),
            'descuento_porcentaje': str(precio.descuento_porcentaje),
            'temporada_choices': PrecioTemporada.TEMPORADA_CHOICES,
        })
    except PrecioTemporada.DoesNotExist:
        return JsonResponse({'error': 'Precio por temporada no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def precio_temporada_create_json(request):
    """
    Crea un nuevo precio por temporada
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    juego_id = request.POST.get('juego_id', '').strip()
    temporada = request.POST.get('temporada', '').strip()
    precio_arriendo = request.POST.get('precio_arriendo', '0').strip()
    fecha_inicio = request.POST.get('fecha_inicio', '').strip()
    fecha_fin = request.POST.get('fecha_fin', '').strip()
    descuento_porcentaje = request.POST.get('descuento_porcentaje', '0').strip()

    errors = []
    
    if not juego_id:
        errors.append('El juego es obligatorio')
    else:
        try:
            juego = Juego.objects.get(id=int(juego_id))
        except (ValueError, Juego.DoesNotExist):
            errors.append('Juego no válido')
    
    if not temporada or temporada not in [choice[0] for choice in PrecioTemporada.TEMPORADA_CHOICES]:
        errors.append('Temporada inválida')
    
    if not precio_arriendo:
        errors.append('El precio de arriendo es obligatorio')
    else:
        try:
            precio_decimal = float(precio_arriendo)
            if precio_decimal < 0:
                errors.append('El precio debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Precio inválido')
    
    if not fecha_inicio:
        errors.append('La fecha de inicio es obligatoria')
    
    if not fecha_fin:
        errors.append('La fecha de fin es obligatoria')
    
    fecha_ini = None
    fecha_f = None
    if fecha_inicio:
        try:
            from datetime import datetime
            fecha_ini = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de inicio inválida')
    
    if fecha_fin:
        try:
            from datetime import datetime
            fecha_f = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de fin inválida')
    
    if fecha_ini and fecha_f and fecha_ini > fecha_f:
        errors.append('La fecha de inicio debe ser anterior a la fecha de fin')
    
    descuento_decimal = 0
    if descuento_porcentaje:
        try:
            descuento_decimal = float(descuento_porcentaje)
            if descuento_decimal < 0 or descuento_decimal > 100:
                errors.append('El descuento debe estar entre 0 y 100')
        except ValueError:
            errors.append('Descuento inválido')
    
    # Verificar unique_together
    if juego_id and temporada and fecha_ini:
        if PrecioTemporada.objects.filter(juego_id=int(juego_id), temporada=temporada, fecha_inicio=fecha_ini).exists():
            errors.append('Ya existe un precio para este juego, temporada y fecha de inicio')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        precio = PrecioTemporada.objects.create(
            juego=juego,
            temporada=temporada,
            precio_arriendo=precio_decimal,
            fecha_inicio=fecha_ini,
            fecha_fin=fecha_f,
            descuento_porcentaje=descuento_decimal,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Precio por temporada #{precio.id} creado correctamente.',
            'precio_id': precio.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el precio por temporada: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def precio_temporada_update_json(request, precio_id: int):
    """
    Actualiza un precio por temporada existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        precio = PrecioTemporada.objects.get(id=precio_id)
    except PrecioTemporada.DoesNotExist:
        return JsonResponse({'error': 'Precio por temporada no encontrado'}, status=404)

    juego_id = request.POST.get('juego_id', '').strip()
    temporada = request.POST.get('temporada', '').strip()
    precio_arriendo = request.POST.get('precio_arriendo', '').strip()
    fecha_inicio = request.POST.get('fecha_inicio', '').strip()
    fecha_fin = request.POST.get('fecha_fin', '').strip()
    descuento_porcentaje = request.POST.get('descuento_porcentaje', '').strip()

    errors = []
    
    if juego_id:
        try:
            precio.juego = Juego.objects.get(id=int(juego_id))
        except (ValueError, Juego.DoesNotExist):
            errors.append('Juego no válido')
    
    if temporada and temporada in [choice[0] for choice in PrecioTemporada.TEMPORADA_CHOICES]:
        precio.temporada = temporada
    
    if precio_arriendo:
        try:
            precio_decimal = float(precio_arriendo)
            if precio_decimal >= 0:
                precio.precio_arriendo = precio_decimal
            else:
                errors.append('El precio debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Precio inválido')
    
    if fecha_inicio:
        try:
            from datetime import datetime
            precio.fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de inicio inválida')
    
    if fecha_fin:
        try:
            from datetime import datetime
            precio.fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de fin inválida')
    
    if precio.fecha_inicio and precio.fecha_fin and precio.fecha_inicio > precio.fecha_fin:
        errors.append('La fecha de inicio debe ser anterior a la fecha de fin')
    
    if descuento_porcentaje:
        try:
            descuento_decimal = float(descuento_porcentaje)
            if 0 <= descuento_decimal <= 100:
                precio.descuento_porcentaje = descuento_decimal
            else:
                errors.append('El descuento debe estar entre 0 y 100')
        except ValueError:
            errors.append('Descuento inválido')
    
    # Verificar unique_together al actualizar
    if juego_id and temporada and precio.fecha_inicio:
        existing = PrecioTemporada.objects.filter(juego_id=int(juego_id), temporada=temporada, fecha_inicio=precio.fecha_inicio).exclude(id=precio.id)
        if existing.exists():
            errors.append('Ya existe un precio para este juego, temporada y fecha de inicio')

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        precio.save()
        return JsonResponse({
            'success': True, 
            'message': f'Precio por temporada #{precio.id} actualizado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el precio por temporada: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def precio_temporada_delete_json(request, precio_id: int):
    """
    Elimina un precio por temporada
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        precio = PrecioTemporada.objects.get(id=precio_id)
    except PrecioTemporada.DoesNotExist:
        return JsonResponse({'error': 'Precio por temporada no encontrado'}, status=404)

    try:
        precio_id_str = str(precio.id)
        precio.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Precio por temporada #{precio_id_str} eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el precio por temporada: {str(e)}']
        }, status=500)


# ========== CRUD DE MATERIALES/INVENTARIO ==========

@login_required
def materiales_list(request):
    """
    Lista todos los materiales con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    categoria_filter = request.GET.get('categoria', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    
    order_by = request.GET.get('order_by', 'nombre').strip()
    direction = request.GET.get('direction', 'asc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'nombre': 'nombre',
        'categoria': 'categoria',
        'stock_actual': 'stock_actual',
        'estado': 'estado',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'nombre'
    
    if direction not in ['asc', 'desc']:
        direction = 'asc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Material.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(nombre__icontains=query) |
            Q(descripcion__icontains=query)
        )
    
    if categoria_filter:
        base_qs = base_qs.filter(categoria=categoria_filter)
    
    if estado_filter:
        base_qs = base_qs.filter(estado=estado_filter)

    return render(request, 'jio_app/materiales_list.html', {
        'materiales': base_qs,
        'query': query,
        'categoria_filter': categoria_filter,
        'estado_filter': estado_filter,
        'order_by': order_by,
        'direction': direction,
        'categoria_choices': Material.CATEGORIA_CHOICES,
        'estado_choices': Material.ESTADO_CHOICES,
        'proveedores': Proveedor.objects.filter(activo=True).order_by('nombre'),
    })


@login_required
@require_http_methods(["GET"])
def material_detail_json(request, material_id: int):
    """
    Obtiene los detalles de un material en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        material = Material.objects.get(id=material_id)
        
        return JsonResponse({
            'id': material.id,
            'nombre': material.nombre,
            'categoria': material.categoria,
            'descripcion': material.descripcion or '',
            'stock_actual': material.stock_actual,
            'stock_minimo': material.stock_minimo,
            'unidad_medida': material.unidad_medida,
            'precio_unitario': str(material.precio_unitario),
            'estado': material.estado,
            'ubicacion': material.ubicacion or '',
            'proveedor_id': material.proveedor.id if material.proveedor else None,
            'fecha_ultima_compra': material.fecha_ultima_compra.strftime('%Y-%m-%d') if material.fecha_ultima_compra else '',
            'observaciones': material.observaciones or '',
            'categoria_choices': Material.CATEGORIA_CHOICES,
            'estado_choices': Material.ESTADO_CHOICES,
        })
    except Material.DoesNotExist:
        return JsonResponse({'error': 'Material no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def material_create_json(request):
    """
    Crea un nuevo material
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    nombre = request.POST.get('nombre', '').strip()
    categoria = request.POST.get('categoria', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    stock_actual = request.POST.get('stock_actual', '0').strip()
    stock_minimo = request.POST.get('stock_minimo', '0').strip()
    unidad_medida = request.POST.get('unidad_medida', 'unidad').strip()
    precio_unitario = request.POST.get('precio_unitario', '0').strip()
    estado = request.POST.get('estado', 'disponible').strip()
    ubicacion = request.POST.get('ubicacion', '').strip()
    proveedor_id = request.POST.get('proveedor_id', '').strip()
    fecha_ultima_compra = request.POST.get('fecha_ultima_compra', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if not nombre:
        errors.append('El nombre es obligatorio')
    
    if not categoria or categoria not in [choice[0] for choice in Material.CATEGORIA_CHOICES]:
        errors.append('Categoría inválida')
    
    stock_actual_int = 0
    if stock_actual:
        try:
            stock_actual_int = int(stock_actual)
            if stock_actual_int < 0:
                errors.append('El stock actual debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Stock actual inválido')
    
    stock_minimo_int = 0
    if stock_minimo:
        try:
            stock_minimo_int = int(stock_minimo)
            if stock_minimo_int < 0:
                errors.append('El stock mínimo debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Stock mínimo inválido')
    
    precio_decimal = 0
    if precio_unitario:
        try:
            precio_decimal = float(precio_unitario)
            if precio_decimal < 0:
                errors.append('El precio unitario debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Precio unitario inválido')
    
    fecha_compra = None
    if fecha_ultima_compra:
        try:
            from datetime import datetime
            fecha_compra = datetime.strptime(fecha_ultima_compra, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de última compra inválida')
    
    proveedor_obj = None
    if proveedor_id:
        try:
            proveedor_obj = Proveedor.objects.get(id=int(proveedor_id))
        except (ValueError, Proveedor.DoesNotExist):
            pass

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        material = Material.objects.create(
            nombre=nombre,
            categoria=categoria,
            descripcion=descripcion or None,
            stock_actual=stock_actual_int,
            stock_minimo=stock_minimo_int,
            unidad_medida=unidad_medida,
            precio_unitario=precio_decimal,
            estado=estado,
            ubicacion=ubicacion or None,
            proveedor=proveedor_obj,
            fecha_ultima_compra=fecha_compra,
            observaciones=observaciones or None,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Material "{material.nombre}" creado correctamente.',
            'material_id': material.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el material: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def material_update_json(request, material_id: int):
    """
    Actualiza un material existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        material = Material.objects.get(id=material_id)
    except Material.DoesNotExist:
        return JsonResponse({'error': 'Material no encontrado'}, status=404)

    nombre = request.POST.get('nombre', '').strip()
    categoria = request.POST.get('categoria', '').strip()
    descripcion = request.POST.get('descripcion', '').strip()
    stock_actual = request.POST.get('stock_actual', '').strip()
    stock_minimo = request.POST.get('stock_minimo', '').strip()
    unidad_medida = request.POST.get('unidad_medida', '').strip()
    precio_unitario = request.POST.get('precio_unitario', '').strip()
    estado = request.POST.get('estado', '').strip()
    ubicacion = request.POST.get('ubicacion', '').strip()
    proveedor_id = request.POST.get('proveedor_id', '').strip()
    fecha_ultima_compra = request.POST.get('fecha_ultima_compra', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if nombre:
        material.nombre = nombre
    
    if categoria and categoria in [choice[0] for choice in Material.CATEGORIA_CHOICES]:
        material.categoria = categoria
    
    if descripcion is not None:
        material.descripcion = descripcion or None
    
    if stock_actual:
        try:
            stock_actual_int = int(stock_actual)
            if stock_actual_int >= 0:
                material.stock_actual = stock_actual_int
            else:
                errors.append('El stock actual debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Stock actual inválido')
    
    if stock_minimo:
        try:
            stock_minimo_int = int(stock_minimo)
            if stock_minimo_int >= 0:
                material.stock_minimo = stock_minimo_int
            else:
                errors.append('El stock mínimo debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Stock mínimo inválido')
    
    if unidad_medida:
        material.unidad_medida = unidad_medida
    
    if precio_unitario:
        try:
            precio_decimal = float(precio_unitario)
            if precio_decimal >= 0:
                material.precio_unitario = precio_decimal
            else:
                errors.append('El precio unitario debe ser mayor o igual a 0')
        except ValueError:
            errors.append('Precio unitario inválido')
    
    if estado and estado in [choice[0] for choice in Material.ESTADO_CHOICES]:
        material.estado = estado
    
    if ubicacion is not None:
        material.ubicacion = ubicacion or None
    
    if proveedor_id:
        try:
            material.proveedor = Proveedor.objects.get(id=int(proveedor_id))
        except (ValueError, Proveedor.DoesNotExist):
            material.proveedor = None
    elif proveedor_id == '':
        material.proveedor = None
    
    if fecha_ultima_compra:
        try:
            from datetime import datetime
            material.fecha_ultima_compra = datetime.strptime(fecha_ultima_compra, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Fecha de última compra inválida')
    elif fecha_ultima_compra == '':
        material.fecha_ultima_compra = None
    
    if observaciones is not None:
        material.observaciones = observaciones or None

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        material.save()
        return JsonResponse({
            'success': True, 
            'message': f'Material "{material.nombre}" actualizado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el material: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def material_delete_json(request, material_id: int):
    """
    Elimina un material
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        material = Material.objects.get(id=material_id)
    except Material.DoesNotExist:
        return JsonResponse({'error': 'Material no encontrado'}, status=404)

    try:
        material_nombre = material.nombre
        material.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Material "{material_nombre}" eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el material: {str(e)}']
        }, status=500)


# ========== CRUD DE PROVEEDORES ==========

@login_required
def proveedores_list(request):
    """
    Lista todos los proveedores con filtros de búsqueda
    """
    if not request.user.tipo_usuario == 'administrador':
        raise PermissionDenied("Solo los administradores pueden acceder a este recurso.")

    query = request.GET.get('q', '').strip()
    tipo_filter = request.GET.get('tipo', '').strip()
    activo_filter = request.GET.get('activo', '').strip()
    
    order_by = request.GET.get('order_by', 'nombre').strip()
    direction = request.GET.get('direction', 'asc').strip()
    
    valid_order_fields = {
        'id': 'id',
        'nombre': 'nombre',
        'tipo_proveedor': 'tipo_proveedor',
        'fecha_creacion': 'fecha_creacion',
    }
    
    if order_by not in valid_order_fields:
        order_by = 'nombre'
    
    if direction not in ['asc', 'desc']:
        direction = 'asc'
    
    order_field = valid_order_fields[order_by]
    if direction == 'desc':
        order_field = '-' + order_field
    
    base_qs = Proveedor.objects.all().order_by(order_field)
    
    if query:
        base_qs = base_qs.filter(
            Q(nombre__icontains=query) |
            Q(contacto_nombre__icontains=query) |
            Q(telefono__icontains=query) |
            Q(email__icontains=query) |
            Q(servicios_ofrecidos__icontains=query)
        )
    
    if tipo_filter:
        base_qs = base_qs.filter(tipo_proveedor=tipo_filter)
    
    if activo_filter:
        if activo_filter == 'si':
            base_qs = base_qs.filter(activo=True)
        elif activo_filter == 'no':
            base_qs = base_qs.filter(activo=False)

    return render(request, 'jio_app/proveedores_list.html', {
        'proveedores': base_qs,
        'query': query,
        'tipo_filter': tipo_filter,
        'activo_filter': activo_filter,
        'order_by': order_by,
        'direction': direction,
        'tipo_choices': Proveedor.TIPO_PROVEEDOR_CHOICES,
    })


@login_required
@require_http_methods(["GET"])
def proveedor_detail_json(request, proveedor_id: int):
    """
    Obtiene los detalles de un proveedor en formato JSON
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        proveedor = Proveedor.objects.get(id=proveedor_id)
        
        return JsonResponse({
            'id': proveedor.id,
            'nombre': proveedor.nombre,
            'tipo_proveedor': proveedor.tipo_proveedor,
            'rut': proveedor.rut or '',
            'contacto_nombre': proveedor.contacto_nombre or '',
            'telefono': proveedor.telefono or '',
            'email': proveedor.email or '',
            'direccion': proveedor.direccion or '',
            'servicios_ofrecidos': proveedor.servicios_ofrecidos or '',
            'activo': proveedor.activo,
            'observaciones': proveedor.observaciones or '',
            'tipo_choices': Proveedor.TIPO_PROVEEDOR_CHOICES,
        })
    except Proveedor.DoesNotExist:
        return JsonResponse({'error': 'Proveedor no encontrado'}, status=404)


@login_required
@require_http_methods(["POST"])
def proveedor_create_json(request):
    """
    Crea un nuevo proveedor
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)

    nombre = request.POST.get('nombre', '').strip()
    tipo_proveedor = request.POST.get('tipo_proveedor', '').strip()
    rut = request.POST.get('rut', '').strip()
    contacto_nombre = request.POST.get('contacto_nombre', '').strip()
    telefono = request.POST.get('telefono', '').strip()
    email = request.POST.get('email', '').strip()
    direccion = request.POST.get('direccion', '').strip()
    servicios_ofrecidos = request.POST.get('servicios_ofrecidos', '').strip()
    activo = request.POST.get('activo', 'true').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if not nombre:
        errors.append('El nombre es obligatorio')
    
    if not tipo_proveedor or tipo_proveedor not in [choice[0] for choice in Proveedor.TIPO_PROVEEDOR_CHOICES]:
        errors.append('Tipo de proveedor inválido')
    
    if email:
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            errors.append('Email inválido')
    
    activo_bool = activo.lower() in ['true', '1', 'yes', 'si', 'sí']

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        proveedor = Proveedor.objects.create(
            nombre=nombre,
            tipo_proveedor=tipo_proveedor,
            rut=rut or None,
            contacto_nombre=contacto_nombre or None,
            telefono=telefono or None,
            email=email or None,
            direccion=direccion or None,
            servicios_ofrecidos=servicios_ofrecidos or None,
            activo=activo_bool,
            observaciones=observaciones or None,
        )
        return JsonResponse({
            'success': True, 
            'message': f'Proveedor "{proveedor.nombre}" creado correctamente.',
            'proveedor_id': proveedor.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al crear el proveedor: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def proveedor_update_json(request, proveedor_id: int):
    """
    Actualiza un proveedor existente
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        proveedor = Proveedor.objects.get(id=proveedor_id)
    except Proveedor.DoesNotExist:
        return JsonResponse({'error': 'Proveedor no encontrado'}, status=404)

    nombre = request.POST.get('nombre', '').strip()
    tipo_proveedor = request.POST.get('tipo_proveedor', '').strip()
    rut = request.POST.get('rut', '').strip()
    contacto_nombre = request.POST.get('contacto_nombre', '').strip()
    telefono = request.POST.get('telefono', '').strip()
    email = request.POST.get('email', '').strip()
    direccion = request.POST.get('direccion', '').strip()
    servicios_ofrecidos = request.POST.get('servicios_ofrecidos', '').strip()
    activo = request.POST.get('activo', '').strip()
    observaciones = request.POST.get('observaciones', '').strip()

    errors = []
    
    if nombre:
        proveedor.nombre = nombre
    
    if tipo_proveedor and tipo_proveedor in [choice[0] for choice in Proveedor.TIPO_PROVEEDOR_CHOICES]:
        proveedor.tipo_proveedor = tipo_proveedor
    
    if rut is not None:
        proveedor.rut = rut or None
    
    if contacto_nombre is not None:
        proveedor.contacto_nombre = contacto_nombre or None
    
    if telefono is not None:
        proveedor.telefono = telefono or None
    
    if email:
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
            proveedor.email = email or None
        except ValidationError:
            errors.append('Email inválido')
    elif email == '':
        proveedor.email = None
    
    if direccion is not None:
        proveedor.direccion = direccion or None
    
    if servicios_ofrecidos is not None:
        proveedor.servicios_ofrecidos = servicios_ofrecidos or None
    
    if activo:
        proveedor.activo = activo.lower() in ['true', '1', 'yes', 'si', 'sí']
    
    if observaciones is not None:
        proveedor.observaciones = observaciones or None

    if errors:
        return JsonResponse({'success': False, 'errors': errors}, status=400)

    try:
        proveedor.save()
        return JsonResponse({
            'success': True, 
            'message': f'Proveedor "{proveedor.nombre}" actualizado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al actualizar el proveedor: {str(e)}']
        }, status=500)


@login_required
@require_http_methods(["POST"])
def proveedor_delete_json(request, proveedor_id: int):
    """
    Elimina un proveedor
    """
    if request.user.tipo_usuario != 'administrador':
        return JsonResponse({'error': 'No autorizado'}, status=403)
    
    try:
        proveedor = Proveedor.objects.get(id=proveedor_id)
    except Proveedor.DoesNotExist:
        return JsonResponse({'error': 'Proveedor no encontrado'}, status=404)

    try:
        proveedor_nombre = proveedor.nombre
        proveedor.delete()
        return JsonResponse({
            'success': True, 
            'message': f'Proveedor "{proveedor_nombre}" eliminado correctamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'errors': [f'Error al eliminar el proveedor: {str(e)}']
        }, status=500)