// database.js - CORRECT VERSION WITH ALL PRICE FIXES
console.log('🚀 Loading Database Module with Fixed Prices...');

class Database {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.priceCache = {};
        this.actualPrices = this.getActualPriceList(); // Your correct prices
        this.initialize();
    }

    // ===== YOUR ACTUAL PRICE LIST =====
    getActualPriceList() {
        return {
            // Water Category
            'NIRVANA-1L': { retail: 1400, wholesale: 1300 },
            'EVA-1.5L': { retail: 3600, wholesale: 3600 },
            'AQUAFINA-50CL': { retail: 1700, wholesale: 1650 },
            'AQUAFINA-75CL': { retail: 2200, wholesale: 2150 },
            
            // RGB (Glass)
            'PEPSI-RGB': { retail: 4500, wholesale: 4400 },
            '7UP-RGB': { retail: 3000, wholesale: 2950 },
            'SK-RGB': { retail: 3120, wholesale: 3050 },
            'COKE-RGB-50CL': { retail: 6000, wholesale: 6000 },
            'COKE-ZERO-RGB': { retail: 3200, wholesale: 3200 },
            'COKE-RED-RGB': { retail: 4400, wholesale: 4400 },
            
            // PET (Plastic)
            'CF-PET': { retail: 4400, wholesale: 4400 },
            'RAZZLE-40CL': { retail: 2200, wholesale: 2100 },
            'RAZZLE-60CL': { retail: 3200, wholesale: 3100 },
            'BIG-COLA-35CL': { retail: 2100, wholesale: 2100 },
            'C-FRUITY': { retail: 2150, wholesale: 2150 },
            'LACASERA-35CL': { retail: 2300, wholesale: 2200 },
            'AMERICAN-COLA': { retail: 3700, wholesale: 3600 },
            
            // Cans
            'DUBIC-CAN': { retail: 12000, wholesale: 11000 },
            
            // Additional PET
            'SK-30CL': { retail: 3000, wholesale: 3000 },
            'SK-50CL': { retail: 4300, wholesale: 4200 },
            'PET-60CL': { retail: 4250, wholesale: 4150 },
            'PET-40CL': { retail: 2320, wholesale: 2300 },
        };
    }

    async initialize() {
        try {
            await this.waitForConfig();
            
            if (!window.CONFIG || !window.supabase) {
                throw new Error('Required dependencies not loaded');
            }

            this.supabase = supabase.createClient(
                CONFIG.SUPABASE_URL, 
                CONFIG.SUPABASE_KEY,
                { auth: { persistSession: false } }
            );

            console.log('✅ Database client created');
            this.isConnected = await this.testConnection();
            
            if (this.isConnected) {
                console.log('🎉 Database ready!');
                await this.ensureCorrectPrices();
            }

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.isConnected = false;
        }
    }

    // ===== CORE FIX: ENSURE CORRECT PRICES =====
    async ensureCorrectPrices() {
        try {
            console.log('🔄 Ensuring database has correct prices...');
            
            const { data: products, error } = await this.supabase
                .from('products')
                .select('id, sku, name, retail_price, wholesale_price');
            
            if (error) throw error;
            
            let updatesNeeded = [];
            
            products.forEach(product => {
                const correctPrice = this.actualPrices[product.sku];
                
                if (correctPrice) {
                    const retailDiff = Math.abs(product.retail_price - correctPrice.retail);
                    const wholesaleDiff = Math.abs(product.wholesale_price - correctPrice.wholesale);
                    
                    if (retailDiff > 10 || wholesaleDiff > 10) {
                        updatesNeeded.push({
                            id: product.id,
                            sku: product.sku,
                            name: product.name,
                            current: {
                                retail: product.retail_price,
                                wholesale: product.wholesale_price
                            },
                            correct: correctPrice
                        });
                    }
                }
            });
            
            if (updatesNeeded.length > 0) {
                console.log(`🔧 Fixing ${updatesNeeded.length} incorrect prices...`);
                await this.fixProductPrices(updatesNeeded);
            } else {
                console.log('✅ All products have correct prices');
            }
            
        } catch (error) {
            console.error('❌ Price check error:', error);
        }
    }
    
    async fixProductPrices(updates) {
        for (const update of updates) {
            try {
                console.log(`  Fixing ${update.name}: ₦${update.current.retail}→₦${update.correct.retail}`);
                
                const { error } = await this.supabase
                    .from('products')
                    .update({
                        retail_price: update.correct.retail,
                        wholesale_price: update.correct.wholesale,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', update.id);
                
                if (!error) {
                    this.priceCache[update.id] = {
                        retail_price: update.correct.retail,
                        wholesale_price: update.correct.wholesale,
                        sku: update.sku,
                        name: update.name
                    };
                    
                    await this.logPriceCorrection(update);
                }
                
            } catch (error) {
                console.error(`  Error fixing ${update.name}:`, error);
            }
        }
        console.log('✅ Price corrections completed');
    }

    // ===== FIXED: GET PRODUCT WITH CORRECT PRICE =====
    async getProductWithCorrectPrice(productId) {
        try {
            if (this.priceCache[productId]) {
                return this.priceCache[productId];
            }
            
            const { data: product, error } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            
            const correctPrice = this.actualPrices[product.sku];
            let correctedProduct = { ...product };
            
            if (correctPrice) {
                correctedProduct = {
                    ...product,
                    retail_price: correctPrice.retail,
                    wholesale_price: correctPrice.wholesale,
                    price_source: 'actual_list'
                };
            }
            
            this.priceCache[productId] = correctedProduct;
            return correctedProduct;
            
        } catch (error) {
            console.error('❌ Get product error:', error);
            return null;
        }
    }
    
    // ===== NEW FUNCTION: GET PRODUCT BY ID =====
    async getProductById(productId) {
        try {
            const product = await this.getProductWithCorrectPrice(productId);
            if (!product) return null;
            
            return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                retail_price: product.retail_price,
                wholesale_price: product.wholesale_price,
                current_qty: product.current_qty,
                min_qty: product.min_qty || 10
            };
        } catch (error) {
            console.error('Error getting product by ID:', error);
            return null;
        }
    }
    
    // ===== CRITICAL FIX: PROCESS SALE WITHOUT DOUBLING =====
    async processSale(saleData) {
        try {
            console.log('🔄 Processing sale...');
            
            const product = await this.getProductWithCorrectPrice(saleData.product_id);
            
            if (!product) {
                throw new Error('Product not found');
            }
            
            if (product.current_qty < saleData.quantity) {
                throw new Error(`Insufficient stock! Available: ${product.current_qty}, Requested: ${saleData.quantity}`);
            }
            
            // FIXED WHOLESALE LOGIC
            let isWholesale = false;
            let unitPrice = product.retail_price;
            
            if (product.sku === 'DUBIC-CAN') {
                isWholesale = saleData.quantity >= CONFIG.PRICING.DUBIC_CAN_WHOLESALE_THRESHOLD;
            } else if (product.sku.includes('AQUAFINA') || product.sku.includes('NIRVANA') || product.sku.includes('EVA')) {
                isWholesale = saleData.quantity >= CONFIG.PRICING.WATER_WHOLESALE_THRESHOLD;
            } else {
                isWholesale = saleData.quantity >= CONFIG.PRICING.STANDARD_WHOLESALE_THRESHOLD;
            }
            
            unitPrice = isWholesale ? product.wholesale_price : product.retail_price;
            
            // CALCULATE TOTAL ONCE - NO DOUBLING
            const totalPrice = unitPrice * saleData.quantity;
            
            console.log('💰 FINAL Price calculation:', {
                product: product.name,
                quantity: saleData.quantity,
                unit_price: unitPrice,
                is_wholesale: isWholesale,
                total_price: totalPrice
            });
            
            // INSERT SALE WITH SINGLE TOTAL FIELD
            const { data: sale, error: saleError } = await this.supabase
                .from('sales')
                .insert([{
                    product_id: saleData.product_id,
                    product_name: product.name,
                    quantity: saleData.quantity,
                    unit_price: unitPrice,
                    total_amount: totalPrice, // ONLY ONE TOTAL FIELD
                    sale_type: isWholesale ? 'WHOLESALE' : 'RETAIL',
                    customer_name: saleData.customer_name,
                    sold_by: saleData.sold_by,
                    sale_date: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (saleError) throw saleError;
            
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
                    reason: `Sale: ${saleData.quantity} units @ ₦${unitPrice}`
                }]);
            
            return {
                success: true,
                sale: sale,
                price_info: {
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    price_type: isWholesale ? 'wholesale' : 'retail',
                    quantity: saleData.quantity,
                    product_name: product.name
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

    // ===== SUPPORT FUNCTIONS =====
    async logPriceCorrection(update) {
        await this.supabase
            .from('activity_logs')
            .insert([{
                user_name: 'System',
                user_role: 'Admin',
                action: 'PRICE_CORRECTION',
                details: {
                    product_id: update.id,
                    product_name: update.name,
                    sku: update.sku,
                    old_retail: update.current.retail,
                    new_retail: update.correct.retail,
                    old_wholesale: update.current.wholesale,
                    new_wholesale: update.correct.wholesale,
                    reason: 'Corrected to actual price list'
                },
                timestamp: new Date().toISOString()
            }]);
    }

    async getAllProductsWithCorrectPrices() {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            const correctedProducts = products.map(product => {
                const correctPrice = this.actualPrices[product.sku];
                
                if (correctPrice) {
                    return {
                        ...product,
                        retail_price: correctPrice.retail,
                        wholesale_price: correctPrice.wholesale,
                        price_source: 'actual_list'
                    };
                }
                
                return product;
            });
            
            return correctedProducts;
            
        } catch (error) {
            console.error('❌ Get all products error:', error);
            return [];
        }
    }

    async waitForConfig() {
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

    async testConnection() {
        try {
            console.log('🔄 Testing database connection...');
            
            const { data, error } = await this.supabase
                .from('products')
                .select('count')
                .limit(1);
            
            if (error) {
                if (error.code === '42P01') {
                    console.log('ℹ️ First time setup - tables not created yet');
                    return true;
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

    async createCEOUser(userData) {
        try {
            const ceoUser = {
                email: userData.email,
                name: userData.name,
                role: 'General Manager',
                entry_code: userData.entryCode || '0000',
                stock_code: userData.stockCode || '000000',
                override_code: userData.overrideCode || '00000000',
                password_hash: btoa(userData.password),
                is_active: true,
                created_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('users')
                .insert([ceoUser])
                .select();
            
            if (error) throw error;
            
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
            const user = {
                email: userData.email,
                name: userData.name,
                role: userData.role,
                entry_code: userData.entryCode || '0000',
                stock_code: (userData.role === 'Admin' || userData.role === 'General Manager') 
                          ? (userData.stockCode || '000000') : null,
                override_code: userData.role === 'General Manager' 
                             ? (userData.overrideCode || '00000000') : null,
                password_hash: btoa(userData.password),
                is_active: true,
                created_at: new Date().toISOString()
            };
            
            const existingUser = await this.getUserByEmail(userData.email);
            if (existingUser) {
                console.log(`⚠️ User ${userData.email} already exists`);
                return existingUser;
            }
            
            const { data, error } = await this.supabase
                .from('users')
                .insert([user])
                .select();
            
            if (error) throw error;
            
            console.log(`✅ ${userData.role} created:`, data[0].email);
            return data[0];
            
        } catch (error) {
            console.error(`Error creating ${userData.role}:`, error);
            return null;
        }
    }

    async verifyLogin(email, password, entryCode) {
        try {
            const user = await this.getUserByEmail(email);
            
            if (!user) {
                return { success: false, message: 'Invalid credentials' };
            }
            
            if (user.entry_code !== entryCode) {
                return { success: false, message: 'Invalid entry code' };
            }
            
            await this.supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
            
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

    async getDashboardStats() {
        try {
            const products = await this.getAllProductsWithCorrectPrices();
            
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
            console.error('Error getting sales:', error);
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
            const { data: product, error: productError } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found');
            }
            
            const newQty = (product.current_qty || 0) + quantity;
            
            const { error: updateError } = await this.supabase
                .from('products')
                .update({ 
                    current_qty: newQty,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);
            
            if (updateError) throw updateError;
            
            await this.supabase
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
            return await this.getAllProductsWithCorrectPrices();
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
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
            console.error('Error getting users:', error);
            return [];
        }
    }
}

// Initialize database
window.addEventListener('load', () => {
    window.database = new Database();
    
    // Debug helper
    window.checkPrices = async function() {
        console.log('🔍 Checking all prices...');
        const products = await window.database.getAllProductsWithCorrectPrices();
        console.table(products.map(p => ({
            Name: p.name,
            SKU: p.sku,
            'Retail (₦)': p.retail_price,
            'Wholesale (₦)': p.wholesale_price,
            Stock: p.current_qty
        })));
    };
});
