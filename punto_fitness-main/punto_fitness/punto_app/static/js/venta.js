document.addEventListener('DOMContentLoaded', function () {
    let cart = [];
    const cartModal = document.getElementById('cart-modal');
    const cartIcon = document.querySelector('.cart-icon');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.querySelector('.total-amount');
    const cartCount = document.querySelector('.cart-count');

    // Abrir/Cerrar carrito
    cartIcon.addEventListener('click', () => {
        cartModal.style.display = 'block';
        updateCartDisplay();
    });

    document.querySelector('.close-cart').addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    // Añadir al carrito
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function () {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.id;
            const productName = productCard.querySelector('h3').textContent;
            const productPrice = parseFloat(productCard.querySelector('.product-price span').textContent.replace('$', ''));
            const productQty = parseInt(productCard.querySelector('.qty-input').value);
            const productImg = productCard.querySelector('.product-image img').src;

            const existingItem = cart.find(item => item.id === productId);

            if (existingItem) {
                existingItem.quantity += productQty;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    quantity: productQty,
                    img: productImg
                });
            }

            updateCartCount();
            showAddToCartFeedback(this);
        });
    });

    // Mostrar carrito
    function updateCartDisplay() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-basket"></i><p>Tu carrito está vacío</p></div>';
        } else {
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;

                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <img src="${item.img}" alt="${item.name}">
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <div class="item-price">$${item.price.toFixed(2)}</div>
                        <div class="item-qty">
                            <button class="qty-change minus" data-id="${item.id}">-</button>
                            <span>${item.quantity}</span>
                            <button class="qty-change plus" data-id="${item.id}">+</button>
                        </div>
                    </div>
                    <div class="item-total">$${itemTotal.toFixed(2)}</div>
                    <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                `;
                cartItemsContainer.appendChild(cartItem);
            });
        }

        cartTotal.textContent = `$${total.toFixed(2)}`;
        attachCartEventListeners();
    }

    function attachCartEventListeners() {
        document.querySelectorAll('.qty-change').forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.dataset.id;
                const item = cart.find(item => item.id === productId);
                if (!item) return;

                if (this.classList.contains('plus')) {
                    item.quantity += 1;
                } else if (this.classList.contains('minus') && item.quantity > 1) {
                    item.quantity -= 1;
                }
                updateCartDisplay();
                updateCartCount();
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.dataset.id;
                cart = cart.filter(item => item.id !== productId);
                updateCartDisplay();
                updateCartCount();
            });
        });
    }

    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    function showAddToCartFeedback(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Añadido';
        button.style.backgroundColor = '#4CAF50';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.backgroundColor = '';
        }, 1500);
    }

    // Filtrar por categoría
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelector('.category-btn.active').classList.remove('active');
            this.classList.add('active');

            const category = this.dataset.category;
            document.querySelectorAll('.product-card').forEach(product => {
                product.style.display = (category === 'all' || product.dataset.category === category) ? 'block' : 'none';
            });
        });
    });

    // Control de cantidad en producto
    document.querySelectorAll('.qty-btn').forEach(button => {
        button.addEventListener('click', function () {
            const input = this.parentElement.querySelector('.qty-input');
            let value = parseInt(input.value);
            const min = parseInt(input.min);
            const max = parseInt(input.max);

            if (this.classList.contains('plus')) {
                input.value = Math.min(value + 1, max);
            } else if (this.classList.contains('minus')) {
                input.value = Math.max(value - 1, min);
            }
        });
    });
    document.querySelector('.btn-clear').addEventListener('click', function () {
            if (cart.length === 0) {
                alert('El carrito ya está vacío');
                return;
            }

            if (confirm('¿Estás seguro que deseas vaciar el carrito?')) {
                cart = [];
                updateCartDisplay();
                updateCartCount();
            }
        });
    // Finalizar compra
    document.querySelector('.btn-checkout').addEventListener('click', function () {
        if (cart.length === 0) {
            alert('Tu carrito está vacío');
            return;
        }

        fetch('/finalizar_compra/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ productos: cart })
        })
            .then(response => response.json())
            .then(data => {
                if (data.voucher) {
                    // Crear formulario oculto para redirigir a la vista del voucher
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = '/mostrar_voucher/';
                    form.target = '_self';
                    const csrfToken = getCookie('csrftoken');
                    const csrfInput = document.createElement('input');
                    csrfInput.type = 'hidden';
                    csrfInput.name = 'csrfmiddlewaretoken';
                    csrfInput.value = csrfToken;
                    form.appendChild(csrfInput);

                    const voucherInput = document.createElement('input');
                    voucherInput.type = 'hidden';
                    voucherInput.name = 'voucher_data';
                    voucherInput.value = JSON.stringify(data.voucher);
                    form.appendChild(voucherInput);

                    document.body.appendChild(form);
                    form.submit();
                    setTimeout(() => {
                    location.reload();
                    }, 500);

                } else {
                    alert(data.mensaje || 'Error al procesar la compra.');
                }

                cart = [];
                updateCartDisplay();
                updateCartCount();
                cartModal.style.display = 'none';
            });
    });

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const productCards = document.querySelectorAll('.product-card');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();

        productCards.forEach(card => {
            const productName = card.querySelector('h3').textContent.toLowerCase();
            if (productName.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});