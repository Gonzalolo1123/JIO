import os
import math
import secrets
import re
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.hashers import make_password
from datetime import timedelta, date, time
from decimal import Decimal
import random
from jio_app.models import (
    Usuario, Cliente, Juego, Reserva, DetalleReserva, 
    Instalacion, Retiro, Repartidor
)


def calcular_distancia_km(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
    Retorna la distancia en kilómetros
    """
    # Radio de la Tierra en kilómetros
    R = 6371.0
    
    # Convertir a radianes
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Diferencias
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Fórmula de Haversine
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distancia = R * c
    return round(distancia, 1)


def generar_coordenadas_cerca_de_osorno(osorno_lat, osorno_lng, radio_max_km=30):
    """
    Genera coordenadas aleatorias dentro de un radio máximo de Osorno
    """
    # 1 grado de latitud ≈ 111 km
    # 1 grado de longitud ≈ 111 km * cos(latitud)
    grados_lat = radio_max_km / 111.0
    grados_lng = radio_max_km / (111.0 * math.cos(math.radians(osorno_lat)))
    
    # Generar coordenadas aleatorias dentro del círculo
    while True:
        # Generar punto aleatorio en cuadrado
        lat_offset = random.uniform(-grados_lat, grados_lat)
        lng_offset = random.uniform(-grados_lng, grados_lng)
        
        lat = osorno_lat + lat_offset
        lng = osorno_lng + lng_offset
        
        # Verificar que esté dentro del radio
        distancia = calcular_distancia_km(osorno_lat, osorno_lng, lat, lng)
        if distancia <= radio_max_km:
            return lat, lng, int(distancia)


class Command(BaseCommand):
    help = 'Limpia todos los arriendos existentes y crea nuevos datos de prueba con clientes ficticios y ubicaciones cerca de Osorno'

    def add_arguments(self, parser):
        parser.add_argument(
            '--num-reservas',
            type=int,
            default=50,
            help='Número de reservas a crear (default: 50)'
        )
        parser.add_argument(
            '--num-clientes',
            type=int,
            default=20,
            help='Número de clientes ficticios a crear (default: 20)'
        )

    def handle(self, *args, **options):
        num_reservas = options['num_reservas']
        num_clientes = options['num_clientes']
        
        self.stdout.write(self.style.WARNING('Eliminando todos los arriendos existentes...'))
        
        with transaction.atomic():
            # Eliminar todos los arriendos y sus relaciones
            Reserva.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Arriendos eliminados correctamente'))
        
        # Coordenadas de Osorno
        OSORNO_LAT = -40.5739
        OSORNO_LNG = -73.1317
        
        # Nombres y apellidos chilenos comunes
        nombres = [
            'Juan', 'Pedro', 'Diego', 'Carlos', 'Francisco', 'Luis', 'Miguel', 'Andrés',
            'María', 'José', 'Fernando', 'Patricio', 'Ricardo', 'Rodrigo', 'Sebastián',
            'Andrea', 'Camila', 'Catalina', 'Daniela', 'Francisca', 'Isabella', 'Javiera',
            'Valentina', 'Constanza', 'Paula', 'Sofía', 'Antonella', 'Martina', 'Agustina'
        ]
        
        apellidos = [
            'González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva',
            'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya',
            'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Ramírez', 'Reyes', 'Gutiérrez',
            'Castro', 'Vargas', 'Álvarez', 'Vásquez', 'Tapia', 'Fernández', 'Sánchez'
        ]
        
        # Localidades y calles cerca de Osorno
        localidades_osorno = [
            'Osorno Centro', 'Rahue', 'Fundo Santa María', 'Las Coloradas',
            'Chuyaca', 'Ovejería', 'Pichil', 'Quilacahuín', 'Choroy',
            'Cancura', 'Trumao', 'Pichil Alto', 'Pichil Bajo', 'Río Negro',
            'Puyehue', 'Entre Lagos', 'Osorno Norte', 'Osorno Sur'
        ]
        
        calles_osorno = [
            'Av. Mackenna', 'Av. O\'Higgins', 'Calle Dr. Guillermo Buhler',
            'Calle Eleuterio Ramírez', 'Calle Juan Mackenna', 'Calle Lord Cochrane',
            'Calle Matta', 'Calle Miraflores', 'Calle Freire', 'Calle Rodríguez',
            'Calle Manuel Antonio Matta', 'Calle Amunátegui', 'Calle Prat',
            'Calle Zenteno', 'Calle Benavente', 'Av. Ejército', 'Av. Chacabuco',
            'Calle Los Carrera', 'Calle Errázuriz', 'Calle Bilbao'
        ]
        
        self.stdout.write(self.style.SUCCESS(f'Creando {num_clientes} clientes ficticios...'))
        
        # Crear clientes ficticios
        clientes_creados = []
        with transaction.atomic():
            for i in range(num_clientes):
                first_name = random.choice(nombres)
                last_name = random.choice(apellidos)
                if random.random() > 0.7:
                    last_name = f"{last_name} {random.choice(apellidos)}"
                
                email = f"{first_name.lower()}.{last_name.lower().split()[0]}@email.com"
                # Evitar duplicados
                while Usuario.objects.filter(email=email).exists():
                    email = f"{first_name.lower()}.{last_name.lower().split()[0]}{random.randint(1, 999)}@email.com"
                
                # Generar RUT válido (formato simple)
                rut_num = random.randint(10000000, 25000000)
                rut_dv = random.choice(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'k', 'K'])
                rut = f"{rut_num}-{rut_dv}"
                
                # Evitar RUTs duplicados
                while Cliente.objects.filter(rut=rut).exists():
                    rut_num = random.randint(10000000, 25000000)
                    rut_dv = random.choice(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'k', 'K'])
                    rut = f"{rut_num}-{rut_dv}"
                
                # Generar teléfono chileno
                telefono = f"+569{random.randint(10000000, 99999999)}"
                
                tipo_cliente = random.choice(['particular', 'empresa'])
                
                # Generar username único
                base_username = f"{first_name.lower()}_{last_name.lower().split()[0]}"
                username = base_username
                counter = 1
                while Usuario.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1
                
                # Crear usuario
                password = secrets.token_urlsafe(12)
                usuario = Usuario.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    tipo_usuario='cliente',
                    is_active=True,
                    telefono=telefono,
                )
                
                # Crear cliente
                cliente = Cliente.objects.create(
                    usuario=usuario,
                    rut=rut,
                    tipo_cliente=tipo_cliente,
                )
                
                clientes_creados.append(cliente)
        
        self.stdout.write(self.style.SUCCESS(f'{len(clientes_creados)} clientes creados'))
        
        # Obtener juegos disponibles
        juegos = list(Juego.objects.filter(estado__iexact='habilitado'))
        if not juegos:
            self.stdout.write(self.style.ERROR('No hay juegos habilitados. Ejecuta primero poblar_juegos.py'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Creando {num_reservas} arriendos...'))
        
        # Crear reservas
        estados_reserva = ['Pendiente', 'Confirmada', 'completada']
        hoy = timezone.now().date()
        
        reservas_creadas = 0
        
        with transaction.atomic():
            for i in range(num_reservas):
                cliente = random.choice(clientes_creados)
                
                # Fecha aleatoria entre hace 30 días y 60 días adelante
                dias_offset = random.randint(-30, 60)
                fecha_evento = hoy + timedelta(days=dias_offset)
                
                # Horarios aleatorios
                hora_instalacion = time(random.randint(8, 14), random.choice([0, 30]))
                hora_retiro = time(random.randint(17, 21), random.choice([0, 30]))
                
                # Generar ubicación aleatoria cerca de Osorno
                lat, lng, distancia_km = generar_coordenadas_cerca_de_osorno(OSORNO_LAT, OSORNO_LNG, 30)
                
                # Generar dirección realista
                localidad = random.choice(localidades_osorno)
                calle = random.choice(calles_osorno)
                numero = random.randint(100, 5000)
                direccion = f"{calle} {numero}, {localidad}, Osorno, Chile"
                
                # Estado aleatorio
                estado = random.choice(estados_reserva)
                
                # Observaciones opcionales
                observaciones = None
                if random.random() > 0.7:
                    observaciones_opciones = [
                        'Llamar antes de llegar',
                        'Casa con portón verde',
                        'Confirmar horario un día antes',
                        'Acceso por calle trasera',
                        'Estacionamiento disponible',
                    ]
                    observaciones = random.choice(observaciones_opciones)
                
                # Seleccionar 1-3 juegos (cantidad siempre 1)
                num_juegos = random.randint(1, 3)
                juegos_seleccionados = random.sample(juegos, min(num_juegos, len(juegos)))
                
                # Calcular total de juegos
                total_juegos = Decimal('0.00')
                for juego in juegos_seleccionados:
                    total_juegos += Decimal(str(juego.precio_base))
                
                # Calcular precio por distancia ($1.000 por km)
                PRECIO_POR_KM = 1000
                precio_distancia = Decimal(str(distancia_km * PRECIO_POR_KM))
                
                # Total final
                total_reserva = total_juegos + precio_distancia
                
                # Crear reserva
                reserva = Reserva.objects.create(
                    cliente=cliente,
                    fecha_evento=fecha_evento,
                    hora_instalacion=hora_instalacion,
                    hora_retiro=hora_retiro,
                    direccion_evento=direccion,
                    distancia_km=distancia_km,
                    precio_distancia=precio_distancia,
                    estado=estado,
                    observaciones=observaciones,
                    total_reserva=total_reserva,
                )
                
                # Crear detalles de reserva (cantidad siempre 1)
                for juego in juegos_seleccionados:
                    DetalleReserva.objects.create(
                        reserva=reserva,
                        juego=juego,
                        cantidad=1,
                        precio_unitario=juego.precio_base,
                        subtotal=juego.precio_base,
                    )
                
                reservas_creadas += 1
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(f'  Creadas {i + 1}/{num_reservas} reservas...')
        
        self.stdout.write(self.style.SUCCESS(f'\n{reservas_creadas} arriendos creados exitosamente'))
        self.stdout.write(self.style.SUCCESS(f'- {len(clientes_creados)} clientes creados'))
        self.stdout.write(self.style.SUCCESS(f'- Distancias calculadas desde Osorno (0-30 km)'))
        self.stdout.write(self.style.SUCCESS(f'- Precios por distancia calculados ($1.000/km)'))
        self.stdout.write(self.style.SUCCESS(f'- Direcciones generadas en zona de Osorno'))

