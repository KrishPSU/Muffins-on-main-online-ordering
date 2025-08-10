// Modal logic for Add to Order
const modal = document.getElementById('addToOrderModal');
const modalItemInfo = document.getElementById('modalItemInfo');
const modalPriceButtons = document.getElementById('modalPriceButtons');
const closeModalBtn = document.getElementById('closeModalBtn');


function showAddToOrderModal(item) {
  quantity = 1;
  updateQuantity();

  modalItemInfo.innerHTML = 
    `<div class="menu-catagory-name">${item.category}:</div>
    <div class="menu-item-name">${item.name}</div>` +
    (item.description ? `<div class="menu-item-description">${item.description}</div>` : '') +
    (item.notes ? `<div class="menu-item-note">${item.notes}</div>` : '');

  modalPriceButtons.innerHTML = '';

  const createPriceButton = (label, size, basePrice) => {
    const btn = document.createElement('button');
    btn.className = 'price-button';
    // Store the base price as a data attribute for easy access
    btn.dataset.basePrice = basePrice;
    btn.textContent = `Add to Order: $${basePrice}`;

    btn.onclick = () => {
      const itemCopy = {
        ...item,
        price: `$${basePrice}`
      };

      addToOrder(itemCopy);
      closeModal();
    };

    modalPriceButtons.appendChild(btn);
  };

  createPriceButton('', 'default', item.price);
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
}

closeModalBtn.onclick = closeModal;
window.onclick = function(event) {
  if (event.target === modal) {
    closeModal();
  }
};

function addToOrder(item) {
  let itemQuantity = quantity;
  let itemText = `${item.name} (${item.category}) × ${itemQuantity}`;
  let priceText = `$${(parseFloat(item.price.split('$').join('')) * itemQuantity).toFixed(2)}`;

  const order = {
    item: itemText,
    quantity: itemQuantity,
    price: priceText,
  };

  addToCart(order);
}

window.showAddToOrderModal = showAddToOrderModal;
window.addToOrder = addToOrder;




const quantityText = document.getElementById('quantity_text');
const quantitySubBtn = document.getElementById('quantity_sub');
const quantityAddBtn = document.getElementById('quantity_add');

let quantity = 1;

quantityAddBtn.addEventListener('click', () => {
  quantity++;
  updateQuantity();
});


quantitySubBtn.addEventListener('click', () => {
  quantity--;
  updateQuantity();
});


function updateQuantity() {
  quantityAddBtn.disabled = false;
  quantitySubBtn.disabled = false;

  if (quantity >= 10) {
    quantity = 10;
    quantityAddBtn.disabled = true;
  }

  if (quantity <= 1) {
    quantity = 1;
    quantitySubBtn.disabled = true;
  }

  quantityText.innerText = quantity;
  
  // Update the price button text to show total price
  updatePriceButtonText();
}

function updatePriceButtonText() {
  const priceButtons = modalPriceButtons.querySelectorAll('.price-button');
  priceButtons.forEach(button => {
    const basePrice = parseFloat(button.dataset.basePrice);
    const totalPrice = (basePrice * quantity).toFixed(2);
    button.textContent = `Add to Order: $${totalPrice}`;
  });
}