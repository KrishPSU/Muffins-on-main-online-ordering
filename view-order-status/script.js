const socket = io();

const orderId = atob(window.location.pathname.split('/view_order_status/').join('').replace('/', ''));


async function getOrderStatus() {
  try {
    const response = await axios.get(`/api/order-status/${orderId}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    const orderData = response.data;
    document.getElementById('orderId').textContent = orderData.client_order_num;
    document.getElementById('customerName').textContent = `${orderData.client_name} | ${orderData.client_email}`;
    setCompleted(orderData.completed);
    document.getElementById('items').innerHTML = parseItems(orderData.client_order);
    document.getElementById('readyTime').innerText = formatDateTime(orderData.client_order_pickup);

  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log("The order id you provided is invalid and does not exist.");
      document.body.innerHTML = "The order id you provided is invalid and does not exist.";
      document.body.style.textAlign = "center";
    } else {
      console.error("Failed to fetch order status:", err);
      document.body.innerHTML = `Failed to fetch order status: ${err}`;
    }
  }
}

// Call it once on page load
getOrderStatus();





// Example completed toggle
function setCompleted(isDone) {
  const el = document.getElementById('completed');
  el.textContent = isDone ? 'Yes' : 'No';
  el.classList.toggle('ok', isDone);
  el.classList.toggle('no', !isDone);
  document.getElementById('statusBadge').textContent = isDone ? 'Completed' : 'Received';
  document.getElementById('statusBadge').style.color = isDone ? "#16a34a" : "#b91c1c";
  document.getElementById('statusBadge').style.backgroundColor = isDone ? "#d5f2d5" : "#fef2f2";
}


function parseItems(items) {
  let html = ``;
  for (let i=0; i<items.length; i++) {
    html += `<li><span class="item-name">${items[i].item}</span><span class="item-qty">${items[i].price}</span></li>`;
  }
  return html;
}


function formatDateTime(dateString) {
  const date = new Date(dateString);

  const optionsDate = { month: 'short', day: 'numeric', year: 'numeric' };
  const optionsTime = { hour: 'numeric', minute: '2-digit', hour12: true };

  const formattedDate = date.toLocaleDateString('en-US', optionsDate);
  const formattedTime = date.toLocaleTimeString('en-US', optionsTime);

  return `${formattedDate} • ${formattedTime}`;
}