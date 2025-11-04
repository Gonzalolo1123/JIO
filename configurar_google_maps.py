#!/usr/bin/env python
"""
Script para configurar Google Maps API Key fácilmente
"""

import os
import sys
from pathlib import Path

# Ruta al archivo settings.py
BASE_DIR = Path(__file__).resolve().parent
SETTINGS_FILE = BASE_DIR / 'JIO' / 'settings.py'

def configurar_api_key():
    """Guía interactiva para configurar la API key"""
    
    print("=" * 60)
    print("Configuración de Google Maps API Key")
    print("=" * 60)
    print()
    
    print("Para obtener tu API key:")
    print("1. Ve a: https://console.cloud.google.com/google/maps-apis")
    print("2. Crea un proyecto o selecciona uno existente")
    print("3. Habilita las siguientes APIs:")
    print("   - Places API")
    print("   - Maps JavaScript API")
    print("   - Geocoding API")
    print("4. Crea una API key")
    print()
    
    api_key = input("Ingresa tu Google Maps API Key (o presiona Enter para usar variable de entorno): ").strip()
    
    if not api_key:
        print()
        print("Usando variable de entorno. Configúrala con:")
        print("  Windows PowerShell: $env:GOOGLE_MAPS_API_KEY='TU_API_KEY'")
        print("  Linux/Mac: export GOOGLE_MAPS_API_KEY='TU_API_KEY'")
        return
    
    # Leer el archivo settings.py
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Buscar la línea con GOOGLE_MAPS_API_KEY
        lines = content.split('\n')
        new_lines = []
        encontrado = False
        
        for line in lines:
            if line.strip().startswith('GOOGLE_MAPS_API_KEY') and 'os.environ.get' in line:
                # Mantener la línea original como comentario y agregar la nueva
                new_lines.append(f"# GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')  # Variable de entorno")
                new_lines.append(f"GOOGLE_MAPS_API_KEY = '{api_key}'  # Configurada directamente")
                encontrado = True
            elif line.strip().startswith('GOOGLE_MAPS_API_KEY') and not line.strip().startswith('#'):
                # Reemplazar si ya existe una configuración directa
                new_lines.append(f"GOOGLE_MAPS_API_KEY = '{api_key}'  # Configurada directamente")
                encontrado = True
            else:
                new_lines.append(line)
        
        if not encontrado:
            # Agregar al final del archivo
            new_lines.append('')
            new_lines.append('# Google Maps API Key')
            new_lines.append(f"GOOGLE_MAPS_API_KEY = '{api_key}'")
        
        # Escribir el archivo actualizado
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        
        print()
        print("✅ API Key configurada exitosamente en settings.py")
        print()
        print("IMPORTANTE:")
        print("- No compartas tu API key públicamente")
        print("- Configura restricciones en Google Cloud Console")
        print("- Para producción, usa variables de entorno")
        print()
        print("Recarga el servidor Django para que los cambios surtan efecto.")
        
    except Exception as e:
        print(f"❌ Error al configurar: {e}")
        sys.exit(1)

if __name__ == '__main__':
    configurar_api_key()

