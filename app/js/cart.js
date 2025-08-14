const goToOrderDetailsBtn = document.getElementById('go-to-order-details');
const submitOrderBtn = document.getElementById('submit_order');
const orderList = document.getElementById('orderList');
const subtotal_elem = document.getElementById('subtotal');
const tax_elem = document.getElementById('tax');
const final_total_elem = document.getElementById('total');


let cart = [];

// Open the drawer
document.getElementById('viewOrderBtn').addEventListener('click', () => {
  document.getElementById('orderDrawer').classList.add('open');
  renderCart();
});

// Close the drawer
document.getElementById('closeDrawer').addEventListener('click', () => {
  document.getElementById('orderDrawer').classList.remove('open');
});

// Add item to cart (call this on button clicks)
function addToCart(order) {
  cart.push(order);
  updateCartCount();
  renderCart();
  showCartAlert(`${order.item} added to cart`);
  goToOrderDetailsBtn.disabled = false;
}

// Update cart count badge
function updateCartCount() {
  document.getElementById('cartCount').textContent = cart.length;
}

// Render cart items inside the drawer
function renderCart() {
  orderList.innerHTML = '';

  if (cart.length === 0) {
    orderList.innerHTML = '<li><em>Your cart is empty.</em></li>';
    goToOrderDetailsBtn.disabled = true;
    return;
  }

  cart.forEach((order, index) => {
    const li = document.createElement('li');

    li.innerHTML = `
      <span class="cart_item">
        <span class="item_name">${index + 1}. ${order.item}</span>
        <span class="item_price">${order.price}</span>
        <button class="delete-item">🗑️</button>
      </span>
    `;

    
    // Delete button logic
    li.querySelector('.delete-item').addEventListener('click', () => {
      cart.splice(index, 1);
      updateCartCount();
      renderCart(); // Re-render after deletion
      updateTotal();
    });
    
    orderList.appendChild(li);
  });

  updateTotal();
  updateShadows();
}


function updateTotal() {
  let subtotal = update_subtotal();
  let tax = update_tax(subtotal);
  let final_total = updateFinalTotal(subtotal, tax);
  
  subtotal_elem.textContent = `$${subtotal.toFixed(2)}`;
  tax_elem.textContent = `$${tax.toFixed(2)}`;
  final_total_elem.textContent = `$${final_total.toFixed(2)}`;
  updateShadows();
}
function update_subtotal() {
  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += parseFloat(item.price.split('$').join(''));
  });
  return subtotal;
}
const TAX_RATE = 0; // Changed from 0.0625 to 0
function update_tax(subtotal) {
  return +(subtotal * TAX_RATE).toFixed(2);
}
function updateFinalTotal(subtotal, tax) {
  return subtotal + tax;
}




function showCartAlert(message = 'Item added to cart ✅') {
  const alert = document.getElementById('cartAlert');
  alert.textContent = message;
  alert.classList.add('show');

  setTimeout(() => {
    alert.classList.remove('show');
  }, 2000); // disappears after 2 seconds
}