// ============================================================
// CAFÉ HUB - COFFEE SHOP MANAGEMENT SYSTEM
// ============================================================

// ===== DATA STORAGE =====
let db = null;
let auth = null;

try {
  const firebaseConfig = {
    apiKey: "AIzaSyDssdRjPHZAH54SgZaLIopKFiBHecdedoY",
    authDomain: "coffeesalesmanagementsystem.firebaseapp.com",
    projectId: "coffeesalesmanagementsystem",
    storageBucket: "coffeesalesmanagementsystem.firebasestorage.app",
    messagingSenderId: "386527605228",
    appId: "1:386527605228:web:7515c677ae299ee03690c9"
  };
  
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
  }
} catch (error) {
  console.log('Firebase not available - using local storage only');
}

let users = {
  admin: { password: 'admin123', role: 'admin' },
  cashier: { password: 'cashier123', role: 'cashier' },
  barista: { password: 'barista123', role: 'barista' }
};

let currentUser = null;
let currentUserRole = null;

let products = [
  { id: 1, name: 'Caramel Macchiato', category: 'Hot Drinks', price: 150, cost: 50, stock: 25, threshold: 10, desc: 'Espresso with vanilla syrup, steamed milk and caramel drizzle' },
  { id: 2, name: 'Americano', category: 'Hot Drinks', price: 120, cost: 35, stock: 30, threshold: 10, desc: 'Two shots of espresso with hot water' },
  { id: 3, name: 'Vanilla Latte', category: 'Iced Drinks', price: 145, cost: 48, stock: 20, threshold: 10, desc: 'Iced espresso with vanilla and cold milk' },
  { id: 4, name: 'Cappuccino', category: 'Hot Drinks', price: 135, cost: 48, stock: 28, threshold: 10, desc: 'Espresso with steamed milk and foam' },
  { id: 5, name: 'Cold Brew', category: 'Iced Drinks', price: 160, cost: 55, stock: 15, threshold: 10, desc: 'Smooth cold brewed concentrate with ice' },
  { id: 6, name: 'Espresso', category: 'Hot Drinks', price: 100, cost: 30, stock: 40, threshold: 10, desc: 'Rich single or double shot espresso' },
  { id: 7, name: 'Croissant', category: 'Pastries', price: 85, cost: 25, stock: 12, threshold: 5, desc: 'Buttery, flaky croissant' },
  { id: 8, name: 'Blueberry Muffin', category: 'Pastries', price: 95, cost: 30, stock: 10, threshold: 5, desc: 'Fresh blueberry muffin with moist crumb' }
];

let addons = [
  { id: 1, name: 'Extra Shot', price: 20, category: 'shots' },
  { id: 2, name: 'Vanilla Syrup', price: 15, category: 'syrup' },
  { id: 3, name: 'Caramel Syrup', price: 15, category: 'syrup' },
  { id: 4, name: 'Chocolate Syrup', price: 15, category: 'syrup' },
  { id: 5, name: 'Extra Whipped Cream', price: 20, category: 'toppings' }
];

let sizes = [
  { name: 'Small (8oz)', priceAdj: 0 },
  { name: 'Medium (12oz)', priceAdj: 15 },
  { name: 'Large (16oz)', priceAdj: 30 }
];

let cart = [];
let transactions = [];
let pendingOrders = [];
let orderCounter = 1000;

// ===== AUTHENTICATION =====
function handleLogin(e) {
  if (e) e.preventDefault(); 

  const userEl = document.getElementById('login-user') || document.getElementById('login-email');
  const passEl = document.getElementById('login-pass');
  
  const user = userEl ? userEl.value.trim().toLowerCase() : '';
  const pass = passEl ? passEl.value.trim() : '';

  if (!user || !pass) {
    document.getElementById('login-error').textContent = 'Please enter both username and password.';
    document.getElementById('login-error').style.display = 'block';
    return;
  }

  const foundUser = users[user];

  if (foundUser && foundUser.password === pass) {
    localStorage.setItem('cafe_user', user);
    localStorage.setItem('cafe_role', foundUser.role);
    
    if (foundUser.role === 'admin') window.location.href = 'manager.html';
    else if (foundUser.role === 'cashier') window.location.href = 'cashier.html';
    else if (foundUser.role === 'barista') window.location.href = 'barista.html';
  } else {
    document.getElementById('login-error').textContent = 'Invalid username or password.';
    document.getElementById('login-error').style.display = 'block';
  }
}

function updateNavForRole(role) {
  const navItems = document.querySelectorAll('.tab-button');

  navItems.forEach(item => {
    item.style.display = 'block';
  });

  if (role === 'barista') {
    navItems.forEach(item => {
      if (item.id !== 'nav-barista') item.style.display = 'none';
    });
  } else if (role === 'cashier') {
    if (document.getElementById('nav-inventory')) document.getElementById('nav-inventory').style.display = 'none';
    if (document.getElementById('nav-reports')) document.getElementById('nav-reports').style.display = 'none';
    if (document.getElementById('nav-barista')) document.getElementById('nav-barista').style.display = 'none';
  }
}

function handleLogout() {
  localStorage.removeItem('cafe_user');
  localStorage.removeItem('cafe_role');
  window.location.href = 'index.html';
}

// ===== NAVIGATION =====
function switchPage(pageId, navItem) {
  if (pageId === 'pos') window.location.href = 'cashier.html';
  else if (pageId === 'barista') window.location.href = 'barista.html';
  else if (pageId === 'inventory') window.location.href = 'manager.html';
  else if (pageId === 'reports') window.location.href = 'analytics.html';
}

// ===== DASHBOARD =====
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 18) greeting = 'Good Afternoon';

  const roleLabel = { admin: 'Admin', cashier: 'Cashier', barista: 'Barista' };
  document.getElementById('dash-greeting').textContent = `${greeting}, ${roleLabel[currentUserRole]}!`;
}

function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
  const clockEl = document.getElementById('nav-clock');
  if (clockEl) clockEl.textContent = timeStr;
  setTimeout(updateClock, 1000);
}

function renderDashboard() {
  const todayTransactions = transactions.filter(t => {
    const tDate = new Date(t.timestamp).toDateString();
    const today = new Date().toDateString();
    return tDate === today;
  });

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const cupsSold = todayTransactions.reduce((sum, t) => sum + t.items.length, 0);
  const lowStock = products.filter(p => p.stock <= p.threshold).length;

  // Safely update elements
  const dashRevenue = document.getElementById('dash-revenue');
  if (dashRevenue) dashRevenue.textContent = '₱' + todayRevenue.toFixed(2);
  
  const dashRevenueSub = document.getElementById('dash-revenue-sub');
  if (dashRevenueSub) dashRevenueSub.textContent = `${todayTransactions.length} orders`;
  
  const dashCupsSold = document.getElementById('dash-cups-sold');
  if (dashCupsSold) dashCupsSold.textContent = cupsSold;
  
  const dashTotalProducts = document.getElementById('dash-total-products');
  if (dashTotalProducts) dashTotalProducts.textContent = products.length;
  
  const dashLowStock = document.getElementById('dash-low-stock');
  if (dashLowStock) dashLowStock.textContent = lowStock;

  const tbody = document.getElementById('dash-recent-transactions');
  if (tbody) {
    tbody.innerHTML = '';
    todayTransactions.slice(-5).reverse().forEach(t => {
      const time = new Date(t.timestamp).toLocaleTimeString('en-US', { hour12: false });
      const itemsText = t.items.map(i => i.name).join(', ');
      tbody.innerHTML += `
        <tr>
          <td>${time}</td>
          <td>#${t.orderId}</td>
          <td>${itemsText}</td>
          <td>₱${t.total.toFixed(2)}</td>
          <td>${t.cashier}</td>
          <td><span class="badge badge-success">${t.status}</span></td>
        </tr>
      `;
    });
  }
}

function updateCharts(transactions) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekData = [0, 0, 0, 0, 0, 0, 0];
  
  transactions.forEach(t => {
    const day = new Date(t.timestamp).getDay() - 1;
    if (day >= 0) weekData[day] += t.total;
  });

  const ctx1 = document.getElementById('weeklyRevenueChart')?.getContext('2d');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Revenue',
          data: weekData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: true }
    });
  }

  const productSales = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + 1;
    });
  });

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ctx2 = document.getElementById('topProductsChart')?.getContext('2d');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: topProducts.map(p => p[0]),
        datasets: [{
          label: 'Cups Sold',
          data: topProducts.map(p => p[1]),
          backgroundColor: '#10b981'
        }]
      },
      options: { responsive: true, maintainAspectRatio: true }
    });
  }
}

// ===== INVENTORY =====
function openAddProductModal() {
  document.getElementById('edit-product-id').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-category').value = 'Hot Drinks';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-cost').value = '';
  document.getElementById('prod-stock').value = '';
  document.getElementById('prod-threshold').value = 10;
  document.getElementById('prod-desc').value = '';
  document.getElementById('modal-product-title').textContent = 'Add Menu Item';
  document.getElementById('modal-product').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('modal-product').style.display = 'none';
}

function saveProduct() {
  if (currentUserRole !== 'admin') {
    showError('Unauthorized: Only admins can manage products.');
    return;
  }

  const id = document.getElementById('edit-product-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const price = parseFloat(document.getElementById('prod-price').value);
  const cost = parseFloat(document.getElementById('prod-cost').value) || 0;
  const stock = parseInt(document.getElementById('prod-stock').value);
  const threshold = parseInt(document.getElementById('prod-threshold').value) || 10;
  const desc = document.getElementById('prod-desc').value.trim();

  if (!name || !price || isNaN(stock)) {
    showError('Please fill in required fields.');
    return;
  }

  let savedProduct = null;

  if (id) {
    const prod = products.find(p => p.id == id);
    if (prod) {
      prod.name = name;
      prod.category = category;
      prod.price = price;
      prod.cost = cost;
      prod.stock = stock;
      prod.threshold = threshold;
      prod.desc = desc;
      savedProduct = prod;
    }
  } else {
    const newProduct = {
      id: Math.max(...products.map(p => p.id), 0) + 1,
      name, category, price, cost, stock, threshold, desc
    };
    products.push(newProduct);
    savedProduct = newProduct;
  }

  closeProductModal();
  renderInventory();
  saveToStorage();
  if (savedProduct) saveProductToFirestore(savedProduct);
  showSuccess('Menu item saved!');
}

function editProduct(id) {
  const prod = products.find(p => p.id == id);
  if (!prod) return;

  document.getElementById('edit-product-id').value = id;
  document.getElementById('prod-name').value = prod.name;
  document.getElementById('prod-category').value = prod.category;
  document.getElementById('prod-price').value = prod.price;
  document.getElementById('prod-cost').value = prod.cost;
  document.getElementById('prod-stock').value = prod.stock;
  document.getElementById('prod-threshold').value = prod.threshold;
  document.getElementById('prod-desc').value = prod.desc;
  document.getElementById('modal-product-title').textContent = 'Edit Menu Item';
  document.getElementById('modal-product').style.display = 'flex';
}

function deleteProduct(id) {
  if (currentUserRole !== 'admin') {
    showError('Unauthorized: Only admins can delete products.');
    return;
  }

  if (!confirm('Delete this menu item?')) return;
  products = products.filter(p => p.id != id);
  renderInventory();
  saveToStorage();
  showSuccess('Menu item deleted!');
}

function renderInventory() {
  const search = document.getElementById('inv-search')?.value.toLowerCase() || '';
  const catFilter = document.getElementById('inv-filter-cat')?.value || 'All';
  const stockFilter = document.getElementById('inv-filter-stock')?.value || 'All';

  let filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search);
    const matchCat = catFilter === 'All' || p.category === catFilter;
    let matchStock = true;
    if (stockFilter === 'Low Stock') matchStock = p.stock <= p.threshold;
    else if (stockFilter === 'Out of Stock') matchStock = p.stock === 0;
    else if (stockFilter === 'In Stock') matchStock = p.stock > p.threshold;
    
    return matchSearch && matchCat && matchStock;
  });

  // Update low stock alert
  const lowStockItems = products.filter(p => p.stock <= p.threshold);
  const alertDiv = document.getElementById('low-stock-alert');
  if (lowStockItems.length > 0) {
    alertDiv.style.display = 'flex';
    const alertText = lowStockItems.map(p => `${p.name} - ${p.stock} cups`).join(', ');
    document.getElementById('alert-text').textContent = `${lowStockItems[0].name} - Stock running low`;
  } else {
    alertDiv.style.display = 'none';
  }

  const tbody = document.getElementById('inventory-body');
  tbody.innerHTML = filtered.map(p => {
    let statusHtml = '<span class="status-badge stock-in">In Stock</span>';
    if (p.stock === 0) statusHtml = '<span class="status-badge stock-out">Out of Stock</span>';
    else if (p.stock <= p.threshold) statusHtml = '<span class="status-badge stock-low">Low Stock</span>';

    return `
      <div class="table-row">
        <div class="item-name"><span class="item-icon">☕</span> ${p.name}</div>
        <div class="item-category">${p.category}</div>
        <div class="item-price">₱${p.price}</div>
        <div class="item-stock">${p.stock} cups</div>
        <div class="item-status">${statusHtml}</div>
        <div class="action-buttons">
          <button class="btn-secondary btn-sm" onclick="editProduct(${p.id})">✏️ Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== POINT OF SALE =====
let selectedProduct = null;
let posCategoryFilter = 'All';

function setPOSCategory(category, btn) {
  posCategoryFilter = category;
  document.querySelectorAll('.category-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPOSProducts();
}

function renderPOSProducts() {
  const search = document.getElementById('pos-search')?.value.toLowerCase() || '';
  const catFilter = posCategoryFilter;

  let filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search);
    const matchCat = catFilter === 'All' || p.category === catFilter;
    return matchSearch && matchCat && p.stock > 0;
  });

  const grid = document.getElementById('pos-product-grid');
  grid.innerHTML = filtered.map(p => {
    const icon = p.category === 'Pastries' ? '🥐' : (p.category === 'Iced Drinks' ? '🧊' : '☕');
    return `
      <div class="product-card" onclick="selectProduct(${p.id})">
        <div class="product-icon">${icon}</div>
        <div class="product-title">${p.name}</div>
        <div class="product-meta">
          <div class="product-price">₱${p.price}</div>
          <div class="product-stock">Stock: ${p.stock}</div>
        </div>
      </div>
    `;
  }).join('');
}

function selectProduct(pid) {
  const prod = products.find(p => p.id == pid);
  if (!prod) return;

  selectedProduct = prod;
  
  const modifiersSection = document.getElementById('modifiers-section');
  if (!modifiersSection) {
    showError('Modifiers section not found');
    return;
  }
  
  modifiersSection.style.display = 'block';
  
  // Reset sugar level to default
  const sugarLevel = document.getElementById('sugar-level');
  if (sugarLevel) sugarLevel.value = 'Normal Sugar';

  const sizeDiv = document.getElementById('size-options');
  if (sizeDiv) {
    sizeDiv.innerHTML = sizes.map((s, idx) => `
      <label class="modifier-option">
        <input type="radio" name="size" value="${s.name}" onchange="updateModifier()" ${idx === 1 ? 'checked' : ''}>
        <span>${s.name}</span>
      </label>
    `).join('');
  }

  const addonsDiv = document.getElementById('addons-options');
  if (addonsDiv) {
    addonsDiv.innerHTML = addons.map(a => `
      <label class="modifier-option">
        <input type="checkbox" name="addon" value="${a.id}" onchange="updateModifier()">
        <span>${a.name} (+₱${a.price})</span>
      </label>
    `).join('');
  }

  updateModifier();
}

function updateModifier() {
  if (!selectedProduct) return;

  const size = document.querySelector('input[name="size"]:checked')?.value || sizes[1].name;
  const selectedAddons = Array.from(document.querySelectorAll('input[name="addon"]:checked'))
    .map(el => addons.find(a => a.id == el.value));

  const sizeAdj = sizes.find(s => s.name === size)?.priceAdj || 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const currentTotal = selectedProduct.price + sizeAdj + addonsTotal;

  // Optional: If you have a price display in your modifiers UI
  const addToCartBtn = document.querySelector('#modifiers-section .btn-primary');
  if (addToCartBtn) addToCartBtn.textContent = `Add to Order - ₱${currentTotal.toFixed(2)}`;
}

function addToCart() {
  if (!selectedProduct) return;

  const size = document.querySelector('input[name="size"]:checked')?.value || sizes[1].name;
  const selectedAddons = Array.from(document.querySelectorAll('input[name="addon"]:checked'))
    .map(el => addons.find(a => a.id == el.value));
  const sugarLevel = document.getElementById('sugar-level').value;

  const sizeAdj = sizes.find(s => s.name === size)?.priceAdj || 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const itemTotal = selectedProduct.price + sizeAdj + addonsTotal;

  cart.push({
    id: selectedProduct.id,
    name: selectedProduct.name,
    basePrice: selectedProduct.price,
    size: size,
    addons: selectedAddons,
    sugar: sugarLevel,
    quantity: 1,
    itemTotal: itemTotal
  });

  showSuccess(`${selectedProduct.name} added to order!`);
  updateCartModal();
  updateCartTotals();
}

// Add event listener for sugar level changes
document.getElementById('sugar-level')?.addEventListener('change', updateModifier);

function updateCartModal() {
  const cartDiv = document.getElementById('cart-items');
  if (!cartDiv) return;

  if (cart.length === 0) {
    cartDiv.innerHTML = `
      <div class="receipt-empty" id="cart-empty-msg">
        <span class="receipt-empty-icon">🛒</span>
        <p>No items in cart</p>
        <p>Select items from menu</p>
      </div>
    `;
    if(document.getElementById('modifiers-section')) document.getElementById('modifiers-section').style.display = 'none';
    if(document.getElementById('cart-count')) document.getElementById('cart-count').textContent = '0 items';
    return;
  }

  cartDiv.innerHTML = cart.map((item, idx) => {
    const addonsText = item.addons && item.addons.length > 0 
      ? item.addons.map(a => a.name).join(', ') 
      : 'No add-ons';
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.size} • ${item.sugar}</div>
          <div class="cart-item-meta">${addonsText}</div>
          <div class="cart-item-price">₱${item.itemTotal.toFixed(2)}</div>
        </div>
        <button class="btn-remove" onclick="removeFromCart(${idx})">×</button>
      </div>
    `;
  }).join('');

  if(document.getElementById('cart-count')) {
    document.getElementById('cart-count').textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
  }
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateCartModal();
  updateCartTotals();
}

function clearCart() {
  if (cart.length === 0) return;
  if (!confirm('Clear the entire order?')) return;
  cart = [];
  selectedProduct = null;
  updateCartModal();
  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
  const discount = 0; // No discount system for now

  const total = subtotal - discount;

  document.getElementById('cart-subtotal').textContent = '₱' + subtotal.toFixed(2);
  document.getElementById('cart-discount').textContent = '₱' + discount.toFixed(2);
  document.getElementById('cart-total').textContent = '₱' + total.toFixed(2);

  updateChange();
}

function updateChange() {
  const total = parseFloat(document.getElementById('cart-total').textContent.replace('₱', '') || 0);
  const payment = document.getElementById('payment-method').value;

  if (payment === 'cash') {
    const tendered = parseFloat(document.getElementById('cash-tendered').value || 0);
    const change = tendered - total;
    document.getElementById('cart-change').textContent = '₱' + (change >= 0 ? change.toFixed(2) : '0.00');
  }
}

function processCheckout() {
  if (cart.length === 0) {
    showError('Cart is empty!');
    return;
  }

  const total = parseFloat(document.getElementById('cart-total').textContent.replace('₱', '') || 0);
  const payment = document.getElementById('payment-method').value;

  if (payment === 'cash') {
    const tendered = parseFloat(document.getElementById('cash-tendered').value || 0);
    if (tendered < total) {
      showError('Insufficient cash!');
      return;
    }
  }

  const orderId = ++orderCounter;
  const order = {
    orderId: orderId,
    timestamp: new Date().toISOString(),
    items: cart.map(item => ({ name: item.name, itemTotal: item.itemTotal })),
    subtotal: parseFloat(document.getElementById('cart-subtotal').textContent.replace('₱', '')),
    discount: parseFloat(document.getElementById('cart-subtotal').textContent.replace('₱', '')) - total,
    total: total,
    payment: payment,
    cashier: currentUser,
    status: 'pending'
  };

  cart.forEach(item => {
    const prod = products.find(p => p.id === item.id);
    if (prod) {
      prod.stock--;
      saveProductToFirestore(prod); // Ferando: Sync stock reduction to DB
    }
  });

  transactions.push(order);
  pendingOrders.push(order);

  showReceipt(order);

  cart = [];
  selectedProduct = null;
  updateCartModal();
  updateCartTotals();
  saveToStorage();
  saveTransactionToFirestore(order);
}

function showReceipt(order) {
  const receiptDiv = document.getElementById('receipt-content');
  const date = new Date(order.timestamp);
  const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString('en-US', { hour12: false });

  const itemsHtml = order.items.map(item => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem;">
      <span>${item.name}</span>
      <span style="font-weight: 700;">₱${item.itemTotal.toFixed(2)}</span>
    </div>
  `).join('');

  receiptDiv.innerHTML = `
    <div style="font-size: 0.9rem; line-height: 1.8;">
      <div style="margin-bottom: 12px; border-bottom: 2px solid #e0d9d0; padding-bottom: 12px;">
        <strong style="font-size: 1.05rem; display: block;">A&R Brew Cafe</strong>
        <span style="font-size: 0.85rem; color: var(--text-muted);">Receipt #${order.orderId}</span><br>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</span>
      </div>
      
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #e0d9d0;">
        ${itemsHtml}
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal</span>
          <span style="font-weight: 700;">₱${order.subtotal.toFixed(2)}</span>
        </div>
        ${order.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Discount</span>
            <span style="font-weight: 700; color: #0f8b5f;">-₱${order.discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem; border-top: 1px solid #e0d9d0; padding-top: 8px;">
          <span>TOTAL</span>
          <span>₱${order.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div style="background: #f4efe7; padding: 10px; border-radius: 12px; margin-top: 10px; text-align: center;">
        <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 4px;">
          ${order.payment === 'cash' ? '💵 Cash' : order.payment === 'gcash' ? '💳 GCash' : '💳 Maya'}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Cashier: ${order.cashier.toUpperCase()}</div>
      </div>
      
      <div style="text-align: center; margin-top: 12px; font-size: 0.8rem; color: var(--text-muted);">
        Thank you for your order!
      </div>
    </div>
  `;

  document.getElementById('modal-receipt').style.display = 'flex';
}

function closeReceiptModal() {
  document.getElementById('modal-receipt').style.display = 'none';
}

function printReceipt() {
  window.print();
}

// ===== BARISTA VIEW =====
function renderBaristaView() {
  const pendingDiv = document.getElementById('pending-orders-list');
  const servedDiv = document.getElementById('served-orders-list');

  const pending = pendingOrders.filter(o => o.status === 'pending');
  const completed = pendingOrders.filter(o => o.status === 'served');

  if (document.getElementById('pending-count')) document.getElementById('pending-count').textContent = pending.length;
  if (document.getElementById('completed-count')) document.getElementById('completed-count').textContent = completed.length;
  if (document.getElementById('barista-pending-count')) document.getElementById('barista-pending-count').textContent = pending.length;
  if (document.getElementById('barista-served-count')) document.getElementById('barista-served-count').textContent = completed.length;

  // Render pending orders
  if (pending.length === 0) {
    pendingDiv.innerHTML = '<div style="color:#999;text-align:center;padding:30px;font-size:0.9rem;">No pending orders</div>';
  } else {
    pendingDiv.innerHTML = pending.map(order => {
      const dateStr = new Date(order.timestamp).toLocaleTimeString('en-US', { hour12: false });
      const itemsHtml = order.items.map(i => `<div style="margin: 4px 0; font-size: 0.9rem;">• ${i.name}</div>`).join('');
      return `
        <div class="order-item pending">
          <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong>Order #${order.orderId}</strong>
            <span>${dateStr}</span>
          </div>
          <div class="order-details" style="margin-bottom: 10px;">${itemsHtml}</div>
          <button class="btn-primary" onclick="markAsServed(${order.orderId})">✓ Mark as Served</button>
        </div>
      `;
    }).join('');
  }

  // Render completed orders
  if (completed.length === 0) {
    servedDiv.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:30px;font-size:0.9rem;">No completed orders yet</div>';
  } else {
    servedDiv.innerHTML = completed.map(order => {
      const dateStr = new Date(order.timestamp).toLocaleTimeString('en-US', { hour12: false });
      const itemsHtml = order.items.map(i => `<div>• ${i.name}</div>`).join('');
      return `
        <div class="order-item served">
          <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong>✓ Order #${order.orderId}</strong>
            <span>${dateStr}</span>
          </div>
          <div class="order-details">${itemsHtml}</div>
        </div>
      `;
    }).join('');
  }
}

function markAsServed(orderId) {
  const order = pendingOrders.find(o => o.orderId === orderId);
  if (order) {
    order.status = 'served';
    renderBaristaView();
    showSuccess('Order marked as served! ✓');
    saveToStorage();
  }
}

// ===== TRANSACTIONS =====
function renderTransactions() {
  const search = document.getElementById('txn-search')?.value.toLowerCase() || '';
  const dateFilter = document.getElementById('txn-date')?.value || '';

  let filtered = transactions.filter(t => {
    const matchSearch = t.orderId.toString().includes(search) || t.cashier.toLowerCase().includes(search);
    const tDate = new Date(t.timestamp).toISOString().split('T')[0];
    const matchDate = !dateFilter || tDate === dateFilter;
    return matchSearch && matchDate;
  });

  document.getElementById('txn-count').textContent = filtered.length;

  const tbody = document.getElementById('transactions-body');
  tbody.innerHTML = filtered.map(t => {
    const date = new Date(t.timestamp);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString('en-US', { hour12: false });
    const itemsText = t.items.map(i => i.name).join(', ');
    const paymentLabel = { cash: '💵 Cash', gcash: '💳 GCash', maya: '💳 Maya' };

    return `
      <tr>
        <td>${dateStr}</td>
        <td>#${t.orderId}</td>
        <td>${itemsText}</td>
        <td>₱${t.subtotal.toFixed(2)}</td>
        <td>₱${t.discount.toFixed(2)}</td>
        <td>₱${t.total.toFixed(2)}</td>
        <td>${paymentLabel[t.payment] || t.payment}</td>
        <td>${t.cashier}</td>
        <td><span class="badge badge-success">${t.status}</span></td>
      </tr>
    `;
  }).join('');
}

// ===== REPORTS =====
function renderReports() {
  // Get today's transactions
  const todayTransactions = transactions.filter(t => {
    const tDate = new Date(t.timestamp).toDateString();
    const today = new Date().toDateString();
    return tDate === today;
  });

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const lowStock = products.filter(p => p.stock <= p.threshold).length;

  // Update metric cards
  document.getElementById('rep-sales-today').textContent = '₱' + todayRevenue.toFixed(2);
  document.getElementById('rep-sales-count').textContent = `${todayTransactions.length} orders`;
  
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  document.getElementById('rep-total-revenue').textContent = '₱' + totalRevenue.toFixed(2);
  const revOrdersEl = document.getElementById('rep-revenue-orders');
  if (revOrdersEl) revOrdersEl.textContent = `${transactions.length} total orders`;
  else {
    const blueCardSmall = document.querySelector('.report-card.blue small');
    if (blueCardSmall) blueCardSmall.textContent = `${transactions.length} total orders`;
  }
  
  const avgSale = transactions.length > 0 ? totalRevenue / transactions.length : 0;
  document.getElementById('rep-avg-sale').textContent = '₱' + avgSale.toFixed(2);
  document.getElementById('rep-stock-alerts').textContent = lowStock;

  // Update low stock list
  const lowStockItems = products.filter(p => p.stock <= p.threshold).sort((a, b) => a.stock - b.stock);
  const lowStockList = document.getElementById('low-stock-list');
  if (lowStockItems.length === 0) {
    lowStockList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No low stock issues</div>';
  } else {
    lowStockList.innerHTML = lowStockItems.map(p => `
      <div class="low-stock-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; font-size: 0.95rem;">☕ ${p.name}</div>
          <div style="background: #ffe8de; color: #b3311b; padding: 6px 12px; border-radius: 12px; font-weight: 700; font-size: 0.85rem;">${p.stock} cups left</div>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">${p.category}</div>
      </div>
    `).join('');
  }

  // Draw charts
  updateReportsCharts();
}

function updateReportsCharts() {
  const days = [];
  const salesData = [0, 0, 0, 0, 0, 0, 0];
  
  // Generate last 7 days labels dynamically
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  
  // Calculate sales by day for last 7 days
  const today = new Date();
  today.setHours(0,0,0,0);
  
  transactions.forEach(t => {
    const tDate = new Date(t.timestamp);
    tDate.setHours(0,0,0,0);
    const dayDiff = Math.round((today - tDate) / (1000 * 60 * 60 * 24));
    
    if (dayDiff >= 0 && dayDiff < 7) {
      salesData[6 - dayDiff] += t.total;
    }
  });

  // Sales trend chart
  const ctxTime = document.getElementById('revenueTimeChart')?.getContext('2d');
  if (ctxTime) {
    new Chart(ctxTime, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Daily Sales (₱)',
          data: salesData,
          borderColor: '#d96d1f',
          backgroundColor: 'rgba(217, 109, 31, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#d96d1f',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function(v) { return '₱' + v; } }
          }
        }
      }
    });
  }

  // Most popular coffee chart
  const productSales = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + 1;
    });
  });

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ctxCategory = document.getElementById('categoryChart')?.getContext('2d');
  if (ctxCategory) {
    new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: topProducts.map(p => p[0]),
        datasets: [{
          data: topProducts.map(p => p[1]),
          backgroundColor: ['#d96d1f', '#3864d8', '#7e4ba8', '#0f8b5f', '#f59e0b'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

// ===== STORAGE =====
function saveToStorage() {
  localStorage.setItem('cafe_products', JSON.stringify(products));
  localStorage.setItem('cafe_transactions', JSON.stringify(transactions));
  localStorage.setItem('cafe_pending_orders', JSON.stringify(pendingOrders));
  localStorage.setItem('cafe_order_counter', orderCounter.toString());
}

function saveProductToFirestore(product) {
  if (!product || !db) return;
  db.collection('products').doc(String(product.id)).set(product).catch(error => {
    console.error('Firestore save product error:', error);
  });
}

function saveTransactionToFirestore(order) {
  if (!order || !db) return;
  db.collection('transactions').doc(String(order.orderId)).set(order).catch(error => {
    console.error('Firestore save transaction error:', error);
  });
}

function loadFromStorage() {
  const saved_products = localStorage.getItem('cafe_products');
  const saved_transactions = localStorage.getItem('cafe_transactions');
  const saved_pending_orders = localStorage.getItem('cafe_pending_orders');
  const saved_counter = localStorage.getItem('cafe_order_counter');

  if (saved_products) products = JSON.parse(saved_products);
  if (saved_transactions) transactions = JSON.parse(saved_transactions);
  if (saved_pending_orders) pendingOrders = JSON.parse(saved_pending_orders);
  if (saved_counter) orderCounter = parseInt(saved_counter);
}

// ===== UTILITIES =====
function showError(msg) {
  showToast(msg, 'error');
}

function showSuccess(msg) {
  showToast(msg, 'success');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();

  currentUser = localStorage.getItem('cafe_user');
  currentUserRole = localStorage.getItem('cafe_role');

  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('proj/');

  if (!currentUser && !isLoginPage) {
    window.location.href = 'index.html';
    return;
  }

  if (currentUser && isLoginPage) {
    if (currentUserRole === 'admin') window.location.href = 'manager.html';
    else if (currentUserRole === 'cashier') window.location.href = 'cashier.html';
    else if (currentUserRole === 'barista') window.location.href = 'barista.html';
    return;
  }

  const loginForm = document.querySelector('#screen-login form') || document.querySelector('form');
  if (loginForm && isLoginPage) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (currentUser && !isLoginPage) {
    if(document.getElementById('screen-login')) document.getElementById('screen-login').style.display = 'none';
    if(document.getElementById('main-app')) document.getElementById('main-app').style.display = 'block';

    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(n => n.classList.remove('active'));

    if(document.getElementById('admin-name-display')) document.getElementById('admin-name-display').textContent = currentUser.toUpperCase();
    updateNavForRole(currentUserRole);
    updateGreeting();
    updateClock();

    if (path.includes('cashier.html')) {
      if(document.getElementById('pos')) document.getElementById('pos').classList.add('active');
      if(document.getElementById('nav-pos')) document.getElementById('nav-pos').classList.add('active');
      renderPOSProducts();
      updateCartModal();
      updateCartTotals();
    } else if (path.includes('barista.html')) {
      if(document.getElementById('barista')) document.getElementById('barista').classList.add('active');
      if(document.getElementById('nav-barista')) document.getElementById('nav-barista').classList.add('active');
      renderBaristaView();
      setInterval(() => {
        loadFromStorage();
        renderBaristaView();
      }, 3000);
    } else if (path.includes('manager.html')) {
      if(document.getElementById('inventory')) document.getElementById('inventory').classList.add('active');
      if(document.getElementById('nav-inventory')) document.getElementById('nav-inventory').classList.add('active');
      renderInventory();
    } else if (path.includes('analytics.html')) {
      if(document.getElementById('reports')) document.getElementById('reports').classList.add('active');
      if(document.getElementById('nav-reports')) document.getElementById('nav-reports').classList.add('active');
      renderReports();
    }
  }
});
