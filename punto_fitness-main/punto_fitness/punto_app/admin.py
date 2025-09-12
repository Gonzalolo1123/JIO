from django.contrib import admin
from .models import Cliente, Producto, Membresia

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'email', 'telefono', 'estado', 'get_fecha_registro')
    list_filter = ('estado',)

    def get_fecha_registro(self, obj):
        return obj.fecha_registro
    get_fecha_registro.admin_order_field = 'fecha_registro'
    get_fecha_registro.short_description = 'Fecha de Registro'

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'stock_actual', 'stock_minimo', 'categoria', 'establecimiento')
    list_filter = ('categoria', 'establecimiento')

@admin.register(Membresia)
class MembresiaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion', 'precio', 'duracion', 'dias_por_semana', 'establecimiento')
    list_filter = ('establecimiento', 'duracion')
