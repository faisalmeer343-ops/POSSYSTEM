/* ===================== GLOBAL STATE ===================== */
let items = [];
let categories = ['All'];
let cart = [];
let salesHistory = [];
let editingItemId = null;
let currentCategory = 'All';
let currentSearch = '';
let nextReceiptNo = 1001;

/* ===================== STORAGE ===================== */
function saveData() {
    try {
        localStorage.setItem('geomir_items', JSON.stringify(items));
        localStorage.setItem('geomir_categories', JSON.stringify(categories));
        localStorage.setItem('geomir_sales', JSON.stringify(salesHistory));
        localStorage.setItem('geomir_next_receipt', nextReceiptNo);
    } catch (e) {
        alert('Data save nahi ho saka! Storage full ho sakta hai.');
        console.error(e);
    }
}

function loadData() {
    items = JSON.parse(localStorage.getItem('geomir_items')) || [];
    categories = JSON.parse(localStorage.getItem('geomir_categories')) || ['All'];
    salesHistory = JSON.parse(localStorage.getItem('geomir_sales')) || [];
    nextReceiptNo = parseInt(localStorage.getItem('geomir_next_receipt')) || 1001;
    if (!categories.includes('All')) categories.unshift('All');
}

/* ===================== DATE-TIME ===================== */
function updateDateTime() {
    const now = new Date();
    document.getElementById('dateTime').textContent = now.toLocaleString('en-PK', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
setInterval(updateDateTime, 1000);

/* ===================== DASHBOARD UPDATE ===================== */
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().slice(0, 7);

    // Daily
    const todaySales = salesHistory.filter(s => s.date === today);
    const dailyRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const dailyOrders = todaySales.length;
    const dailyItems = todaySales.reduce((sum, s) =>
        sum + s.items.reduce((a, i) => a + i.qty, 0), 0);

    // Monthly
    const monthSales = salesHistory.filter(s => s.date.startsWith(month));
    const monthlyRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const monthlyOrders = monthSales.length;
    const monthlyItems = monthSales.reduce((sum, s) =>
        sum + s.items.reduce((a, i) => a + i.qty, 0), 0);

    // Update top dashboard
    document.getElementById('dashDailyRevenue').textContent = 'Rs. ' + dailyRevenue.toLocaleString();
    document.getElementById('dashDailyOrders').textContent = dailyOrders + ' orders';
    document.getElementById('dashDailyItems').textContent = dailyItems;
    document.getElementById('dashMonthlyRevenue').textContent = 'Rs. ' + monthlyRevenue.toLocaleString();
    document.getElementById('dashMonthlyOrders').textContent = monthlyOrders + ' orders';
    document.getElementById('dashTotalItems').textContent = items.length;

    // Update side mini dashboard
    document.getElementById('sideMonthlyRevenue').textContent = 'Rs. ' + monthlyRevenue.toLocaleString();
    document.getElementById('sideMonthlyOrders').textContent = monthlyOrders;
    document.getElementById('sideMonthlyItems').textContent = monthlyItems;
}

/* ===================== CATEGORIES ===================== */
function renderCategories() {
    const container = document.getElementById('sidebarCategories');
    container.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn' + (cat === currentCategory ? ' active' : '');
        btn.textContent = cat;
        btn.onclick = () => {
            currentCategory = cat;
            document.getElementById('currentCategoryTitle').textContent =
                cat === 'All' ? 'All Items' : cat;
            renderCategories();
            renderItems();
        };
        container.appendChild(btn);
    });

    const select = document.getElementById('itemCategory');
    select.innerHTML = '';
    categories.filter(c => c !== 'All').forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

/* ===================== ITEMS RENDER ===================== */
function renderItems() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';

    let list = items;
    if (currentCategory !== 'All') list = list.filter(i => i.category === currentCategory);
    if (currentSearch.trim()) {
        const q = currentSearch.toLowerCase();
        list = list.filter(i => i.name.toLowerCase().includes(q));
    }

    document.getElementById('itemCount').textContent = list.length + ' items';

    if (list.length === 0) {
        grid.innerHTML = '<p class="empty-msg">Koi item nahi mila.</p>';
        return;
    }

    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        const path = (item.image || '').trim();
        let imgHTML = '';
        if (path) {
            imgHTML = `<img src="${escAttr(path)}" alt="${escAttr(item.name)}"
                onerror="this.style.display='none'; this.parentElement.querySelector('.no-img').style.display='block';">
                <span class="no-img" style="display:none;">🍽️</span>`;
        } else {
            imgHTML = `<span class="no-img">🍽️</span>`;
        }

        div.innerHTML = `
            <div class="item-actions">
                <button class="edit-btn" onclick="event.stopPropagation(); editItem(${item.id})">✏️</button>
                <button class="del-btn" onclick="event.stopPropagation(); deleteItem(${item.id})">🗑️</button>
            </div>
            <div class="item-img-box">${imgHTML}</div>
            <h4>${esc(item.name)}</h4>
            <div class="price">Rs. ${item.price}</div>
            <div class="category-tag">${esc(item.category || '-')}</div>
        `;
        div.onclick = () => addToCart(item.id);
        grid.appendChild(div);
    });
}

function searchItems() {
    currentSearch = document.getElementById('searchInput').value;
    renderItems();
}

/* ===================== CART ===================== */
function addToCart(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const ex = cart.find(c => c.id === id);
    if (ex) ex.qty += 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    renderCart();
}

function changeQty(id, delta) {
    const c = cart.find(x => x.id === id);
    if (!c) return;
    c.qty += delta;
    if (c.qty <= 0) cart = cart.filter(x => x.id !== id);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">Cart khali hai</p>';
    } else {
        container.innerHTML = cart.map(x => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${esc(x.name)}</strong>
                    <small>Rs. ${x.price} × ${x.qty}</small>
                </div>
                <div class="qty-controls">
                    <button onclick="changeQty(${x.id}, -1)">−</button>
                    <span>${x.qty}</span>
                    <button onclick="changeQty(${x.id}, 1)">+</button>
                </div>
                <div class="item-total">Rs. ${x.price * x.qty}</div>
            </div>
        `).join('');
    }
    updateCart();
}

function updateCart() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = subtotal * 0.05;
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const total = Math.max(0, subtotal + tax - discount);
    document.getElementById('subtotal').textContent = 'Rs. ' + subtotal.toLocaleString();
    document.getElementById('tax').textContent = 'Rs. ' + tax.toFixed(2);
    document.getElementById('total').textContent = 'Rs. ' + total.toFixed(2);
    return { subtotal, tax, discount, total };
}

function clearCart() {
    if (cart.length === 0) return;
    if (!confirm('Cart clear karein?')) return;
    cart = [];
    renderCart();
}

/* ===================== ITEM MODAL ===================== */
function openItemModal(editId = null) {
    editingItemId = editId;
    const box = document.getElementById('imgPreview');

    if (editId) {
        const item = items.find(i => i.id === editId);
        document.getElementById('itemModalTitle').textContent = '✏️ Edit Item';
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemPrice').value = item.price;
        document.getElementById('itemImage').value = item.image || '';
        if (item.image) {
            box.innerHTML = `<img src="${escAttr(item.image)}" alt="preview"
                onerror="this.parentElement.textContent='❌ Image load nahi hui';">`;
        } else box.textContent = 'Image preview';
    } else {
        document.getElementById('itemModalTitle').textContent = '➕ Add New Item';
        document.getElementById('itemName').value = '';
        document.getElementById('itemPrice').value = '';
        document.getElementById('itemImage').value = '';
        box.textContent = 'Image preview';
    }

    renderCategories();
    if (editId) {
        const item = items.find(i => i.id === editId);
        setTimeout(() => {
            document.getElementById('itemCategory').value = item.category || '';
        }, 0);
    }
    document.getElementById('itemModal').classList.add('show');
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('show');
    editingItemId = null;
}

function previewFromPath() {
    const path = document.getElementById('itemImage').value.trim();
    const box = document.getElementById('imgPreview');
    if (!path) { box.textContent = 'Image preview'; return; }
    box.innerHTML = `<img src="${escAttr(path)}" alt="preview"
        onerror="this.parentElement.textContent='❌ Image load nahi hui';">`;
}

function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const image = document.getElementById('itemImage').value.trim();

    if (!name) return alert('Item name likhein!');
    if (isNaN(price) || price < 0) return alert('Valid price likhein!');
    if (!category) return alert('Category select karein!');

    if (editingItemId) {
        const item = items.find(i => i.id === editingItemId);
        item.name = name; item.price = price; item.category = category; item.image = image;
    } else {
        items.push({ id: Date.now(), name, price, category, image });
    }

    saveData();
    closeItemModal();
    renderItems();
    updateDashboard();
}

function editItem(id) { openItemModal(id); }

function deleteItem(id) {
    if (!confirm('Item delete karein?')) return;
    items = items.filter(i => i.id !== id);
    cart = cart.filter(c => c.id !== id);
    saveData();
    renderItems();
    renderCart();
    updateDashboard();
}

/* ===================== CATEGORY MODAL ===================== */
function openCategoryModal() {
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryModal').classList.add('show');
}
function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('show');
}
function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) return alert('Category name likhein!');
    if (categories.includes(name)) return alert('Category already exists!');
    categories.push(name);
    saveData();
    closeCategoryModal();
    renderCategories();
}

/* ===================== CHECKOUT ===================== */
function checkout() {
    if (cart.length === 0) return alert('Cart khali hai!');

    const { subtotal, tax, discount, total } = updateCart();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-PK');
    const timeStr = now.toLocaleTimeString('en-PK');

    const customerName = document.getElementById('customerName').value.trim() || 'Walk-in';
    const tableNo = document.getElementById('tableNo').value.trim() || '-';
    const receiptNo = nextReceiptNo++;

    const saleRecord = {
        id: now.getTime(),
        receiptNo: receiptNo,
        date: now.toISOString().split('T')[0],
        time: timeStr,
        customerName,
        tableNo,
        items: JSON.parse(JSON.stringify(cart)),
        subtotal, tax, discount, total
    };
    salesHistory.push(saleRecord);
    saveData();

    document.getElementById('receiptContent').innerHTML = buildReceiptHTML(saleRecord);
    document.getElementById('receiptModal').classList.add('show');

    cart = [];
    document.getElementById('customerName').value = '';
    document.getElementById('tableNo').value = '';
    document.getElementById('discount').value = 0;
    renderCart();
    updateDashboard();
}

/* ===================== RECEIPT HTML BUILDER ===================== */
function buildReceiptHTML(sale) {
    let html = `
        <div style="text-align:center; margin-bottom:6px;">
            <strong>Receipt No: ${sale.receiptNo}</strong><br>
            ${sale.date} — ${sale.time}
        </div>
        <hr>
        <div><strong>Customer:</strong> ${esc(sale.customerName)}</div>
        <div><strong>Table:</strong> ${esc(sale.tableNo)}</div>
        <hr>
        <table>
            <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
    `;
    sale.items.forEach(i => {
        html += `<tr>
            <td>${esc(i.name)}</td>
            <td>${i.qty}</td>
            <td>Rs. ${i.price * i.qty}</td>
        </tr>`;
    });
    html += `</table>
        <hr>
        <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>Rs. ${sale.subtotal}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Tax (5%):</span><span>Rs. ${sale.tax.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Discount:</span><span>Rs. ${sale.discount}</span></div>
        <hr>
        <h3 style="display:flex; justify-content:space-between;">
            <span>TOTAL:</span><span>Rs. ${sale.total.toFixed(2)}</span>
        </h3>
        <div style="text-align:center; margin-top:8px; font-size:10px;">Shukriya! Dobara tashreef laayen 😊</div>
    `;
    return html;
}

/* ===================== PRINT ===================== */
function printReceipt() {
    const modal = document.getElementById('receiptModal');
    modal.classList.add('printing');
    setTimeout(() => {
        window.print();
        setTimeout(() => modal.classList.remove('printing'), 500);
    }, 100);
}
function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('show');
}

function printViewReceipt() {
    const modal = document.getElementById('viewReceiptModal');
    modal.classList.add('printing');
    setTimeout(() => {
        window.print();
        setTimeout(() => modal.classList.remove('printing'), 500);
    }, 100);
}
function closeViewReceiptModal() {
    document.getElementById('viewReceiptModal').classList.remove('show');
}

function printReport() {
    const modal = document.getElementById('reportModal');
    modal.classList.add('printing');
    setTimeout(() => {
        window.print();
        setTimeout(() => modal.classList.remove('printing'), 500);
    }, 100);
}

/* ===================== REPORTS ===================== */
function openReportModal() {
    // Default: is mahine ki pehli date se aaj tak
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    document.getElementById('reportFromDate').value = firstDay;
    document.getElementById('reportToDate').value = today;

    document.getElementById('reportModal').classList.add('show');
    showDailyReport();
}
function closeReportModal() {
    document.getElementById('reportModal').classList.remove('show');
}

function showDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const list = salesHistory.filter(s => s.date === today);
    renderReport(list, `📅 Daily Report — ${today}`);
}

function showMonthlyReport() {
    const month = new Date().toISOString().slice(0, 7);
    const list = salesHistory.filter(s => s.date.startsWith(month));
    renderReport(list, `📆 Monthly Report — ${month}`);
}

function showRangeReport() {
    const from = document.getElementById('reportFromDate').value;
    const to = document.getElementById('reportToDate').value;

    if (!from || !to) return alert('From aur To date select karein!');
    if (from > to) return alert('From date, To date se pehle honi chahiye!');

    const list = salesHistory.filter(s => s.date >= from && s.date <= to);
    renderReport(list, `📋 Custom Report — ${from} to ${to}`);
}

function renderReport(list, title) {
    const totalAmount = list.reduce((s, x) => s + x.total, 0);
    const totalOrders = list.length;
    const totalItems = list.reduce((s, x) =>
        s + x.items.reduce((a, i) => a + i.qty, 0), 0);

    // Item-wise breakdown
    const itemBreakdown = {};
    list.forEach(sale => {
        sale.items.forEach(it => {
            if (!itemBreakdown[it.name]) itemBreakdown[it.name] = { qty: 0, revenue: 0 };
            itemBreakdown[it.name].qty += it.qty;
            itemBreakdown[it.name].revenue += it.price * it.qty;
        });
    });

    // Day-wise breakdown
    const dayBreakdown = {};
    list.forEach(sale => {
        if (!dayBreakdown[sale.date]) dayBreakdown[sale.date] = { orders: 0, revenue: 0 };
        dayBreakdown[sale.date].orders += 1;
        dayBreakdown[sale.date].revenue += sale.total;
    });

    let html = `
        <h3>${title}</h3>
        <p><strong>Total Orders:</strong> ${totalOrders}</p>
        <p><strong>Total Items Sold:</strong> ${totalItems}</p>
        <p><strong>Total Revenue:</strong> Rs. ${totalAmount.toLocaleString()}</p>
        <hr>
        <h4>Item-wise Sales:</h4>
        <table>
            <tr><th>Item</th><th>Qty</th><th>Revenue</th></tr>
    `;

    if (Object.keys(itemBreakdown).length === 0) {
        html += `<tr><td colspan="3" style="text-align:center;">No sales</td></tr>`;
    } else {
        Object.keys(itemBreakdown).sort().forEach(name => {
            const d = itemBreakdown[name];
            html += `<tr>
                <td>${esc(name)}</td>
                <td>${d.qty}</td>
                <td>Rs. ${d.revenue.toLocaleString()}</td>
            </tr>`;
        });
    }
    html += `</table>`;

    // Day-wise (only if multiple days)
    if (Object.keys(dayBreakdown).length > 1) {
        html += `<hr><h4>Day-wise Sales:</h4>
            <table><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr>`;
        Object.keys(dayBreakdown).sort().forEach(date => {
            const d = dayBreakdown[date];
            html += `<tr>
                <td>${date}</td>
                <td>${d.orders}</td>
                <td>Rs. ${d.revenue.toLocaleString()}</td>
            </tr>`;
        });
        html += `</table>`;
    }

    document.getElementById('reportContent').innerHTML = html;
}

/* ===================== FIND RECEIPT ===================== */
function openFindReceiptModal() {
    document.getElementById('findDate').value = '';
    document.getElementById('findReceiptNo').value = '';
    document.getElementById('findCustomerName').value = '';
    document.getElementById('findReceiptResults').innerHTML =
        '<p style="text-align:center; color:#95a5a6;">Filters lagayen aur Search dabayen</p>';
    document.getElementById('findReceiptModal').classList.add('show');
}
function closeFindReceiptModal() {
    document.getElementById('findReceiptModal').classList.remove('show');
}

function clearReceiptSearch() {
    document.getElementById('findDate').value = '';
    document.getElementById('findReceiptNo').value = '';
    document.getElementById('findCustomerName').value = '';
    document.getElementById('findReceiptResults').innerHTML =
        '<p style="text-align:center; color:#95a5a6;">Filters lagayen aur Search dabayen</p>';
}

function searchReceipts() {
    const date = document.getElementById('findDate').value;
    const rno = document.getElementById('findReceiptNo').value.trim();
    const cname = document.getElementById('findCustomerName').value.trim().toLowerCase();

    let results = salesHistory;

    if (date) results = results.filter(s => s.date === date);
    if (rno) results = results.filter(s => String(s.receiptNo).includes(rno));
    if (cname) results = results.filter(s =>
        (s.customerName || '').toLowerCase().includes(cname));

    // Sort by newest first
    results = results.sort((a, b) => b.id - a.id);

    const container = document.getElementById('findReceiptResults');

    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#e74c3c; padding:20px;">❌ Koi receipt nahi mili. Filters change karein.</p>';
        return;
    }

    container.innerHTML = results.map(s => `
        <div class="find-receipt-card" onclick="viewReceipt(${s.id})">
            <div class="rc-top">
                <span>Receipt #${s.receiptNo}</span>
                <span>Rs. ${s.total.toFixed(2)}</span>
            </div>
            <div class="rc-meta">
                <span>📅 ${s.date}</span>
                <span>🕐 ${s.time}</span>
                <span>👤 ${esc(s.customerName)}</span>
                <span>🍽️ ${esc(s.tableNo)}</span>
            </div>
            <div class="rc-total">${s.items.length} item(s) • ${s.items.reduce((a, i) => a + i.qty, 0)} qty</div>
        </div>
    `).join('');
}

function viewReceipt(saleId) {
    const sale = salesHistory.find(s => s.id === saleId);
    if (!sale) return alert('Receipt nahi mili!');

    document.getElementById('viewReceiptContent').innerHTML = buildReceiptHTML(sale);
    document.getElementById('viewReceiptModal').classList.add('show');
}

/* ===================== UTILS ===================== */
function esc(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escAttr(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function logout() {
    if (confirm('Logout karein?')) location.reload();
}

/* ===================== INIT ===================== */
function init() {
    loadData();
    updateDateTime();
    renderCategories();
    renderItems();
    renderCart();
    updateDashboard();

    // Default dates for range picker
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    document.getElementById('reportFromDate').value = firstDay;
    document.getElementById('reportToDate').value = today;

    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => {
            if (e.target === m) m.classList.remove('show');
        });
    });
}

window.addEventListener('DOMContentLoaded', init);
