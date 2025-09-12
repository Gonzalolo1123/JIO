from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Arregla el orden de las migraciones problemáticas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔧 Iniciando arreglo del orden de migraciones...'))
        
        try:
            with connection.cursor() as cursor:
                # Verificar si existe la tabla de migraciones
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'django_migrations'
                """)
                
                if cursor.fetchone():
                    # Obtener todas las migraciones de punto_app
                    cursor.execute("""
                        SELECT app, name FROM django_migrations 
                        WHERE app = 'punto_app' 
                        ORDER BY name
                    """)
                    
                    migrations = cursor.fetchall()
                    applied_migrations = [m[1] for m in migrations]
                    self.stdout.write(f'📋 Migraciones aplicadas: {applied_migrations}')
                    
                    # Si 0002 está aplicada pero 0001 no, removemos 0002
                    if '0002_alter_cliente_contrasena' in applied_migrations and '0001_initial' not in applied_migrations:
                        self.stdout.write(self.style.WARNING('⚠️  Detectada migración 0002 sin 0001, removiendo 0002...'))
                        cursor.execute("""
                            DELETE FROM django_migrations 
                            WHERE app = 'punto_app' AND name = '0002_alter_cliente_contrasena'
                        """)
                        self.stdout.write(self.style.SUCCESS('✅ Migración 0002 removida'))
                    
                    # Si hay otras migraciones que dependen de 0001 pero 0001 no está aplicada
                    problematic_migrations = [
                        '0003_alter_cliente_apellido_alter_cliente_contrasena_and_more',
                        '0004_alter_administrador_nivel_acceso_and_more',
                        '0005_alter_administrador_nivel_acceso_and_more',
                        '0006_alter_administrador_nivel_acceso_and_more',
                        '0007_alter_administrador_nivel_acceso_and_more',
                        '0008_alter_administrador_nivel_acceso_and_more',
                        '0009_alter_categoriaproducto_descripcion_and_more',
                        '0010_administrador_id_cliente',
                        '0011_remove_administrador_id_cliente',
                        '0012_administrador_cliente',
                        '0013_remove_administrador_cliente_curso_inscripcion',
                        '0014_administrador_id_cliente',
                        '0015_rename_id_cliente_administrador_cliente',
                        '0016_inscripcion_fecha_realizacion_and_more'
                    ]
                    
                    for migration in problematic_migrations:
                        if migration in applied_migrations and '0001_initial' not in applied_migrations:
                            self.stdout.write(self.style.WARNING(f'⚠️  Removiendo migración {migration} que depende de 0001...'))
                            cursor.execute("""
                                DELETE FROM django_migrations 
                                WHERE app = 'punto_app' AND name = %s
                            """, [migration])
                            self.stdout.write(self.style.SUCCESS(f'✅ Migración {migration} removida'))
                    
                    self.stdout.write(self.style.SUCCESS('✅ Orden de migraciones arreglado'))
                else:
                    self.stdout.write(self.style.WARNING('ℹ️  Tabla django_migrations no encontrada, continuando...'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error al arreglar migraciones: {e}'))
            # No fallamos el build por esto, solo registramos el error
            pass 