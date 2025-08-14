const socket = io();

const reloadMenuBtn = document.getElementById('reload-menu-btn');
const goToEditItems = document.getElementById('go-to-edit-items');
const ordersContainer = document.getElementById('ordersContainer');

reloadMenuBtn.addEventListener('click', () => {
  location.reload();
});

goToEditItems.addEventListener('click', () => {
  window.location.href = `${window.location.origin}/admin`;
});




window.addEventListener('load', () => {
  socket.emit('get-order-data');
});


socket.on('load-order-data', (data) => {
  console.log(data);
});





socket.on('new-order', (order) => {
  // console.log('New order received:', order);
  addOrder(order);
  playDing();
});

socket.on('load-order-data', (orderData) => {
  ordersContainer.innerHTML = '';

  if (orderData.length === 0) {
    ordersContainer.innerHTML = `<div class="no-orders">No orders</div>`;
    return;
  }

  orderData.sort((a, b) => {
    const dateA = new Date(a.client_order_pickup.replace(' ', 'T'));
    const dateB = new Date(b.client_order_pickup.replace(' ', 'T'));
    return dateB - dateA;
  });

  orderData.forEach((order) => addOrder(order));
});

function addOrder(order) {
  const orderEl = document.createElement('div');
  orderEl.classList.add('order-card');
  orderEl.id = order.id;
  orderEl.dataset.orderNum = order.client_order_num;

  let noOrderElem = document.querySelector('.no-orders');
  if (noOrderElem) noOrderElem.remove();

  const dateObj = new Date(order.client_order_pickup.replace('+00', '').replace(' ', 'T')); // Replace space with 'T'
  const edtString = dateObj.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // console.log(dateObj);
  // console.log(edtString);

  orderEl.innerHTML = `
    <div class="order-content">
      <div class="order-header">
        <div class="order-info">
          <p class="order-num">#${order.client_order_num}</p>
          <h2>${order.client_name}</h2>
          <p class="email"><strong>Email:</strong> ${order.client_email}</p>
          <p><strong>Pickup:</strong> ${edtString}</p>
          <br>
          <p><strong>Subtotal:</strong> $${order.client_subtotal.toFixed(2)}</p>
          <p><strong>Tax:</strong> $${order.client_tax.toFixed(2)}</p>
          <br>
          <p><strong>Total:</strong> $${order.client_final_total.toFixed(2)}</p>
        </div>
      </div>
      <div class="items">
        <strong>Items:</strong>
        <ul>
          ${order.client_order.map(item => `
            <li>${item.item} - ${item.price}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
  

  ordersContainer.prepend(orderEl);
}




socket.on('order-deleted', id => {
  removeOrderFromDOM(id);
});


socket.on('completed-order', orderId => {
  removeOrderFromDOM(orderId);
});


function removeOrderFromDOM(orderId) {
  document.getElementById(orderId).remove();

  if (!document.querySelector('.order-card')) {
    ordersContainer.innerHTML = `<div class="no-orders">No orders</div>`;
  }
}