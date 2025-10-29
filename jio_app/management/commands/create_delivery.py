from django.core.management.base import BaseCommand
from jio_app.models import Usuario, Repartidor


class Command(BaseCommand):
    help = 'Crea un usuario repartidor y su perfil Repartidor'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='repartidor@jio.cl', help='Email del repartidor')
        parser.add_argument('--password', type=str, default='reparto123', help='Contraseña del repartidor')
        parser.add_argument('--username', type=str, default='repartidor1', help='Username del repartidor')
        parser.add_argument('--first-name', type=str, default='Repartidor', help='Nombre del repartidor')
        parser.add_argument('--last-name', type=str, default='JIO', help='Apellido del repartidor')
        parser.add_argument('--telefono', type=str, default='', help='Teléfono del repartidor')
        parser.add_argument('--licencia', type=str, default='', help='Número de licencia de conducir')
        parser.add_argument('--vehiculo', type=str, default='', help='Vehículo del repartidor')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        username = options['username']
        first_name = options['first_name']
        last_name = options['last_name']
        telefono = options['telefono']
        licencia = options['licencia']
        vehiculo = options['vehiculo']

        if Usuario.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'El usuario con email {email} ya existe.'))
            return

        if Usuario.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'El usuario con username {username} ya existe.'))
            return

        try:
            usuario = Usuario.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                tipo_usuario='repartidor',
                is_active=True,
            )

            if telefono:
                usuario.telefono = telefono
                usuario.save(update_fields=['telefono'])

            repartidor = Repartidor.objects.create(
                usuario=usuario,
                licencia_conducir=licencia or None,
                vehiculo=vehiculo or None,
                estado='disponible',
            )

            self.stdout.write(self.style.SUCCESS(
                'Repartidor creado exitosamente:\n'
                f'   - Username: {username}\n'
                f'   - Email: {email}\n'
                f'   - Nombre: {first_name} {last_name}\n'
                '   - Tipo: Repartidor\n'
                f'   - Licencia: {repartidor.licencia_conducir or "-"}\n'
                f'   - Vehículo: {repartidor.vehiculo or "-"}'
            ))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error al crear el repartidor: {str(e)}'))


