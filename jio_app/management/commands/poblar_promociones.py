from django.core.management.base import BaseCommand
from django.utils import timezone
from jio_app.models import Promocion, Juego
from decimal import Decimal
from datetime import datetime, timedelta
import random
import string


class Command(BaseCommand):
    help = 'Genera datos de prueba de promociones con diferentes estados, tipos y fechas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cantidad',
            type=int,
            default=30,
            help='Cantidad total de promociones a generar (default: 30)'
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Elimina todas las promociones existentes antes de crear nuevas'
        )

    def generar_codigo_unico(self):
        """Genera un código único para la promoción"""
        while True:
            # Generar código aleatorio
            prefijos = ['DESC', 'PROMO', 'CUPON', 'OFERTA', 'VERANO', 'INVIERNO', 'NAVIDAD', 'BLACK']
            prefijo = random.choice(prefijos)
            numero = random.randint(100, 9999)
            codigo = f"{prefijo}{numero}"
            
            # Verificar que no exista
            if not Promocion.objects.filter(codigo=codigo).exists():
                return codigo

    def handle(self, *args, **options):
        cantidad = options['cantidad']
        limpiar = options['limpiar']

        # Obtener juegos disponibles
        juegos = list(Juego.objects.filter(estado='Habilitado'))

        # Limpiar promociones existentes si se solicita
        if limpiar:
            count = Promocion.objects.count()
            Promocion.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Se eliminaron {count} promociones existentes.')
            )

        # Datos de prueba
        tipos_descuento = [choice[0] for choice in Promocion.TIPO_DESCUENTO_CHOICES]
        estados = [choice[0] for choice in Promocion.ESTADO_CHOICES]

        nombres_promociones = [
            'Descuento de Verano',
            'Oferta Especial',
            'Promoción Navideña',
            'Descuento Black Friday',
            'Cupón de Bienvenida',
            'Oferta de Temporada',
            'Descuento por Volumen',
            'Promoción de Fin de Mes',
            'Cupón de Fidelidad',
            'Oferta Relámpago',
            'Descuento Estudiantil',
            'Promoción de Cumpleaños',
            'Oferta de Primavera',
            'Descuento de Otoño',
            'Promoción de Invierno',
            'Cupón de Referido',
            'Oferta Flash',
            'Descuento VIP',
            'Promoción de Apertura',
            'Cupón de Aniversario',
        ]

        descripciones = [
            'Aprovecha esta increíble oferta',
            'Descuento exclusivo para clientes',
            'No te pierdas esta promoción',
            'Oferta limitada por tiempo',
            'Descuento especial de temporada',
            'Promoción válida por tiempo limitado',
            'Ahorra con esta increíble oferta',
            'Descuento disponible por tiempo limitado',
            'Oferta especial para nuevos clientes',
            'Promoción exclusiva',
            None,  # Algunas sin descripción
            None,
        ]

        hoy = timezone.now().date()
        promociones_creadas = 0

        self.stdout.write(f'Generando {cantidad} promociones...')

        # Distribuir promociones en diferentes estados
        estados_distribucion = {
            'activa': int(cantidad * 0.5),  # 50% activas
            'inactiva': int(cantidad * 0.3),  # 30% inactivas
            'expirada': int(cantidad * 0.2),  # 20% expiradas
        }

        for i in range(cantidad):
            # Seleccionar estado según distribución
            if i < estados_distribucion['activa']:
                estado = 'activa'
            elif i < estados_distribucion['activa'] + estados_distribucion['inactiva']:
                estado = 'inactiva'
            else:
                estado = 'expirada'

            # Generar código único
            codigo = self.generar_codigo_unico()
            
            # Seleccionar nombre
            nombre = random.choice(nombres_promociones)
            
            # Seleccionar descripción
            descripcion = random.choice(descripciones)
            
            # Seleccionar tipo de descuento
            tipo_descuento = random.choice(tipos_descuento)
            
            # Generar valor según tipo
            if tipo_descuento == 'porcentaje':
                valor_descuento = Decimal(str(random.randint(5, 50)))  # 5% a 50%
            elif tipo_descuento == 'monto_fijo':
                valor_descuento = Decimal(str(random.randint(5000, 50000)))  # $5,000 a $50,000
            else:  # 2x1 o envio_gratis
                valor_descuento = Decimal('0')
            
            # Generar fechas según estado
            if estado == 'activa':
                # Promociones activas: algunas ya empezaron, algunas empiezan hoy o en el futuro
                dias_inicio = random.randint(-30, 30)  # Hasta 30 días atrás o adelante
                fecha_inicio = hoy + timedelta(days=dias_inicio)
                dias_duracion = random.randint(7, 90)  # Duración de 7 a 90 días
                fecha_fin = fecha_inicio + timedelta(days=dias_duracion)
            elif estado == 'inactiva':
                # Promociones inactivas: pueden estar en cualquier fecha
                dias_inicio = random.randint(-60, 60)
                fecha_inicio = hoy + timedelta(days=dias_inicio)
                dias_duracion = random.randint(7, 90)
                fecha_fin = fecha_inicio + timedelta(days=dias_duracion)
            else:  # expirada
                # Promociones expiradas: fechas pasadas
                dias_fin = random.randint(1, 180)  # Expiraron hace 1 a 180 días
                fecha_fin = hoy - timedelta(days=dias_fin)
                dias_duracion = random.randint(7, 90)
                fecha_inicio = fecha_fin - timedelta(days=dias_duracion)
            
            # Monto mínimo (algunas con, algunas sin)
            if random.random() < 0.4:  # 40% con monto mínimo
                monto_minimo = Decimal(str(random.randint(20000, 200000)))
            else:
                monto_minimo = Decimal('0')
            
            # Límite de usos (algunas ilimitadas, algunas limitadas)
            if random.random() < 0.6:  # 60% con límite
                limite_usos = random.randint(10, 100)
            else:
                limite_usos = 0  # Ilimitado
            
            # Usos actuales (si tiene límite, algunos usos ya realizados)
            if limite_usos > 0:
                usos_actuales = random.randint(0, int(limite_usos * 0.8))  # Hasta 80% usado
            else:
                usos_actuales = random.randint(0, 50)
            
            # Seleccionar juegos (algunas aplican a todos, algunas a juegos específicos)
            juegos_aplicables = []
            if juegos and random.random() < 0.4:  # 40% aplican a juegos específicos
                cantidad_juegos = random.randint(1, min(5, len(juegos)))
                juegos_aplicables = random.sample(juegos, cantidad_juegos)

            # Crear la promoción
            try:
                promocion = Promocion.objects.create(
                    codigo=codigo,
                    nombre=nombre,
                    descripcion=descripcion,
                    tipo_descuento=tipo_descuento,
                    valor_descuento=valor_descuento,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    monto_minimo=monto_minimo,
                    limite_usos=limite_usos,
                    usos_actuales=usos_actuales,
                    estado=estado,
                )
                
                # Asignar juegos si se seleccionaron
                if juegos_aplicables:
                    promocion.juegos.set(juegos_aplicables)
                
                promociones_creadas += 1

                if (i + 1) % 10 == 0:
                    self.stdout.write(f'  Creadas {i + 1}/{cantidad} promociones...')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error al crear promoción {i + 1}: {str(e)}')
                )

        # Mostrar estadísticas
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Se crearon {promociones_creadas} promociones exitosamente.'))

        # Mostrar resumen por estado
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Resumen de promociones creadas:'))
        
        total_promociones = Promocion.objects.count()
        activas = Promocion.objects.filter(estado='activa').count()
        inactivas = Promocion.objects.filter(estado='inactiva').count()
        expiradas = Promocion.objects.filter(estado='expirada').count()
        
        self.stdout.write(f'  - Total en BD: {total_promociones} promociones')
        self.stdout.write(f'  - Activas: {activas} promociones')
        self.stdout.write(f'  - Inactivas: {inactivas} promociones')
        self.stdout.write(f'  - Expiradas: {expiradas} promociones')
        
        # Mostrar por tipo de descuento
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Distribución por tipo de descuento:'))
        for tipo, label in Promocion.TIPO_DESCUENTO_CHOICES:
            count = Promocion.objects.filter(tipo_descuento=tipo).count()
            self.stdout.write(f'  - {label}: {count} promociones')

