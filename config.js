// config.js - Arijeem Insight 360 Configuration
const CONFIG = {
    // SUPABASE CREDENTIALS
    SUPABASE_URL: 'https://twnbpdqssvzuvdlfzdum.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bmJwZHFzc3Z6dXZkbGZ6ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzQ0NzAsImV4cCI6MjA4Mzg1MDQ3MH0.XfPvPh4YZDES5gktKkj5KHtHmNTZmjye8LfDkBbpX-U',
    
    // SYSTEM SETTINGS
    SYSTEM_NAME: 'Arijeem Insight 360',
    COMPANY_NAME: 'Arijeem Multipurpose Enterprises',
    PARENT_COMPANY: 'Pepsi Corporation',
    
    // SECURITY SETTINGS
    MAX_LOGIN_ATTEMPTS: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    REQUIRE_ENTRY_CODE: true,
    
    // DATABASE TABLES
    TABLES: {
        USERS: 'users',
        PRODUCTS: 'products',
        SALES: 'sales',
        STOCK_CHANGES: 'stock_changes',
        NOTIFICATIONS: 'notifications'
    },
    
    // STOCK SETTINGS
    MIN_STOCK_QUANTITY: 10,
    MAX_STOCK_QUANTITY: 100000,
    LOW_STOCK_ALERT_PERCENT: 0.2,
    
    // COLORS (Pepsi Theme)
    COLORS: {
        primary: '#004B93',
        secondary: '#E31C23',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        background: '#f5f7fa'
    }
};

// Export to global scope
window.CONFIG = CONFIG;
console.log('✅ Config loaded successfully');