from .models import Cliente, Administrador # Asegúrate de importar todos los modelos necesarios

def user_info(request):
    cliente_id = request.session.get('cliente_id')
    cliente_data = {}
    if cliente_id:
        try:
            cliente = Cliente.objects.get(id=cliente_id)
            cliente_data['cliente_id'] = cliente.id
            cliente_data['cliente_nombre'] = cliente.nombre
            cliente_data['cliente_apellido'] = cliente.apellido
            cliente_data['cliente_email'] = cliente.email
            cliente_data['cliente_telefono'] = cliente.telefono

            # Obtener el nivel de acceso más reciente desde la base de datos
            admin_obj = Administrador.objects.filter(cliente=cliente).first()
            if admin_obj:
                cliente_data['nivel_acceso'] = admin_obj.nivel_acceso.lower()
            else:
                cliente_data['nivel_acceso'] = 'cliente' # Rol por defecto si no es administrador
        except Cliente.DoesNotExist:
            # Si el cliente no existe en la DB, limpia la sesión y marca como no logueado
            request.session.flush()
            cliente_data['cliente_id'] = None
            cliente_data['nivel_acceso'] = 'anonimo' # O cualquier otro rol para no logueado
    else:
        cliente_data['nivel_acceso'] = 'anonimo' # Para usuarios no logueados

    return cliente_data 