from django.core.management.base import BaseCommand
from django.utils import timezone
from punto_app.models import VerificacionCorreo, Cliente
import logging

logger = logging.getLogger('punto_app')

class Command(BaseCommand):
    help = 'Limpia clientes temporales y verificaciones de correo expiradas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se eliminaría sin ejecutar la eliminación',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        try:
            # Encontrar verificaciones expiradas
            verificaciones_expiradas = VerificacionCorreo.objects.filter(
                fecha_expiracion__lt=timezone.now()
            )
            
            # Encontrar clientes temporales asociados a verificaciones expiradas
            clientes_temporales = Cliente.objects.filter(
                verificacioncorreo__in=verificaciones_expiradas,
                nombre='Temporal',
                apellido='Usuario',
                estado='Pendiente'
            ).distinct()
            
            # Encontrar clientes temporales sin verificaciones
            clientes_sin_verificacion = Cliente.objects.filter(
                nombre='Temporal',
                apellido='Usuario',
                estado='Pendiente'
            ).exclude(
                verificacioncorreo__isnull=False
            )
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'DRY RUN: Se eliminarían {verificaciones_expiradas.count()} verificaciones expiradas'
                    )
                )
                self.stdout.write(
                    self.style.WARNING(
                        f'DRY RUN: Se eliminarían {clientes_temporales.count()} clientes temporales con verificaciones expiradas'
                    )
                )
                self.stdout.write(
                    self.style.WARNING(
                        f'DRY RUN: Se eliminarían {clientes_sin_verificacion.count()} clientes temporales sin verificaciones'
                    )
                )
            else:
                # Eliminar verificaciones expiradas
                verificaciones_count = verificaciones_expiradas.count()
                verificaciones_expiradas.delete()
                
                # Eliminar clientes temporales sin verificaciones
                clientes_sin_verificacion_count = clientes_sin_verificacion.count()
                clientes_sin_verificacion.delete()
                
                # Eliminar clientes temporales con verificaciones expiradas
                clientes_temporales_count = clientes_temporales.count()
                clientes_temporales.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Limpieza completada: {verificaciones_count} verificaciones, '
                        f'{clientes_temporales_count} clientes temporales con verificaciones expiradas, '
                        f'{clientes_sin_verificacion_count} clientes temporales sin verificaciones eliminados'
                    )
                )
                
                logger.info(
                    f'Limpieza automática completada: {verificaciones_count} verificaciones, '
                    f'{clientes_temporales_count + clientes_sin_verificacion_count} clientes temporales eliminados'
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error durante la limpieza: {str(e)}')
            )
            logger.error(f'Error en comando limpiar_datos_temporales: {str(e)}') 