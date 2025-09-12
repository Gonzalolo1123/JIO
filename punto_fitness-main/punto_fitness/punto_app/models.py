from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
class MetodoPago(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=100)

    class Meta:
        db_table = 'metodo_pago'


class TipoDocumentoPago(models.Model):
    nombre = models.CharField(max_length=100)

    class Meta:
        db_table = 'tipo_documento_pago'


class Proveedor(models.Model):
    nombre = models.CharField(max_length=100)
    telefono = models.IntegerField()
    email = models.EmailField(max_length=100)

    class Meta:
        db_table = 'proveedor'


class Encargado(models.Model):
    nombre = models.CharField(max_length=100)
    telefono = models.IntegerField()
    email = models.EmailField(max_length=100)

    class Meta:
        db_table = 'encargado'


class Establecimiento(models.Model):
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=100)
    telefono = models.IntegerField()
    email = models.EmailField(max_length=100)
    horario_apertura = models.TimeField()
    horario_cierre = models.TimeField()
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)

    class Meta:
        db_table = 'establecimiento'

class Cliente(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    contrasena = models.CharField(max_length=100)
    telefono = models.IntegerField()
    fecha_registro = models.DateField(auto_now_add=True)  # Usamos auto_now_add para agregar la fecha automáticamente
    estado = models.CharField(max_length=100, default='Activo')

    class Meta:
        db_table = 'cliente'

class Administrador(models.Model):
    cliente =models.ForeignKey(Cliente, on_delete=models.CASCADE, null=True, blank=True) 
    nivel_acceso = models.CharField(max_length=100)
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)

    class Meta:
        db_table = 'administrador'

class RegistroAcceso(models.Model):
    usuario = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)
    fecha_hora_entrada = models.DateTimeField()
    fecha_hora_salida = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'registro_acceso'


class CategoriaProducto(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=100)

    class Meta:
        db_table = 'categoria_producto'


class Vendedor(models.Model):
    nombre = models.CharField(max_length=100)
    telefono = models.IntegerField()
    email = models.EmailField(max_length=100)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)

    class Meta:
        db_table = 'vendedor'


class CompraVendedor(models.Model):
    fecha = models.DateTimeField()
    total = models.IntegerField()
    iva = models.DecimalField(max_digits=6, decimal_places=2)
    estado = models.BooleanField()
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE)

    class Meta:
        db_table = 'compra_vendedor'


class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=100)
    precio = models.IntegerField()
    stock_actual = models.IntegerField()
    stock_minimo = models.IntegerField()
    compra = models.ForeignKey(CompraVendedor, on_delete=models.CASCADE)
    categoria = models.ForeignKey(CategoriaProducto, on_delete=models.CASCADE)
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)
    imagen = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'producto'


class DetalleCompra(models.Model):
    cantidad = models.IntegerField()
    iva = models.DecimalField(max_digits=6, decimal_places=2)
    subtotal = models.IntegerField()
    precio_unitario = models.IntegerField()
    compra = models.ForeignKey(CompraVendedor, on_delete=models.CASCADE)
    tipo_documento = models.ForeignKey(TipoDocumentoPago, on_delete=models.CASCADE)
    metodo_pago = models.ForeignKey(MetodoPago, on_delete=models.CASCADE)

    class Meta:
        db_table = 'detalle_compra'


class VentaCliente(models.Model):
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)
    metodo_pago = models.ForeignKey(MetodoPago, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    fecha = models.DateField()
    total = models.IntegerField()

    class Meta:
        db_table = 'venta_cliente'


class DetalleVenta(models.Model):
    cantidad = models.IntegerField()
    iva = models.DecimalField(max_digits=6, decimal_places=2)
    subtotal = models.IntegerField()
    precio_unitario = models.IntegerField()
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    venta = models.ForeignKey(VentaCliente, on_delete=models.CASCADE)

    class Meta:
        db_table = 'detalle_venta'


class Membresia(models.Model):
    DURACIONES = [
        ('semanal', 'Semanal'),
        ('mensual', 'Mensual'),
        ('anual', 'Anual'),
        ('personalizada', 'Personalizada'),
    ]

    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=100)
    precio = models.IntegerField()
    duracion = models.CharField(max_length=15, choices=DURACIONES)
    dias_por_semana = models.IntegerField(null=True, blank=True)  # Para "3 veces por semana", etc.
    imagen = models.CharField(max_length=200, null=True, blank=True)  # Imagen de la membresía

    class Meta:
        db_table = 'membresia'


class ClienteMembresia(models.Model):
    usuario = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    membresia = models.ForeignKey(Membresia, on_delete=models.CASCADE)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.BooleanField()
    codigo_qr = models.CharField(max_length=100)

    class Meta:
        db_table = 'cliente_membresia'


class Maquina(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=100)
    cantidad = models.IntegerField()
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)
    imagen = models.CharField(max_length=200, null=True, blank=True)
    class Meta:
        db_table = 'maquina'
        
class Curso(models.Model):
    nombre = models.CharField(max_length=30)
    cupos = models.IntegerField()
    fecha_realizacion = models.DateField()
    estado = models.CharField(max_length=30, default='Activo')
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)

    class Meta:
        db_table = 'curso'


class Inscripcion(models.Model):
    usuario = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE)
    fecha_inscripcion = models.DateField()
    fecha_realizacion = models.DateField()

    class Meta:
        db_table = 'inscripcion'
        unique_together = ('usuario', 'curso', 'fecha_realizacion')
        
    def save(self, *args, **kwargs):
        # Establece la fecha_realizacion igual a la del curso relacionado
        self.fecha_realizacion = self.curso.fecha_realizacion
        super().save(*args, **kwargs)

class VerificacionCorreo(models.Model):
    id_verificacion = models.AutoField(primary_key=True)
    id_usuario = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        db_column='id_usuario'
    )
    codigo = models.CharField(max_length=10)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField()
    utilizado = models.BooleanField(default=False)

    class Meta:
        db_table = 'verificacion_correo'
        verbose_name = 'Verificación de correo'
        verbose_name_plural = 'Verificaciones de correo'

    def __str__(self):
        return f"Verificación para {self.id_usuario} - {self.codigo}"

    def save(self, *args, **kwargs):
        # Si es un nuevo registro y no tiene fecha de expiración, establece una por defecto (10 minutos)
        if not self.id_verificacion and not self.fecha_expiracion:
            self.fecha_expiracion = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)