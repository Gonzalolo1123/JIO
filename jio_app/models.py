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
        ('Habilitado', 'Habilitado'),
        ('Deshabilitado', 'Deshabilitado'),
    ]
    
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='repartidor')
    licencia_conducir = models.CharField(max_length=20, blank=True, null=True)
    vehiculo = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES,
        default='Habilitado'
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
        ('Pequeño', 'Pequeño'),
        ('Mediano', 'Mediano'),
        ('Grande', 'Grande'),
    ]
    
    ESTADO_CHOICES = [
        ('Habilitado', 'Habilitado'),
        ('Deshabilitado', 'Deshabilitado'),
    ]
    
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    edad_minima = models.PositiveIntegerField(help_text="Edad mínima en años", default=3)
    edad_maxima = models.PositiveIntegerField(help_text="Edad máxima en años", default=12)
    dimension_largo = models.FloatField(help_text="Largo en metros", default=0.0)
    dimension_ancho = models.FloatField(help_text="Ancho en metros", default=0.0)
    dimension_alto = models.FloatField(help_text="Alto en metros", default=0.0)
    capacidad_personas = models.PositiveIntegerField()
    peso_maximo = models.PositiveIntegerField(help_text="Peso máximo en kg")
    precio_base = models.PositiveIntegerField()
    foto = models.ImageField(upload_to='juegos/', blank=True, null=True, help_text="Imagen del juego inflable")
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default='Habilitado',
        help_text="Estado actual del juego inflable"
    )
    # Campos para registrar peso excedido
    peso_excedido = models.BooleanField(default=False, help_text="Indica si el peso excede el máximo de la categoría")
    peso_excedido_por = models.ForeignKey(
        Usuario, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='juegos_peso_excedido',
        help_text="Usuario que ingresó el peso excedido"
    )
    peso_excedido_fecha = models.DateTimeField(null=True, blank=True, help_text="Fecha y hora en que se ingresó el peso excedido")
    
    class Meta:
        verbose_name = 'Juego Inflable'
        verbose_name_plural = 'Juegos Inflables'
        ordering = ['nombre']
    
    @property
    def dimensiones(self):
        """Devuelve las dimensiones formateadas como string para compatibilidad"""
        return f"{self.dimension_largo}m x {self.dimension_ancho}m x {self.dimension_alto}m"
    
    def __str__(self):
        return f"{self.nombre} - {self.get_categoria_display()}"
class PrecioTemporada(models.Model):
    """
    Precios por temporada para cada juego
    """
    TEMPORADA_CHOICES = [
        ('Alta', 'Temporada Alta'),
        ('Baja', 'Temporada Baja'),
        ('Especial', 'Temporada Especial'),
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
        ('Pendiente', 'Pendiente'),
        ('Confirmada', 'Confirmada'),
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
    distancia_km = models.PositiveIntegerField(default=0, help_text="Kilómetros fuera de Osorno")
    precio_distancia = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Precio por distancia (km * precio por km)")
    horas_extra = models.PositiveIntegerField(default=0, help_text="Horas adicionales después de las 6 horas base")
    precio_horas_extra = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Precio por horas extra ($10.000 por hora)")
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
    
    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('otro', 'Otro'),
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
    
    # Información de pago
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, blank=True, null=True)
    comprobante_pago = models.ImageField(upload_to='comprobantes/', blank=True, null=True)
    
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


class Vehiculo(models.Model):
    """
    Modelo para gestionar la flota de vehículos de reparto
    """
    TIPO_CHOICES = [
        ('camioneta', 'Camioneta'),
        ('furgon', 'Furgón'),
        ('camion', 'Camión'),
        ('otro', 'Otro'),
    ]
    
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('en_uso', 'En Uso'),
        ('en_mantenimiento', 'En Mantenimiento'),
        ('fuera_servicio', 'Fuera de Servicio'),
    ]
    
    patente = models.CharField(max_length=10, unique=True, help_text="Patente del vehículo")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='camioneta')
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    año = models.PositiveIntegerField(help_text="Año del vehículo")
    color = models.CharField(max_length=30, blank=True, null=True)
    kilometraje_actual = models.PositiveIntegerField(default=0, help_text="Kilometraje actual en km")
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='disponible'
    )
    fecha_ultimo_mantenimiento = models.DateField(blank=True, null=True)
    proximo_mantenimiento_km = models.PositiveIntegerField(blank=True, null=True, help_text="Próximo mantenimiento en km")
    seguro_vencimiento = models.DateField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Vehículo'
        verbose_name_plural = 'Vehículos'
        ordering = ['patente']
    
    def __str__(self):
        return f"{self.patente} - {self.marca} {self.modelo} ({self.año})"


class GastoOperativo(models.Model):
    """
    Modelo para registrar gastos operativos del negocio
    """
    CATEGORIA_CHOICES = [
        ('combustible', 'Combustible'),
        ('mantenimiento', 'Mantenimiento'),
        ('publicidad', 'Publicidad'),
        ('servicios', 'Servicios'),
        ('materiales', 'Materiales'),
        ('salarios', 'Salarios'),
        ('alquiler', 'Alquiler'),
        ('seguros', 'Seguros'),
        ('impuestos', 'Impuestos'),
        ('otros', 'Otros'),
    ]
    
    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('tarjeta', 'Tarjeta'),
        ('cheque', 'Cheque'),
    ]
    
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_gasto = models.DateField()
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    comprobante = models.ImageField(upload_to='comprobantes_gastos/', blank=True, null=True)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True, related_name='gastos')
    reserva = models.ForeignKey(Reserva, on_delete=models.SET_NULL, null=True, blank=True, related_name='gastos')
    observaciones = models.TextField(blank=True, null=True)
    registrado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='gastos_registrados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Gasto Operativo'
        verbose_name_plural = 'Gastos Operativos'
        ordering = ['-fecha_gasto', '-fecha_creacion']
    
    def __str__(self):
        return f"Gasto #{self.id} - {self.get_categoria_display()} - ${self.monto}"


class Promocion(models.Model):
    """
    Modelo para gestionar promociones y descuentos
    """
    TIPO_DESCUENTO_CHOICES = [
        ('porcentaje', 'Porcentaje (%)'),
        ('monto_fijo', 'Monto Fijo ($)'),
        ('2x1', '2x1'),
        ('envio_gratis', 'Envío Gratis'),
    ]
    
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('inactiva', 'Inactiva'),
        ('expirada', 'Expirada'),
    ]
    
    codigo = models.CharField(max_length=50, unique=True, help_text="Código de cupón")
    nombre = models.CharField(max_length=100, help_text="Nombre de la promoción")
    descripcion = models.TextField(blank=True, null=True)
    tipo_descuento = models.CharField(max_length=20, choices=TIPO_DESCUENTO_CHOICES, default='porcentaje')
    valor_descuento = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Valor del descuento (porcentaje o monto según tipo)"
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    juegos = models.ManyToManyField(Juego, blank=True, related_name='promociones', help_text="Juegos aplicables (vacío = todos)")
    monto_minimo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Monto mínimo de compra para aplicar el descuento"
    )
    limite_usos = models.PositiveIntegerField(
        default=0,
        help_text="Límite de usos (0 = ilimitado)"
    )
    usos_actuales = models.PositiveIntegerField(default=0, help_text="Usos actuales")
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='activa'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Promoción'
        verbose_name_plural = 'Promociones'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    @property
    def esta_vigente(self):
        """Verifica si la promoción está vigente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        return self.estado == 'activa' and self.fecha_inicio <= hoy <= self.fecha_fin
    
    @property
    def puede_usarse(self):
        """Verifica si la promoción puede usarse"""
        if not self.esta_vigente:
            return False
        if self.limite_usos > 0 and self.usos_actuales >= self.limite_usos:
            return False
        return True


class Evaluacion(models.Model):
    """
    Modelo para evaluaciones y reseñas de clientes
    """
    CALIFICACION_CHOICES = [
        (1, '1 Estrella'),
        (2, '2 Estrellas'),
        (3, '3 Estrellas'),
        (4, '4 Estrellas'),
        (5, '5 Estrellas'),
    ]
    
    ESTADO_CHOICES = [
        ('publicada', 'Publicada'),
        ('pendiente', 'Pendiente'),
        ('oculta', 'Oculta'),
    ]
    
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='evaluaciones')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='evaluaciones')
    calificacion = models.PositiveIntegerField(choices=CALIFICACION_CHOICES)
    comentario = models.TextField(blank=True, null=True)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente'
    )
    respuesta_admin = models.TextField(blank=True, null=True, help_text="Respuesta del administrador")
    fecha_evaluacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Evaluación'
        verbose_name_plural = 'Evaluaciones'
        ordering = ['-fecha_evaluacion']
        unique_together = ['reserva', 'cliente']
    
    def __str__(self):
        return f"Evaluación #{self.id} - {self.cliente.usuario.get_full_name()} - {self.calificacion} estrellas"


class Proveedor(models.Model):
    """
    Modelo para gestionar proveedores de servicios y productos
    """
    TIPO_PROVEEDOR_CHOICES = [
        ('mantenimiento', 'Mantenimiento Vehículos'),
        ('combustible', 'Combustible'),
        ('seguros', 'Seguros'),
        ('materiales', 'Materiales/Repuestos'),
        ('servicios', 'Servicios Generales'),
        ('otros', 'Otros'),
    ]
    
    nombre = models.CharField(max_length=100, help_text="Nombre del proveedor")
    tipo_proveedor = models.CharField(max_length=20, choices=TIPO_PROVEEDOR_CHOICES)
    rut = models.CharField(max_length=12, blank=True, null=True, help_text="RUT del proveedor")
    contacto_nombre = models.CharField(max_length=100, blank=True, null=True, help_text="Nombre de contacto")
    telefono = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    servicios_ofrecidos = models.TextField(blank=True, null=True, help_text="Descripción de servicios ofrecidos")
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - {self.get_tipo_proveedor_display()}"


class MantenimientoVehiculo(models.Model):
    """
    Modelo para registrar mantenimientos de vehículos
    """
    TIPO_MANTENIMIENTO_CHOICES = [
        ('preventivo', 'Preventivo'),
        ('correctivo', 'Correctivo'),
        ('revision', 'Revisión'),
        ('reparacion', 'Reparación'),
    ]
    
    ESTADO_CHOICES = [
        ('programado', 'Programado'),
        ('en_proceso', 'En Proceso'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]
    
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='mantenimientos')
    tipo_mantenimiento = models.CharField(max_length=20, choices=TIPO_MANTENIMIENTO_CHOICES)
    fecha_programada = models.DateField()
    fecha_realizada = models.DateField(blank=True, null=True)
    kilometraje = models.PositiveIntegerField(help_text="Kilometraje al momento del mantenimiento")
    descripcion = models.TextField(help_text="Descripción del trabajo realizado")
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True, related_name='mantenimientos')
    observaciones = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='programado')
    realizado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='mantenimientos_realizados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Mantenimiento de Vehículo'
        verbose_name_plural = 'Mantenimientos de Vehículos'
        ordering = ['-fecha_programada', '-fecha_creacion']
    
    def __str__(self):
        return f"Mantenimiento #{self.id} - {self.vehiculo.patente} - {self.get_tipo_mantenimiento_display()}"


class Material(models.Model):
    """
    Modelo para gestionar inventario de materiales y equipos
    """
    CATEGORIA_CHOICES = [
        ('bomba', 'Bomba de Aire'),
        ('extension', 'Extensiones Eléctricas'),
        ('accesorio', 'Accesorios'),
        ('repuesto', 'Repuestos'),
        ('herramienta', 'Herramientas'),
        ('limpieza', 'Productos de Limpieza'),
        ('otro', 'Otro'),
    ]
    
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('en_uso', 'En Uso'),
        ('mantenimiento', 'En Mantenimiento'),
        ('dañado', 'Dañado'),
        ('baja', 'Dado de Baja'),
    ]
    
    nombre = models.CharField(max_length=100, help_text="Nombre del material/equipo")
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    stock_actual = models.PositiveIntegerField(default=0, help_text="Cantidad disponible")
    stock_minimo = models.PositiveIntegerField(default=0, help_text="Stock mínimo antes de alertar")
    unidad_medida = models.CharField(max_length=20, default='unidad', help_text="Ej: unidad, metro, litro, kg")
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Precio de compra unitario")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')
    ubicacion = models.CharField(max_length=100, blank=True, null=True, help_text="Ubicación física del material")
    proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True, related_name='materiales')
    fecha_ultima_compra = models.DateField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Material'
        verbose_name_plural = 'Materiales'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - Stock: {self.stock_actual} {self.unidad_medida}"
    
    @property
    def stock_bajo(self):
        """Indica si el stock está por debajo del mínimo"""
        return self.stock_actual <= self.stock_minimo and self.stock_minimo > 0