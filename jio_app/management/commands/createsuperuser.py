"""
Comando personalizado para crear superusuarios con tipo_usuario='administrador'
"""
from django.contrib.auth.management.commands import createsuperuser as BaseCommand
from django.core.exceptions import ValidationError


class Command(BaseCommand):
    """Extiende el comando createsuperuser para configurar tipo_usuario automáticamente"""
    
    def handle(self, *args, **options):
        # Llamar al método padre para crear el usuario
        super().handle(*args, **options)
        
        # Obtener el último usuario creado (debería ser el que acabamos de crear)
        from jio_app.models import Usuario
        try:
            # Obtener el username del usuario recién creado
            username = options.get('username')
            if username:
                try:
                    user = Usuario.objects.get(username=username)
                    # Si no tiene tipo_usuario='administrador', actualizarlo
                    if user.tipo_usuario != 'administrador':
                        user.tipo_usuario = 'administrador'
                        user.save(update_fields=['tipo_usuario'])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Usuario '{username}' configurado como administrador."
                            )
                        )
                except Usuario.DoesNotExist:
                    pass
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Advertencia: No se pudo configurar tipo_usuario: {e}")
            )

