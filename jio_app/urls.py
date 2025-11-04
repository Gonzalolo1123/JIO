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
]