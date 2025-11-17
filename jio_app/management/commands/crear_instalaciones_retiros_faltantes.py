import os
from django.core.management.base import BaseCommand
from django.db import transaction
from jio_app.models import Reserva, Instalacion, Retiro


class Command(BaseCommand):
    help = 'Crea instalaciones y retiros faltantes para arriendos existentes que no los tienen'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Buscando arriendos sin instalaciones o retiros...'))
        
        reservas_sin_instalacion = Reserva.objects.filter(instalacion__isnull=True)
        reservas_sin_retiro = Reserva.objects.filter(retiro__isnull=True)
        
        total_sin_instalacion = reservas_sin_instalacion.count()
        total_sin_retiro = reservas_sin_retiro.count()
        
        self.stdout.write(f'  - Arriendos sin instalación: {total_sin_instalacion}')
        self.stdout.write(f'  - Arriendos sin retiro: {total_sin_retiro}')
        
        if total_sin_instalacion == 0 and total_sin_retiro == 0:
            self.stdout.write(self.style.SUCCESS('✓ Todos los arriendos ya tienen instalaciones y retiros'))
            return
        
        instalaciones_creadas = 0
        retiros_creados = 0
        
        with transaction.atomic():
            # Crear instalaciones faltantes
            for reserva in reservas_sin_instalacion:
                try:
                    Instalacion.objects.create(
                        reserva=reserva,
                        fecha_instalacion=reserva.fecha_evento,
                        hora_instalacion=reserva.hora_instalacion,
                        direccion_instalacion=reserva.direccion_evento,
                        telefono_cliente=reserva.cliente.usuario.telefono or '',
                        estado_instalacion='programada',
                        observaciones_instalacion=reserva.observaciones,
                    )
                    instalaciones_creadas += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error al crear instalación para reserva #{reserva.id}: {str(e)}'))
            
            # Crear retiros faltantes
            for reserva in reservas_sin_retiro:
                try:
                    Retiro.objects.create(
                        reserva=reserva,
                        fecha_retiro=reserva.fecha_evento,
                        hora_retiro=reserva.hora_retiro,
                        estado_retiro='programado',
                        observaciones_retiro=reserva.observaciones,
                    )
                    retiros_creados += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error al crear retiro para reserva #{reserva.id}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Proceso completado:'))
        self.stdout.write(self.style.SUCCESS(f'  - Instalaciones creadas: {instalaciones_creadas}'))
        self.stdout.write(self.style.SUCCESS(f'  - Retiros creados: {retiros_creados}'))

