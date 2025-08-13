menuContainer.addEventListener('click', function(e) {
  if (e.target.classList.contains('edit-btn')) {
    const parentDiv = e.target.closest('.menu-item');
    if (parentDiv) {
      const id = parentDiv.id;
      // console.log('Div ID:', id);
      editItemModal.style.display = 'flex';
      editItemForm.reset(); // Reset form fields
      const item = allMenuData.find(item => item.id === id);
      if (item) {
        // Populate the edit form with item data
        editItemForm.querySelector('input[name="name"]').value = item.name;
        editItemForm.querySelector('textarea[name="description"]').value = item.description;
        editItemForm.querySelector('input[name="price"]').value = item.price;
        editItemForm.querySelector('input[name="category"]').value = item.category;
        editItemForm.querySelector('input[name="hidden"]').checked = item.hidden;
        editItemForm.dataset.itemId = id; // Store the ID for later use
      }
    }
  }
});




menuContainer.addEventListener('click', function(e) {
  if (e.target.classList.contains('hide-checkbox')) {
    const parentDiv = e.target.closest('.menu-item');
    if (parentDiv) {
      const id = parentDiv.id;
      socket.emit('toggle-item-visibility', id, e.target.checked);
      const item = allMenuData.find(item => item.id === id);
      if (item) {
        item.hidden = e.target.checked; // Update the item's hidden status
      }
      // update the menuDataByCategories variable
      if (menuDataByCategories[item.category]) {
        const index = menuDataByCategories[item.category].findIndex(i => i.id === id);
        if (index !== -1) {
          menuDataByCategories[item.category][index].hidden = item.hidden; // Update the hidden status in the category array
        }
      }
    }
  }
});




const deleteModal = document.getElementById('deleteModal');
const deleteConfirmBtn = document.getElementById('confirm-delete-btn');
const deleteCancelBtn = document.getElementById('cancel-delete-btn');
const itemToDeleteText = document.getElementById('item-to-delete-text');

menuContainer.addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-btn')) {
    const parentDiv = e.target.closest('.menu-item');

    if (parentDiv) {
      const id = parentDiv.id;
      const item = allMenuData.find(item => item.id === id);
      if (item) {
        itemToDeleteText.textContent = item.name; // Display the item name in the modal
        deleteModal.style.display = 'flex';
        deleteConfirmBtn.dataset.itemId = id; // Store the ID for later use
      }
    }
  }
});


deleteCancelBtn.addEventListener('click', () => {
  deleteModal.style.display = 'none';
});


deleteConfirmBtn.addEventListener('click', () => {
  const itemId = deleteConfirmBtn.dataset.itemId;
  if (itemId) {
    socket.emit('delete-item', itemId);
    // Remove the item from allMenuData
    allMenuData = allMenuData.filter(item => item.id !== itemId);
    // Update the menuDataByCategories variable
    Object.keys(menuDataByCategories).forEach(category => {
      menuDataByCategories[category] = menuDataByCategories[category].filter(item => item.id !== itemId);
      if (menuDataByCategories[category].length == 0) {
        delete menuDataByCategories[category];
      }
    });
    filterAndRender(); // Re-render the menu
  }
  deleteModal.style.display = 'none';
});




const addItemDescTextarea = document.getElementById('add-item-desc-textarea');
const addItemcharCountText = document.getElementById('add-item-desc-char-limit');

const editItemDescTextarea = document.getElementById('edit-item-desc-textarea');
const editItemcharCountText = document.getElementById('edit-item-desc-char-limit');

addItemDescTextarea.addEventListener('keypress', () => {
  updateAddItemCharCount();
});

editItemDescTextarea.addEventListener('keypress', () => {
  updateEditItemCharCount();
});


function updateAddItemCharCount() {
  let chars = addItemDescTextarea.value.length;
  addItemcharCountText.innerText = `(${chars}/60)`;
}

function updateEditItemCharCount() {
  let chars = editItemDescTextarea.value.length;
  editItemcharCountText.innerText = `(${chars}/60)`;
}