from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum
from jio_app.models import GastoOperativo, Usuario, Vehiculo
from decimal import Decimal
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Genera datos de prueba de gastos operativos en distintos períodos (semanas, meses, años)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cantidad',
            type=int,
            default=100,
            help='Cantidad total de gastos a generar (default: 100)'
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Elimina todos los gastos existentes antes de crear nuevos'
        )

    def handle(self, *args, **options):
        cantidad = options['cantidad']
        limpiar = options['limpiar']

        # Obtener o crear un usuario administrador para registrar los gastos
        admin = Usuario.objects.filter(tipo_usuario='administrador').first()
        if not admin:
            self.stdout.write(
                self.style.WARNING('No se encontró un usuario administrador. Creando uno temporal...')
            )
            admin = Usuario.objects.create_user(
                username='admin_temp',
                email='admin_temp@jio.cl',
                password='temp123',
                tipo_usuario='administrador',
                is_staff=True
            )

        # Obtener vehículos si existen
        vehiculos = list(Vehiculo.objects.all())

        # Limpiar gastos existentes si se solicita
        if limpiar:
            count = GastoOperativo.objects.count()
            GastoOperativo.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Se eliminaron {count} gastos existentes.')
            )

        # Datos de prueba
        categorias = [choice[0] for choice in GastoOperativo.CATEGORIA_CHOICES]
        metodos_pago = [choice[0] for choice in GastoOperativo.METODO_PAGO_CHOICES]

        descripciones_por_categoria = {
            'combustible': [
                'Carga de bencina vehículo principal',
                'Combustible para reparto',
                'Diesel para camión',
                'Recarga de combustible',
            ],
            'mantenimiento': [
                'Cambio de aceite',
                'Reparación de neumáticos',
                'Mantenimiento preventivo',
                'Servicio técnico vehículo',
                'Revisión mecánica',
            ],
            'publicidad': [
                'Publicidad en redes sociales',
                'Anuncio en radio local',
                'Flyers y volantes',
                'Publicidad en Google Ads',
                'Banner promocional',
            ],
            'servicios': [
                'Servicio de internet',
                'Servicio de telefonía',
                'Servicio de luz',
                'Servicio de agua',
                'Servicio de gas',
            ],
            'materiales': [
                'Compra de materiales de limpieza',
                'Materiales de embalaje',
                'Herramientas y equipos',
                'Insumos varios',
            ],
            'salarios': [
                'Pago de salario repartidor',
                'Pago de salario administrativo',
                'Bonos y comisiones',
            ],
            'alquiler': [
                'Alquiler de bodega',
                'Alquiler de oficina',
                'Alquiler de espacio',
            ],
            'seguros': [
                'Seguro de vehículo',
                'Seguro de responsabilidad civil',
                'Seguro de inventario',
            ],
            'impuestos': [
                'Pago de impuestos mensuales',
                'IVA',
                'Impuestos municipales',
            ],
            'otros': [
                'Gastos varios',
                'Gastos administrativos',
                'Gastos no categorizados',
            ],
        }

        hoy = timezone.now().date()
        gastos_creados = 0

        self.stdout.write(f'Generando {cantidad} gastos operativos...')

        # Generar gastos distribuidos en diferentes períodos
        for i in range(cantidad):
            # Distribuir gastos en los últimos 2 años
            dias_atras = random.randint(0, 730)  # Últimos 2 años
            fecha_gasto = hoy - timedelta(days=dias_atras)

            # Seleccionar categoría
            categoria = random.choice(categorias)
            
            # Seleccionar descripción según categoría
            descripciones = descripciones_por_categoria.get(categoria, ['Gasto operativo'])
            descripcion = random.choice(descripciones)

            # Generar monto según categoría (rangos realistas)
            rangos_montos = {
                'combustible': (15000, 80000),
                'mantenimiento': (20000, 150000),
                'publicidad': (50000, 300000),
                'servicios': (10000, 50000),
                'materiales': (15000, 100000),
                'salarios': (200000, 800000),
                'alquiler': (150000, 500000),
                'seguros': (50000, 200000),
                'impuestos': (30000, 200000),
                'otros': (5000, 50000),
            }
            
            min_monto, max_monto = rangos_montos.get(categoria, (10000, 100000))
            monto = Decimal(str(random.randint(min_monto, max_monto)))

            # Seleccionar método de pago
            metodo_pago = random.choice(metodos_pago)

            # Seleccionar vehículo aleatoriamente (o None)
            vehiculo = random.choice(vehiculos) if vehiculos and random.random() < 0.3 else None

            # Generar observaciones aleatorias (50% de probabilidad)
            observaciones = None
            if random.random() < 0.5:
                observaciones_list = [
                    'Gasto aprobado',
                    'Pendiente de revisión',
                    'Comprobante adjunto',
                    'Gasto recurrente',
                    'Gasto extraordinario',
                ]
                observaciones = random.choice(observaciones_list)

            # Crear el gasto
            try:
                gasto = GastoOperativo.objects.create(
                    categoria=categoria,
                    descripcion=descripcion,
                    monto=monto,
                    fecha_gasto=fecha_gasto,
                    metodo_pago=metodo_pago,
                    vehiculo=vehiculo,
                    observaciones=observaciones,
                    registrado_por=admin,
                )
                gastos_creados += 1

                if (i + 1) % 20 == 0:
                    self.stdout.write(f'  Creados {i + 1}/{cantidad} gastos...')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error al crear gasto {i + 1}: {str(e)}')
                )

        # Mostrar estadísticas
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Se crearon {gastos_creados} gastos operativos exitosamente.'))

        # Mostrar resumen por período
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Resumen de gastos creados:'))
        
        # Esta semana
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        fin_semana = inicio_semana + timedelta(days=6)
        gastos_semana = GastoOperativo.objects.filter(
            fecha_gasto__gte=inicio_semana,
            fecha_gasto__lte=fin_semana
        ).count()
        
        # Este mes
        primer_dia_mes = hoy.replace(day=1)
        gastos_mes = GastoOperativo.objects.filter(
            fecha_gasto__gte=primer_dia_mes
        ).count()
        
        # Este año
        primer_dia_ano = hoy.replace(month=1, day=1)
        gastos_ano = GastoOperativo.objects.filter(
            fecha_gasto__gte=primer_dia_ano
        ).count()
        
        # Total
        total_gastos = GastoOperativo.objects.count()
        total_monto = GastoOperativo.objects.aggregate(total=Sum('monto'))['total'] or 0

        self.stdout.write(f'  - Esta semana: {gastos_semana} gastos')
        self.stdout.write(f'  - Este mes: {gastos_mes} gastos')
        self.stdout.write(f'  - Este año: {gastos_ano} gastos')
        self.stdout.write(f'  - Total en BD: {total_gastos} gastos')
        self.stdout.write(f'  - Monto total: ${total_monto:,.0f}')

