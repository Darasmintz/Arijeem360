// script.js - Main Application Logic
console.log('📱 Arijeem Insight 360 - Loading...');

// Global variables
let currentUser = null;
let currentStep = 1;
let selectedRole = null;
let sessionTimer = null;

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application starting...');
    
    // Update loading message
    const loadingMessage = document.getElementById('loadingMessage');
    const dbStatus = document.getElementById('databaseStatus');
    
    if (loadingMessage) loadingMessage.textContent = 'Connecting to Database...';
    if (dbStatus) dbStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Establishing database connection...';
    
    // Wait for database module
    let dbCheckCount = 0;
    const dbCheckInterval = setInterval(() => {
        dbCheckCount++;
        
        if (window.database) {
            clearInterval(dbCheckInterval);
            console.log('✅ Database module detected');
            
            // Test connection after short delay
            setTimeout(async () => {
                try {
                    if (window.database.isConnected === undefined) {
                        // Database still initializing
                        console.log('Database still initializing...');
                        if (dbStatus) {
                            dbStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Database initializing...';
                        }
                        return;
                    }
                    
                    if (window.database.isConnected) {
                        if (dbStatus) {
                            dbStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981"></i> ✅ Connected to real database!';
                        }
                        
                        // Check system setup
                        const isSetup = await window.database.checkSystemSetup();
                        
                        // Hide loading screen
                        setTimeout(() => {
                            const loadingScreen = document.getElementById('loadingScreen');
                            const mainContainer = document.getElementById('mainContainer');
                            
                            if (loadingScreen) loadingScreen.style.display = 'none';
                            if (mainContainer) mainContainer.style.display = 'block';
                            
                            // Show appropriate screen
                            if (isSetup) {
                                showLoginScreen();
                                showToast('✅ System ready. Please login.', 'info');
                            } else {
                                showSetupScreen();
                                showToast('🔄 First-time setup required.', 'info');
                            }
                            
                            // Start clock
                            updateClock();
                            setInterval(updateClock, 1000);
                            
                        }, 1000);
                        
                    } else {
                        if (dbStatus) {
                            dbStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f59e0b"></i> Database connection failed';
                        }
                        
                        // Still continue
                        setTimeout(() => {
                            const loadingScreen = document.getElementById('loadingScreen');
                            const mainContainer = document.getElementById('mainContainer');
                            
                            if (loadingScreen) loadingScreen.style.display = 'none';
                            if (mainContainer) mainContainer.style.display = 'block';
                            
                            showSetupScreen();
                            showToast('⚠️ Database not connected. Running in limited mode.', 'warning');
                        }, 1500);
                    }
                } catch (error) {
                    console.error('❌ Initialization error:', error);
                    
                    if (dbStatus) {
                        dbStatus.innerHTML = `<i class="fas fa-times-circle" style="color: #ef4444"></i> Error: ${error.message}`;
                    }
                    
                    setTimeout(() => {
                        const loadingScreen = document.getElementById('loadingScreen');
                        const mainContainer = document.getElementById('mainContainer');
                        
                        if (loadingScreen) loadingScreen.style.display = 'none';
                        if (mainContainer) mainContainer.style.display = 'block';
                        
                        showSetupScreen();
                        showToast('Error connecting to database.', 'error');
                    }, 1500);
                }
            }, 2000);
            
        } else if (dbCheckCount > 20) {
            clearInterval(dbCheckInterval);
            console.error('❌ Database module not loaded after 10 seconds');
            
            if (dbStatus) {
                dbStatus.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444"></i> Database module failed to load';
            }
            
            // Continue anyway
            setTimeout(() => {
                const loadingScreen = document.getElementById('loadingScreen');
                const mainContainer = document.getElementById('mainContainer');
                
                if (loadingScreen) loadingScreen.style.display = 'none';
                if (mainContainer) mainContainer.style.display = 'block';
                
                showSetupScreen();
                showToast('Database module unavailable.', 'error');
            }, 1000);
        }
    }, 500);
});

// ===== SETUP FUNCTIONS =====
function showSetupScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const loginScreen = document.getElementById('loginScreen');
    const ceoDashboard = document.getElementById('ceoDashboard');
    
    if (setupScreen) setupScreen.style.display = 'block';
    if (loginScreen) loginScreen.style.display = 'none';
    if (ceoDashboard) ceoDashboard.style.display = 'none';
    
    goToStep(1);
}

function showLoginScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const loginScreen = document.getElementById('loginScreen');
    const ceoDashboard = document.getElementById('ceoDashboard');
    
    if (setupScreen) setupScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'block';
    if (ceoDashboard) ceoDashboard.style.display = 'none';
    
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
    
    // Collect CEO data
    const ceoName = document.getElementById('ceoName').value;
    const ceoEmail = document.getElementById('ceoEmail').value;
    const ceoPassword = document.getElementById('ceoPassword').value;
    const ceoConfirm = document.getElementById('ceoConfirmPassword').value;
    const entryCode = document.getElementById('entryCode').value;
    const stockCode = document.getElementById('stockCode').value;
    const overrideCode = document.getElementById('overrideCode').value;
    
    // CEO Validation
    if (!ceoName || !ceoEmail || !ceoPassword || !ceoConfirm || !entryCode || !stockCode || !overrideCode) {
        showToast('Please fill all CEO required fields', 'error');
        return;
    }
    
    // Check password match for CEO
    if (ceoPassword !== ceoConfirm) {
        showToast('CEO passwords do not match', 'error');
        return;
    }
    
    // Validate codes
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
        // Create CEO user in REAL DATABASE
        const ceoData = {
            name: ceoName,
            email: ceoEmail,
            password: ceoPassword,
            entryCode: entryCode,
            stockCode: stockCode,
            overrideCode: overrideCode
        };
        
        const ceoUser = await window.database.createCEOUser(ceoData);
        
        if (!ceoUser || !ceoUser.id) {
            throw new Error('Failed to create CEO user');
        }
        
        console.log('✅ CEO created with ID:', ceoUser.id);
        showToast(`✅ CEO account created: ${ceoUser.email}`, 'success');
        
        // Create other users with provided passwords
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
                role: 'Manager',
                email: document.getElementById('managerEmail').value,
                name: document.getElementById('managerName').value,
                password: document.getElementById('managerPassword').value,
                entryCode: entryCode,
                stockCode: stockCode
            },
            {
                role: 'Staff',
                email: document.getElementById('staffEmail').value,
                name: document.getElementById('staffName').value,
                password: document.getElementById('staffPassword').value,
                entryCode: entryCode
            },
            {
                role: 'Customer',
                email: document.getElementById('customerEmail').value,
                name: document.getElementById('customerName').value,
                password: document.getElementById('customerPassword').value,
                entryCode: entryCode
            }
        ];
        
        console.log('📝 Creating team accounts...');
        
        let createdCount = 0;
        for (const userData of usersToCreate) {
            try {
                // Check if all required fields are filled
                if (!userData.email || !userData.name || !userData.password) {
                    console.log(`⚠️ Skipping ${userData.role}: Missing required fields`);
                    continue;
                }
                
                const result = await window.database.createUser(userData);
                if (result) {
                    createdCount++;
                    console.log(`✅ Created ${userData.role}: ${userData.email}`);
                }
            } catch (userError) {
                console.warn(`⚠️ Could not create ${userData.role}:`, userError.message);
                // Continue with other users
            }
        }
        
        showToast(`✅ System setup complete! Created ${createdCount + 1} accounts in database.`, 'success');
        
        // Auto-login as CEO after 2 seconds
        setTimeout(() => {
            showLoginScreen();
            selectRole('CEO');
            
            // Pre-fill CEO credentials
            document.getElementById('loginEmail').value = ceoEmail;
            document.getElementById('loginPassword').value = ceoPassword;
            document.getElementById('loginEntryCode').value = entryCode;
            document.getElementById('loginStockCode').value = stockCode;
            document.getElementById('loginOverrideCode').value = overrideCode;
            
            showToast('CEO credentials pre-filled. Click "Login with Database".', 'info');
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
    
    const selectedBtn = document.querySelector(`.role-btn.${role.toLowerCase()}`);
    if (selectedBtn) {
        const color = role === 'CEO' ? 'gold' : 
                     role === 'Admin' ? '#004B93' : 
                     role === 'Manager' ? '#10b981' : '#8b5cf6';
        const bg = role === 'CEO' ? '#fff9db' : 
                   role === 'Admin' ? '#eff6ff' : 
                   role === 'Manager' ? '#f0fdf4' : '#f5f3ff';
        
        selectedBtn.style.borderColor = color;
        selectedBtn.style.background = bg;
    }
    
    // Show/hide security fields
    const stockInput = document.querySelector('.stock-code-input');
    const overrideInput = document.querySelector('.override-code-input');
    
    if (stockInput) stockInput.style.display = 'none';
    if (overrideInput) overrideInput.style.display = 'none';
    
    if (role === 'CEO') {
        if (stockInput) stockInput.style.display = 'block';
        if (overrideInput) overrideInput.style.display = 'block';
    } else if (role === 'Admin' || role === 'Manager') {
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
    
    showToast('Authenticating with database...', 'info');
    
    try {
        // Verify login against REAL DATABASE
        const result = await window.database.verifyLogin(email, password, entryCode);
        
        if (!result.success) {
            showToast(`Login failed: ${result.message}`, 'error');
            return;
        }
        
        // Additional code checks
        if (selectedRole === 'CEO') {
            if (!overrideCode || result.user.override_code !== overrideCode) {
                showToast('Invalid override code', 'error');
                return;
            }
        } else if (selectedRole === 'Admin' || selectedRole === 'Manager') {
            if (!stockCode || result.user.stock_code !== stockCode) {
                showToast('Invalid stock code', 'error');
                return;
            }
        }
        
        // Set current user
        currentUser = result.user;
        
        showToast(`✅ Welcome ${currentUser.name}! (Database authenticated)`, 'success');
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            const loginScreen = document.getElementById('loginScreen');
            
            if (loginScreen) loginScreen.style.display = 'none';
            
            if (selectedRole === 'CEO') {
                const ceoDashboard = document.getElementById('ceoDashboard');
                if (ceoDashboard) {
                    ceoDashboard.style.display = 'block';
                    loadCEODashboard();
                }
            } else {
                showToast(`${selectedRole} dashboard coming soon`, 'info');
                logout();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(`Login error: ${error.message}`, 'error');
    }
}

// ===== CEO DASHBOARD =====
async function loadCEODashboard() {
    if (currentUser) {
        const userName = document.getElementById('ceoUserName');
        const userEmail = document.getElementById('ceoUserEmail');
        const userIdText = document.getElementById('userIdText');
        
        if (userName) userName.textContent = currentUser.name;
        if (userEmail) userEmail.textContent = currentUser.email;
        if (userIdText) userIdText.textContent = currentUser.id ? 
            currentUser.id.substring(0, 8) + '...' : 'Unknown';
    }
    
    // Load real data from database
    await loadDashboardData();
    
    // Start session timer
    startSessionTimer();
    
    // Load sales chart
    loadSalesChart();
}

async function loadDashboardData() {
    try {
        // Get real stats from database
        const stats = await window.database.getDashboardStats();
        const userCount = await window.database.getActiveUserCount();
        
        // Update quick stats
        const quickStatsElement = document.getElementById('ceoQuickStats');
        if (quickStatsElement) {
            quickStatsElement.innerHTML = `
                <div class="stat-card blue">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <h3>Today's Sales</h3>
                        <p class="stat-value">₦ ${stats.todaySales.toLocaleString()}</p>
                        <p class="stat-change neutral">Real-time data</p>
                    </div>
                </div>
                <div class="stat-card red">
                    <i class="fas fa-boxes"></i>
                    <div>
                        <h3>Total Stock Value</h3>
                        <p class="stat-value">₦ ${stats.totalStockValue.toLocaleString()}</p>
                        <p class="stat-change neutral">${stats.totalItems} items</p>
                    </div>
                </div>
                <div class="stat-card green">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <h3>Low Stock Alerts</h3>
                        <p class="stat-value">${stats.lowStockCount}</p>
                        <p class="stat-change ${stats.lowStockCount > 0 ? 'negative' : 'positive'}">
                            ${stats.lowStockCount > 0 ? 'Needs attention' : 'All good'}
                        </p>
                    </div>
                </div>
                <div class="stat-card purple">
                    <i class="fas fa-users"></i>
                    <div>
                        <h3>Active Users</h3>
                        <p class="stat-value">${userCount}</p>
                        <p class="stat-change positive">Database count</p>
                    </div>
                </div>
            `;
        }
        
        // Update low stock list
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
        
        // Update activity list
        const activities = await window.database.getRecentActivities(5);
        const activityList = document.getElementById('ceoActivityList');
        if (activityList) {
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon info">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div>
                            <p><strong>${activity.reason || 'Stock update'}</strong></p>
                            <small>${new Date(activity.timestamp).toLocaleTimeString()} • ${activity.change_type || 'Unknown'}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
            }
        }
        
        // Update user count display
        const userCountStatus = document.getElementById('userCountStatus');
        if (userCountStatus) {
            userCountStatus.textContent = `${userCount} Users`;
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function loadSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    // Destroy existing chart if any
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

// ===== DASHBOARD ACTIONS =====
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
            loadDashboardData();
        } else {
            showToast(`Failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function addStockModal() {
    showToast('Add Stock feature coming soon', 'info');
}

function generateReport() {
    showToast('Report generation feature coming soon', 'info');
}

function manageUsers() {
    showToast('User management feature coming soon', 'info');
}

function viewProducts() {
    showToast('Product view feature coming soon', 'info');
}

function overrideStock() {
    showToast('CEO override feature coming soon', 'info');
}

function refreshDashboard() {
    showToast('Refreshing dashboard...', 'info');
    loadDashboardData();
}

function viewSalesReport() {
    showToast('Sales report view coming soon', 'info');
}

function viewActivityLogs() {
    showToast('Activity logs view coming soon', 'info');
}

function showAlerts() {
    showToast('Alerts view coming soon', 'info');
}

function printReport() {
    window.print();
}

function exportData() {
    showToast('Export feature coming soon', 'info');
}

// ===== UTILITY FUNCTIONS =====
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
    
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

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

function logout() {
    if (sessionTimer) clearInterval(sessionTimer);
    
    currentUser = null;
    selectedRole = null;
    
    showToast('Logged out successfully', 'info');
    
    const ceoDashboard = document.getElementById('ceoDashboard');
    if (ceoDashboard) ceoDashboard.style.display = 'none';
    
    showLoginScreen();
}

console.log('✅ Main application script loaded');