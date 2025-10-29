from django.core.management.base import BaseCommand
from jio_app.models import Juego

class Command(BaseCommand):
    help = 'Crea juegos inflables de ejemplo en la base de datos'

    def handle(self, *args, **options):
        juegos_ejemplo = [
            {
                'nombre': 'Juego 2en1',
                'descripcion': 'Doble diversión en un solo juego. Perfecto para espacios reducidos y eventos íntimos.',
                'categoria': 'combo',
                'dimensiones': '4.5m x 3m x 2m',
                'capacidad_personas': 6,
                'peso_maximo': 200,
                'precio_base': 25000.00,
                'foto': 'images/juegos_inflables/JI_2en1.jpg',
                'estado': 'disponible'
            },
            {
                'nombre': 'Juego 3en1',
                'descripcion': 'Triple diversión combinada. Ideal para eventos pequeños con máxima variedad de entretenimiento.',
                'categoria': 'combo',
                'dimensiones': '3m x 3m x 2m',
                'capacidad_personas': 8,
                'peso_maximo': 250,
                'precio_base': 30000.00,
                'foto': 'images/juegos_inflables/JI_3en1.jpg',
                'estado': 'disponible'
            },
            {
                'nombre': 'Juego Block',
                'descripcion': 'Desafíos y construcción en un juego inflable. Desarrolla la creatividad y coordinación de los niños.',
                'categoria': 'infantil',
                'dimensiones': '4m x 3m x 3.5m',
                'capacidad_personas': 10,
                'peso_maximo': 300,
                'precio_base': 35000.00,
                'foto': 'images/juegos_inflables/JI_block.jpg',
                'estado': 'disponible'
            },
            {
                'nombre': 'Juego Fantasía',
                'descripcion': 'Un mundo mágico de diversión donde los niños pueden explorar y soñar sin límites.',
                'categoria': 'castillo',
                'dimensiones': '6m x 4m x 4m',
                'capacidad_personas': 12,
                'peso_maximo': 350,
                'precio_base': 40000.00,
                'foto': 'images/juegos_inflables/JI_fantasia.jpg',
                'estado': 'disponible'
            },
            {
                'nombre': 'Juego Candy',
                'descripcion': 'Dulce diversión con colores vibrantes. Perfecto para fiestas temáticas y celebraciones coloridas.',
                'categoria': 'infantil',
                'dimensiones': '4m x 3m x 4m',
                'capacidad_personas': 10,
                'peso_maximo': 280,
                'precio_base': 35000.00,
                'foto': 'images/juegos_inflables/JI_candy.jpg',
                'estado': 'disponible'
            },
            {
                'nombre': 'Juego Túnel',
                'descripcion': 'Emoción y aventura en cada paso. Un túnel de diversión que desafía la imaginación de los niños.',
                'categoria': 'obstaculos',
                'dimensiones': '7m x 5m x 5m',
                'capacidad_personas': 15,
                'peso_maximo': 400,
                'precio_base': 50000.00,
                'foto': 'images/juegos_inflables/JI_tunel.jpg',
                'estado': 'disponible'
            },
            {
                'nombre': 'Juego Arco',
                'descripcion': 'Diversión en forma de arco con múltiples actividades. Ideal para eventos grandes y espacios amplios.',
                'categoria': 'castillo',
                'dimensiones': '6m x 4m x 5m',
                'capacidad_personas': 20,
                'peso_maximo': 450,
                'precio_base': 60000.00,
                'foto': 'images/juegos_inflables/JI_arco.jpg',
                'estado': 'disponible'
            }
        ]

        juegos_creados = 0
        for juego_data in juegos_ejemplo:
            juego, created = Juego.objects.get_or_create(
                nombre=juego_data['nombre'],
                defaults=juego_data
            )
            if created:
                juegos_creados += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Juego creado: {juego.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Juego ya existe: {juego.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSe crearon {juegos_creados} juegos nuevos.')
        )
