import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta, date, time
from decimal import Decimal
import random
from jio_app.models import (
    Usuario, Cliente, Juego, Reserva, DetalleReserva, 
    Instalacion, Retiro, Repartidor
)


class Command(BaseCommand):
    help = 'Pobla la base de datos con arriendos (reservas) de prueba para estadísticas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--num-reservas',
            type=int,
            default=30,
            help='Número de reservas a crear (default: 30)'
        )

    def handle(self, *args, **options):
        num_reservas = options['num_reservas']
        
        self.stdout.write(self.style.SUCCESS('Iniciando creación de arriendos de prueba...'))
        
        # Obtener o crear clientes de prueba
        clientes = self._obtener_clientes()
        if not clientes:
            self.stdout.write(self.style.ERROR('No hay clientes en la base de datos. Creando clientes de prueba...'))
            clientes = self._crear_clientes_prueba()
        
        # Obtener juegos disponibles
        juegos = Juego.objects.filter(estado__iexact='habilitado')
        if not juegos.exists():
            self.stdout.write(self.style.ERROR('No hay juegos habilitados. Ejecuta primero poblar_juegos.py'))
            return
        
        # Obtener repartidores (opcional)
        repartidores = list(Repartidor.objects.all())
        
        # Crear reservas
        estados_reserva = ['Pendiente', 'Confirmada', 'completada', 'cancelada']
        estados_instalacion = ['programada', 'realizada', 'pendiente', 'cancelada']
        estados_retiro = ['programado', 'realizado', 'pendiente', 'cancelado']
        metodos_pago = ['efectivo', 'transferencia', 'otro']
        
        reservas_creadas = 0
        
        with transaction.atomic():
            # Crear reservas en diferentes fechas (pasado, presente, futuro)
            hoy = date.today()
            
            for i in range(num_reservas):
                # Distribuir fechas: algunas en el pasado, algunas en el presente, algunas en el futuro
                if i % 3 == 0:
                    # Pasado (últimos 60 días)
                    dias_offset = random.randint(-60, -1)
                elif i % 3 == 1:
                    # Presente (hoy o próximos 7 días)
                    dias_offset = random.randint(0, 7)
                else:
                    # Futuro (próximos 30 días)
                    dias_offset = random.randint(8, 30)
                
                fecha_evento = hoy + timedelta(days=dias_offset)
                cliente = random.choice(clientes)
                estado_reserva = random.choice(estados_reserva)
                
                # Crear reserva
                hora_instalacion = time(random.randint(8, 12), random.randint(0, 59))
                hora_retiro = time(random.randint(16, 20), random.randint(0, 59))
                
                direcciones = [
                    "Av. Providencia 1234, Santiago",
                    "Calle Los Aromos 567, Valparaíso",
                    "Pasaje Las Flores 89, Viña del Mar",
                    "Av. Libertador 2345, Concepción",
                    "Calle Central 678, Temuco",
                    "Av. Marina 901, La Serena",
                    "Pasaje Los Robles 345, Rancagua",
                    "Av. Principal 123, Talca",
                    "Calle Arturo Prat 456, Iquique",
                    "Av. Costanera 789, Puerto Montt",
                ]
                
                reserva = Reserva.objects.create(
                    cliente=cliente,
                    fecha_evento=fecha_evento,
                    hora_instalacion=hora_instalacion,
                    hora_retiro=hora_retiro,
                    direccion_evento=random.choice(direcciones),
                    estado=estado_reserva,
                    observaciones=f'Reserva de prueba #{i+1} - Generada automáticamente',
                    total_reserva=Decimal('0.00')  # Se calculará después
                )
                
                # Agregar juegos a la reserva
                num_juegos = random.randint(1, 3)
                juegos_seleccionados = random.sample(list(juegos), min(num_juegos, juegos.count()))
                total = Decimal('0.00')
                
                for juego in juegos_seleccionados:
                    cantidad = random.randint(1, 2)
                    precio_unitario = Decimal(str(juego.precio_base))
                    subtotal = precio_unitario * cantidad
                    total += subtotal
                    
                    DetalleReserva.objects.create(
                        reserva=reserva,
                        juego=juego,
                        cantidad=cantidad,
                        precio_unitario=precio_unitario,
                        subtotal=subtotal
                    )
                
                # Agregar costo de distancia (opcional, 50% de probabilidad)
                if random.random() > 0.5:
                    distancia_km = random.randint(5, 50)
                    costo_distancia = Decimal(str(distancia_km * 1000))  # $1.000 por km
                    total += costo_distancia
                
                reserva.total_reserva = total
                reserva.save()
                
                # Crear instalación
                estado_instalacion = random.choice(estados_instalacion)
                repartidor_inst = random.choice(repartidores) if repartidores and random.random() > 0.3 else None
                
                instalacion = Instalacion.objects.create(
                    reserva=reserva,
                    repartidor=repartidor_inst,
                    fecha_instalacion=fecha_evento,
                    hora_instalacion=hora_instalacion,
                    direccion_instalacion=reserva.direccion_evento,
                    telefono_cliente=cliente.usuario.telefono or '987654321',
                    estado_instalacion=estado_instalacion,
                    observaciones_instalacion=f'Instalación de prueba para reserva #{reserva.id}',
                    metodo_pago=random.choice(metodos_pago) if estado_instalacion == 'realizada' and random.random() > 0.5 else None
                )
                
                # Crear retiro
                estado_retiro = random.choice(estados_retiro)
                repartidor_ret = random.choice(repartidores) if repartidores and random.random() > 0.3 else None
                
                retiro = Retiro.objects.create(
                    reserva=reserva,
                    repartidor=repartidor_ret,
                    fecha_retiro=fecha_evento,
                    hora_retiro=hora_retiro,
                    estado_retiro=estado_retiro,
                    observaciones_retiro=f'Retiro de prueba para reserva #{reserva.id}'
                )
                
                reservas_creadas += 1
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(f'Creadas {i + 1}/{num_reservas} reservas...')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSe crearon {reservas_creadas} arriendos (reservas) de prueba exitosamente!'
            )
        )
        self.stdout.write(self.style.SUCCESS(f'   - Reservas creadas: {reservas_creadas}'))
        self.stdout.write(self.style.SUCCESS(f'   - Instalaciones creadas: {reservas_creadas}'))
        self.stdout.write(self.style.SUCCESS(f'   - Retiros creados: {reservas_creadas}'))
        self.stdout.write(
            self.style.WARNING(
                '\nAhora puedes probar tu panel de estadisticas con estos datos.'
            )
        )

    def _obtener_clientes(self):
        """Obtiene los clientes existentes"""
        return list(Cliente.objects.all())
    
    def _crear_clientes_prueba(self):
        """Crea clientes de prueba si no existen"""
        nombres = [
            ('Juan', 'Pérez'),
            ('María', 'González'),
            ('Carlos', 'Rodríguez'),
            ('Ana', 'López'),
            ('Pedro', 'Martínez'),
            ('Laura', 'Sánchez'),
            ('Diego', 'Fernández'),
            ('Carmen', 'García'),
            ('Roberto', 'Torres'),
            ('Patricia', 'Ramírez'),
        ]
        
        clientes_creados = []
        
        for i, (nombre, apellido) in enumerate(nombres):
            # Generar username único
            base_username = f"{nombre.lower()}.{apellido.lower()}"
            username = base_username
            counter = 1
            while Usuario.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Crear usuario
            usuario = Usuario.objects.create_user(
                username=username,
                email=f"{username}@test.com",
                password='test123456',
                first_name=nombre,
                last_name=apellido,
                tipo_usuario='cliente',
                telefono=f"9{random.randint(10000000, 99999999)}",
                is_active=True
            )
            
            # Crear cliente
            rut = f"{random.randint(10000000, 99999999)}-{random.randint(1, 9)}"
            while Cliente.objects.filter(rut=rut).exists():
                rut = f"{random.randint(10000000, 99999999)}-{random.randint(1, 9)}"
            
            cliente = Cliente.objects.create(
                usuario=usuario,
                rut=rut,
                tipo_cliente=random.choice(['particular', 'empresa'])
            )
            
            clientes_creados.append(cliente)
        
        self.stdout.write(
            self.style.SUCCESS(f'Se crearon {len(clientes_creados)} clientes de prueba')
        )
        
        return clientes_creados

