document.addEventListener('DOMContentLoaded', function () {
    // Función para mostrar el modal de selección de cliente
    function mostrarSeleccionCliente() {
        // Datos de clientes pasados desde Django
        const clientes = JSON.parse(document.getElementById('clientes-data').textContent);
        const forma_pago = JSON.parse(document.getElementById('forma_pago-data').textContent);
        // Agregar opción de cliente no registrado
        const existeClienteNoRegistrado = clientes.some(cliente => cliente.email.trim().toLowerCase() === 'no.registrado@tienda.com');
        console.log('resultado no registrado',existeClienteNoRegistrado)
        const clienteNoRegistrado = {
            id: 0,
            nombre: 'Cliente sin registro',
            apellido: '',
            documento: '1111111111',
            telefono: '1111111111',
            email: 'no.registrado@tienda.com'
        };
        
        // Construir el HTML para la tabla de clientes
        let html = `
            <div class="swal2-cliente-container">
                <div class="swal2-filter-container">
                    <input type="text" id="swal2-filter" class="swal2-input" placeholder="Filtrar por nombre o email...">
                </div>
                <div class="swal2-table-container">
                    <table class="swal2-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Seleccionar</th>
                            </tr>
                        </thead>
                        <tbody id="swal2-clientes-body">
                            ${clientes.map(cliente => `
                                <tr>
                                    <td>${cliente.nombre} ${cliente.apellido || ''}</td>
                                    <td>${cliente.email}</td>
                                    <td>${cliente.telefono}</td>
                                    <td><button class="swal2-select-btn" data-id="${cliente.id}">Seleccionar</button></td>
                                </tr>
                            `).join('')}
                            <tr>
                                <td colspan="4">
                                    <button class="swal2-select-btn swal2-no-reg-btn" data-id="0"
                                        ${existeClienteNoRegistrado ? 'disabled' : ''}>
                                        Cliente no registrado
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="swal2-payment-container">
                    <label for="swal2-metodo-pago">Método de Pago:</label>
                    <select id="swal2-metodo-pago" class="swal2-select">
                        <option value="">-- Seleccione --</option>
                    </select>
                </div>
            </div>
        `;

        // Mostrar el SweetAlert con la tabla de clientes
        const swalInstance = Swal.fire({
            title: 'Seleccionar Cliente',
            html: html,
            didRender: () => {
                if (existeClienteNoRegistrado) {
                    document.querySelector('.swal2-no-reg-btn').setAttribute('disabled', 'disabled');
                }
            },
            width: '800px',
            showConfirmButton: true,
            confirmButtonText: 'Confirmar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                // Configurar el filtro
                const filterInput = document.getElementById('swal2-filter');
                filterInput.addEventListener('input', (e) => {
                    const filter = e.target.value.toLowerCase();
                    const rows = document.querySelectorAll('#swal2-clientes-body tr');

                    rows.forEach(row => {
                        const nombre = row.cells[0].textContent.toLowerCase();
                        const email = row.cells[1].textContent.toLowerCase();
                        const shouldShow = nombre.includes(filter) || email.includes(filter);
                        row.style.display = shouldShow ? '' : 'none';
                    });
                });
                
                // Configurar los botones de selección
                const selectButtons = document.querySelectorAll('.swal2-select-btn');
                selectButtons.forEach(btn => {
                    btn.addEventListener('click', function () {
                        // Remover selección previa
                        selectButtons.forEach(b => b.classList.remove('selected'));
                        // Marcar como seleccionado
                        this.classList.add('selected');
                        // Guardar el ID del cliente seleccionado
                        swalInstance.selectedClienteId = this.dataset.id;

                        // Si es cliente no registrado, seleccionarlo automáticamente
                        if (this.dataset.id === '0') {
                            swalInstance.enableButtons();
                        } else {
                            // Verificar que se haya seleccionado método de pago
                            const metodoPago = document.getElementById('swal2-metodo-pago').value;
                            swalInstance.enableButtons(!!metodoPago);
                        }
                    });
                });

                // Configurar el método de pago
                const metodoPagoSelect = document.getElementById('swal2-metodo-pago');
                forma_pago.forEach(fp => {
                    const option = document.createElement('option');
                    option.value = fp.id;               // Usa el ID como valor
                    option.textContent = fp.nombre;     // Muestra el nombre
                    metodoPagoSelect.appendChild(option);
                });
                metodoPagoSelect.addEventListener('change', function () {
                    const hasSelectedClient = !!swalInstance.selectedClienteId;
                    swalInstance.enableButtons(hasSelectedClient && !!this.value);
                });

                // Función para habilitar/deshabilitar botón de confirmar
                swalInstance.enableButtons = function (enabled) {
                    const confirmBtn = Swal.getConfirmButton();
                    confirmBtn.disabled = !enabled;
                };

                // Inicialmente deshabilitar el botón de confirmar
                swalInstance.enableButtons(false);
            },
            preConfirm: () => {
                const selectedId = swalInstance.selectedClienteId;
                if (!selectedId) {
                    Swal.showValidationMessage('Por favor selecciona un cliente');
                    return false;
                }

                const metodoPago = document.getElementById('swal2-metodo-pago').value;
                if (!metodoPago) {
                    Swal.showValidationMessage('Por favor selecciona un método de pago');
                    return false;
                }

                let clienteSeleccionado;
                if (selectedId === '0') {
                    clienteSeleccionado = clienteNoRegistrado;
                } else {
                    clienteSeleccionado = clientes.find(c => c.id == selectedId);
                }

                return {
                    cliente: clienteSeleccionado,
                    metodoPago: metodoPago
                };
            }
        }).then((result) => {
            // En la parte donde actualizas los campos ocultos (dentro del .then de Swal.fire)
            if (result.isConfirmed) {
                const { cliente, metodoPago } = result.value;

                // Actualizar la interfaz con los datos del cliente
                document.getElementById('nombre_mostrado').textContent = cliente.nombre + (cliente.apellido ? ' ' + cliente.apellido : '');
                document.getElementById('documento_mostrado').textContent = cliente.documento || '-';
                document.getElementById('telefono_mostrado').textContent = cliente.telefono;
                document.getElementById('email_mostrado').textContent = cliente.email;
                document.getElementById('metodo_pago_mostrado').textContent = metodoPago;

                // Actualizar los campos ocultos
                document.getElementById('nombre').value = cliente.nombre + (cliente.apellido ? ' ' + cliente.apellido : '');
                document.getElementById('documento').value = cliente.documento || '';
                document.getElementById('telefono').value = cliente.telefono;
                document.getElementById('email').value = cliente.email;
                document.getElementById('metodo_pago').value = metodoPago;

                // Actualizar campos del formulario
                document.getElementById('form_nombre').value = cliente.nombre + (cliente.apellido ? ' ' + cliente.apellido : '');
                document.getElementById('form_documento').value = cliente.documento || '';
                document.getElementById('form_telefono').value = cliente.telefono;
                document.getElementById('form_email').value = cliente.email;
                document.getElementById('form_metodo_pago').value = metodoPago;

                // Añadir campo oculto para el ID del cliente (nuevo)
                let clienteId = cliente.id === 0 ? '00' : cliente.id;
                document.getElementById('form_cliente_id').value = clienteId;
            }
        });
    }

    // Evento para el botón de seleccionar cliente
    document.getElementById('btnSeleccionarCliente').addEventListener('click', mostrarSeleccionCliente);
});

function limpiarNombre(nombre) {
    // Quita paréntesis y lo que está dentro
    return nombre.replace(/\s*\(.*?\)\s*/g, '').trim();
}
// Función para confirmar los datos de la venta
function confirmarDatos(boton) {
    const urlVenta = boton.dataset.url;
    const nombre = document.getElementById("nombre").value.trim();
    const documento = document.getElementById("documento").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim();
    const metodoPago = document.getElementById("metodo_pago").value;

    if (!nombre || !telefono || !metodoPago) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: 'Por favor completa todos los campos antes de confirmar.'
        });
        return;
    }

    // Obtener productos
    const filas = document.querySelectorAll(".products-table tbody tr");
    let productos = [];
    filas.forEach(fila => {
        const columnas = fila.querySelectorAll("td");
        productos.push({
            nombre_codigo: limpiarNombre(columnas[0].innerText.trim()),
            cantidad: columnas[1].innerText.trim(),
            precio_unitario: columnas[2].innerText.trim().replace("$", ""),
            total_producto: columnas[3].innerText.trim().replace("$", "")
        });
    });

    // Actualizar campo oculto de productos
    document.getElementById("form_productos_json").value = JSON.stringify(productos);

    const formData = new FormData(document.getElementById("formVenta"));

    fetch(urlVenta, {
        method: "POST",
        headers: {
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: formData
    })
        .then(response => {
            if (!response.ok) throw new Error("Error en la petición.");
            return response.json();
        })
        .then(data => {
            Swal.fire({
                icon: 'success',
                title: '¡Venta Confirmada!',
                text: 'Los datos han sido enviados correctamente.',
                confirmButtonColor: '#3085d6'
            }).then(() => {
                document.getElementById("btnImprimir").disabled = false;
                // Ya no se refresca ni redirige automáticamente. El usuario debe usar el botón 'Volver a la tienda'.
            });
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al confirmar la venta. Intenta nuevamente.'
            });
            console.error(error);
        });
}