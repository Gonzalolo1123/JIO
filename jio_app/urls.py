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
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # API
    path('api/juegos/', views.api_juegos, name='api_juegos'),
]
