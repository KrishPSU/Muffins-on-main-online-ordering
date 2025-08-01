const socket = io('http://localhost:3000/'); // Initialize socket.io client

const reloadMenuBtn = document.getElementById('reload-menu-btn');

reloadMenuBtn.addEventListener('click', () => {
  location.reload();
});








const modal = document.getElementById('itemModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const itemForm = document.getElementById('itemForm');


const editItemModal = document.getElementById('editItemModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editItemForm = document.getElementById('editItemForm');



closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; }

closeEditModalBtn.onclick = () => editItemModal.style.display = 'none';
window.onclick = (e) => { if(e.target === editItemModal) editItemModal.style.display = 'none'; }


itemForm.onsubmit = function(e) {
  e.preventDefault();
  // Get form data
  const formData = new FormData(itemForm);
  const newItem = {
    name: formData.get('name'),
    description: formData.get('description'),
    price: parseFloat(formData.get('price')),
    hidden: !!formData.get('hidden'),
    category: formData.get('category')
  };
  // Do something with data (e.g., send to server or display)
  socket.emit('add-menu-item', newItem);
  modal.style.display = 'none';
  itemForm.reset();


  // Add new item to the menu data
  allMenuData.push(newItem);
  
  // Update the grouped data
  if (!menuDataByCategories[newItem.category]) {
    menuDataByCategories[newItem.category] = [];
  }
  menuDataByCategories[newItem.category].push(newItem);

  // Re-render the menu
  renderMenu(menuDataByCategories);
};



editItemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(editItemForm);
  const updatedItem = {
    id: editItemForm.dataset.itemId,
    name: formData.get('name'),
    description: formData.get('description'),
    price: parseFloat(formData.get('price')),
    hidden: !!formData.get('hidden'),
    category: formData.get('category')
  };

  socket.emit('update-menu-item', updatedItem);

  // Update the local menu data
  const index = allMenuData.findIndex(item => item.id === updatedItem.id);
  let oldCategory = null;
  if (index !== -1) {
    oldCategory = allMenuData[index].category; // Save old category
    allMenuData[index] = updatedItem;          // Update the item
  }

  // Ensure the new category array exists
  if (!menuDataByCategories[updatedItem.category]) {
    menuDataByCategories[updatedItem.category] = [];
  }

  // Remove from old category if changed
  if (oldCategory && oldCategory !== updatedItem.category) {
    const oldIndex = menuDataByCategories[oldCategory].findIndex(item => item.id === updatedItem.id);
    if (oldIndex !== -1) {
      menuDataByCategories[oldCategory].splice(oldIndex, 1);
    }
  }

  // Remove any existing in the new/current category to prevent duplicates
  const existingIndex = menuDataByCategories[updatedItem.category].findIndex(item => item.id === updatedItem.id);
  if (existingIndex !== -1) {
    menuDataByCategories[updatedItem.category].splice(existingIndex, 1);
  }

  // Now push the updated item once!
  menuDataByCategories[updatedItem.category].push(updatedItem);

  document.getElementById(updatedItem.id).remove(); // Remove the old item from the DOM

  // Re-render the menu
  filterAndRender();
  editItemModal.style.display = 'none';
  editItemForm.reset();
});
