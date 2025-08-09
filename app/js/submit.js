// Custom Alert Function
function showCustomAlert(message, type = 'success', duration = 5000) {
  // Remove any existing alerts
  const existingAlerts = document.querySelectorAll('.custom-alert');
  existingAlerts.forEach(alert => alert.remove());

  // Create alert element
  const alert = document.createElement('div');
  alert.className = `custom-alert ${type}`;
  
  alert.innerHTML = `
    <div class="alert-content">${message}</div>
    <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  // Add to page
  document.body.appendChild(alert);

  // Auto remove after duration
  setTimeout(() => {
    if (alert.parentElement) {
      alert.classList.add('hiding');
      setTimeout(() => {
        if (alert.parentElement) {
          alert.remove();
        }
      }, 300);
    }
  }, duration);

  return alert;
}

const submit_order_btn = document.getElementById('submit_order');
const client_name_input = document.getElementById('client-name');
const client_email_input = document.getElementById('client-email');
const pickup_date_input = document.getElementById('pickup-date');
const pickup_time_input = document.getElementById('pickup-time');

submit_order_btn.addEventListener('click', () => {  
  if (cart.length === 0) return;
  let client_name = client_name_input.value.trim();
  let client_email = client_email_input.value.trim();
  let pickup_date = pickup_date_input.value.trim();
  let pickup_time = pickup_time_input.value.trim();

  if (client_name == "") {
    client_name_input.style.borderColor = "red";
    showCustomAlert('Please fill the name field.', 'error');
    return;
  } else {
    client_name_input.style.borderColor = "black";
  }

  if (client_email == "") {
    client_email_input.style.borderColor = "red";
    showCustomAlert('Please fill the email field.', 'error');
    return;
  } else {
    client_email_input.style.borderColor = "black";
  }

  if (pickup_date == "") {
    pickup_date_input.style.borderColor = "red";
    showCustomAlert('Please enter a pickup date.', 'error');
    return;
  } else {
    pickup_date_input.style.borderColor = "black";
  }

  // Validate pickup date
  const [year, month, day] = pickup_date.split('-').map(Number);

  const inputDate = new Date(year, month - 1, day); // month is zero-based

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  inputDate.setHours(0, 0, 0, 0); // set inputDate to midnight too

  if (inputDate.getTime() < tomorrow.getTime()) {
    pickup_date_input.style.borderColor = "red";
    showCustomAlert('Please select a date that is tomorrow or later.', 'warning');
    return;
  } else {
    pickup_date_input.style.borderColor = "black";
  }



  if (pickup_time == "") {
    pickup_time_input.style.borderColor = "red";
    return;
  } else {
    pickup_time_input.style.borderColor = "black"; 
  }

  const [hours, minutes] = pickup_time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;

  const minAllowed = 8 * 60;   // 8:00am = 480 minutes
  const maxAllowed = 14 * 60;  // 2:00pm = 840 minutes

  if (totalMinutes < minAllowed || totalMinutes > maxAllowed) {
    // The time is between 8am (inclusive) and 2pm (exclusive)
    pickup_time_input.style.borderColor = "red";
    showCustomAlert('Please pick a time between 8am and 2pm', 'warning');
    return;
  } else {
    pickup_time_input.style.borderColor = "black";
  }


  // console.log(client_name, client_email, pickup_date, pickup_time);
  // return;

  let subtotal = 0;
  let tax = 0;
  let final_total = 0;
  cart.forEach((item) => {
    subtotal += parseFloat(item.price.split('$').join(''));
    tax += (subtotal * TAX_RATE);
    final_total += (parseFloat(subtotal) + parseFloat(tax));
  });


  let orderData = {
    client_order_num: generateOrderNum(),
    client_name: client_name,
    client_email: client_email,
    client_order_pickup: `${pickup_date}T${pickup_time}:00`,
    client_order: cart,
    client_subtotal: subtotal_elem.innerText.split('$').join(''),
    client_tax: tax_elem.innerText.split('$').join(''),
    client_final_total: final_total_elem.innerText.split('$').join('')
  };

  submitOrder(orderData);

  if (localStorage.getItem('hideMoMPwaPopup') === '1') {
    const popup = document.getElementById('MoM-pwa-popup');
    popup.style.display = 'block';
    setTimeout(() => popup.classList.add('active'), 100);

    document.getElementById('MoM-pwa-close').onclick = closeMoMPwaPopup;
  }
});



function isValidPhoneNumber(phone) {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Valid if 10 digits (standard) or 11 digits starting with '1' (US country code)
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'));
}




async function submitOrder(orderData) {
  try {
    const response = await axios.post('/api/orders', orderData);

    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      alert("You've previously blocked notifications. To fix this, please go to iPhone Settings > Safari > Advanced > Website Data, search 'ordermuffinsonmain.com', and delete it. Then re-add the app from Safari.");
      return; // Exit early if permission denied
    }

    // Use existing service worker registration
    console.log('Getting service worker registration...');
    const reg = await navigator.serviceWorker.ready;
    console.log('Service Worker is ready:', reg);

    // Check if service worker is active
    if (reg.active) {
      console.log('Service Worker is active');
    } else {
      console.log('Service Worker is not active yet');
      // Wait a bit more for activation
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Now try to subscribe
    console.log('Creating push subscription...');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BPk5VX60JVmOmpdOXCe1JQD6rHQYlgbngjLPk355nAxVLcMS0hjDOprFc4e9xXFvcu_Gy3eJs20mmOvlrEHCH5A'
    });
    console.log('Push subscription created:', sub);

    socket.emit('save-subscription', orderData.client_name, sub, orderData.client_order_num);

    if (response.status === 201 || response.status === 200) {
      console.log('Order submitted:', response.data);
      showCustomAlert('Your order has been placed successfully!', 'success');

      drawer_content.style.transform = 'translateX(0)';
      document.getElementById('orderDrawer').classList.remove('open');

      cart = [];
      renderCart();
      updateCartCount()
      client_name_input.value = "";
      client_email_input.value = "";
      pickup_date_input.value = "";
      pickup_time_input.value = "";
      updateTotal();

      setTimeout(() => {
        window.location.href += `order_confirmed/${btoa(orderData.client_order_num)}`;
      }, 1000);

    } else {
      console.warn('Unexpected response:', response);
      showCustomAlert('Something went wrong. Please try again.', 'warning');
    }
  } catch (error) {
    console.error('Service Worker or Push subscription error:', error);
    
    if (error.name === 'NotAllowedError') {
      showCustomAlert('Notification permission denied. Please allow notifications and try again.', 'error');
    } else if (error.message.includes('no active Service Worker')) {
      showCustomAlert('Service Worker not ready. Please refresh the page and try again.', 'error');
    } else {
      showCustomAlert('Failed to set up notifications. Please try again.', 'error');
    }
    
    // Continue with order submission even if notifications fail
    if (response && (response.status === 201 || response.status === 200)) {
      console.log('Order submitted:', response.data);
      showCustomAlert('Your order has been placed successfully!', 'success');

      drawer_content.style.transform = 'translateX(0)';
      document.getElementById('orderDrawer').classList.remove('open');

      cart = [];
      renderCart();
      updateCartCount()
      client_name_input.value = "";
      client_email_input.value = "";
      pickup_date_input.value = "";
      pickup_time_input.value = "";
      updateTotal();

      window.location.href += `order_confirmed/${btoa(orderData.client_order_num)}`;

    } else if (error.response) {
      console.error('Server error:', error.response.data);
      showCustomAlert(`Server error: ${error.response.data.message || 'Unable to submit order.'}`, 'error');
    } else {
      console.error('Network error:', error.message);
      showCustomAlert('Network error. Please check your internet connection.' + error.message, 'error');
      alert(error.message);
    }
  }
}





function generateOrderNum() {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 2 random digits
  console.log('Generated order number:', timestamp + random);
  return timestamp + random; // 8-digit number
}