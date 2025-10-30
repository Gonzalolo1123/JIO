import os
from django.core.management.base import BaseCommand
from django.conf import settings
from jio_app.models import Juego
import shutil

class Command(BaseCommand):
    help = 'Pobla la base de datos con los juegos inflables iniciales'

    def handle(self, *args, **kwargs):
        juegos_data = [
            {
                'nombre': 'Juego 2en1',
                'descripcion': 'Doble diversión en un solo juego. Perfecto para espacios reducidos y eventos íntimos.',
                'categoria': 'Pequeño',
                'dimensiones': '4.5m x 3m x 2m',
                'capacidad_personas': 6,
                'peso_maximo': 180,
                'precio_base': 25000,
                'foto_nombre': 'JI_2en1.jpg',
                'estado': 'habilitado'
            },
            {
                'nombre': 'Juego 3en1',
                'descripcion': 'Triple diversión combinada. Ideal para eventos pequeños con máxima variedad de entretenimiento.',
                'categoria': 'Pequeño',
                'dimensiones': '3m x 3m x 2m',
                'capacidad_personas': 8,
                'peso_maximo': 240,
                'precio_base': 30000,
                'foto_nombre': 'JI_3en1.jpg',
                'estado': 'habilitado'
            },
            {
                'nombre': 'Juego Block',
                'descripcion': 'Desafíos y construcción en un juego inflable. Desarrolla la creatividad y coordinación de los niños.',
                'categoria': 'Mediano',
                'dimensiones': '4m x 3m x 3.5m',
                'capacidad_personas': 10,
                'peso_maximo': 300,
                'precio_base': 35000,
                'foto_nombre': 'JI_block.jpg',
                'estado': 'habilitado'
            },
            {
                'nombre': 'Juego Fantasía',
                'descripcion': 'Un mundo mágico de diversión donde los niños pueden explorar y soñar sin límites.',
                'categoria': 'Mediano',
                'dimensiones': '6m x 4m x 4m',
                'capacidad_personas': 12,
                'peso_maximo': 360,
                'precio_base': 40000,
                'foto_nombre': 'JI_fantasia.jpg',
                'estado': 'habilitado'
            },
            {
                'nombre': 'Juego Candy',
                'descripcion': 'Dulce diversión con colores vibrantes. Perfecto para fiestas temáticas y celebraciones coloridas.',
                'categoria': 'Mediano',
                'dimensiones': '4m x 3m x 4m',
                'capacidad_personas': 10,
                'peso_maximo': 300,
                'precio_base': 35000,
                'foto_nombre': 'JI_candy.jpg',
                'estado': 'habilitado'
            },
            {
                'nombre': 'Juego Túnel',
                'descripcion': 'Emoción y aventura en cada paso. Un túnel de diversión que desafía la imaginación de los niños.',
                'categoria': 'Grande',
                'dimensiones': '7m x 5m x 5m',
                'capacidad_personas': 15,
                'peso_maximo': 450,
                'precio_base': 50000,
                'foto_nombre': 'JI_tunel.jpg',
                'estado': 'habilitado'
            },
            {
                'nombre': 'Juego Arco',
                'descripcion': 'Diversión en forma de arco con múltiples actividades. Ideal para eventos grandes y espacios amplios.',
                'categoria': 'Grande',
                'dimensiones': '6m x 4m x 5m',
                'capacidad_personas': 20,
                'peso_maximo': 600,
                'precio_base': 60000,
                'foto_nombre': 'JI_arco.jpg',
                'estado': 'habilitado'
            },
        ]

        # Crear carpeta media/juegos si no existe
        juegos_dir = os.path.join(settings.MEDIA_ROOT, 'juegos')
        os.makedirs(juegos_dir, exist_ok=True)

        for juego_data in juegos_data:
            # Verificar si el juego ya existe
            if Juego.objects.filter(nombre=juego_data['nombre']).exists():
                self.stdout.write(
                    self.style.WARNING(f'El juego "{juego_data["nombre"]}" ya existe, omitiendo...')
                )
                continue

            # Copiar imagen desde static a media
            foto_nombre = juego_data.pop('foto_nombre')
            foto_origen = os.path.join(
                settings.BASE_DIR, 
                'jio_app', 
                'static', 
                'images', 
                'juegos_inflables', 
                foto_nombre
            )
            foto_destino = os.path.join(juegos_dir, foto_nombre)

            # Copiar solo si el archivo origen existe y el destino no existe
            if os.path.exists(foto_origen):
                if not os.path.exists(foto_destino):
                    shutil.copy2(foto_origen, foto_destino)
                    self.stdout.write(
                        self.style.SUCCESS(f'Imagen "{foto_nombre}" copiada a media/juegos/')
                    )
                foto_path = f'juegos/{foto_nombre}'
            else:
                self.stdout.write(
                    self.style.WARNING(f'Imagen "{foto_nombre}" no encontrada en static')
                )
                foto_path = None

            # Crear el juego
            juego = Juego.objects.create(
                **juego_data,
                foto=foto_path
            )

            self.stdout.write(
                self.style.SUCCESS(f'✓ Juego "{juego.nombre}" creado exitosamente')
            )

        self.stdout.write(
            self.style.SUCCESS('\n¡Todos los juegos han sido poblados exitosamente!')
        )

