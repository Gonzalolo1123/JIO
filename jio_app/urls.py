from django.urls import path
from . import views

app_name = 'jio_app'

urlpatterns = [
    # Páginas públicas
    path('', views.index, name='index'),
    path('juegos/', views.juegos_view, name='juegos'),
    path('reservar/', views.reservar_view, name='reservar'),
    path('contacto/', views.contacto_view, name='contacto'),
    
    # Autenticación
    path('login_jio/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Paneles administrativos
    path('panel/', views.panel_redirect, name='panel_redirect'),
    path('admin_jio/', views.admin_panel, name='admin_panel'),
    path('delivery/', views.delivery_panel, name='delivery_panel'),
    
    # API
    path('api/juegos/', views.api_juegos, name='api_juegos'),
]
