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
            console.log('🔄 Creating CEO user in database...');
            
            // Validate data
            if (!userData.email || !userData.name || !userData.password) {
                throw new Error('Missing required CEO information');
            }
            
            // Create user object
            const ceoUser = {
                email: userData.email,
                name: userData.name,
                role: 'CEO',
                entry_code: userData.entryCode || '0000',
                stock_code: userData.stockCode || '000000',
                override_code: userData.overrideCode || '00000000',
                password_hash: btoa(userData.password), // Basic encoding
                is_active: true,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            };
            
            console.log('📝 Creating CEO:', ceoUser.email);
            
            // Insert into database
            const { data, error } = await this.supabase
                .from('users')
                .insert([ceoUser])
                .select();
            
            if (error) {
                console.error('❌ CEO creation error:', error);
                throw error;
            }
            
            console.log('✅ CEO user created:', data[0].id);
            return data[0];
            
        } catch (error) {
            console.error('❌ Error creating CEO:', error);
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
            
            // Use provided values
            const user = {
                email: userData.email,
                name: userData.name,
                role: userData.role,
                entry_code: userData.entryCode || '0000',
                stock_code: (userData.role === 'Admin' || userData.role === 'Manager' || userData.role === 'CEO') 
                          ? (userData.stockCode || '000000') : null,
                override_code: userData.role === 'CEO' 
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
            // Don't throw, just return null
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
            const { data: products } = await this.supabase
                .from('products')
                .select('*');
            
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
            const { data: sales } = await this.supabase
                .from('sales')
                .select('total_amount')
                .gte('sale_date', today + 'T00:00:00')
                .lte('sale_date', today + 'T23:59:59');
            
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
}

// Initialize database when page loads
window.addEventListener('load', () => {
    window.database = new Database();
});