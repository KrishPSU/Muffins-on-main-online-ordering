const socket = io(`${window.location.origin}/`); // Initialize socket.io client

const reloadMenuBtn = document.getElementById('reload-menu-btn');
const goToOrderList = document.getElementById('go-to-order-list');

reloadMenuBtn.addEventListener('click', () => {
  location.reload();
});

goToOrderList.addEventListener('click', () => {
  window.location.href = `${window.location.origin}/admin/order_list`;
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
    category: formData.get('category'),
    image: formData.get('image')
  };

  // console.log(newItem);

  // Do something with data (e.g., send to server or display)
  socket.emit('add-menu-item', newItem);
  modal.style.display = 'none';
  // itemForm.reset();
};



async function uploadImage(itemId, imageInput) {
  try {
    // Create FormData and upload the file
    const formData = new FormData();
    formData.append('image', imageInput.files?.[0]);
    formData.append('item_id', itemId);
    
    const response = await fetch(`/api/upload-image/${itemId}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await response.json();
    
    // console.log(result.filename);
    // console.log(result.publicUrl);
    
  } catch (error) {
    console.error('Upload error:', error);
    alert("The item was added but we had problems with the image. Try again by editing.");
  }
}





editItemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(editItemForm);
  const updatedItem = {
    id: editItemForm.dataset.itemId,
    name: formData.get('name'),
    description: formData.get('description'),
    price: parseFloat(formData.get('price')),
    hidden: !!formData.get('hidden'),
    category: formData.get('category'),
    image: formData.get('image')
  };

  console.log(updatedItem);

  // socket.emit('update-menu-item', updatedItem);


  if (updatedItem.image.name != "") {
    deleteImage(updatedItem.id);
    uploadImage(updatedItem.id, document.getElementById('editItemImage'));
  }


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
      if (menuDataByCategories[oldCategory].length == 0) {
        delete menuDataByCategories[oldCategory];
      }
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



socket.on('menu-item-added', (newItem, image) => {

  if (image.byteLength != 0) {
    uploadImage(newItem.id, document.getElementById('itemImage'));
  }

  // Add new item to the menu data
  allMenuData.push(newItem);
  
  // Update the grouped data
  if (!menuDataByCategories[newItem.category]) {
    menuDataByCategories[newItem.category] = [];
  }
  menuDataByCategories[newItem.category].push(newItem);

  // Re-render the menu
  renderMenu(menuDataByCategories);
});









const viewImageModal = document.querySelector('.view-image-modal');
const viewImageDialog = document.querySelector('.view-image-dialog');
const viewImageCloseBtn = document.getElementById('close-image-view-modal');
const viewImageElem = document.getElementById('view-image-elem');


function openViewImageModal(itemId) {
  axios.get(`https://xnduhgagnjwwonzwmyyq.supabase.co/storage/v1/object/public/images/${itemId}.avif`)
    .then(res => {
      viewImageElem.src = `https://xnduhgagnjwwonzwmyyq.supabase.co/storage/v1/object/public/images/${itemId}.avif`;
    })
    .catch(error => {
      viewImageElem.src = `https://xnduhgagnjwwonzwmyyq.supabase.co/storage/v1/object/public/images/no-muffin.png`;
    });

  viewImageModal.classList.add('is-open');
}



(() => {
  function close() { 
    viewImageModal.classList.remove('is-open');
    viewImageElem.src = '';
  }

  viewImageCloseBtn?.addEventListener('click', close);
  viewImageModal?.addEventListener('click', (e) => { if (!viewImageDialog.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();