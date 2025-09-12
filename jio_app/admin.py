from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, Cliente, Repartidor, Juego, PrecioTemporada,
    Reserva, DetalleReserva, Instalacion, Retiro, Pago
)

# Register your models here.

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    """
    Configuración del admin para el modelo Usuario personalizado
    """
    list_display = ('username', 'email', 'first_name', 'last_name', 'tipo_usuario', 'activo', 'fecha_registro')
    list_filter = ('tipo_usuario', 'activo', 'is_staff', 'is_superuser', 'fecha_registro')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('-fecha_registro',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Información Adicional', {
            'fields': ('tipo_usuario', 'telefono', 'activo')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información Adicional', {
            'fields': ('tipo_usuario', 'telefono', 'activo')
        }),
    )


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Cliente
    """
    list_display = ('usuario', 'rut', 'tipo_cliente')
    list_filter = ('tipo_cliente',)
    search_fields = ('usuario__username', 'usuario__first_name', 'usuario__last_name', 'rut')
    raw_id_fields = ('usuario',)


@admin.register(Repartidor)
class RepartidorAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Repartidor
    """
    list_display = ('usuario', 'licencia_conducir', 'vehiculo', 'estado')
    list_filter = ('estado',)
    search_fields = ('usuario__username', 'usuario__first_name', 'usuario__last_name', 'licencia_conducir')
    raw_id_fields = ('usuario',)


class PrecioTemporadaInline(admin.TabularInline):
    """
    Inline para mostrar precios por temporada en el admin de Juegos
    """
    model = PrecioTemporada
    extra = 1


@admin.register(Juego)
class JuegoAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Juego
    """
    list_display = ('nombre', 'categoria', 'dimensiones', 'capacidad_personas', 'peso_maximo', 'precio_base')
    list_filter = ('categoria',)
    search_fields = ('nombre', 'descripcion')
    inlines = [PrecioTemporadaInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'categoria', 'foto')
        }),
        ('Características Físicas', {
            'fields': ('dimensiones', 'capacidad_personas', 'peso_maximo')
        }),
        ('Precio', {
            'fields': ('precio_base',)
        }),
    )


@admin.register(PrecioTemporada)
class PrecioTemporadaAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo PrecioTemporada
    """
    list_display = ('juego', 'temporada', 'precio_arriendo', 'fecha_inicio', 'fecha_fin', 'descuento_porcentaje')
    list_filter = ('temporada', 'fecha_inicio', 'fecha_fin')
    search_fields = ('juego__nombre', 'juego__codigo')
    raw_id_fields = ('juego',)


class DetalleReservaInline(admin.TabularInline):
    """
    Inline para mostrar detalles de reserva
    """
    model = DetalleReserva
    extra = 1
    readonly_fields = ('subtotal',)


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Reserva
    """
    list_display = ('id', 'cliente', 'fecha_evento', 'hora_instalacion', 'hora_retiro', 'estado', 'total_reserva', 'fecha_creacion')
    list_filter = ('estado', 'fecha_evento', 'fecha_creacion')
    search_fields = ('cliente__usuario__username', 'cliente__usuario__first_name', 'cliente__usuario__last_name', 'direccion_evento')
    raw_id_fields = ('cliente',)
    inlines = [DetalleReservaInline]
    readonly_fields = ('fecha_creacion', 'fecha_modificacion')
    
    fieldsets = (
        ('Información del Cliente', {
            'fields': ('cliente',)
        }),
        ('Detalles del Evento', {
            'fields': ('fecha_evento', 'hora_instalacion', 'hora_retiro', 'direccion_evento')
        }),
        ('Estado y Observaciones', {
            'fields': ('estado', 'observaciones', 'total_reserva')
        }),
        ('Fechas del Sistema', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DetalleReserva)
class DetalleReservaAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo DetalleReserva
    """
    list_display = ('reserva', 'juego', 'cantidad', 'precio_unitario', 'subtotal')
    list_filter = ('juego__categoria',)
    search_fields = ('reserva__cliente__usuario__username', 'juego__nombre')
    raw_id_fields = ('reserva', 'juego')
    readonly_fields = ('subtotal',)


@admin.register(Instalacion)
class InstalacionAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Instalacion
    """
    list_display = ('id', 'reserva', 'repartidor', 'fecha_instalacion', 'hora_instalacion', 'estado_instalacion')
    list_filter = ('estado_instalacion', 'fecha_instalacion')
    search_fields = ('reserva__cliente__usuario__username', 'repartidor__usuario__username', 'direccion_instalacion')
    raw_id_fields = ('reserva', 'repartidor')
    
    fieldsets = (
        ('Información de la Reserva', {
            'fields': ('reserva',)
        }),
        ('Repartidor Asignado', {
            'fields': ('repartidor',)
        }),
        ('Detalles de la Instalación', {
            'fields': ('fecha_instalacion', 'hora_instalacion', 'direccion_instalacion', 'telefono_cliente')
        }),
        ('Estado y Observaciones', {
            'fields': ('estado_instalacion', 'observaciones_instalacion')
        }),
    )


@admin.register(Retiro)
class RetiroAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Retiro
    """
    list_display = ('id', 'reserva', 'repartidor', 'fecha_retiro', 'hora_retiro', 'estado_retiro')
    list_filter = ('estado_retiro', 'fecha_retiro')
    search_fields = ('reserva__cliente__usuario__username', 'repartidor__usuario__username')
    raw_id_fields = ('reserva', 'repartidor')
    
    fieldsets = (
        ('Información de la Reserva', {
            'fields': ('reserva',)
        }),
        ('Repartidor Asignado', {
            'fields': ('repartidor',)
        }),
        ('Detalles del Retiro', {
            'fields': ('fecha_retiro', 'hora_retiro')
        }),
        ('Estado y Observaciones', {
            'fields': ('estado_retiro', 'observaciones_retiro')
        }),
    )


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Pago
    """
    list_display = ('id', 'reserva', 'monto', 'metodo_pago', 'estado', 'fecha_pago', 'fecha_creacion')
    list_filter = ('metodo_pago', 'estado', 'fecha_pago', 'fecha_creacion')
    search_fields = ('reserva__cliente__usuario__username', 'observaciones')
    raw_id_fields = ('reserva',)
    readonly_fields = ('fecha_creacion',)
    
    fieldsets = (
        ('Información de la Reserva', {
            'fields': ('reserva',)
        }),
        ('Detalles del Pago', {
            'fields': ('monto', 'metodo_pago', 'estado', 'fecha_pago')
        }),
        ('Documentación', {
            'fields': ('imagen_transferencia', 'observaciones')
        }),
        ('Fechas del Sistema', {
            'fields': ('fecha_creacion',),
            'classes': ('collapse',)
        }),
    )


# Configuración personalizada del sitio de administración
admin.site.site_header = "JIO - Sistema de Arriendos"
admin.site.site_title = "JIO Admin"
admin.site.index_title = "Panel de Administración"
