# miapp/urls.py

from django.urls import path
from . import views

urlpatterns = [
     path('', views.principal, name='principal'),
    path('login/', views.login_view, name='login'),
    path('registro/', views.register_view, name='registro'),
    path('planes/', views.planes, name='planes'),
    path('inscribir_curso/', views.inscribir_curso, name='inscribir_curso'),
    path('cancelar_inscripcion/', views.cancelar_inscripcion, name='cancelar_inscripcion'),
    path('logout/', views.logout_cliente, name='logout'),
    path("verificar-correo/", views.verificar_correo, name="verificar_correo"),
    path("verificar-sesion/", views.verificar_sesion, name="verificar_sesion"),
    path("recuperar-contrasena/", views.recuperar_contrasena, name="recuperar_contrasena"),
    path("enviar-codigo-verificacion/", views.enviar_codigo_verificacion, name="enviar_codigo_verificacion"),
    path("verificar-codigo/", views.verificar_codigo, name="verificar_codigo"),
    
    path('inventario/', views.inventario, name='inventario'),

    path('inventario/crear_producto/', views.admin_producto_crear, name='admin_producto_crear'),
    path('inventario/actualizar_producto/<int:producto_id>/', views.admin_producto_actualizar, name='admin_producto_actualizar'),
    path('inventario/borrar_producto/<int:producto_id>/', views.admin_producto_borrar, name='admin_producto_borrar'),

    path('inventario/crear_categoria/', views.admin_categoria_crear, name='admin_categoria_crear'),
    path('inventario/actualizar_categoria/<int:categoria_id>/', views.admin_categoria_actualizar, name='admin_categoria_actualizar'),
    path('inventario/borrar_categoria/<int:categoria_id>/', views.admin_categoria_borrar, name='admin_categoria_borrar'),
    
    path('cursos/', views.cursos, name='cursos'),
    path('cursos/crear_curso/', views.admin_curso_crear, name='admin_curso_crear'),
    path('cursos/actualizar_curso/<int:curso_id>/', views.admin_curso_actualizar, name='admin_curso_actualizar'),
    path('cursos/borrar_curso/<int:curso_id>/', views.admin_curso_borrar, name='admin_curso_borrar'),
    path('cursos/crear_inscripcion/', views.admin_inscripcion_crear, name='admin_inscripcion_crear'),
    path('cursos/actualizar_inscripcion/<int:inscripcion_id>/', views.admin_inscripcion_actualizar, name='admin_inscripcion_actualizar'),
    path('cursos/borrar_inscripcion/<int:inscripcion_id>/', views.admin_inscripcion_borrar, name='admin_inscripcion_borrar'),
    path('maquinas/', views.maquinas, name='maquinas'),
    path('maquinas-admin/', views.admin_maquinas, name='maquinas-admin'),
    path('maquinas/crear_maquina/', views.admin_maquina_crear, name='admin_maquina_crear'),
    path('maquinas/actualizar_maquina/<int:maquina_id>/', views.admin_maquina_actualizar, name='admin_maquina_actualizar'),
    path('maquinas/borrar_maquina/<int:maquina_id>/', views.admin_maquina_borrar, name='admin_maquina_borrar'),
    
    path('usuarios/', views.usuarios, name='usuarios'),

    path('usuarios/crear_usuario/', views.admin_usuario_crear, name='admin_usuario_crear'),
    path('usuarios/actualizar_usuario/<int:usuario_id>/', views.admin_usuario_actualizar, name='admin_usuario_actualizar'),
    path('usuarios/borrar_usuario/<int:usuario_id>/', views.admin_usuario_borrar, name='admin_usuario_borrar'),
    # Adiciones nuevas para funcionamiento de crud de productos
    # Compras
    path('inventario/crear_compra_vendedor/', views.admin_compra_vendedor_crear, name='admin_compra_vendedor_crear'),
    path('inventario/actualizar_compra_vendedor/<int:compra_vendedor_id>/', views.admin_compra_vendedor_actualizar, name='admin_compra_vendedor_actualizar'),
    path('inventario/borrar_compra_vendedor/<int:compra_vendedor_id>/', views.admin_compra_vendedor_borrar, name='admin_compra_vendedor_borrar'),
    # Vendedores
    path('inventario/crear_vendedor/', views.admin_vendedor_crear, name='admin_vendedor_crear'),
    path('inventario/actualizar_vendedor/<int:vendedor_id>/', views.admin_vendedor_actualizar, name='admin_vendedor_actualizar'),
    path('inventario/borrar_vendedor/<int:vendedor_id>/', views.admin_vendedor_borrar, name='admin_vendedor_borrar'),
    # Establecimientos (nuevas rutas solo para superadmin)
    path('super_admin/crear_establecimiento/', views.superadmin_establecimiento_crear, name='superadmin_establecimiento_crear'),
    path('super_admin/actualizar_establecimiento/<int:establecimiento_id>/', views.superadmin_establecimiento_actualizar, name='superadmin_establecimiento_actualizar'),
    path('super_admin/borrar_establecimiento/<int:establecimiento_id>/', views.superadmin_establecimiento_borrar, name='superadmin_establecimiento_borrar'),
    # Proveedores
    path('inventario/crear_proveedor/', views.admin_proveedor_crear, name='admin_proveedor_crear'),
    path('inventario/actualizar_proveedor/<int:proveedor_id>/', views.admin_proveedor_actualizar, name='admin_proveedor_actualizar'),
    path('inventario/borrar_proveedor/<int:proveedor_id>/', views.admin_proveedor_borrar, name='admin_proveedor_borrar'),
    #SuperAdmin
    path('super_admin/', views.super_admin, name='super_admin'),
    path('super_admin/crear_admin/', views.crear_o_actualizar_admin, name='crear_o_actualizar_admin'),
    path('super_admin/actualizar_admin/<int:admin_id>/', views.actualizar_admin, name='actualizar_admin'),
    path('super_admin/borrar_admin/<int:admin_id>/', views.borrar_admin, name='borrar_admin'),
    path('asistencias/', views.asistencias, name='asistencias'),
    path('confirmar_asistencia/', views.confirmar_asistencia, name='confirmar_asistencia'),
    path('confirmar-salida/', views.confirmar_salida, name='confirmar_salida'),
    path('cambiar-rol-admin/', views.cambiar_rol_admin, name='cambiar_rol_admin'),
    # Nuevas URLs para transferencia de superadmin
    path('super_admin/transferir_superadmin/', views.transferir_superadmin, name='transferir_superadmin'),
    path('super_admin/verificar_elegibilidad/<int:admin_id>/', views.verificar_elegibilidad_admin_superadmin, name='verificar_elegibilidad_admin_superadmin'),
    path('super_admin/enviar_codigo_verificacion/', views.enviar_codigo_verificacion_superadmin, name='enviar_codigo_verificacion_superadmin'),
    path('super_admin/enviar_codigo_verificacion_actual/', views.enviar_codigo_verificacion_superadmin_actual, name='enviar_codigo_verificacion_superadmin_actual'),
    
    #Venta Productos
    path('venta_producto/', views.venta_producto, name='venta_producto'),
    path('obtener_imagenes_productos/', views.obtener_imagenes_productos, name='obtener_imagenes_productos'),
    path('subir_imagen_producto/', views.subir_imagen_producto, name='subir_imagen_producto'),
    path('obtener_imagenes_maquinas/', views.obtener_imagenes_maquinas, name='obtener_imagenes_maquinas'),
    path('subir_imagen_maquina/', views.subir_imagen_maquina, name='subir_imagen_maquina'),
    path('finalizar_compra/', views.finalizar_compra, name='finalizar_compra'),
    path('mostrar_voucher/', views.mostrar_voucher, name='mostrar_voucher'),
    path('venta_confirmada/', views.venta_confirmada, name='venta_confirmada'),
    # Membresías
    path('membresias/', views.membresias, name='membresias'),
    path('membresias/crear_membresia/', views.admin_membresia_crear, name='admin_membresia_crear'),
    path('membresias/actualizar_membresia/<int:membresia_id>/', views.admin_membresia_actualizar, name='admin_membresia_actualizar'),
    path('membresias/borrar_membresia/<int:membresia_id>/', views.admin_membresia_borrar, name='admin_membresia_borrar'),
    path('membresias/crear_cliente_membresia/', views.admin_cliente_membresia_crear, name='admin_cliente_membresia_crear'),
    path('membresias/actualizar_cliente_membresia/<int:cliente_membresia_id>/', views.admin_cliente_membresia_actualizar, name='admin_cliente_membresia_actualizar'),
    path('membresias/borrar_cliente_membresia/<int:cliente_membresia_id>/', views.admin_cliente_membresia_borrar, name='admin_cliente_membresia_borrar'),
    path('estadisticas/', views.estadisticas_view, name='estadisticas'),
    path('obtener_imagenes_membresias/', views.obtener_imagenes_membresias, name='obtener_imagenes_membresias'),
    path('subir_imagen_membresia/', views.subir_imagen_membresia, name='subir_imagen_membresia'),
    # Asistencia cliente
    path('asistencia-cliente/', views.asistencia_cliente, name='asistencia_cliente'),
    path('generar-qr/', views.generar_qr_asistencia, name='generar_qr'),
    path('escanear-qr/', views.escanear_qr_asistencia, name='escanear_qr'),
    path('asistencia-cliente/historial/', views.historial_asistencia_cliente, name='historial_asistencia_cliente'),
]