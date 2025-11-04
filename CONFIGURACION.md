# Guía de Configuración - Proyecto JIO

## ✅ Pasos de Configuración Completados

### 1. Base de Datos
- ✅ Migraciones aplicadas correctamente
- ✅ Todas las tablas creadas

### 2. Datos Iniciales
- ✅ **25 juegos inflables** creados y disponibles
- ✅ **Usuario administrador** creado:
  - Username: `admin`
  - Email: `admin@jio.cl`
  - Password: `admin123`
  - Tipo: Administrador (Superuser)

### 3. Funcionalidades Implementadas
- ✅ Calendario de reservas con disponibilidad
- ✅ Sistema de reservas con modal
- ✅ Integración con Google Maps (requiere API key)
- ✅ Cálculo automático de distancia desde Osorno
- ✅ Autocompletado de direcciones

## ✅ Mapa Configurado

### OpenStreetMap con Leaflet (GRATIS, SIN API KEY)

El proyecto ahora usa **OpenStreetMap** con **Leaflet**, que es completamente gratuito y no requiere configuración de API key. El mapa funciona inmediatamente sin ninguna configuración adicional.

### Funcionalidades del Mapa:

- ✅ Mapa interactivo centrado en Osorno
- ✅ Búsqueda de direcciones usando Nominatim (OpenStreetMap)
- ✅ Clic en el mapa para seleccionar ubicación
- ✅ Marcador arrastrable para ajustar posición
- ✅ Cálculo automático de distancia desde Osorno
- ✅ Geocodificación inversa (obtener dirección desde coordenadas)
- ✅ Sin límites de uso ni costos

### Nota sobre Google Maps (Opcional)

Si prefieres usar Google Maps en el futuro, puedes configurar tu API key:

1. **Obtener una API key:**
   - Ve a: https://console.cloud.google.com/google/maps-apis
   - Crea un proyecto o selecciona uno existente
   - Habilita las siguientes APIs:
     - **Places API** (para autocompletado de direcciones)
     - **Maps JavaScript API** (para mostrar el mapa)
     - **Geocoding API** (para obtener direcciones desde coordenadas)
   - Crea una API key

2. **Configurar la API key en el proyecto:**

   **Opción A - Script automático (MÁS FÁCIL):**
   ```bash
   python configurar_google_maps.py
   ```
   El script te guiará paso a paso para configurar tu API key.

   **Opción B - Manual (editar directamente):**
   Edita el archivo `JIO/settings.py` y agrega tu API key:
   ```python
   GOOGLE_MAPS_API_KEY = 'TU_API_KEY_AQUI'
   ```

   **Opción C - Variable de entorno (RECOMENDADO para producción):**
   ```bash
   # Windows PowerShell
   $env:GOOGLE_MAPS_API_KEY="TU_API_KEY_AQUI"
   
   # Linux/Mac
   export GOOGLE_MAPS_API_KEY="TU_API_KEY_AQUI"
   ```

3. **Restricciones de seguridad (opcional pero recomendado):**
   - En Google Cloud Console, configura restricciones de API key
   - Limita por dominio HTTP (para desarrollo)
   - Limita por IP (para producción)

## 📋 Comandos Útiles

### Crear más juegos
```bash
python manage.py crear_muchos_juegos
```

### Crear otro administrador
```bash
python manage.py create_admin --email nuevo@jio.cl --username nuevo_admin --password nueva_pass
```

### Crear repartidor
```bash
python manage.py create_delivery --email repartidor@jio.cl --username repartidor --password rep123
```

### Poblar arriendos de prueba
```bash
python manage.py limpiar_y_poblar_arriendos
```

## 🚀 Iniciar el Servidor

```bash
python manage.py runserver
```

Luego accede a:
- **Página principal:** http://127.0.0.1:8000/
- **Calendario de reservas:** http://127.0.0.1:8000/calendario/
- **Panel de administración:** http://127.0.0.1:8000/admin/

## 📝 Notas Importantes

1. **Credenciales del Administrador:**
   - Username: `admin`
   - Password: `admin123`
   - **IMPORTANTE:** Cambia la contraseña en producción

2. **Base de Datos:**
   - PostgreSQL configurado en `localhost:5433`
   - Base de datos: `postgres`
   - Usuario: `postgres`
   - Password: `damian8140`

3. **Mapa:**
   - Usa OpenStreetMap con Leaflet (gratis, sin API key necesaria)
   - Funciona inmediatamente sin configuración
   - Todas las funcionalidades están disponibles: búsqueda, clic en mapa, marcador arrastrable, cálculo de distancia

## ✅ Estado Actual

- ✅ Migraciones: Aplicadas
- ✅ Juegos: 25 disponibles
- ✅ Administrador: Creado
- ✅ Mapa: OpenStreetMap configurado (funciona sin API key)

