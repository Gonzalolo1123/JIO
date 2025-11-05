from django.core.management.base import BaseCommand
from jio_app.models import Juego

class Command(BaseCommand):
    help = 'Crea muchos juegos inflables con estado disponible para tener disponibilidad en el calendario'

    def handle(self, *args, **options):
        # Lista amplia de juegos inflables
        juegos_ejemplo = [
            # Castillos
            {'nombre': 'Castillo Princesa', 'descripcion': 'Castillo mágico para princesas', 'categoria': 'castillo', 'dimensiones': '5m x 4m x 3m', 'capacidad_personas': 10, 'peso_maximo': 300, 'precio_base': 45000, 'foto': 'images/juegos_inflables/JI_arco.jpg', 'estado': 'disponible'},
            {'nombre': 'Castillo Medieval', 'descripcion': 'Castillo de caballeros', 'categoria': 'castillo', 'dimensiones': '6m x 5m x 4m', 'capacidad_personas': 15, 'peso_maximo': 400, 'precio_base': 55000, 'foto': 'images/juegos_inflables/JI_fantasia.jpg', 'estado': 'disponible'},
            {'nombre': 'Castillo Espacial', 'descripcion': 'Castillo futurista', 'categoria': 'castillo', 'dimensiones': '5.5m x 4.5m x 3.5m', 'capacidad_personas': 12, 'peso_maximo': 350, 'precio_base': 50000, 'foto': 'images/juegos_inflables/JI_block.jpg', 'estado': 'disponible'},
            {'nombre': 'Castillo Pirata', 'descripcion': 'Castillo temático pirata', 'categoria': 'castillo', 'dimensiones': '6m x 4m x 4m', 'capacidad_personas': 14, 'peso_maximo': 380, 'precio_base': 52000, 'foto': 'images/juegos_inflables/JI_candy.jpg', 'estado': 'disponible'},
            
            # Toboganes
            {'nombre': 'Tobogán Grande', 'descripcion': 'Tobogán de gran altura', 'categoria': 'tobogan', 'dimensiones': '8m x 3m x 5m', 'capacidad_personas': 8, 'peso_maximo': 250, 'precio_base': 48000, 'foto': 'images/juegos_inflables/JI_tunel.jpg', 'estado': 'disponible'},
            {'nombre': 'Tobogán Acuático', 'descripcion': 'Tobogán con piscina', 'categoria': 'tobogan', 'dimensiones': '7m x 4m x 4m', 'capacidad_personas': 10, 'peso_maximo': 300, 'precio_base': 52000, 'foto': 'images/juegos_inflables/JI_arco.jpg', 'estado': 'disponible'},
            {'nombre': 'Tobogán Doble', 'descripcion': 'Tobogán con dos pistas', 'categoria': 'tobogan', 'dimensiones': '6m x 3.5m x 4.5m', 'capacidad_personas': 12, 'peso_maximo': 320, 'precio_base': 55000, 'foto': 'images/juegos_inflables/JI_fantasia.jpg', 'estado': 'disponible'},
            
            # Obstáculos
            {'nombre': 'Carrera de Obstáculos', 'descripcion': 'Circuito de obstáculos', 'categoria': 'obstaculos', 'dimensiones': '10m x 3m x 2.5m', 'capacidad_personas': 6, 'peso_maximo': 200, 'precio_base': 40000, 'foto': 'images/juegos_inflables/JI_block.jpg', 'estado': 'disponible'},
            {'nombre': 'Laberinto Obstáculos', 'descripcion': 'Laberinto con obstáculos', 'categoria': 'obstaculos', 'dimensiones': '8m x 4m x 3m', 'capacidad_personas': 8, 'peso_maximo': 250, 'precio_base': 45000, 'foto': 'images/juegos_inflables/JI_candy.jpg', 'estado': 'disponible'},
            {'nombre': 'Pista de Obstáculos', 'descripcion': 'Pista completa de desafíos', 'categoria': 'obstaculos', 'dimensiones': '12m x 3m x 2.5m', 'capacidad_personas': 8, 'peso_maximo': 280, 'precio_base': 50000, 'foto': 'images/juegos_inflables/JI_tunel.jpg', 'estado': 'disponible'},
            
            # Combos
            {'nombre': 'Juego 2en1', 'descripcion': 'Doble diversión en un solo juego', 'categoria': 'combo', 'dimensiones': '4.5m x 3m x 2m', 'capacidad_personas': 6, 'peso_maximo': 200, 'precio_base': 25000, 'foto': 'images/juegos_inflables/JI_2en1.jpg', 'estado': 'disponible'},
            {'nombre': 'Juego 3en1', 'descripcion': 'Triple diversión combinada', 'categoria': 'combo', 'dimensiones': '3m x 3m x 2m', 'capacidad_personas': 8, 'peso_maximo': 250, 'precio_base': 30000, 'foto': 'images/juegos_inflables/JI_3en1.jpg', 'estado': 'disponible'},
            {'nombre': 'Combo Mega', 'descripcion': 'Combo con múltiples actividades', 'categoria': 'combo', 'dimensiones': '5m x 4m x 3m', 'capacidad_personas': 10, 'peso_maximo': 300, 'precio_base': 42000, 'foto': 'images/juegos_inflables/JI_fantasia.jpg', 'estado': 'disponible'},
            {'nombre': 'Combo Familiar', 'descripcion': 'Combo para toda la familia', 'categoria': 'combo', 'dimensiones': '4m x 3m x 2.5m', 'capacidad_personas': 8, 'peso_maximo': 280, 'precio_base': 38000, 'foto': 'images/juegos_inflables/JI_block.jpg', 'estado': 'disponible'},
            
            # Deportivos
            {'nombre': 'Cancha Fútbol', 'descripcion': 'Cancha inflable de fútbol', 'categoria': 'deportivo', 'dimensiones': '10m x 6m x 2m', 'capacidad_personas': 10, 'peso_maximo': 350, 'precio_base': 60000, 'foto': 'images/juegos_inflables/JI_arco.jpg', 'estado': 'disponible'},
            {'nombre': 'Ring Boxeo', 'descripcion': 'Ring de boxeo inflable', 'categoria': 'deportivo', 'dimensiones': '4m x 4m x 2.5m', 'capacidad_personas': 4, 'peso_maximo': 200, 'precio_base': 35000, 'foto': 'images/juegos_inflables/JI_candy.jpg', 'estado': 'disponible'},
            {'nombre': 'Pista Atletismo', 'descripcion': 'Pista inflable de atletismo', 'categoria': 'deportivo', 'dimensiones': '8m x 3m x 1.5m', 'capacidad_personas': 6, 'peso_maximo': 180, 'precio_base': 32000, 'foto': 'images/juegos_inflables/JI_tunel.jpg', 'estado': 'disponible'},
            
            # Infantiles
            {'nombre': 'Juego Block', 'descripcion': 'Desafíos y construcción', 'categoria': 'infantil', 'dimensiones': '4m x 3m x 3.5m', 'capacidad_personas': 10, 'peso_maximo': 300, 'precio_base': 35000, 'foto': 'images/juegos_inflables/JI_block.jpg', 'estado': 'disponible'},
            {'nombre': 'Juego Fantasía', 'descripcion': 'Mundo mágico de diversión', 'categoria': 'infantil', 'dimensiones': '6m x 4m x 4m', 'capacidad_personas': 12, 'peso_maximo': 350, 'precio_base': 40000, 'foto': 'images/juegos_inflables/JI_fantasia.jpg', 'estado': 'disponible'},
            {'nombre': 'Juego Candy', 'descripcion': 'Dulce diversión colorida', 'categoria': 'infantil', 'dimensiones': '4m x 3m x 4m', 'capacidad_personas': 10, 'peso_maximo': 280, 'precio_base': 35000, 'foto': 'images/juegos_inflables/JI_candy.jpg', 'estado': 'disponible'},
            {'nombre': 'Juego Túnel', 'descripcion': 'Túnel de aventura', 'categoria': 'infantil', 'dimensiones': '7m x 5m x 5m', 'capacidad_personas': 15, 'peso_maximo': 400, 'precio_base': 50000, 'foto': 'images/juegos_inflables/JI_tunel.jpg', 'estado': 'disponible'},
            {'nombre': 'Juego Arco', 'descripcion': 'Diversión en forma de arco', 'categoria': 'infantil', 'dimensiones': '6m x 4m x 5m', 'capacidad_personas': 20, 'peso_maximo': 450, 'precio_base': 60000, 'foto': 'images/juegos_inflables/JI_arco.jpg', 'estado': 'disponible'},
            {'nombre': 'Parque Infantil', 'descripcion': 'Parque completo para niños', 'categoria': 'infantil', 'dimensiones': '8m x 6m x 4m', 'capacidad_personas': 18, 'peso_maximo': 500, 'precio_base': 65000, 'foto': 'images/juegos_inflables/JI_fantasia.jpg', 'estado': 'disponible'},
            {'nombre': 'Mundo Mágico', 'descripcion': 'Mundo de fantasía', 'categoria': 'infantil', 'dimensiones': '5m x 4m x 3.5m', 'capacidad_personas': 12, 'peso_maximo': 320, 'precio_base': 42000, 'foto': 'images/juegos_inflables/JI_block.jpg', 'estado': 'disponible'},
            {'nombre': 'Aventura Infantil', 'descripcion': 'Aventura para los más pequeños', 'categoria': 'infantil', 'dimensiones': '4.5m x 3.5m x 3m', 'capacidad_personas': 10, 'peso_maximo': 290, 'precio_base': 38000, 'foto': 'images/juegos_inflables/JI_candy.jpg', 'estado': 'disponible'},
        ]

        juegos_creados = 0
        juegos_actualizados = 0
        
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
                # Si ya existe, actualizar el estado a 'disponible' si no lo está
                if juego.estado != 'disponible':
                    juego.estado = 'disponible'
                    juego.save()
                    juegos_actualizados += 1
                    self.stdout.write(
                        self.style.WARNING(f'Juego actualizado a disponible: {juego.nombre}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Juego ya existe: {juego.nombre}')
                    )

        total_juegos = Juego.objects.filter(estado='disponible').count()
        
        self.stdout.write(
            self.style.SUCCESS(f'\n{"="*60}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'Se crearon {juegos_creados} juegos nuevos')
        )
        if juegos_actualizados > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Se actualizaron {juegos_actualizados} juegos a disponible')
            )
        self.stdout.write(
            self.style.SUCCESS(f'Total de juegos disponibles: {total_juegos}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'{"="*60}')
        )

