# JIO - Sistema de Arriendos de Juegos Inflables

## Descripción
Sistema web completo para la gestión de arriendos de juegos inflables, desde la solicitud hasta la instalación.

## Características
- Gestión completa de arriendos
- Control de inventario de juegos inflables
- Seguimiento de instalaciones
- Gestión de clientes
- Sistema de reservas

## Estructura del Proyecto
```
JIO/
├── JIO/                    # Configuración del proyecto Django
├── jio_app/               # Aplicación principal
│   ├── static/           # Archivos estáticos
│   │   ├── css/         # Hojas de estilo
│   │   ├── js/          # JavaScript
│   │   ├── images/      # Imágenes
│   │   │   ├── juegos_inflables/
│   │   │   ├── clientes/
│   │   │   ├── instalaciones/
│   │   │   ├── equipos/
│   │   │   └── eventos/
│   │   └── videos/      # Videos
│   ├── templates/       # Plantillas HTML
│   ├── management/      # Comandos personalizados
│   └── migrations/      # Migraciones de BD
└── manage.py           # Script de administración
```

## Instalación
1. Activar entorno virtual: `.\venv\Scripts\Activate.ps1`
2. Instalar dependencias: `pip install -r requirements.txt`
3. Ejecutar migraciones: `python manage.py migrate`
4. Crear superusuario: `python manage.py createsuperuser`
5. Ejecutar servidor: `python manage.py runserver`

## Tecnologías
- Django 5.2.6
- Python 3.13
- HTML/CSS/JavaScript

