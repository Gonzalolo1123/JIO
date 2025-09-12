from functools import wraps
from django.shortcuts import render
from .models import Administrador

def requiere_admin(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Verificar si el usuario está autenticado
        if 'cliente_id' not in request.session:
            return render(request, 'punto_app/no_autorizado.html')

        try:
            # Obtener el nivel de acceso del usuario
            nivel_acceso = request.session.get('nivel_acceso', 'cliente')
            
            # Verificar si es admin o superadmin
            if nivel_acceso not in ['admin', 'superadmin']:
                return render(request, 'punto_app/no_autorizado.html')
            
            return view_func(request, *args, **kwargs)
        except Exception as e:
            print(f"Error en decorador requiere_admin: {str(e)}")
            return render(request, 'punto_app/no_autorizado.html')
    
    return _wrapped_view

def requiere_superadmin(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Verificar si el usuario está autenticado
        if 'cliente_id' not in request.session:
            return render(request, 'punto_app/no_autorizado.html')

        try:
            # Obtener el nivel de acceso del usuario
            nivel_acceso = request.session.get('nivel_acceso', 'cliente')
            
            # Verificar si es superadmin
            if nivel_acceso != 'superadmin':
                return render(request, 'punto_app/no_autorizado.html')
            
            return view_func(request, *args, **kwargs)
        except Exception as e:
            print(f"Error en decorador requiere_superadmin: {str(e)}")
            return render(request, 'punto_app/no_autorizado.html')
    
    return _wrapped_view 