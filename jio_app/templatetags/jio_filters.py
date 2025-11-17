from django import template

register = template.Library()

@register.filter(name='precio_chileno')
def precio_chileno(value):
    """
    Formatea un número como precio chileno usando el mismo formato que formatearPrecioChileno en validaciones.js
    Ejemplo: 25000 -> "$25.000"
    """
    if value is None:
        return "$0"
    
    try:
        # Convertir a entero para eliminar decimales
        valor = int(float(value))
        # Formatear con puntos como separadores de miles
        valor_formateado = f"{valor:,}".replace(",", ".")
        return f"${valor_formateado}"
    except (ValueError, TypeError):
        return f"${value}"

