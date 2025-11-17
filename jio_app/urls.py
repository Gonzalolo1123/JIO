from django.urls import path
from . import views

app_name = 'jio_app'

urlpatterns = [
    # Páginas públicas
    path('', views.index, name='index'),
    path('calendario/', views.calendario_reservas, name='calendario_reservas'),
    path('api/disponibilidad/', views.disponibilidad_fecha_json, name='disponibilidad_fecha_json'),
    path('api/reserva/', views.crear_reserva_publica, name='crear_reserva_publica'),
    
    # Autenticación
    path('login_jio/', views.login_view, name='login_jio'),
    path('logout/', views.logout_view, name='logout'),
    
    # Paneles administrativos
    path('panel/', views.panel_redirect, name='panel_redirect'),
    path('admin_panel/', views.admin_panel, name='admin_panel'),
    path('delivery/', views.delivery_panel, name='delivery_panel'),

    # Creación protegida (solo admin) - prefijo 'panel/' para evitar colisión con Django admin
    path('panel/admin/create/', views.create_admin, name='create_admin'),
    path('panel/delivery/create/', views.create_delivery, name='create_delivery'),
    path('panel/cliente/create/', views.create_cliente, name='create_cliente'),

    # Invitaciones compartibles
    path('panel/admin/share-invite/', views.share_admin_invite, name='share_admin_invite'),
    path('panel/delivery/share-invite/', views.share_delivery_invite, name='share_delivery_invite'),
    path('invite/signup/', views.invite_signup, name='invite_signup'),

    # Listado de usuarios
    path('panel/users/', views.users_list, name='users_list'),
    path('panel/users/<int:user_id>/json/', views.user_detail_json, name='user_detail_json'),
    path('panel/users/<int:user_id>/update/', views.user_update_json, name='user_update_json'),
    path('panel/users/<int:user_id>/delete/', views.user_delete_json, name='user_delete_json'),

    # Gestión de Repartos
    path('panel/repartos/', views.repartos_list, name='repartos_list'),
    path('panel/repartos/agenda/json/', views.agenda_repartos_json, name='agenda_repartos_json'),
    path('panel/repartos/<str:tipo_reparto>/<int:reparto_id>/asignar/', views.asignar_repartidor, name='asignar_repartidor'),
    path('panel/repartos/<str:tipo_reparto>/<int:reparto_id>/cambiar-estado/', views.cambiar_estado_reparto, name='cambiar_estado_reparto'),
    path('panel/repartos/<str:tipo_reparto>/<int:reparto_id>/registrar-incidente/', views.registrar_incidente, name='registrar_incidente'),

    # Endpoints para Repartidores
    path('delivery/cambiar-estado/', views.cambiar_estado_repartidor, name='cambiar_estado_repartidor'),
    path('delivery/instalacion/<int:instalacion_id>/detalle/', views.detalle_instalacion_json, name='detalle_instalacion_json'),
    path('delivery/retiro/<int:retiro_id>/detalle/', views.detalle_retiro_json, name='detalle_retiro_json'),
    path('delivery/<str:tipo_reparto>/<int:reparto_id>/marcar-realizado/', views.marcar_reparto_realizado, name='marcar_reparto_realizado'),
    
    # CRUD de juegos inflables
    path('panel/juegos/', views.juegos_list, name='juegos_list'),
    path('panel/juegos/create/', views.juego_create_json, name='juego_create_json'),
    path('panel/juegos/<int:juego_id>/json/', views.juego_detail_json, name='juego_detail_json'),
    path('panel/juegos/<int:juego_id>/update/', views.juego_update_json, name='juego_update_json'),
    path('panel/juegos/<int:juego_id>/delete/', views.juego_delete_json, name='juego_delete_json'),

    # CRUD de arriendos
    path('panel/arriendos/', views.arriendos_list, name='arriendos_list'),
    path('panel/arriendos/create/', views.arriendo_create_json, name='arriendo_create_json'),
    path('panel/arriendos/juegos-disponibles/', views.juegos_disponibles_fecha_json, name='juegos_disponibles_fecha_json'),
    path('panel/arriendos/<int:arriendo_id>/json/', views.arriendo_detail_json, name='arriendo_detail_json'),
    path('panel/arriendos/<int:arriendo_id>/update/', views.arriendo_update_json, name='arriendo_update_json'),
    path('panel/arriendos/<int:arriendo_id>/delete/', views.arriendo_delete_json, name='arriendo_delete_json'),

    #Estadisticas   
    path('panel/estadisticas/', views.estadisticas, name='estadisticas'),
    
    #Contabilidad
    path('panel/contabilidad/', views.contabilidad, name='contabilidad'),
    
    # CRUD de vehículos
    path('panel/vehiculos/', views.vehiculos_list, name='vehiculos_list'),
    path('panel/vehiculos/create/', views.vehiculo_create_json, name='vehiculo_create_json'),
    path('panel/vehiculos/<int:vehiculo_id>/json/', views.vehiculo_detail_json, name='vehiculo_detail_json'),
    path('panel/vehiculos/<int:vehiculo_id>/update/', views.vehiculo_update_json, name='vehiculo_update_json'),
    path('panel/vehiculos/<int:vehiculo_id>/delete/', views.vehiculo_delete_json, name='vehiculo_delete_json'),
    
    # CRUD de gastos operativos
    path('panel/gastos/', views.gastos_list, name='gastos_list'),
    path('panel/gastos/create/', views.gasto_create_json, name='gasto_create_json'),
    path('panel/gastos/<int:gasto_id>/json/', views.gasto_detail_json, name='gasto_detail_json'),
    path('panel/gastos/<int:gasto_id>/update/', views.gasto_update_json, name='gasto_update_json'),
    path('panel/gastos/<int:gasto_id>/delete/', views.gasto_delete_json, name='gasto_delete_json'),
    
    # CRUD de promociones
    path('panel/promociones/', views.promociones_list, name='promociones_list'),
    path('panel/promociones/create/', views.promocion_create_json, name='promocion_create_json'),
    path('panel/promociones/<int:promocion_id>/json/', views.promocion_detail_json, name='promocion_detail_json'),
    path('panel/promociones/<int:promocion_id>/update/', views.promocion_update_json, name='promocion_update_json'),
    path('panel/promociones/<int:promocion_id>/delete/', views.promocion_delete_json, name='promocion_delete_json'),
    
    # CRUD de evaluaciones
    path('panel/evaluaciones/', views.evaluaciones_list, name='evaluaciones_list'),
    path('panel/evaluaciones/create/', views.evaluacion_create_json, name='evaluacion_create_json'),
    path('panel/evaluaciones/<int:evaluacion_id>/json/', views.evaluacion_detail_json, name='evaluacion_detail_json'),
    path('panel/evaluaciones/<int:evaluacion_id>/update/', views.evaluacion_update_json, name='evaluacion_update_json'),
    path('panel/evaluaciones/<int:evaluacion_id>/delete/', views.evaluacion_delete_json, name='evaluacion_delete_json'),
    
    # CRUD de mantenimiento de vehículos
    path('panel/mantenimientos/', views.mantenimientos_list, name='mantenimientos_list'),
    path('panel/mantenimientos/create/', views.mantenimiento_create_json, name='mantenimiento_create_json'),
    path('panel/mantenimientos/<int:mantenimiento_id>/json/', views.mantenimiento_detail_json, name='mantenimiento_detail_json'),
    path('panel/mantenimientos/<int:mantenimiento_id>/update/', views.mantenimiento_update_json, name='mantenimiento_update_json'),
    path('panel/mantenimientos/<int:mantenimiento_id>/delete/', views.mantenimiento_delete_json, name='mantenimiento_delete_json'),
    
    # CRUD de precios por temporada
    path('panel/precios-temporada/', views.precios_temporada_list, name='precios_temporada_list'),
    path('panel/precios-temporada/create/', views.precio_temporada_create_json, name='precio_temporada_create_json'),
    path('panel/precios-temporada/<int:precio_id>/json/', views.precio_temporada_detail_json, name='precio_temporada_detail_json'),
    path('panel/precios-temporada/<int:precio_id>/update/', views.precio_temporada_update_json, name='precio_temporada_update_json'),
    path('panel/precios-temporada/<int:precio_id>/delete/', views.precio_temporada_delete_json, name='precio_temporada_delete_json'),
    
    # CRUD de materiales/inventario
    path('panel/materiales/', views.materiales_list, name='materiales_list'),
    path('panel/materiales/create/', views.material_create_json, name='material_create_json'),
    path('panel/materiales/<int:material_id>/json/', views.material_detail_json, name='material_detail_json'),
    path('panel/materiales/<int:material_id>/update/', views.material_update_json, name='material_update_json'),
    path('panel/materiales/<int:material_id>/delete/', views.material_delete_json, name='material_delete_json'),
    
    # CRUD de proveedores
    path('panel/proveedores/', views.proveedores_list, name='proveedores_list'),
    path('panel/proveedores/create/', views.proveedor_create_json, name='proveedor_create_json'),
    path('panel/proveedores/<int:proveedor_id>/json/', views.proveedor_detail_json, name='proveedor_detail_json'),
    path('panel/proveedores/<int:proveedor_id>/update/', views.proveedor_update_json, name='proveedor_update_json'),
    path('panel/proveedores/<int:proveedor_id>/delete/', views.proveedor_delete_json, name='proveedor_delete_json'),
]