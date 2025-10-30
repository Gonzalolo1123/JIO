from django.urls import path
from . import views

app_name = 'jio_app'

urlpatterns = [
    # Páginas públicas
    path('', views.index, name='index'),
    
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
    path('panel/repartos/<str:tipo_reparto>/<int:reparto_id>/asignar/', views.asignar_repartidor, name='asignar_repartidor'),
    path('panel/repartos/<str:tipo_reparto>/<int:reparto_id>/cambiar-estado/', views.cambiar_estado_reparto, name='cambiar_estado_reparto'),
    path('panel/repartos/<str:tipo_reparto>/<int:reparto_id>/registrar-incidente/', views.registrar_incidente, name='registrar_incidente'),

    # Endpoints para Repartidores
    path('delivery/cambiar-estado/', views.cambiar_estado_repartidor, name='cambiar_estado_repartidor'),
    path('delivery/instalacion/<int:instalacion_id>/detalle/', views.detalle_instalacion_json, name='detalle_instalacion_json'),
    path('delivery/retiro/<int:retiro_id>/detalle/', views.detalle_retiro_json, name='detalle_retiro_json'),
    path('delivery/<str:tipo_reparto>/<int:reparto_id>/marcar-realizado/', views.marcar_reparto_realizado, name='marcar_reparto_realizado'),
]