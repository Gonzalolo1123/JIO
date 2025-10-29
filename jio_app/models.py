from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

# Create your models here.

class Usuario(AbstractUser):
    """
    Modelo de usuario personalizado que extiende AbstractUser
    """
    TIPO_USUARIO_CHOICES = [
        ('administrador', 'Administrador'),
        ('repartidor', 'Repartidor'),
        ('cliente', 'Cliente'),
    ]
    
    tipo_usuario = models.CharField(
        max_length=20, 
        choices=TIPO_USUARIO_CHOICES,
        default='cliente'
    )
    telefono = models.CharField(max_length=15, blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return f"{self.username} - {self.get_tipo_usuario_display()}"


class Cliente(models.Model):
    """
    Información específica de los clientes
    """
    TIPO_CLIENTE_CHOICES = [
        ('particular', 'Particular'),
        ('empresa', 'Empresa'),
    ]
    
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='cliente')
    rut = models.CharField(max_length=12, unique=True)
    tipo_cliente = models.CharField(
        max_length=20, 
        choices=TIPO_CLIENTE_CHOICES,
        default='particular'
    )
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
    
    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.rut}"


class Repartidor(models.Model):
    """
    Información específica de los repartidores
    """
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('en_ruta', 'En Ruta'),
        ('ocupado', 'Ocupado'),
        ('inactivo', 'Inactivo'),
    ]
    
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='repartidor')
    licencia_conducir = models.CharField(max_length=20, blank=True, null=True)
    vehiculo = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES,
        default='disponible'
    )
    
    class Meta:
        verbose_name = 'Repartidor'
        verbose_name_plural = 'Repartidores'
    
    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.get_estado_display()}"


class Juego(models.Model):
    """
    Modelo para los juegos inflables disponibles
    """
    CATEGORIA_CHOICES = [
        ('castillo', 'Castillo'),
        ('tobogan', 'Tobogán'),
        ('obstaculos', 'Obstáculos'),
        ('combo', 'Combo'),
        ('deportivo', 'Deportivo'),
        ('infantil', 'Infantil'),
    ]
    
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('mantenimiento', 'En Mantenimiento'),
        ('reservado', 'Reservado'),
        ('no_disponible', 'No Disponible'),
    ]
    
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    dimensiones = models.CharField(max_length=50, help_text="Ej: 5m x 3m x 2m")
    capacidad_personas = models.PositiveIntegerField()
    peso_maximo = models.PositiveIntegerField(help_text="Peso máximo en kg")
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    foto = models.CharField(max_length=200, blank=True, null=True, help_text="URL de la imagen del juego")
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default='disponible',
        help_text="Estado actual del juego inflable"
    )
    
    class Meta:
        verbose_name = 'Juego Inflable'
        verbose_name_plural = 'Juegos Inflables'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - {self.get_categoria_display()}"
class PrecioTemporada(models.Model):
    """
    Precios por temporada para cada juego
    """
    TEMPORADA_CHOICES = [
        ('alta', 'Temporada Alta'),
        ('baja', 'Temporada Baja'),
        ('especial', 'Temporada Especial'),
    ]
    
    juego = models.ForeignKey(Juego, on_delete=models.CASCADE, related_name='precios_temporada')
    temporada = models.CharField(max_length=20, choices=TEMPORADA_CHOICES)
    precio_arriendo = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    descuento_porcentaje = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    class Meta:
        verbose_name = 'Precio por Temporada'
        verbose_name_plural = 'Precios por Temporada'
        unique_together = ['juego', 'temporada', 'fecha_inicio']
    
    def __str__(self):
        return f"{self.juego.nombre} - {self.get_temporada_display()}"


class Reserva(models.Model):
    """
    Reservas de juegos inflables
    """
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('completada', 'Completada'),
    ]
    
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='reservas')
    fecha_evento = models.DateField()
    hora_instalacion = models.TimeField()
    hora_retiro = models.TimeField()
    direccion_evento = models.CharField(max_length=300)
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES,
        default='pendiente'
    )
    observaciones = models.TextField(blank=True, null=True)
    total_reserva = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Reserva #{self.id} - {self.cliente.usuario.get_full_name()} - {self.fecha_evento}"


class DetalleReserva(models.Model):
    """
    Detalles de cada juego en una reserva
    """
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='detalles')
    juego = models.ForeignKey(Juego, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = 'Detalle de Reserva'
        verbose_name_plural = 'Detalles de Reserva'
        unique_together = ['reserva', 'juego']
    
    def __str__(self):
        return f"{self.reserva} - {self.juego.nombre} x{self.cantidad}"
    
    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)


class Instalacion(models.Model):
    """
    Servicios de instalación/entrega
    """
    ESTADO_CHOICES = [
        ('programada', 'Programada'),
        ('realizada', 'Realizada'),
        ('pendiente', 'Pendiente'),
        ('cancelada', 'Cancelada'),
    ]
    
    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE, related_name='instalacion')
    repartidor = models.ForeignKey(Repartidor, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_instalacion = models.DateField()
    hora_instalacion = models.TimeField()
    direccion_instalacion = models.CharField(max_length=300)
    telefono_cliente = models.CharField(max_length=15)
    estado_instalacion = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES,
        default='programada'
    )
    observaciones_instalacion = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Instalación'
        verbose_name_plural = 'Instalaciones'
    
    def __str__(self):
        return f"Instalación #{self.id} - {self.reserva.cliente.usuario.get_full_name()}"


class Retiro(models.Model):
    """
    Servicios de retiro/recogida
    """
    ESTADO_CHOICES = [
        ('programado', 'Programado'),
        ('realizado', 'Realizado'),
        ('pendiente', 'Pendiente'),
        ('cancelado', 'Cancelado'),
    ]
    
    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE, related_name='retiro')
    repartidor = models.ForeignKey(Repartidor, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_retiro = models.DateField()
    hora_retiro = models.TimeField()
    estado_retiro = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES,
        default='programado'
    )
    observaciones_retiro = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Retiro'
        verbose_name_plural = 'Retiros'
    
    def __str__(self):
        return f"Retiro #{self.id} - {self.reserva.cliente.usuario.get_full_name()}"


class Pago(models.Model):
    """
    Pagos realizados por las reservas
    """
    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('tarjeta', 'Tarjeta'),
        ('cheque', 'Cheque'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('reembolsado', 'Reembolsado'),
        ('vencido', 'Vencido'),
    ]
    
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='pagos')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES,
        default='pendiente'
    )
    fecha_pago = models.DateTimeField(blank=True, null=True)
    imagen_transferencia = models.CharField(max_length=200, blank=True, null=True, help_text="URL de la imagen de transferencia")
    observaciones = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Pago #{self.id} - {self.reserva} - ${self.monto}"
