// script.js - Main Application Logic with Price Fixes
console.log('📱 Arijeem Insight 360 - Loading with Fixed Prices...');

// Global variables
let currentUser = null;
let currentStep = 1;
let selectedRole = null;
let sessionTimer = null;
let currentDashboard = null;
let lastCalculatedPrice = 0; // Prevent double calculations

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application starting with price fixes...');
    
    const loadingMessage = document.getElementById('loadingMessage');
    const dbStatus = document.getElementById('databaseStatus');
    
    if (loadingMessage) loadingMessage.textContent = 'Loading with price corrections...';
    if (dbStatus) dbStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing fixed database...';
    
    let dbCheckCount = 0;
    const dbCheckInterval = setInterval(() => {
        dbCheckCount++;
        
        if (window.database) {
            clearInterval(dbCheckInterval);
            console.log('✅ Database module detected');
            
            setTimeout(async () => {
                try {
                    if (window.database.isConnected) {
                        if (dbStatus) {
                            dbStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981"></i> ✅ Connected with price fixes!';
                        }
                        
                        const isSetup = await window.database.checkSystemSetup();
                        
                        setTimeout(() => {
                            const loadingScreen = document.getElementById('loadingScreen');
                            const mainContainer = document.getElementById('mainContainer');
                            
                            if (loadingScreen) loadingScreen.style.display = 'none';
                            if (mainContainer) mainContainer.style.display = 'block';
                            
                            if (isSetup) {
                                showLoginScreen();
                                showToast('✅ System ready with corrected prices.', 'info');
                            } else {
                                showSetupScreen();
                                showToast('🔄 First-time setup required.', 'info');
                            }
                            
                            updateClock();
                            setInterval(updateClock, 1000);
                            
                        }, 1000);
                        
                    } else {
                        if (dbStatus) {
                            dbStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f59e0b"></i> Database connection failed';
                        }
                        
                        setTimeout(() => {
                            const loadingScreen = document.getElementById('loadingScreen');
                            const mainContainer = document.getElementById('mainContainer');
                            
                            if (loadingScreen) loadingScreen.style.display = 'none';
                            if (mainContainer) mainContainer.style.display = 'block';
                            
                            showSetupScreen();
                            showToast('⚠️ Running in limited mode.', 'warning');
                        }, 1500);
                    }
                } catch (error) {
                    console.error('❌ Initialization error:', error);
                    
                    setTimeout(() => {
                        const loadingScreen = document.getElementById('loadingScreen');
                        const mainContainer = document.getElementById('mainContainer');
                        
                        if (loadingScreen) loadingScreen.style.display = 'none';
                        if (mainContainer) mainContainer.style.display = 'block';
                        
                        showSetupScreen();
                        showToast('System loaded with offline mode.', 'info');
                    }, 1500);
                }
            }, 2000);
            
        } else if (dbCheckCount > 20) {
            clearInterval(dbCheckInterval);
            console.warn('⚠️ Database module not loaded');
            
            setTimeout(() => {
                const loadingScreen = document.getElementById('loadingScreen');
                const mainContainer = document.getElementById('mainContainer');
                
                if (loadingScreen) loadingScreen.style.display = 'none';
                if (mainContainer) mainContainer.style.display = 'block';
                
                showSetupScreen();
                showToast('Using offline mode.', 'info');
            }, 1000);
        }
    }, 500);
});

// ===== SETUP FUNCTIONS =====
function showSetupScreen() {
    const screens = [
        'setupScreen',
        'loginScreen',
        'generalManagerDashboard',
        'adminDashboard',
        'salesDashboard'
    ];
    
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) screen.style.display = screenId === 'setupScreen' ? 'block' : 'none';
    });
    
    goToStep(1);
}

function showLoginScreen() {
    const screens = [
        'setupScreen',
        'loginScreen',
        'generalManagerDashboard',
        'adminDashboard',
        'salesDashboard'
    ];
    
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) screen.style.display = screenId === 'loginScreen' ? 'block' : 'none';
    });
    
    selectedRole = null;
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.style.borderColor = '';
        btn.style.background = '';
    });
}

function goToStep(step) {
    document.querySelectorAll('.setup-step').forEach(el => {
        el.classList.remove('active');
    });
    
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = step;
    }
}

function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const icon = field.parentElement.querySelector('.toggle-password i');
    if (!icon) return;
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

async function completeSetup() {
    console.log('🔄 Starting system setup...');
    
    const gmName = document.getElementById('gmName').value;
    const gmEmail = document.getElementById('gmEmail').value;
    const gmPassword = document.getElementById('gmPassword').value;
    const gmConfirm = document.getElementById('gmConfirmPassword').value;
    const entryCode = document.getElementById('entryCode').value;
    const stockCode = document.getElementById('stockCode').value;
    const overrideCode = document.getElementById('overrideCode').value;
    
    if (!gmName || !gmEmail || !gmPassword || !gmConfirm || !entryCode || !stockCode || !overrideCode) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (gmPassword !== gmConfirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (entryCode.length !== 4 || !/^\d+$/.test(entryCode)) {
        showToast('Entry code must be 4 digits', 'error');
        return;
    }
    
    if (stockCode.length !== 6 || !/^\d+$/.test(stockCode)) {
        showToast('Stock code must be 6 digits', 'error');
        return;
    }
    
    if (overrideCode.length !== 8 || !/^\d+$/.test(overrideCode)) {
        showToast('Override code must be 8 digits', 'error');
        return;
    }
    
    showToast('Creating system accounts...', 'info');
    
    try {
        const gmData = {
            name: gmName,
            email: gmEmail,
            password: gmPassword,
            entryCode: entryCode,
            stockCode: stockCode,
            overrideCode: overrideCode
        };
        
        const gmUser = await window.database.createCEOUser(gmData);
        
        if (!gmUser || !gmUser.id) {
            throw new Error('Failed to create General Manager');
        }
        
        console.log('✅ General Manager created');
        showToast(`✅ General Manager account created: ${gmUser.email}`, 'success');
        
        const usersToCreate = [
            {
                role: 'Admin',
                email: document.getElementById('adminEmail').value,
                name: document.getElementById('adminName').value,
                password: document.getElementById('adminPassword').value,
                entryCode: entryCode,
                stockCode: stockCode
            },
            {
                role: 'Sales Management',
                email: document.getElementById('salesEmail').value,
                name: document.getElementById('salesName').value,
                password: document.getElementById('salesPassword').value,
                entryCode: entryCode
            }
        ];
        
        console.log('📝 Creating team accounts...');
        
        let createdCount = 0;
        for (const userData of usersToCreate) {
            try {
                if (!userData.email || !userData.name || !userData.password) {
                    continue;
                }
                
                const result = await window.database.createUser(userData);
                if (result) {
                    createdCount++;
                    console.log(`✅ Created ${userData.role}: ${userData.email}`);
                }
            } catch (userError) {
                console.warn(`⚠️ Could not create ${userData.role}:`, userError.message);
            }
        }
        
        showToast(`✅ System setup complete! Created ${createdCount + 1} accounts.`, 'success');
        
        setTimeout(() => {
            showLoginScreen();
            selectRole('General Manager');
            
            document.getElementById('loginEmail').value = gmEmail;
            document.getElementById('loginPassword').value = gmPassword;
            document.getElementById('loginEntryCode').value = entryCode;
            document.getElementById('loginStockCode').value = stockCode;
            document.getElementById('loginOverrideCode').value = overrideCode;
            
            showToast('General Manager credentials pre-filled.', 'info');
        }, 2000);
        
    } catch (error) {
        console.error('❌ Setup error:', error);
        showToast(`Setup failed: ${error.message}`, 'error');
    }
}

// ===== LOGIN FUNCTIONS =====
function selectRole(role) {
    selectedRole = role;
    
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.style.borderColor = '';
        btn.style.background = '';
    });
    
    const selectedBtn = document.querySelector(`.role-btn.${role.toLowerCase().replace(' ', '-')}`);
    if (selectedBtn) {
        const color = role === 'General Manager' ? 'gold' : 
                     role === 'Admin' ? '#004B93' : '#8b5cf6';
        const bg = role === 'General Manager' ? '#fff9db' : 
                   role === 'Admin' ? '#eff6ff' : '#f5f3ff';
        
        selectedBtn.style.borderColor = color;
        selectedBtn.style.background = bg;
    }
    
    const stockInput = document.querySelector('.stock-code-input');
    const overrideInput = document.querySelector('.override-code-input');
    
    if (stockInput) stockInput.style.display = 'none';
    if (overrideInput) overrideInput.style.display = 'none';
    
    if (role === 'General Manager') {
        if (stockInput) stockInput.style.display = 'block';
        if (overrideInput) overrideInput.style.display = 'block';
    } else if (role === 'Admin') {
        if (stockInput) stockInput.style.display = 'block';
    }
    
    showToast(`${role} access selected`, 'info');
}

async function login() {
    if (!selectedRole) {
        showToast('Please select a role first', 'error');
        return;
    }
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const entryCode = document.getElementById('loginEntryCode').value;
    const stockCode = document.getElementById('loginStockCode')?.value || '';
    const overrideCode = document.getElementById('loginOverrideCode')?.value || '';
    
    if (!email || !password || !entryCode) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    showToast('Authenticating...', 'info');
    
    try {
        const result = await window.database.verifyLogin(email, password, entryCode);
        
        if (!result.success) {
            showToast(`Login failed: ${result.message}`, 'error');
            return;
        }
        
        if (selectedRole === 'General Manager') {
            if (!overrideCode || result.user.override_code !== overrideCode) {
                showToast('Invalid override code', 'error');
                return;
            }
        } else if (selectedRole === 'Admin') {
            if (!stockCode || result.user.stock_code !== stockCode) {
                showToast('Invalid stock code', 'error');
                return;
            }
        }
        
        currentUser = result.user;
        
        showToast(`✅ Welcome ${currentUser.name}!`, 'success');
        
        setTimeout(() => {
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen) loginScreen.style.display = 'none';
            
            if (selectedRole === 'General Manager') {
                currentDashboard = 'generalManager';
                const gmDashboard = document.getElementById('generalManagerDashboard');
                if (gmDashboard) {
                    gmDashboard.style.display = 'block';
                    loadGeneralManagerDashboard();
                }
            } else if (selectedRole === 'Admin') {
                currentDashboard = 'admin';
                const adminDashboard = document.getElementById('adminDashboard');
                if (adminDashboard) {
                    adminDashboard.style.display = 'block';
                    loadAdminDashboard();
                }
            } else if (selectedRole === 'Sales Management') {
                currentDashboard = 'sales';
                const salesDashboard = document.getElementById('salesDashboard');
                if (salesDashboard) {
                    salesDashboard.style.display = 'block';
                    loadSalesDashboard();
                }
            }
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(`Login error: ${error.message}`, 'error');
    }
}

// ===== FIXED: UPDATE SALE PRICE FUNCTION =====
async function updateSalePrice() {
    const productSelect = document.getElementById('saleProduct');
    const saleType = document.getElementById('saleType').value;
    const unitPriceInput = document.getElementById('saleUnitPrice');
    const productId = productSelect.value;
    
    if (!productId) {
        unitPriceInput.value = '';
        updateSaleTotal();
        return;
    }
    
    try {
        const product = await window.database.getProductById(productId);
        
        if (product) {
            let price = 0;
            
            if (saleType === 'RETAIL' || saleType === 'RETAIL_CAN') {
                price = product.retail_price;
            } else if (saleType === 'WHOLESALE' || saleType === 'WHOLESALE_CAN') {
                price = product.wholesale_price;
            }
            
            // Prevent unnecessary updates
            if (parseFloat(unitPriceInput.value) !== price) {
                unitPriceInput.value = price;
                lastCalculatedPrice = price;
                updateSaleTotal();
            }
        }
    } catch (error) {
        console.error('Error fetching price:', error);
        // Fallback defaults
        if (saleType.includes('RETAIL')) {
            unitPriceInput.value = 4400;
        } else if (saleType.includes('WHOLESALE')) {
            unitPriceInput.value = 4200;
        }
        updateSaleTotal();
    }
}

// ===== FIXED: UPDATE SALE TOTAL =====
function updateSaleTotal() {
    const quantity = document.getElementById('saleQuantity').value;
    const unitPrice = document.getElementById('saleUnitPrice').value;
    const totalInput = document.getElementById('saleTotalAmount');
    
    const quantityNum = parseFloat(quantity);
    const unitPriceNum = parseFloat(unitPrice);
    
    if (!isNaN(quantityNum) && !isNaN(unitPriceNum)) {
        const total = quantityNum * unitPriceNum;
        
        // Only update if calculation changed
        if (parseFloat(totalInput.value) !== total) {
            totalInput.value = total.toFixed(2);
        }
    }
}

// ===== FIXED: SUBMIT SALE =====
async function submitSale() {
    const productId = document.getElementById('saleProduct').value;
    const quantity = document.getElementById('saleQuantity').value;
    const saleType = document.getElementById('saleType').value;
    const unitPrice = document.getElementById('saleUnitPrice').value;
    const customerName = document.getElementById('saleCustomer').value;
    
    if (!productId || !quantity || !unitPrice) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    showToast('Processing sale...', 'info');
    
    try {
        const result = await window.database.processSale({
            product_id: productId,
            quantity: quantityNum,
            customer_name: customerName || null,
            sold_by: currentUser.id
        });
        
        if (result.success) {
            const total = result.price_info.total_price;
            showToast(`✅ Sale recorded: ₦${total.toLocaleString()}`, 'success');
            
            // Clear form
            document.getElementById('saleProduct').value = '';
            document.getElementById('saleQuantity').value = '1';
            document.getElementById('saleUnitPrice').value = '';
            document.getElementById('saleTotalAmount').value = '';
            document.getElementById('saleCustomer').value = '';
            
            closeForm('recordSaleForm');
            refreshCurrentDashboard();
        } else {
            showToast(`Failed: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ===== DASHBOARD FUNCTIONS =====
async function loadGeneralManagerDashboard() {
    if (currentUser) {
        const userName = document.getElementById('gmUserName');
        const userEmail = document.getElementById('gmUserEmail');
        const userIdText = document.getElementById('userIdText');
        
        if (userName) userName.textContent = currentUser.name;
        if (userEmail) userEmail.textContent = currentUser.email;
        if (userIdText) userIdText.textContent = currentUser.id ? 
            currentUser.id.substring(0, 8) + '...' : 'Unknown';
    }
    
    await loadDashboardData();
    startSessionTimer();
    loadSalesChart('salesChart');
}

async function loadAdminDashboard() {
    if (currentUser) {
        const userName = document.getElementById('adminUserName');
        const userEmail = document.getElementById('adminUserEmail');
        const userIdText = document.getElementById('adminIdText');
        
        if (userName) userName.textContent = currentUser.name;
        if (userEmail) userEmail.textContent = currentUser.email;
        if (userIdText) userIdText.textContent = currentUser.id ? 
            currentUser.id.substring(0, 8) + '...' : 'Unknown';
    }
    
    await loadAdminDashboardData();
    startAdminSessionTimer();
    loadSalesChart('adminSalesChart');
}

async function loadSalesDashboard() {
    if (currentUser) {
        const userName = document.getElementById('salesUserName');
        const userEmail = document.getElementById('salesUserEmail');
        
        if (userName) userName.textContent = currentUser.name;
        if (userEmail) userEmail.textContent = currentUser.email;
    }
    
    await loadSalesDashboardData();
    startSalesSessionTimer();
    loadSalesChart('salesManagementChart');
}

async function loadDashboardData() {
    try {
        const stats = await window.database.getDashboardStats();
        const userCount = await window.database.getActiveUserCount();
        
        const quickStatsElement = document.getElementById('gmQuickStats');
        if (quickStatsElement) {
            quickStatsElement.innerHTML = `
                <div class="stat-card blue">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <h3>Today's Sales</h3>
                        <p class="stat-value">₦ ${stats.todaySales.toLocaleString()}</p>
                        <p class="stat-change neutral">Corrected prices</p>
                    </div>
                </div>
                <div class="stat-card red">
                    <i class="fas fa-boxes"></i>
                    <div>
                        <h3>Stock Value</h3>
                        <p class="stat-value">₦ ${stats.totalStockValue.toLocaleString()}</p>
                        <p class="stat-change neutral">${stats.totalItems} items</p>
                    </div>
                </div>
                <div class="stat-card green">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <h3>Low Stock</h3>
                        <p class="stat-value">${stats.lowStockCount}</p>
                        <p class="stat-change ${stats.lowStockCount > 0 ? 'negative' : 'positive'}">
                            ${stats.lowStockCount > 0 ? 'Check' : 'Good'}
                        </p>
                    </div>
                </div>
                <div class="stat-card purple">
                    <i class="fas fa-users"></i>
                    <div>
                        <h3>Active Users</h3>
                        <p class="stat-value">${userCount}</p>
                        <p class="stat-change positive">Database</p>
                    </div>
                </div>
            `;
        }
        
        const lowStockList = document.getElementById('lowStockList');
        if (lowStockList) {
            if (stats.lowStockItems && stats.lowStockItems.length > 0) {
                lowStockList.innerHTML = stats.lowStockItems.map(item => `
                    <div class="stock-item">
                        <div class="stock-info">
                            <strong>${item.name}</strong>
                            <p>Current: ${item.current_qty} units • Min: ${item.min_qty}</p>
                        </div>
                        <button class="btn-stock-action" onclick="quickRestock('${item.id}', '${item.name}')">
                            <i class="fas fa-plus"></i> Restock
                        </button>
                    </div>
                `).join('');
            } else {
                lowStockList.innerHTML = '<p class="no-alerts">No low stock alerts</p>';
            }
        }
        
        const activities = await window.database.getRecentActivities(5);
        const activityList = document.getElementById('gmActivityList');
        if (activityList) {
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon info">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div>
                            <p><strong>${activity.reason || 'Stock update'}</strong></p>
                            <small>${new Date(activity.timestamp).toLocaleTimeString()}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
            }
        }
        
        const userCountStatus = document.getElementById('userCountStatus');
        if (userCountStatus) {
            userCountStatus.textContent = `${userCount} Users`;
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading data', 'error');
    }
}

async function loadAdminDashboardData() {
    try {
        const stats = await window.database.getDashboardStats();
        const quickStatsElement = document.getElementById('adminQuickStats');
        if (quickStatsElement) {
            quickStatsElement.innerHTML = `
                <div class="stat-card blue">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <h3>Today's Sales</h3>
                        <p class="stat-value">₦ ${stats.todaySales.toLocaleString()}</p>
                    </div>
                </div>
                <div class="stat-card red">
                    <i class="fas fa-boxes"></i>
                    <div>
                        <h3>Total Stock</h3>
                        <p class="stat-value">${stats.totalItems} items</p>
                    </div>
                </div>
                <div class="stat-card green">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <h3>Low Stock</h3>
                        <p class="stat-value">${stats.lowStockCount}</p>
                    </div>
                </div>
            `;
        }
        
        const lowStockList = document.getElementById('adminLowStockList');
        if (lowStockList) {
            if (stats.lowStockItems && stats.lowStockItems.length > 0) {
                lowStockList.innerHTML = stats.lowStockItems.map(item => `
                    <div class="stock-item">
                        <div class="stock-info">
                            <strong>${item.name}</strong>
                            <p>Current: ${item.current_qty} units</p>
                        </div>
                    </div>
                `).join('');
            } else {
                lowStockList.innerHTML = '<p class="no-alerts">No low stock alerts</p>';
            }
        }
        
        const activities = await window.database.getRecentActivities(3);
        const activityList = document.getElementById('adminActivityList');
        if (activityList) {
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon info">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div>
                            <p><strong>${activity.product_name}</strong></p>
                            <small>${activity.change_type} • ${activity.quantity} units</small>
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
            }
        }
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

async function loadSalesDashboardData() {
    try {
        const stats = await window.database.getDashboardStats();
        const quickStatsElement = document.getElementById('salesQuickStats');
        if (quickStatsElement) {
            quickStatsElement.innerHTML = `
                <div class="stat-card blue">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <h3>Today's Sales</h3>
                        <p class="stat-value">₦ ${stats.todaySales.toLocaleString()}</p>
                    </div>
                </div>
                <div class="stat-card green">
                    <i class="fas fa-shopping-cart"></i>
                    <div>
                        <h3>Products</h3>
                        <p class="stat-value">${stats.totalProducts} items</p>
                    </div>
                </div>
            `;
        }
        
        const recentSales = await window.database.getRecentSales(5);
        const activityList = document.getElementById('salesActivityList');
        if (activityList) {
            if (recentSales && recentSales.length > 0) {
                activityList.innerHTML = recentSales.map(sale => `
                    <div class="activity-item">
                        <div class="activity-icon success">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div>
                            <p><strong>${sale.product_name}</strong></p>
                            <small>₦${sale.total_amount} • ${sale.quantity} units</small>
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = '<p class="no-activity">No recent sales</p>';
            }
        }
        
    } catch (error) {
        console.error('Error loading sales dashboard:', error);
    }
}

function loadSalesChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    const data = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Sales (₦)',
            data: [125000, 189000, 210000, 287500, 240000, 320000, 275000],
            borderColor: '#004B93',
            backgroundColor: 'rgba(0, 75, 147, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    };
    
    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '₦' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₦' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// ===== FORM MANAGEMENT =====
function showAddStockForm() {
    closeAllForms();
    const form = document.getElementById('addStockForm');
    form.style.display = 'flex';
    loadProductsIntoSelect('addStockProduct');
}

function showRecordSaleForm() {
    closeAllForms();
    const form = document.getElementById('recordSaleForm');
    form.style.display = 'flex';
    loadProductsIntoSelect('saleProduct');
}

function showOverridePriceForm() {
    if (currentUser.role !== 'General Manager') {
        showToast('Only General Manager can override prices', 'error');
        return;
    }
    
    closeAllForms();
    const form = document.getElementById('overridePriceForm');
    form.style.display = 'flex';
    loadProductsIntoSelect('overrideProduct');
}

function showGenerateReport() {
    closeAllForms();
    const form = document.getElementById('generateReportForm');
    form.style.display = 'flex';
    
    const periodSelect = document.getElementById('reportPeriod');
    const dateRangeDiv = document.getElementById('customDateRange');
    
    periodSelect.onchange = function() {
        dateRangeDiv.style.display = this.value === 'custom' ? 'block' : 'none';
    };
}

function showUserManagement() {
    closeAllForms();
    const form = document.getElementById('userManagementForm');
    form.style.display = 'flex';
    loadUsersList();
}

function showProductManagement() {
    closeAllForms();
    const form = document.getElementById('productManagementForm');
    form.style.display = 'flex';
    loadProductList();
}

function closeForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.style.display = 'none';
}

function closeAllForms() {
    const forms = [
        'addStockForm',
        'recordSaleForm', 
        'overridePriceForm',
        'generateReportForm',
        'userManagementForm',
        'productManagementForm'
    ];
    
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.style.display = 'none';
    });
}

// ===== OTHER FORM SUBMISSIONS =====
async function submitAddStock() {
    const productId = document.getElementById('addStockProduct').value;
    const quantity = document.getElementById('addStockQuantity').value;
    const reason = document.getElementById('addStockReason').value;
    
    if (!productId || !quantity || quantity <= 0) {
        showToast('Please select product and enter valid quantity', 'error');
        return;
    }
    
    try {
        const result = await window.database.addStockToProduct(
            productId, 
            parseInt(quantity), 
            currentUser.id,
            reason || `Stock added by ${currentUser.name}`
        );
        
        if (result.success) {
            showToast(`✅ Added ${quantity} units to ${result.productName}`, 'success');
            closeForm('addStockForm');
            refreshCurrentDashboard();
        } else {
            showToast(`Failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function submitPriceOverride() {
    const securityCode = document.getElementById('overrideSecurityCode').value;
    const productId = document.getElementById('overrideProduct').value;
    const newRetail = document.getElementById('overrideRetailPrice').value;
    const newWholesale = document.getElementById('overrideWholesalePrice').value;
    const reason = document.getElementById('overrideReason').value;
    
    if (!securityCode || securityCode !== currentUser.override_code) {
        showToast('Invalid override code', 'error');
        return;
    }
    
    if (!productId || !newRetail || !newWholesale || !reason) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (parseFloat(newWholesale) > parseFloat(newRetail)) {
        showToast('Wholesale price cannot be higher than retail price', 'error');
        return;
    }
    
    showToast('Overriding price...', 'info');
    // Implementation would go here
    showToast('Price override would update database', 'info');
    closeForm('overridePriceForm');
}

async function generateReportNow() {
    const period = document.getElementById('reportPeriod').value;
    const reportType = document.getElementById('reportType').value;
    const exportFormat = document.querySelector('input[name="exportFormat"]:checked').value;
    
    showToast(`Generating ${reportType} report...`, 'info');
    
    setTimeout(() => {
        if (exportFormat === 'print') {
            window.print();
            showToast('Report sent to printer', 'success');
        } else if (exportFormat === 'csv') {
            downloadCSVReport();
            showToast('CSV report downloaded', 'success');
        } else if (exportFormat === 'pdf') {
            showToast('PDF generation would require additional library', 'info');
        }
        
        closeForm('generateReportForm');
    }, 2000);
}

async function addNewUser() {
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const role = document.getElementById('newUserRole').value;
    const password = document.getElementById('newUserPassword').value;
    
    if (!name || !email || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    const entryCode = currentUser.entry_code;
    const stockCode = role === 'Admin' ? currentUser.stock_code : null;
    
    try {
        const result = await window.database.createUser({
            name: name,
            email: email,
            role: role,
            password: password,
            entryCode: entryCode,
            stockCode: stockCode
        });
        
        if (result) {
            showToast(`✅ ${role} user ${email} created`, 'success');
            loadUsersList();
            
            document.getElementById('newUserName').value = '';
            document.getElementById('newUserEmail').value = '';
            document.getElementById('newUserPassword').value = '';
        }
    } catch (error) {
        showToast(`Error creating user: ${error.message}`, 'error');
    }
}

// ===== UTILITY FUNCTIONS =====
async function loadProductsIntoSelect(selectId) {
    try {
        const products = await window.database.getAllProducts();
        const select = document.getElementById(selectId);
        
        if (select && products) {
            select.innerHTML = '<option value="">Select product...</option>' +
                products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.current_qty})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadUsersList() {
    try {
        const users = await window.database.getAllUsers();
        const usersTable = document.getElementById('usersTable');
        
        if (usersTable && users) {
            usersTable.innerHTML = `
                <div class="user-row user-row-header">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Role</div>
                    <div>Status</div>
                </div>
                ${users.map(user => `
                    <div class="user-row">
                        <div>${user.name}</div>
                        <div>${user.email}</div>
                        <div>${user.role}</div>
                        <div>${user.is_active ? '<span class="success-text">Active</span>' : '<span class="error-text">Inactive</span>'}</div>
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadProductList() {
    try {
        const products = await window.database.getAllProducts();
        const productsTable = document.getElementById('productsTable');
        
        if (productsTable && products) {
            productsTable.innerHTML = `
                <div class="product-row product-row-header">
                    <div>Product Name</div>
                    <div>Stock</div>
                    <div>Retail Price</div>
                    <div>Wholesale</div>
                </div>
                ${products.map(product => `
                    <div class="product-row">
                        <div><strong>${product.name}</strong><br><small>${product.sku}</small></div>
                        <div>${product.current_qty} units</div>
                        <div>₦${product.retail_price}</div>
                        <div>₦${product.wholesale_price}</div>
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function quickRestock(productId, productName) {
    const quantity = prompt(`How many units to add to ${productName}?`, "50");
    
    if (!quantity || isNaN(quantity) || quantity <= 0) {
        showToast('Invalid quantity', 'error');
        return;
    }
    
    try {
        const result = await window.database.addStockToProduct(
            productId, 
            parseInt(quantity), 
            currentUser.id,
            `Quick restock by ${currentUser.name}`
        );
        
        if (result.success) {
            showToast(`✅ Added ${quantity} units to ${productName}`, 'success');
            refreshCurrentDashboard();
        } else {
            showToast(`Failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function refreshCurrentDashboard() {
    if (currentDashboard === 'generalManager') {
        loadGeneralManagerDashboard();
    } else if (currentDashboard === 'admin') {
        loadAdminDashboard();
    } else if (currentDashboard === 'sales') {
        loadSalesDashboard();
    }
}

function refreshDashboard() {
    refreshCurrentDashboard();
    showToast('Dashboard refreshed', 'info');
}

function refreshAdminDashboard() {
    loadAdminDashboard();
    showToast('Admin dashboard refreshed', 'info');
}

function refreshSalesDashboard() {
    loadSalesDashboard();
    showToast('Sales dashboard refreshed', 'info');
}

function refreshProductList() {
    loadProductList();
    showToast('Product list refreshed', 'info');
}

function viewSalesReport() {
    showGenerateReport();
    document.getElementById('reportType').value = 'sales';
}

function viewActivityLogs() {
    showToast('Opening activity logs...', 'info');
}

function showAlerts() {
    showToast('Opening alerts...', 'info');
}

function printReport() {
    window.print();
}

function viewProductCatalog() {
    showProductManagement();
}

function downloadCSVReport() {
    const csvContent = "data:text/csv;charset=utf-8,";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== SESSION MANAGEMENT =====
function startSessionTimer() {
    let minutes = 30;
    let seconds = 0;
    
    if (sessionTimer) clearInterval(sessionTimer);
    
    sessionTimer = setInterval(() => {
        seconds--;
        if (seconds < 0) {
            minutes--;
            seconds = 59;
        }
        
        if (minutes < 0) {
            logout();
            clearInterval(sessionTimer);
            return;
        }
        
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function startAdminSessionTimer() {
    let minutes = 30;
    let seconds = 0;
    
    const timer = setInterval(() => {
        seconds--;
        if (seconds < 0) {
            minutes--;
            seconds = 59;
        }
        
        if (minutes < 0) {
            logout();
            clearInterval(timer);
            return;
        }
        
        const timerElement = document.getElementById('adminSessionTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function startSalesSessionTimer() {
    let minutes = 30;
    let seconds = 0;
    
    const timer = setInterval(() => {
        seconds--;
        if (seconds < 0) {
            minutes--;
            seconds = 59;
        }
        
        if (minutes < 0) {
            logout();
            clearInterval(timer);
            return;
        }
        
        const timerElement = document.getElementById('salesSessionTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function logout() {
    if (sessionTimer) clearInterval(sessionTimer);
    
    currentUser = null;
    selectedRole = null;
    currentDashboard = null;
    
    showToast('Logged out successfully', 'info');
    
    const dashboards = [
        'generalManagerDashboard',
        'adminDashboard',
        'salesDashboard'
    ];
    
    dashboards.forEach(dashboardId => {
        const dashboard = document.getElementById(dashboardId);
        if (dashboard) dashboard.style.display = 'none';
    });
    
    closeAllForms();
    showLoginScreen();
}

// ===== TOAST SYSTEM =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="toast-icon ${icons[type] || icons.info}"></i>
        <div class="toast-content">
            <p>${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, 5000);
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timeElements = ['currentTime', 'adminCurrentTime', 'salesCurrentTime'];
    timeElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = timeString;
    });
}

console.log('✅ Main application script loaded with price fixes');
