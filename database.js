// database.js - Real Database Operations with PRICE FIX
console.log('🚀 Loading Database Module with Price Fix...');

class Database {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.priceCache = {}; // Cache to prevent price doubling
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
                // Initialize price cache and fix any doubled prices
                await this.initializePriceCache();
            }

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.isConnected = false;
        }
    }

    // ===== PRICE FIX FUNCTIONS =====
    
    async initializePriceCache() {
        try {
            console.log('🔄 Initializing price cache...');
            
            const { data: products, error } = await this.supabase
                .from('products')
                .select('id, sku, name, retail_price, wholesale_price');
            
            if (error) throw error;
            
            // Cache all products and check for price issues
            products.forEach(product => {
                this.priceCache[product.id] = {
                    retail_price: product.retail_price,
                    wholesale_price: product.wholesale_price,
                    sku: product.sku,
                    name: product.name
                };
                
                // Check and fix Aquafina 75cl price doubling
                if ((product.sku === 'AQUAFINA-75CL' || product.name.includes('Aquafina 75cl')) && 
                    (product.retail_price > 2500 || product.wholesale_price > 2500)) {
                    
                    console.log('⚠️ Detected doubled price for Aquafina 75cl:', product.retail_price, product.wholesale_price);
                    this.fixAquafinaPrice(product.id);
                }
            });
            
            console.log(`✅ Price cache initialized with ${products.length} products`);
            
        } catch (error) {
            console.error('❌ Price cache initialization error:', error);
        }
    }
    
    async fixAquafinaPrice(productId) {
        try {
            console.log('🔧 Fixing Aquafina 75cl price doubling...');
            
            const { error } = await this.supabase
                .from('products')
                .update({
                    retail_price: 2200,
                    wholesale_price: 2150,
                    last_updated: new Date().toISOString()
                })
                .eq('id', productId);
            
            if (!error) {
                console.log('✅ Aquafina 75cl price fixed: ₦2,200 / ₦2,150');
                
                // Update cache
                this.priceCache[productId] = {
                    ...this.priceCache[productId],
                    retail_price: 2200,
                    wholesale_price: 2150
                };
                
                // Log the fix
                await this.supabase
                    .from('activity_logs')
                    .insert([{
                        user_name: 'System',
                        user_role: 'Admin',
                        action: 'PRICE_FIX',
                        details: {
                            product_id: productId,
                            product_name: 'Aquafina 75cl',
                            old_retail: this.priceCache[productId]?.retail_price || 0,
                            new_retail: 2200,
                            old_wholesale: this.priceCache[productId]?.wholesale_price || 0,
                            new_wholesale: 2150,
                            reason: 'Fixed price doubling issue'
                        },
                        timestamp: new Date().toISOString()
                    }]);
            }
            
        } catch (error) {
            console.error('❌ Price fix error:', error);
        }
    }
    
    // Get product with price fix applied
    async getProductWithFixedPrice(productId) {
        try {
            // Check cache first
            if (this.priceCache[productId]) {
                const cached = this.priceCache[productId];
                
                // Apply fix for Aquafina 75cl if needed
                if ((cached.sku === 'AQUAFINA-75CL' || cached.name.includes('Aquafina 75cl')) && 
                    cached.retail_price > 2500) {
                    
                    return {
                        ...cached,
                        retail_price: 2200,
                        wholesale_price: 2150,
                        price_fixed: true
                    };
                }
                return cached;
            }
            
            // Fetch from database
            const { data: product, error } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            
            // Apply price fix if needed
            let fixedProduct = { ...product };
            
            if ((product.sku === 'AQUAFINA-75CL' || product.name.includes('Aquafina 75cl')) && 
                product.retail_price > 2500) {
                
                fixedProduct = {
                    ...product,
                    retail_price: 2200,
                    wholesale_price: 2150,
                    price_fixed: true
                };
                
                // Update cache with fixed price
                this.priceCache[productId] = {
                    retail_price: 2200,
                    wholesale_price: 2150,
                    sku: product.sku,
                    name: product.name
                };
            } else {
                // Update cache with original price
                this.priceCache[productId] = {
                    retail_price: product.retail_price,
                    wholesale_price: product.wholesale_price,
                    sku: product.sku,
                    name: product.name
                };
            }
            
            return fixedProduct;
            
        } catch (error) {
            console.error('❌ Get product with fixed price error:', error);
            return null;
        }
    }
    
    // Get all products with price fixes applied
    async getAllProductsWithFixedPrices() {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            // Apply price fixes
            const fixedProducts = products.map(product => {
                if ((product.sku === 'AQUAFINA-75CL' || product.name.includes('Aquafina 75cl')) && 
                    product.retail_price > 2500) {
                    
                    return {
                        ...product,
                        retail_price: 2200,
                        wholesale_price: 2150,
                        price_fixed: true
                    };
                }
                return product;
            });
            
            return fixedProducts;
            
        } catch (error) {
            console.error('❌ Get all products error:', error);
            return [];
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
                role: 'General Manager', // Updated role
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
                stock_code: (userData.role === 'Admin' || userData.role === 'Manager' || userData.role === 'General Manager') 
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
            // Get products with fixed prices
            const products = await this.getAllProductsWithFixedPrices();
            
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

    // Updated to use fixed prices
    async getAllProducts() {
        try {
            return await this.getAllProductsWithFixedPrices();
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }
    
    // New: Process sale with price fix
    async processSale(saleData) {
        try {
            console.log('🔄 Processing sale with price fix...', saleData);
            
            // Get product with fixed price
            const product = await this.getProductWithFixedPrice(saleData.product_id);
            
            if (!product) {
                throw new Error('Product not found');
            }
            
            // Check stock
            if (product.current_qty < saleData.quantity) {
                throw new Error(`Insufficient stock! Available: ${product.current_qty}, Requested: ${saleData.quantity}`);
            }
            
            // Determine price based on quantity (wholesale for 50+, retail for less)
            const isWholesale = saleData.quantity >= 50;
            const unitPrice = isWholesale ? product.wholesale_price : product.retail_price;
            const totalPrice = unitPrice * saleData.quantity;
            
            console.log('💰 Price calculation:', {
                quantity: saleData.quantity,
                isWholesale,
                unitPrice,
                totalPrice,
                productName: product.name
            });
            
            // Insert sale
            const { data: sale, error: saleError } = await this.supabase
                .from('sales')
                .insert([{
                    product_id: saleData.product_id,
                    product_name: product.name,
                    quantity: saleData.quantity,
                    unit_price: unitPrice,
                    total_amount: totalPrice,
                    total_price: totalPrice,
                    sale_type: isWholesale ? 'WHOLESALE' : 'RETAIL',
                    customer_name: saleData.customer_name,
                    customer_phone: saleData.customer_phone,
                    customer_type: saleData.customer_type || 'retail',
                    sold_by: saleData.sold_by,
                    payment_status: saleData.payment_status || 'paid',
                    amount_paid: saleData.amount_paid || totalPrice,
                    amount_owing: saleData.amount_owing || 0
                }])
                .select()
                .single();
            
            if (saleError) throw new Error(`Sale failed: ${saleError.message}`);
            
            // Update stock
            const newQty = product.current_qty - saleData.quantity;
            await this.supabase
                .from('products')
                .update({ current_qty: newQty })
                .eq('id', saleData.product_id);
            
            // Log stock change
            await this.supabase
                .from('stock_changes')
                .insert([{
                    product_id: saleData.product_id,
                    product_name: product.name,
                    change_type: 'SALE_DEDUCT',
                    quantity: saleData.quantity,
                    previous_qty: product.current_qty,
                    new_qty: newQty,
                    changed_by: saleData.sold_by,
                    reason: `Sale: ${saleData.quantity} units`
                }]);
            
            return {
                success: true,
                sale: sale,
                price_info: {
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    price_type: isWholesale ? 'wholesale' : 'retail',
                    quantity: saleData.quantity
                }
            };
            
        } catch (error) {
            console.error('❌ Process sale error:', error);
            return {
                success: false,
                error: error.message,
                message: `Sale failed: ${error.message}`
            };
        }
    }
}

// Initialize database when page loads
window.addEventListener('load', () => {
    window.database = new Database();
    
    // Also add price fix helper to window
    window.fixAquafinaPrice = async function() {
        if (!window.database || !window.database.isConnected) {
            console.error('❌ Database not connected');
            return;
        }
        
        console.log('🔧 Manually fixing Aquafina 75cl price...');
        
        try {
            // Find Aquafina 75cl product
            const { data: products, error } = await window.database.supabase
                .from('products')
                .select('id, name, retail_price, wholesale_price')
                .or('sku.eq.AQUAFINA-75CL,name.ilike.%Aquafina 75cl%');
            
            if (error) throw error;
            
            if (products && products.length > 0) {
                products.forEach(product => {
                    if (product.retail_price > 2500) {
                        console.log(`Fixing ${product.name}: ${product.retail_price} → 2200`);
                        window.database.fixAquafinaPrice(product.id);
                    }
                });
            } else {
                console.log('ℹ️ No Aquafina 75cl products found');
            }
        } catch (error) {
            console.error('Manual fix error:', error);
        }
    };
});
