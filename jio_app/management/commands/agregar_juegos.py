"""
Script para agregar juegos inflables a la base de datos.

Uso:
    python manage.py agregar_juegos
    python manage.py agregar_juegos --cantidad 10
    python manage.py agregar_juegos --categoria Pequeño
"""

from django.core.management.base import BaseCommand
from jio_app.models import Juego
import random


class Command(BaseCommand):
    help = 'Agrega juegos inflables a la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cantidad',
            type=int,
            default=5,
            help='Cantidad de juegos a crear (default: 5)'
        )
        parser.add_argument(
            '--categoria',
            type=str,
            choices=['Pequeño', 'Mediano', 'Grande'],
            help='Filtrar por categoría específica'
        )
        parser.add_argument(
            '--estado',
            type=str,
            choices=['Habilitado', 'Deshabilitado'],
            default='Habilitado',
            help='Estado de los juegos (default: Habilitado)'
        )

    def handle(self, *args, **options):
        cantidad = options['cantidad']
        categoria_filtro = options.get('categoria')
        estado = options['estado']

        # Datos de ejemplo para generar juegos
        nombres_base = [
            'Castillo Inflable', 'Tobogán Gigante', 'Laberinto Mágico',
            'Parque Aventura', 'Combo Diversión', 'Mundo Fantasía',
            'Juego 2en1', 'Juego 3en1', 'Castillo Princesa', 'Castillo Medieval',
            'Tobogán Acuático', 'Carrera Obstáculos', 'Cancha Fútbol',
            'Ring Boxeo', 'Pista Atletismo', 'Juego Block', 'Juego Candy',
            'Juego Túnel', 'Juego Arco', 'Parque Infantil', 'Mundo Mágico',
            'Aventura Espacial', 'Castillo Pirata', 'Tobogán Doble',
            'Laberinto Obstáculos', 'Pista Obstáculos', 'Combo Mega',
            'Combo Familiar', 'Juego Fantasía', 'Castillo Espacial'
        ]

        descripciones = [
            'Diversión garantizada para toda la familia',
            'Perfecto para eventos y celebraciones',
            'Ideal para espacios amplios',
            'Diseñado para máxima seguridad',
            'Colores vibrantes y atractivos',
            'Múltiples actividades en un solo juego',
            'Perfecto para fiestas temáticas',
            'Diversión sin límites para los niños',
            'Juego inflable de alta calidad',
            'Experiencia única de entretenimiento'
        ]

        # Configuraciones por categoría
        configuraciones = {
            'Pequeño': {
                'dimension_largo': (3.0, 4.5),
                'dimension_ancho': (2.5, 3.5),
                'dimension_alto': (2.0, 3.0),
                'capacidad_personas': (4, 8),
                'peso_maximo': (150, 250),
                'precio_base': (20000, 35000),
                'edad_minima': (2, 4),
                'edad_maxima': (8, 12)
            },
            'Mediano': {
                'dimension_largo': (4.5, 6.5),
                'dimension_ancho': (3.5, 4.5),
                'dimension_alto': (3.0, 4.5),
                'capacidad_personas': (8, 15),
                'peso_maximo': (250, 400),
                'precio_base': (35000, 50000),
                'edad_minima': (3, 5),
                'edad_maxima': (10, 14)
            },
            'Grande': {
                'dimension_largo': (6.5, 10.0),
                'dimension_ancho': (4.5, 6.0),
                'dimension_alto': (4.5, 6.0),
                'capacidad_personas': (15, 25),
                'peso_maximo': (400, 700),
                'precio_base': (50000, 80000),
                'edad_minima': (4, 6),
                'edad_maxima': (12, 16)
            }
        }

        categorias = ['Pequeño', 'Mediano', 'Grande']
        if categoria_filtro:
            categorias = [categoria_filtro]

        juegos_creados = 0
        juegos_existentes = 0
        errores = []

        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('Iniciando creación de juegos...'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))

        for i in range(cantidad):
            # Seleccionar categoría aleatoria si no hay filtro
            categoria = random.choice(categorias)
            config = configuraciones[categoria]

            # Generar nombre único
            nombre_base = random.choice(nombres_base)
            contador = 1
            nombre = nombre_base
            while Juego.objects.filter(nombre=nombre).exists():
                nombre = f"{nombre_base} {contador}"
                contador += 1

            # Generar datos aleatorios según la categoría
            try:
                juego = Juego.objects.create(
                    nombre=nombre,
                    descripcion=random.choice(descripciones),
                    categoria=categoria,
                    edad_minima=random.randint(*config['edad_minima']),
                    edad_maxima=random.randint(*config['edad_maxima']),
                    dimension_largo=round(random.uniform(*config['dimension_largo']), 1),
                    dimension_ancho=round(random.uniform(*config['dimension_ancho']), 1),
                    dimension_alto=round(random.uniform(*config['dimension_alto']), 1),
                    capacidad_personas=random.randint(*config['capacidad_personas']),
                    peso_maximo=random.randint(*config['peso_maximo']),
                    precio_base=random.randint(*config['precio_base']),
                    estado=estado,
                    foto=None  # Se puede agregar después
                )

                juegos_creados += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[OK] [{juegos_creados}] Juego "{juego.nombre}" creado '
                        f'({categoria} - ${juego.precio_base:,} CLP)'
                    )
                )

            except Exception as e:
                errores.append(f"Error al crear juego '{nombre}': {str(e)}")
                self.stdout.write(
                    self.style.ERROR(f'[ERROR] Error al crear juego "{nombre}": {str(e)}')
                )

        # Resumen
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('RESUMEN:'))
        self.stdout.write(self.style.SUCCESS(f'  • Juegos creados: {juegos_creados}'))
        if errores:
            self.stdout.write(self.style.WARNING(f'  • Errores: {len(errores)}'))
            for error in errores:
                self.stdout.write(self.style.ERROR(f'    - {error}'))
        
        total_juegos = Juego.objects.count()
        self.stdout.write(self.style.SUCCESS(f'  • Total de juegos en BD: {total_juegos}'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))

