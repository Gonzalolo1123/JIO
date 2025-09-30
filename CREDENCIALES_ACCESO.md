# 🔐 Credenciales de Acceso - JIO

## 🌐 URLs del Sistema

- **Página Principal**: http://localhost:8000/
- **Login**: http://localhost:8000/login/
- **Panel Admin**: http://localhost:8000/admin/
- **Panel Repartidor**: http://localhost:8000/delivery/

## 👥 Usuarios del Sistema

### 🔧 Administrador
- **Email**: admin@jio.com
- **Contraseña**: admin123
- **Acceso**: Panel completo de administración
- **Funciones**:
  - Gestión de usuarios y repartidores
  - Administración de reservas
  - Reportes y estadísticas
  - Configuración del sistema

### 🚚 Repartidor
- **Email**: repartidor@jio.com
- **Contraseña**: repartidor123
- **Acceso**: Panel de repartidor
- **Funciones**:
  - Ver entregas asignadas
  - Marcar entregas como completadas
  - Reportar problemas
  - Ver rutas y horarios

## 🚀 Cómo Probar el Sistema

### 1. Acceso desde la Página Principal
1. Ve a http://localhost:8000/
2. Haz clic en "Iniciar Sesión" en el menú superior
3. Ingresa las credenciales correspondientes

### 2. Acceso Directo
- **Para Admin**: http://localhost:8000/login/ → admin@jio.com / admin123
- **Para Repartidor**: http://localhost:8000/login/ → repartidor@jio.com / repartidor123

### 3. Redirección Automática
- El sistema detectará automáticamente el tipo de usuario
- Los administradores irán a `/admin/`
- Los repartidores irán a `/delivery/`

## 🎮 Funcionalidades Disponibles

### ✅ Página Principal
- Catálogo de juegos inflables con dimensiones y edades
- Información de la empresa
- Formulario de contacto
- Enlace de login funcional

### ✅ Sistema de Login
- Autenticación por email (más intuitivo)
- Validación de permisos por tipo de usuario
- Mensajes de error claros
- Redirección automática

### ✅ Panel de Administrador
- Dashboard con estadísticas
- Gestión de usuarios
- Administración de reservas
- Reportes y configuración

### ✅ Panel de Repartidor
- Estado del repartidor
- Entregas asignadas
- Acciones rápidas
- Estadísticas personales

## 🗄️ Base de Datos

- **Tipo**: PostgreSQL
- **Nombre**: jio_db
- **Usuario**: postgres
- **Contraseña**: hola1234
- **Host**: localhost:5432

## 🛠️ Comandos Útiles

```bash
# Iniciar servidor
python manage.py runserver

# Crear superusuario
python manage.py createsuperuser

# Aplicar migraciones
python manage.py migrate

# Recopilar archivos estáticos
python manage.py collectstatic
```

## 📱 Pruebas Recomendadas

1. **Login con Administrador**:
   - Email: admin@jio.com
   - Contraseña: admin123
   - Debería redirigir a `/admin/`

2. **Login con Repartidor**:
   - Email: repartidor@jio.com
   - Contraseña: repartidor123
   - Debería redirigir a `/delivery/`

3. **Login con credenciales incorrectas**:
   - Debería mostrar mensaje de error

4. **Acceso sin autenticación**:
   - Debería redirigir al login

---

**¡El sistema está listo para usar!** 🎉
