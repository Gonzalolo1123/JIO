# -*- coding: utf-8 -*-
import os
import django
import sys

if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'JIO.settings')
django.setup()

from jio_app.models import Usuario

print("\n" + "="*60)
print("ESTABLECER CONTRASEÑAS PARA REPARTIDORES")
print("="*60)

# Contraseña simple para todos los repartidores
CONTRASEÑA = "repartidor123"

# Obtener todos los repartidores
repartidores = Usuario.objects.filter(tipo_usuario='repartidor')

print(f"\n📋 Repartidores encontrados: {repartidores.count()}")

if repartidores.count() == 0:
    print("❌ No se encontraron repartidores en el sistema")
else:
    print(f"\n🔐 Estableciendo contraseña: '{CONTRASEÑA}' para todos\n")
    
    for rep in repartidores:
        rep.set_password(CONTRASEÑA)
        rep.save()
        print(f"✅ {rep.get_full_name()}")
        print(f"   Usuario: {rep.username}")
        print(f"   Contraseña: {CONTRASEÑA}")
        print(f"   Email: {rep.email}")
        if hasattr(rep, 'repartidor'):
            print(f"   Vehículo: {rep.repartidor.vehiculo}")
            print(f"   Estado: {rep.repartidor.get_estado_display()}")
        print()

print("="*60)
print("✅ Contraseñas actualizadas exitosamente")
print("="*60)
print("\n💡 Usa estos datos para iniciar sesión:")
print(f"   URL: /login_jio/")
print(f"   Usuario: [username del repartidor]")
print(f"   Contraseña: {CONTRASEÑA}")
print("\n")

