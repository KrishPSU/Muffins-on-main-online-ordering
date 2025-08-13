const menuContainer = document.getElementById('menuContainer');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');
const createNewItemBtn = document.getElementById('create-new-item');


let allMenuData = [];
let menuDataByCategories = {};

axios.get(`${window.location.origin}/api/menu`)
  .then(response => {

    allMenuData = response.data.data || [];
    menuDataByCategories = response.data.groupedByCategory || {};

    // Sort categories to put muffins first
    const sortedCategories = Object.keys(menuDataByCategories).sort((a, b) => {
      if (a.toLowerCase().includes('muffin')) return -1;
      if (b.toLowerCase().includes('muffin')) return 1;
      return a.localeCompare(b);
    });
    
    // Create new sorted object
    const sortedMenuData = {};
    sortedCategories.forEach(category => {
      sortedMenuData[category] = menuDataByCategories[category];
    });
    
    menuDataByCategories = sortedMenuData;
    
    populateCategoryDropdown(menuDataByCategories);
    renderMenu(menuDataByCategories); // initial render
  })
  .catch(error => {
    console.error('Error fetching menu:', error);
    menuContainer.innerHTML = '<p>Failed to load menu.</p>';
  });

function populateCategoryDropdown(data) {
  const select = document.getElementById('categorySelect');
  const search = document.getElementById('searchInput');

  Object.keys(data).forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });

  select.addEventListener('change', filterAndRender);
  search.addEventListener('input', filterAndRender);
}

function filterAndRender() {
  const selected = document.getElementById('categorySelect').value;
  const searchText = document.getElementById('searchInput').value.trim().toLowerCase();

  let filteredData = {};

  if (searchText === '') {
    filteredData = menuDataByCategories; // No search, show all categories
  } else {
    // Fuzzy search across all items
    const options = {
      keys: ['name', 'description'], // fields to search in each object
      threshold: 0.4 // how fuzzy: lower = more strict, higher = more matches
    };


    const fuse = new Fuse(allMenuData, options);
    const fuzzyResults = fuse.search(searchText);
    const matchedItems = fuzzyResults.map(result => result.item);

    // if (matchedItems.length === 0) {
    //   document.getElementById('menuContainer').innerHTML = '<p>No matching items found.</p>';
    //   return;
    // }

    matchedItems.forEach(item => {
      const category = item.category;
      if (!filteredData[category]) {
        filteredData[category] = [];
      }
      filteredData[category].push(item);

      if (filteredData[category].length == 0) {
        delete filteredData[category];
      }
    });
  }


  // Also apply category dropdown filter
  if (selected !== 'all') {
    newFilteredData = {};

    newFilteredData[selected] = filteredData[selected];
    renderMenu(newFilteredData);
  } else {
    // If "all" is selected, render all filtered data
    renderMenu(filteredData);
  }
}



function renderMenu(dataGroupedByCategory) {

  const container = document.getElementById('menuContainer');
  container.innerHTML = ''; // Clear previous content

  if (Object.keys(dataGroupedByCategory).length === 0) { 
    const noItems = document.createElement('div');
    noItems.className = 'no-items fade-in';
    noItems.textContent = 'No menu items found.';
    container.appendChild(noItems);
    return;
  }

  Object.keys(dataGroupedByCategory).forEach(category => {

    const categoryWrapper = document.createElement('div');
    categoryWrapper.className = 'category-wrapper';
    const categoryHeader = document.createElement('h2');
    categoryHeader.className = 'category-header';
    categoryHeader.textContent = category;
    categoryWrapper.appendChild(categoryHeader);

    dataGroupedByCategory[category].forEach(item => {
      const itemHtml = `
        <div class="menu-item" id="${item.id}">
          <div class="item-info">
            <p id="item-id">ID: ${item.id} <button data-item-id="${item.id}" class="show-image-btn">View Image</button></p>
            <h2>${item.name}</h2>
            <p>Category: <span class="category">${category}</span></p>
            <p>Price: $<span class="price">${item.price}</span></p>
            <p id="desc">Description: <span class="description">${item.description}</span></p>
          </div>
          <div class="hide-toggle">
            <label>
              <input type="checkbox" class="hide-checkbox" ${item.hidden ? 'checked' : ''}>
              Hide Item
            </label>
          </div>
          <div class="item-actions">
            <button class="edit-btn">Edit &#9998;</button>
            <button class="delete-btn">Delete &#128465;</button>
          </div>
        </div>
      `;

      categoryWrapper.innerHTML += itemHtml;
    });
    container.appendChild(categoryWrapper);
  });

  const allShowImageBtns = document.querySelectorAll('.show-image-btn');
  allShowImageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openViewImageModal(btn.dataset.itemId);
    });
  });
}



createNewItemBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  itemForm.reset(); // Reset form fields
});

// Image upload functionality
function setupImageUpload(inputId, infoId) {
  const fileInput = document.getElementById(inputId);
  const fileInfo = document.getElementById(infoId);
  
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        fileInput.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB.');
        fileInput.value = '';
        return;
      }
      
      // Display file information
      const fileName = file.name;
      const fileSize = (file.size / 1024).toFixed(1) + ' KB';
      
      fileInfo.innerHTML = `
        <div class="file-name">${fileName}</div>
        <div class="file-size">${fileSize}</div>
      `;
      fileInfo.classList.add('show');
    } else {
      fileInfo.classList.remove('show');
    }
  });
}

// Initialize image upload functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupImageUpload('itemImage', 'selectedFileInfo');
  setupImageUpload('editItemImage', 'editSelectedFileInfo');
});