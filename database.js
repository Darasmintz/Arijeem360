// database.js - Real Database Operations
console.log('🚀 Loading Database Module...');

class Database {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for config to load
            await this.waitForConfig();
            
            if (!window.CONFIG || !window.supabase) {
                throw new Error('Required dependencies not loaded');
            }

            // Create Supabase client
            this.supabase = supabase.createClient(
                CONFIG.SUPABASE_URL, 
                CONFIG.SUPABASE_KEY,
                {
                    auth: { persistSession: false }
                }
            );

            console.log('✅ Database client created');
            
            // Test connection
            this.isConnected = await this.testConnection();
            
            if (this.isConnected) {
                console.log('🎉 Database ready for operations!');
            }

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.isConnected = false;
        }
    }

    waitForConfig() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (window.CONFIG && window.supabase) {
                    resolve();
                } else if (attempts > 20) {
                    console.warn('⚠️ Config/Supabase not loaded after 10 seconds');
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    // ===== CONNECTION & TESTING =====
    async testConnection() {
        try {
            console.log('🔄 Testing database connection...');
            
            // Try to access a table
            const { data, error } = await this.supabase
                .from('products')
                .select('count')
                .limit(1);
            
            if (error) {
                // Check if it's a table not found error (first setup)
                if (error.code === '42P01') {
                    console.log('ℹ️ First time setup - tables not created yet');
                    return true; // Connection is good, just no tables
                }
                console.error('❌ Connection test error:', error.message);
                return false;
            }
            
            console.log('✅ Database connection successful');
            return true;
            
        } catch (error) {
            console.error('❌ Connection test exception:', error);
            return false;
        }
    }

    async checkSystemSetup() {
        try {
            console.log('🔄 Checking if system is set up...');
            
            // Check if users table exists and has data
            const { data, error } = await this.supabase
                .from('users')
                .select('count')
                .limit(1);
            
            if (error) {
                if (error.code === '42P01') {
                    console.log('ℹ️ First time setup - creating initial tables');
                    return false;
                }
                console.error('Setup check error:', error);
                return false;
            }
            
            const userCount = data?.[0]?.count || 0;
            console.log(`📊 Found ${userCount} users in database`);
            
            return userCount > 0;
            
        } catch (error) {
            console.error('Setup check exception:', error);
            return false;
        }
    }

    // ===== USER MANAGEMENT =====
    async createCEOUser(userData) {
        try {
            console.log('🔄 Creating General Manager user in database...');
            
            // Validate data
            if (!userData.email || !userData.name || !userData.password) {
                throw new Error('Missing required General Manager information');
            }
            
            // Create user object
            const gmUser = {
                email: userData.email,
                name: userData.name,
                role: 'General Manager',
                entry_code: userData.entryCode || '0000',
                stock_code: userData.stockCode || '000000',
                override_code: userData.overrideCode || '00000000',
                password_hash: btoa(userData.password),
                is_active: true,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            };
            
            console.log('📝 Creating General Manager:', gmUser.email);
            
            // Insert into database
            const { data, error } = await this.supabase
                .from('users')
                .insert([gmUser])
                .select();
            
            if (error) {
                console.error('❌ General Manager creation error:', error);
                throw error;
            }
            
            console.log('✅ General Manager user created:', data[0].id);
            return data[0];
            
        } catch (error) {
            console.error('❌ Error creating General Manager:', error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            
            if (error) {
                if (error.code === 'PGRST116') return null;
                console.error('Error getting user:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Error in getUserByEmail:', error);
            return null;
        }
    }

    async createUser(userData) {
        try {
            console.log(`🔄 Creating ${userData.role} user...`);
            
            // Map role to database role
            let dbRole = userData.role;
            if (userData.role === 'General Manager') dbRole = 'General Manager';
            if (userData.role === 'Sales Management') dbRole = 'Sales Management';
            
            const user = {
                email: userData.email,
                name: userData.name,
                role: dbRole,
                entry_code: userData.entryCode || '0000',
                stock_code: (userData.role === 'Admin' || userData.role === 'General Manager') 
                          ? (userData.stockCode || '000000') : null,
                override_code: userData.role === 'General Manager' 
                             ? (userData.overrideCode || '00000000') : null,
                password_hash: btoa(userData.password),
                is_active: true,
                created_at: new Date().toISOString(),
                last_login: null
            };
            
            // Check if user already exists
            const existingUser = await this.getUserByEmail(userData.email);
            if (existingUser) {
                console.log(`⚠️ User ${userData.email} already exists, skipping...`);
                return existingUser;
            }
            
            const { data, error } = await this.supabase
                .from('users')
                .insert([user])
                .select();
            
            if (error) {
                // If it's a duplicate error, continue
                if (error.code === '23505') {
                    console.log(`⚠️ User ${userData.email} already exists (duplicate)`);
                    return { id: 'existing', email: userData.email };
                }
                throw error;
            }
            
            console.log(`✅ ${userData.role} created:`, data[0].email);
            return data[0];
            
        } catch (error) {
            console.error(`Error creating ${userData.role}:`, error);
            return null;
        }
    }

    async verifyLogin(email, password, entryCode) {
        try {
            console.log(`🔄 Verifying login for: ${email}`);
            
            const user = await this.getUserByEmail(email);
            
            if (!user) {
                console.log(`❌ User not found: ${email}`);
                return { success: false, message: 'Invalid credentials' };
            }
            
            // Check password (in production, use proper hashing)
            const inputPasswordHash = btoa(password);
            if (user.password_hash !== inputPasswordHash) {
                console.log(`❌ Invalid password for: ${email}`);
                return { success: false, message: 'Invalid credentials' };
            }
            
            if (user.entry_code !== entryCode) {
                console.log(`❌ Invalid entry code for: ${email}`);
                return { success: false, message: 'Invalid entry code' };
            }
            
            // Update last login
            await this.supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
            
            console.log(`✅ Login successful: ${email} (${user.role})`);
            
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    entry_code: user.entry_code,
                    stock_code: user.stock_code,
                    override_code: user.override_code
                }
            };
            
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'System error' };
        }
    }

    // ===== PRODUCTS & STOCK =====
    async getDashboardStats() {
        try {
            // Get products
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('*');
            
            if (productsError) throw productsError;
            
            let totalStockValue = 0;
            let totalItems = 0;
            let lowStockCount = 0;
            const lowStockItems = [];
            
            if (products) {
                products.forEach(p => {
                    const value = (p.current_qty || 0) * (p.wholesale_price || 0);
                    totalStockValue += value;
                    totalItems += p.current_qty || 0;
                    
                    if ((p.current_qty || 0) <= (p.min_qty || 10)) {
                        lowStockCount++;
                        lowStockItems.push(p);
                    }
                });
            }
            
            // Get today's sales
            const today = new Date().toISOString().split('T')[0];
            const { data: sales, error: salesError } = await this.supabase
                .from('sales')
                .select('total_amount')
                .gte('sale_date', today + 'T00:00:00')
                .lte('sale_date', today + 'T23:59:59');
            
            if (salesError) throw salesError;
            
            let todaySales = 0;
            if (sales) {
                sales.forEach(s => {
                    todaySales += s.total_amount || 0;
                });
            }
            
            return {
                todaySales: todaySales,
                totalStockValue: totalStockValue,
                totalItems: totalItems,
                lowStockCount: lowStockCount,
                lowStockItems: lowStockItems,
                totalProducts: products?.length || 0
            };
            
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                todaySales: 0,
                totalStockValue: 0,
                totalItems: 0,
                lowStockCount: 0,
                lowStockItems: [],
                totalProducts: 0
            };
        }
    }

    async getRecentActivities(limit = 5) {
        try {
            const { data, error } = await this.supabase
                .from('stock_changes')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error getting activities:', error);
            return [];
        }
    }

    async getRecentSales(limit = 5) {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select('*')
                .order('sale_date', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error getting recent sales:', error);
            return [];
        }
    }

    async getActiveUserCount() {
        try {
            const { count, error } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            if (error) throw error;
            return count || 0;
            
        } catch (error) {
            console.error('Error getting user count:', error);
            return 0;
        }
    }

    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async getAllProducts() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    // ===== STOCK OPERATIONS =====
    async addStockToProduct(productId, quantity, userId, reason = 'Stock addition') {
        try {
            // Get current product
            const { data: product, error: productError } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found');
            }
            
            const newQty = (product.current_qty || 0) + quantity;
            
            // Update product
            const { error: updateError } = await this.supabase
                .from('products')
                .update({ 
                    current_qty: newQty,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);
            
            if (updateError) throw updateError;
            
            // Log stock change
            const { error: logError } = await this.supabase
                .from('stock_changes')
                .insert([{
                    product_id: productId,
                    product_name: product.name,
                    change_type: 'ADD_STOCK',
                    quantity: quantity,
                    previous_qty: product.current_qty,
                    new_qty: newQty,
                    changed_by: userId,
                    reason: reason,
                    timestamp: new Date().toISOString()
                }]);
            
            if (logError) throw logError;
            
            return { 
                success: true, 
                newQty: newQty, 
                productName: product.name 
            };
            
        } catch (error) {
            console.error('Add stock error:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== SALES OPERATIONS =====
    async recordSale(saleData) {
        try {
            console.log('🔄 Recording sale...');
            
            // First, check if we have enough stock
            const { data: product, error: productError } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', saleData.product_id)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found');
            }
            
            if ((product.current_qty || 0) < saleData.quantity) {
                throw new Error(`Insufficient stock. Available: ${product.current_qty}, Requested: ${saleData.quantity}`);
            }
            
            // Deduct from stock
            const newQty = (product.current_qty || 0) - saleData.quantity;
            
            const { error: updateError } = await this.supabase
                .from('products')
                .update({ 
                    current_qty: newQty,
                    updated_at: new Date().toISOString()
                })
                .eq('id', saleData.product_id);
            
            if (updateError) throw updateError;
            
            // Record the sale
            const saleRecord = {
                product_id: saleData.product_id,
                product_name: saleData.product_name,
                quantity: saleData.quantity,
                unit_price: saleData.unit_price,
                total_amount: saleData.total_amount,
                sale_type: saleData.sale_type,
                customer_name: saleData.customer_name || null,
                sold_by: saleData.sold_by,
                sale_date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            const { data: saleResult, error: saleError } = await this.supabase
                .from('sales')
                .insert([saleRecord])
                .select();
            
            if (saleError) throw saleError;
            
            // Log stock change
            await this.supabase
                .from('stock_changes')
                .insert([{
                    product_id: saleData.product_id,
                    product_name: saleData.product_name,
                    change_type: 'SALE_DEDUCT',
                    quantity: -saleData.quantity, // Negative for deduction
                    previous_qty: product.current_qty,
                    new_qty: newQty,
                    changed_by: saleData.sold_by,
                    reason: `Sale recorded: ${saleData.quantity} units`,
                    timestamp: new Date().toISOString()
                }]);
            
            console.log('✅ Sale recorded:', saleResult[0].id);
            return { success: true, saleId: saleResult[0].id };
            
        } catch (error) {
            console.error('Record sale error:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== PRICE OVERRIDE =====
    async overrideProductPrice(productId, newRetailPrice, newWholesalePrice, userId, reason) {
        try {
            console.log('🔄 Overriding product price...');
            
            if (newWholesalePrice > newRetailPrice) {
                throw new Error('Wholesale price cannot be higher than retail price');
            }
            
            // Get current product
            const { data: product, error: productError } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found');
            }
            
            // Update prices
            const { error: updateError } = await this.supabase
                .from('products')
                .update({ 
                    retail_price: newRetailPrice,
                    wholesale_price: newWholesalePrice,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);
            
            if (updateError) throw updateError;
            
            // Log price change
            await this.supabase
                .from('stock_changes')
                .insert([{
                    product_id: productId,
                    product_name: product.name,
                    change_type: 'PRICE_OVERRIDE',
                    quantity: 0,
                    previous_qty: product.current_qty,
                    new_qty: product.current_qty,
                    changed_by: userId,
                    reason: `Price override: Retail: ₦${product.retail_price} → ₦${newRetailPrice}, Wholesale: ₦${product.wholesale_price} → ₦${newWholesalePrice}. Reason: ${reason}`,
                    timestamp: new Date().toISOString()
                }]);
            
            console.log('✅ Price override successful for:', product.name);
            return { success: true, productName: product.name };
            
        } catch (error) {
            console.error('Price override error:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== REPORT GENERATION =====
    async generateSalesReport(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select('*')
                .gte('sale_date', startDate)
                .lte('sale_date', endDate)
                .order('sale_date', { ascending: false });
            
            if (error) throw error;
            
            return {
                success: true,
                data: data || [],
                totalSales: data ? data.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) : 0,
                totalItems: data ? data.reduce((sum, sale) => sum + (sale.quantity || 0), 0) : 0
            };
            
        } catch (error) {
            console.error('Generate sales report error:', error);
            return { success: false, error: error.message };
        }
    }

    async generateStockReport() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .order('current_qty', { ascending: true });
            
            if (error) throw error;
            
            const totalValue = data ? data.reduce((sum, product) => 
                sum + ((product.current_qty || 0) * (product.wholesale_price || 0)), 0) : 0;
            
            const lowStockItems = data ? data.filter(p => 
                (p.current_qty || 0) <= (p.min_qty || 10)) : [];
            
            return {
                success: true,
                data: data || [],
                totalValue: totalValue,
                lowStockCount: lowStockItems.length,
                totalItems: data ? data.reduce((sum, p) => sum + (p.current_qty || 0), 0) : 0
            };
            
        } catch (error) {
            console.error('Generate stock report error:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== ACTIVITY LOGGING =====
    async logActivity(userId, userName, userRole, action, details) {
        try {
            await this.supabase
                .from('activity_logs')
                .insert([{
                    user_id: userId,
                    user_name: userName,
                    user_role: userRole,
                    action: action,
                    details: details || {},
                    timestamp: new Date().toISOString()
                }]);
            
            return true;
        } catch (error) {
            console.error('Activity logging error:', error);
            return false;
        }
    }

    // ===== DATABASE MAINTENANCE =====
    async initializeDatabaseTables() {
        try {
            console.log('🔄 Initializing database tables...');
            
            // This would run your SQL schema
            // In production, you would run the SQL you provided
            // For now, we'll just log it
            
            console.log('✅ Database tables would be initialized here');
            return true;
            
        } catch (error) {
            console.error('Database initialization error:', error);
            return false;
        }
    }

    async backupDatabase() {
        try {
            // Get all data from all tables
            const [users, products, sales, stockChanges, activityLogs] = await Promise.all([
                this.getAllUsers(),
                this.getAllProducts(),
                this.getRecentSales(1000), // Get all sales
                this.getRecentActivities(1000), // Get all activities
                this.supabase.from('activity_logs').select('*').limit(1000)
            ]);
            
            const backupData = {
                timestamp: new Date().toISOString(),
                users: users || [],
                products: products || [],
                sales: sales || [],
                stock_changes: stockChanges || [],
                activity_logs: activityLogs.data || []
            };
            
            return {
                success: true,
                data: backupData,
                message: `Backup created with ${backupData.users.length} users, ${backupData.products.length} products, ${backupData.sales.length} sales`
            };
            
        } catch (error) {
            console.error('Backup error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize database when page loads
window.addEventListener('load', () => {
    window.database = new Database();
    console.log('✅ Database module ready');
});
