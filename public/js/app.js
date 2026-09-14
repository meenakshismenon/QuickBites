/**
 * QuickBite Food Delivery - Client Application Logic
 * Integrates directly with Node.js Express & MongoDB backend via REST APIs.
 */

// Global State
const state = {
  foods: [],
  orders: [],
  cart: JSON.parse(localStorage.getItem('quickbite_cart') || '[]'),
  activeCategory: 'All',
  searchQuery: '',
  vegOnly: false,
};

// DOM Elements
const DOM = {
  dbStatusLabel: document.getElementById('dbStatusLabel'),
  btnSeedMenu: document.getElementById('btnSeedMenu'),
  btnOpenMenuManager: document.getElementById('btnOpenMenuManager'),
  btnOpenOrdersModal: document.getElementById('btnOpenOrdersModal'),
  ordersCountBadge: document.getElementById('ordersCountBadge'),
  btnOpenCart: document.getElementById('btnOpenCart'),
  cartCountBadge: document.getElementById('cartCountBadge'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  brandHomeBtn: document.getElementById('brandHomeBtn'),

  // Hero Controls
  foodSearchInput: document.getElementById('foodSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  vegFilterToggle: document.getElementById('vegFilterToggle'),
  categoryPills: document.getElementById('categoryPills'),

  // Menu Grid
  foodGrid: document.getElementById('foodGrid'),
  activeCategoryTitle: document.getElementById('activeCategoryTitle'),
  menuCountSubtitle: document.getElementById('menuCountSubtitle'),

  // Cart Drawer
  cartBackdrop: document.getElementById('cartBackdrop'),
  cartDrawer: document.getElementById('cartDrawer'),
  btnCloseCart: document.getElementById('btnCloseCart'),
  cartDrawerCount: document.getElementById('cartDrawerCount'),
  cartItemsList: document.getElementById('cartItemsList'),
  checkoutFormContainer: document.getElementById('checkoutFormContainer'),
  checkoutForm: document.getElementById('checkoutForm'),
  billSubtotal: document.getElementById('billSubtotal'),
  billDeliveryFee: document.getElementById('billDeliveryFee'),
  billTotalAmount: document.getElementById('billTotalAmount'),
  btnPlaceOrder: document.getElementById('btnPlaceOrder'),

  // Orders Modal
  ordersModal: document.getElementById('ordersModal'),
  ordersListContainer: document.getElementById('ordersListContainer'),

  // Menu Manager Modal
  menuManagerModal: document.getElementById('menuManagerModal'),
  addFoodForm: document.getElementById('addFoodForm'),
  manageMenuCount: document.getElementById('manageMenuCount'),
  manageMenuTableBody: document.getElementById('manageMenuTableBody'),

  // Edit Food Modal
  editFoodModal: document.getElementById('editFoodModal'),
  editFoodForm: document.getElementById('editFoodForm'),

  // API Tester Modal
  apiTesterModal: document.getElementById('apiTesterModal'),
  btnOpenApiDrawer: document.getElementById('btnOpenApiDrawer'),
  apiSelector: document.getElementById('apiSelector'),
  testMethodBadge: document.getElementById('testMethodBadge'),
  testRouteDisplay: document.getElementById('testRouteDisplay'),
  testRequestBodyGroup: document.getElementById('testRequestBodyGroup'),
  testRequestBody: document.getElementById('testRequestBody'),
  btnRunApiTest: document.getElementById('btnRunApiTest'),
  testStatusPill: document.getElementById('testStatusPill'),
  testLatencyPill: document.getElementById('testLatencyPill'),
  testResponseBox: document.getElementById('testResponseBox'),

  // Toasts
  toastContainer: document.getElementById('toastContainer'),
};

// ==========================================================================
// Toast Notification
// ==========================================================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald' : 'fa-triangle-exclamation text-rose'}"></i>
    <span>${message}</span>
  `;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// REST API Client Layer
// ==========================================================================
async function apiCall(endpoint, options = {}) {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    };
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    const res = await fetch(endpoint, config);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    return { ok: false, status: 500, data: { message: err.message } };
  }
}

// ==========================================================================
// Initialization
// ==========================================================================
async function initApp() {
  setupEventListeners();
  setupApiTester();
  checkHealth();
  await Promise.all([fetchFoods(), fetchOrders()]);
  renderCart();
}

async function checkHealth() {
  const res = await apiCall('/api/stats/health');
  if (res.ok && res.data.success) {
    DOM.dbStatusLabel.textContent = `MongoDB Connected (${res.data.database.name})`;
  } else {
    DOM.dbStatusLabel.textContent = 'Server / DB Offline';
  }
}

// ==========================================================================
// Food Menu (Fetch & Render)
// ==========================================================================
async function fetchFoods() {
  const params = new URLSearchParams();
  if (state.activeCategory && state.activeCategory !== 'All') {
    params.append('category', state.activeCategory);
  }
  if (state.vegOnly) {
    params.append('vegOnly', 'true');
  }
  if (state.searchQuery) {
    params.append('search', state.searchQuery);
  }

  const res = await apiCall(`/api/foods?${params.toString()}`);
  if (res.ok && res.data.success) {
    state.foods = res.data.data;
    renderFoodGrid();
    renderManageMenu();
  }
}

function renderFoodGrid() {
  DOM.activeCategoryTitle.textContent =
    state.activeCategory === 'All' ? 'Explore Our Menu' : `${state.activeCategory} Specialties`;
  DOM.menuCountSubtitle.textContent = `Showing ${state.foods.length} delicious items`;

  if (state.foods.length === 0) {
    DOM.foodGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-utensils" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--text-muted);"></i>
        <p>No dishes match your selection. Try clearing search filters or click "Seed Menu".</p>
      </div>
    `;
    return;
  }

  DOM.foodGrid.innerHTML = state.foods
    .map((food) => {
      const cartItem = state.cart.find((it) => it.foodItem === food._id);
      const isAvailable = food.isAvailable !== false;

      let actionBtn = '';
      if (!isAvailable) {
        actionBtn = `<span class="out-of-stock-tag">Out of Stock</span>`;
      } else if (cartItem) {
        actionBtn = `
          <div class="qty-stepper">
            <button class="qty-btn" onclick="updateCartQty('${food._id}', -1)">&minus;</button>
            <span class="qty-count">${cartItem.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty('${food._id}', 1)">&plus;</button>
          </div>
        `;
      } else {
        actionBtn = `
          <button class="btn btn-primary btn-sm" onclick="addToCart('${food._id}')">
            <i class="fa-solid fa-plus"></i> Add
          </button>
        `;
      }

      return `
        <div class="food-card">
          <div class="food-image-wrapper">
            <img src="${escapeHtml(food.image)}" alt="${escapeHtml(food.name)}" class="food-img" loading="lazy">
            <div class="food-card-badges">
              <span class="diet-tag ${food.isVeg ? 'veg' : 'nonveg'}" title="${food.isVeg ? 'Pure Veg' : 'Non-Veg'}"></span>
              <span class="rating-badge">★ ${food.rating || 4.5}</span>
            </div>
          </div>
          <div class="food-card-content">
            <span class="food-category-label">${escapeHtml(food.category)}</span>
            <h3 class="food-name">${escapeHtml(food.name)}</h3>
            <p class="food-description">${escapeHtml(food.description || '')}</p>
            <div class="food-meta-row">
              <span class="food-price">₹${food.price}</span>
              ${actionBtn}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// ==========================================================================
// Shopping Cart Logic
// ==========================================================================
window.addToCart = function (foodId) {
  const food = state.foods.find((f) => f._id === foodId);
  if (!food || !food.isAvailable) return;

  const existing = state.cart.find((it) => it.foodItem === foodId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      foodItem: food._id,
      name: food.name,
      price: food.price,
      image: food.image,
      quantity: 1,
    });
  }

  saveCart();
  renderCart();
  renderFoodGrid();
  showToast(`Added '${food.name}' to cart!`);
};

window.updateCartQty = function (foodId, delta) {
  const index = state.cart.findIndex((it) => it.foodItem === foodId);
  if (index === -1) return;

  state.cart[index].quantity += delta;
  if (state.cart[index].quantity <= 0) {
    state.cart.splice(index, 1);
  }

  saveCart();
  renderCart();
  renderFoodGrid();
};

function saveCart() {
  localStorage.setItem('quickbite_cart', JSON.stringify(state.cart));
}

function renderCart() {
  const totalCount = state.cart.reduce((sum, it) => sum + it.quantity, 0);
  DOM.cartCountBadge.textContent = totalCount;
  DOM.cartDrawerCount.textContent = totalCount;

  if (state.cart.length === 0) {
    DOM.cartItemsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--text-muted);"></i>
        <p>Your cart is empty.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Add delicious items from the menu to place an order!</p>
      </div>
    `;
    DOM.checkoutFormContainer.style.display = 'none';
    return;
  }

  DOM.checkoutFormContainer.style.display = 'block';

  // Render items
  DOM.cartItemsList.innerHTML = state.cart
    .map(
      (item) => `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-price">₹${item.price} each</div>
          </div>
          <div class="qty-stepper">
            <button class="qty-btn" onclick="updateCartQty('${item.foodItem}', -1)">&minus;</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty('${item.foodItem}', 1)">&plus;</button>
          </div>
          <strong style="min-width: 55px; text-align: right;">₹${item.price * item.quantity}</strong>
        </div>
      `
    )
    .join('');

  // Bill calculations
  const subtotal = state.cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const deliveryFee = 30;
  const total = subtotal + deliveryFee;

  DOM.billSubtotal.textContent = `₹${subtotal}`;
  DOM.billDeliveryFee.textContent = `₹${deliveryFee}`;
  DOM.billTotalAmount.textContent = `₹${total}`;
}

// Checkout Form Submit (POST /api/orders)
DOM.checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.cart.length === 0) return;

  DOM.btnPlaceOrder.disabled = true;
  DOM.btnPlaceOrder.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; margin: 0 6px 0 0; display: inline-block;"></div> Placing order...`;

  const payload = {
    customerName: document.getElementById('custName').value.trim(),
    customerPhone: document.getElementById('custPhone').value.trim(),
    deliveryAddress: document.getElementById('custAddress').value.trim(),
    paymentMethod: document.getElementById('custPayment').value,
    orderNotes: document.getElementById('custNotes').value.trim(),
    items: state.cart.map((it) => ({
      foodItem: it.foodItem,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
    })),
  };

  const res = await apiCall('/api/orders', { method: 'POST', body: payload });

  DOM.btnPlaceOrder.disabled = false;
  DOM.btnPlaceOrder.innerHTML = `<i class="fa-solid fa-check"></i> Place Delivery Order`;

  if (res.ok && res.data.success) {
    showToast(res.data.message);
    state.cart = [];
    saveCart();
    renderCart();
    renderFoodGrid();
    closeCart();
    await fetchOrders();
    openModal('ordersModal');
  } else {
    showToast(res.data.message || 'Error placing order', 'error');
  }
});

// ==========================================================================
// Orders & Delivery Tracking (CRUD)
// ==========================================================================
async function fetchOrders() {
  const res = await apiCall('/api/orders');
  if (res.ok && res.data.success) {
    state.orders = res.data.data;
    DOM.ordersCountBadge.textContent = state.orders.length;
    renderOrdersList();
  }
}

function renderOrdersList() {
  if (state.orders.length === 0) {
    DOM.ordersListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-receipt" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--text-muted);"></i>
        <p>No orders placed yet. Add items from the menu to start!</p>
      </div>
    `;
    return;
  }

  DOM.ordersListContainer.innerHTML = state.orders
    .map((order) => {
      const statuses = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
      const isCancelled = order.status === 'Cancelled';
      const currentIndex = statuses.indexOf(order.status);

      let stepperHtml = '';
      if (isCancelled) {
        stepperHtml = `
          <div style="background: var(--rose-light); color: var(--rose); padding: 0.6rem 1rem; border-radius: var(--radius-md); font-weight: 700; text-align: center; margin: 1rem 0;">
            <i class="fa-solid fa-ban"></i> Order Cancelled
          </div>
        `;
      } else {
        const steps = statuses
          .map((st, idx) => {
            let stepClass = '';
            if (idx < currentIndex) stepClass = 'completed';
            else if (idx === currentIndex) stepClass = 'current';

            return `
              <div class="status-step ${stepClass}">
                <div class="step-circle">${idx + 1}</div>
                <span class="step-label">${st}</span>
              </div>
            `;
          })
          .join('');
        stepperHtml = `<div class="status-stepper">${steps}</div>`;
      }

      const itemsSummary = order.items
        .map((it) => `${it.name} (x${it.quantity})`)
        .join(', ');

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <span class="order-id">#${order._id.toString().slice(-6).toUpperCase()}</span>
              <div style="font-weight: 700; margin-top: 0.2rem;">${escapeHtml(order.customerName)} &bull; ${escapeHtml(order.customerPhone)}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(order.deliveryAddress)}</div>
            </div>
            <div style="text-align: right;">
              <strong style="font-family: var(--font-heading); font-size: 1.15rem;">₹${order.totalAmount}</strong>
              <div class="order-timestamp">${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          ${stepperHtml}

          <div class="order-items-preview">
            <strong>Items:</strong> ${escapeHtml(itemsSummary)}
          </div>

          <div class="order-card-footer">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Update Status:</span>
              <select class="order-status-select" onchange="updateOrderStatus('${order._id}', this.value)">
                <option value="Placed" ${order.status === 'Placed' ? 'selected' : ''}>Placed</option>
                <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>

            <button class="btn btn-outline btn-sm text-danger" onclick="cancelOrder('${order._id}')" title="Delete / Cancel Order">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

window.updateOrderStatus = async function (orderId, newStatus) {
  const res = await apiCall(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status: newStatus },
  });

  if (res.ok && res.data.success) {
    showToast(res.data.message);
    await fetchOrders();
  } else {
    showToast(res.data.message || 'Error updating order status', 'error');
  }
};

window.cancelOrder = async function (orderId) {
  if (!confirm('Are you sure you want to cancel and remove this order?')) return;

  const res = await apiCall(`/api/orders/${orderId}`, { method: 'DELETE' });
  if (res.ok && res.data.success) {
    showToast(res.data.message);
    await fetchOrders();
  } else {
    showToast(res.data.message || 'Error cancelling order', 'error');
  }
};

// ==========================================================================
// Restaurant Menu Manager (Admin CRUD)
// ==========================================================================
function renderManageMenu() {
  DOM.manageMenuCount.textContent = state.foods.length;

  DOM.manageMenuTableBody.innerHTML = state.foods
    .map(
      (f) => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span class="diet-tag ${f.isVeg ? 'veg' : 'nonveg'}"></span>
              <strong>${escapeHtml(f.name)}</strong>
            </div>
          </td>
          <td>${f.category}</td>
          <td><strong>₹${f.price}</strong></td>
          <td>${f.isVeg ? 'Veg' : 'Non-Veg'}</td>
          <td>
            <button class="btn btn-sm ${f.isAvailable ? 'btn-secondary' : 'btn-outline text-danger'}" onclick="toggleAvailability('${f._id}')">
              ${f.isAvailable ? 'In Stock' : 'Out of Stock'}
            </button>
          </td>
          <td class="text-right">
            <div style="display: flex; justify-content: flex-end; gap: 0.4rem;">
              <button class="btn btn-icon btn-sm" onclick="openEditFoodModal('${f._id}')" title="Edit Price & Details">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-icon btn-sm text-danger" onclick="deleteFood('${f._id}', '${escapeHtml(f.name)}')" title="Delete Dish">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');
}

// Add New Food Item (POST /api/foods)
DOM.addFoodForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('newFoodName').value.trim(),
    price: Number(document.getElementById('newFoodPrice').value),
    category: document.getElementById('newFoodCategory').value,
    isVeg: document.getElementById('newFoodVeg').value === 'true',
    preparationTime: document.getElementById('newFoodPrep').value.trim(),
    image: document.getElementById('newFoodImage').value.trim(),
    description: document.getElementById('newFoodDesc').value.trim(),
  };

  const res = await apiCall('/api/foods', { method: 'POST', body: payload });
  if (res.ok && res.data.success) {
    showToast(res.data.message);
    DOM.addFoodForm.reset();
    await fetchFoods();
  } else {
    showToast(res.data.message || 'Error adding dish', 'error');
  }
});

// Edit Food Item Modal Open & Submit (PUT /api/foods/:id)
window.openEditFoodModal = function (foodId) {
  const food = state.foods.find((f) => f._id === foodId);
  if (!food) return;

  document.getElementById('editFoodId').value = food._id;
  document.getElementById('editFoodName').value = food.name;
  document.getElementById('editFoodPrice').value = food.price;
  document.getElementById('editFoodCategory').value = food.category;
  document.getElementById('editFoodDesc').value = food.description || '';

  openModal('editFoodModal');
};

DOM.editFoodForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const foodId = document.getElementById('editFoodId').value;
  const payload = {
    name: document.getElementById('editFoodName').value.trim(),
    price: Number(document.getElementById('editFoodPrice').value),
    category: document.getElementById('editFoodCategory').value,
    description: document.getElementById('editFoodDesc').value.trim(),
  };

  const res = await apiCall(`/api/foods/${foodId}`, { method: 'PUT', body: payload });
  if (res.ok && res.data.success) {
    showToast(res.data.message);
    closeModal('editFoodModal');
    await fetchFoods();
  } else {
    showToast(res.data.message || 'Error updating dish', 'error');
  }
});

// Toggle In Stock / Out of Stock (PATCH /api/foods/:id/availability)
window.toggleAvailability = async function (foodId) {
  const res = await apiCall(`/api/foods/${foodId}/availability`, { method: 'PATCH' });
  if (res.ok && res.data.success) {
    showToast(res.data.message);
    await fetchFoods();
  } else {
    showToast(res.data.message || 'Error toggling availability', 'error');
  }
};

// Delete Food Item (DELETE /api/foods/:id)
window.deleteFood = async function (foodId, foodName) {
  if (!confirm(`Are you sure you want to remove '${foodName}' from the menu?`)) return;

  const res = await apiCall(`/api/foods/${foodId}`, { method: 'DELETE' });
  if (res.ok && res.data.success) {
    showToast(res.data.message);
    await fetchFoods();
  } else {
    showToast(res.data.message || 'Error deleting dish', 'error');
  }
};

// ==========================================================================
// REST API Tester (Interactive Playground)
// ==========================================================================
const API_PRESETS = {
  GET_FOODS: { method: 'GET', route: '/api/foods', body: null },
  GET_FOOD_ID: { method: 'GET', route: '/api/foods/{FOOD_ID}', body: null },
  POST_FOOD: {
    method: 'POST',
    route: '/api/foods',
    body: {
      name: 'Paneer Tikka Roll',
      description: 'Char-grilled cottage cheese with bell peppers and mint chutney',
      price: 219,
      category: 'Sides',
      isVeg: true,
      preparationTime: '15 mins',
    },
  },
  PUT_FOOD: {
    method: 'PUT',
    route: '/api/foods/{FOOD_ID}',
    body: { price: 379, description: 'Updated gourmet recipe with Italian herbs' },
  },
  PATCH_FOOD_AVAIL: { method: 'PATCH', route: '/api/foods/{FOOD_ID}/availability', body: {} },
  DELETE_FOOD: { method: 'DELETE', route: '/api/foods/{FOOD_ID}', body: null },
  GET_ORDERS: { method: 'GET', route: '/api/orders', body: null },
  GET_ORDER_ID: { method: 'GET', route: '/api/orders/{ORDER_ID}', body: null },
  POST_ORDER: {
    method: 'POST',
    route: '/api/orders',
    body: {
      customerName: 'Karthik Rao',
      customerPhone: '+91 98765 99887',
      deliveryAddress: 'Flat 104, Sunrise Apartments, HSR Layout',
      paymentMethod: 'Cash on Delivery',
      items: [{ foodItem: '{FOOD_ID}', name: 'Artisan Margherita Pizza', price: 349, quantity: 1 }],
    },
  },
  PATCH_ORDER_STATUS: {
    method: 'PATCH',
    route: '/api/orders/{ORDER_ID}/status',
    body: { status: 'Delivered' },
  },
  DELETE_ORDER: { method: 'DELETE', route: '/api/orders/{ORDER_ID}', body: null },
  GET_REVIEWS: { method: 'GET', route: '/api/reviews/food/{FOOD_ID}', body: null },
  POST_REVIEW: {
    method: 'POST',
    route: '/api/reviews',
    body: {
      customerName: 'Maya Patel',
      foodItem: '{FOOD_ID}',
      rating: 5,
      comment: 'Absolutely delectable crust and rich sauce! Loved it.',
    },
  },
  GET_STATS: { method: 'GET', route: '/api/stats', body: null },
  GET_HEALTH: { method: 'GET', route: '/api/stats/health', body: null },
};

function setupApiTester() {
  const updateFields = () => {
    const key = DOM.apiSelector.value;
    const preset = API_PRESETS[key];
    if (!preset) return;

    const sampleFoodId = state.foods[0]?._id || '650000000000000000000001';
    const sampleOrderId = state.orders[0]?._id || '650000000000000000000002';

    const resolvedRoute = preset.route
      .replace('{FOOD_ID}', sampleFoodId)
      .replace('{ORDER_ID}', sampleOrderId);

    DOM.testMethodBadge.textContent = preset.method;
    DOM.testMethodBadge.className = `method-badge method-${preset.method.toLowerCase()}`;
    DOM.testRouteDisplay.textContent = resolvedRoute;

    if (preset.body) {
      DOM.testRequestBodyGroup.style.display = 'block';
      let b = JSON.parse(JSON.stringify(preset.body));
      if (b.items && b.items[0]?.foodItem === '{FOOD_ID}') b.items[0].foodItem = sampleFoodId;
      if (b.foodItem === '{FOOD_ID}') b.foodItem = sampleFoodId;
      DOM.testRequestBody.value = JSON.stringify(b, null, 2);
    } else {
      DOM.testRequestBodyGroup.style.display = 'none';
      DOM.testRequestBody.value = '';
    }
  };

  DOM.apiSelector.addEventListener('change', updateFields);
  updateFields();

  DOM.btnRunApiTest.addEventListener('click', async () => {
    const key = DOM.apiSelector.value;
    const preset = API_PRESETS[key];
    if (!preset) return;

    const sampleFoodId = state.foods[0]?._id || '650000000000000000000001';
    const sampleOrderId = state.orders[0]?._id || '650000000000000000000002';

    const resolvedRoute = preset.route
      .replace('{FOOD_ID}', sampleFoodId)
      .replace('{ORDER_ID}', sampleOrderId);

    DOM.testStatusPill.textContent = 'Sending...';
    DOM.testResponseBox.textContent = '// Executing REST request...';

    const t0 = performance.now();
    let body = null;
    if (preset.body && DOM.testRequestBody.value.trim()) {
      try {
        body = JSON.parse(DOM.testRequestBody.value.trim());
      } catch (err) {
        showToast('Invalid JSON in request payload', 'error');
        return;
      }
    }

    const res = await apiCall(resolvedRoute, { method: preset.method, body });
    const elapsed = Math.round(performance.now() - t0);

    DOM.testLatencyPill.textContent = `${elapsed} ms`;
    DOM.testStatusPill.textContent = `Status: ${res.status} ${res.ok ? 'OK' : 'Error'}`;
    DOM.testResponseBox.textContent = JSON.stringify(res.data, null, 2);

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(preset.method) && res.ok) {
      await Promise.all([fetchFoods(), fetchOrders()]);
    }
  });
}

// ==========================================================================
// Modal & Drawer Helpers
// ==========================================================================
function openCart() {
  DOM.cartBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  DOM.cartBackdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// ==========================================================================
// Event Listeners
// ==========================================================================
function setupEventListeners() {
  // Cart open/close
  DOM.btnOpenCart.addEventListener('click', openCart);
  DOM.btnCloseCart.addEventListener('click', closeCart);
  DOM.cartBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.cartBackdrop) closeCart();
  });

  // Modals open/close
  DOM.btnOpenOrdersModal.addEventListener('click', () => {
    fetchOrders();
    openModal('ordersModal');
  });
  DOM.btnOpenMenuManager.addEventListener('click', () => {
    renderManageMenu();
    openModal('menuManagerModal');
  });
  DOM.btnOpenApiDrawer.addEventListener('click', () => {
    openModal('apiTesterModal');
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
  });

  // Seed Menu
  DOM.btnSeedMenu.addEventListener('click', async () => {
    DOM.btnSeedMenu.disabled = true;
    DOM.btnSeedMenu.innerHTML = `<div class="spinner" style="width: 14px; height: 14px; margin: 0 4px 0 0; display: inline-block;"></div> Seeding...`;

    const res = await apiCall('/api/stats/seed', { method: 'POST' });
    DOM.btnSeedMenu.disabled = false;
    DOM.btnSeedMenu.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Seed Menu</span>`;

    if (res.ok && res.data.success) {
      showToast(res.data.message);
      await Promise.all([fetchFoods(), fetchOrders()]);
    } else {
      showToast(res.data.message || 'Failed to seed data', 'error');
    }
  });

  // Category Pills Filter
  DOM.categoryPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (!pill) return;

    document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');

    state.activeCategory = pill.getAttribute('data-category');
    fetchFoods();
  });

  // Search Input
  DOM.foodSearchInput.addEventListener('input', () => {
    state.searchQuery = DOM.foodSearchInput.value.trim();
    DOM.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    fetchFoods();
  });
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.foodSearchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.style.display = 'none';
    fetchFoods();
  });

  // Veg Only Toggle
  DOM.vegFilterToggle.addEventListener('change', () => {
    state.vegOnly = DOM.vegFilterToggle.checked;
    fetchFoods();
  });

  // Theme Toggle
  DOM.themeToggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    DOM.themeIcon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });

  // Brand Logo Click
  DOM.brandHomeBtn.addEventListener('click', () => {
    state.activeCategory = 'All';
    state.searchQuery = '';
    state.vegOnly = false;
    DOM.foodSearchInput.value = '';
    DOM.vegFilterToggle.checked = false;
    document.querySelectorAll('.category-pill').forEach((p) => {
      p.classList.toggle('active', p.getAttribute('data-category') === 'All');
    });
    fetchFoods();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', initApp);
