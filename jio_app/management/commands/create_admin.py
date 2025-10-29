from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from jio_app.models import Usuario

class Command(BaseCommand):
    help = 'Crea un usuario administrador'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='admin2@jio.cl',
            help='Email del administrador'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Contraseña del administrador'
        )
        parser.add_argument(
            '--username',
            type=str,
            default='admin2',
            help='Username del administrador'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='Admin',
            help='Nombre del administrador'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            default='JIO',
            help='Apellido del administrador'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        username = options['username']
        first_name = options['first_name']
        last_name = options['last_name']

        # Verificar si el usuario ya existe
        if Usuario.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'El usuario con email {email} ya existe.')
            )
            return

        if Usuario.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'El usuario con username {username} ya existe.')
            )
            return

        try:
            # Crear el usuario administrador
            usuario = Usuario.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                tipo_usuario='administrador',
                is_staff=True,
                is_superuser=True,
                is_active=True
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Usuario administrador creado exitosamente:\n'
                    f'   - Username: {username}\n'
                    f'   - Email: {email}\n'
                    f'   - Nombre: {first_name} {last_name}\n'
                    f'   - Tipo: Administrador\n'
                    f'   - Staff: {usuario.is_staff}\n'
                    f'   - Superuser: {usuario.is_superuser}'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error al crear el usuario: {str(e)}')
            )
