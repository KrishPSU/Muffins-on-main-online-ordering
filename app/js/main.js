// Register service worker on page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(registration => {
      // console.log('Service Worker registered successfully:', registration);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}

const socket = io(); // Initialize socket.io client

let allMenuData = [];
let menuDataByCategories = {};

axios.get('/api/menu')
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
    document.getElementById('menuContainer').innerHTML = '<p>Failed to load menu.</p>';
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
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category fade-in';

    const title = document.createElement('h2');
    title.textContent = category;
    categoryDiv.appendChild(title);

    if (!dataGroupedByCategory[category] || dataGroupedByCategory[category].length === 0) {
      const noItems = document.createElement('div');
      noItems.className = 'no-items fade-in';
      noItems.textContent = 'No menu items found.';
      container.appendChild(noItems);
      return;
    }

    dataGroupedByCategory[category].forEach(item => {

      if (item.hidden) return; // Skip hidden items

      // <div class="menu-item" id="${item.id}">
      const itemDiv = document.createElement('div');
      itemDiv.className = 'menu-item';
      itemDiv.id = item.id;

      // <img class="menu-item-image" src=".../muffin.avif" alt="${item.name} ${item.category}">
      const img = document.createElement('img');
      img.className = 'menu-item-image';

      axios.get(`https://xnduhgagnjwwonzwmyyq.supabase.co/storage/v1/object/public/images/${item.id}.avif`)
        .then(res => {
          console.log(res);
          img.src = `https://xnduhgagnjwwonzwmyyq.supabase.co/storage/v1/object/public/images/${item.id}.avif`;
        })
        .catch(error => {
          img.src = `https://xnduhgagnjwwonzwmyyq.supabase.co/storage/v1/object/public/images/no-muffin.png`;
        });
      img.alt = `${item.name} ${item.category}`;
      itemDiv.appendChild(img);

      // <div class="menu-item-info"> ... </div>
      const infoDiv = document.createElement('div');
      infoDiv.className = 'menu-item-info';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'menu-item-name';
      nameDiv.textContent = item.name;

      const descDiv = document.createElement('div');
      descDiv.className = 'menu-item-description';
      descDiv.textContent = item.description || '';

      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(descDiv);
      itemDiv.appendChild(infoDiv);

      // <div class="menu-item-content"> <div class="menu-item-price">...</div> <button class="add-to-order-btn"></button> </div>
      const contentDiv = document.createElement('div');
      contentDiv.className = 'menu-item-content';

      const priceDiv = document.createElement('div');
      priceDiv.className = 'menu-item-price';
      priceDiv.textContent = `$${item.price}`;

      const addBtn = document.createElement('button');
      addBtn.className = 'add-to-order-btn';
      addBtn.textContent = 'Add to Order';
      addBtn.onclick = () => window.showAddToOrderModal?.(item);

      contentDiv.appendChild(priceDiv);
      contentDiv.appendChild(addBtn);
      itemDiv.appendChild(contentDiv);
      categoryDiv.appendChild(itemDiv);
    });

    let menuItems = categoryDiv.querySelectorAll('.menu-item');
    if (menuItems.length === 0) return;

    container.appendChild(categoryDiv);
  });
}



socket.on('menu-item-added', (newItem) => {
  if (newItem.hidden) return; // Skip rendering if the item is hidden

  allMenuData.push(newItem);

  if (!menuDataByCategories[newItem.category]) {
    menuDataByCategories[newItem.category] = [];
  }
  menuDataByCategories[newItem.category].push(newItem);
  
  filterAndRender();
});


socket.on('menu-item-updated', (updatedItem) => {
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

  filterAndRender();
});





socket.on('item-visibility-toggled', (updatedItem) => {
  const item = allMenuData.find(item => item.id === updatedItem.id);

  if (item) {
    item.hidden = !item.hidden; // Toggle visibility

    // Update the menuDataByCategories variable
    if (menuDataByCategories[item.category]) {
      const index = menuDataByCategories[item.category].findIndex(i => i.id === item.id);
      if (index !== -1) {
        menuDataByCategories[item.category][index].hidden = item.hidden; // Update the hidden status in the category array
      }
    }
  } else {
    allMenuData.push(updatedItem);
    if (!menuDataByCategories[updatedItem.category]) {
      menuDataByCategories[updatedItem.category] = [];
    }
    menuDataByCategories[updatedItem.category].push(updatedItem);
  }

  filterAndRender(); // Re-render the menu to reflect changes
});




socket.on('menu-item-deleted', (deletedItemId) => {
  allMenuData = allMenuData.filter(item => item.id !== deletedItemId);

  // Remove from menuDataByCategories
  Object.keys(menuDataByCategories).forEach(category => {
    menuDataByCategories[category] = menuDataByCategories[category].filter(item => item.id !== deletedItemId);
  });

  // Remove the item from the DOM
  const itemDiv = document.getElementById(deletedItemId);
  if (itemDiv) {
    itemDiv.remove();
  }

  filterAndRender(); // Re-render the menu to reflect changes
});
