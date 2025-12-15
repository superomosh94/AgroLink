const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Dashboard
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userType = req.session.user.userType;

        // Get user's products
        const [products] = await db.query(`
            SELECT * FROM products 
            WHERE seller_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [userId]);

        // Get product count
        const [productCount] = await db.query(`
            SELECT COUNT(*) as count FROM products WHERE seller_id = ?
        `, [userId]);

        // Get total sales (from orders where user is seller)
        const [salesData] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_sales, COUNT(*) as order_count
            FROM orders 
            WHERE seller_id = ?
        `, [userId]);

        // Get pending orders
        const [pendingOrders] = await db.query(`
            SELECT COUNT(*) as count FROM orders 
            WHERE seller_id = ? AND status = 'pending'
        `, [userId]);

        // Get recent activity
        const [recentOrders] = await db.query(`
            SELECT o.*, p.name as product_name
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [userId]);

        res.render('dashboard/index', {
            title: 'Dashboard - AgroLink',
            stats: {
                totalProducts: productCount[0].count,
                totalSales: salesData[0].total_sales,
                pendingOrders: pendingOrders[0].count,
                orderCount: salesData[0].order_count
            },
            products,
            recentOrders
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load dashboard'
        });
    }
});

// User settings page
router.get('/settings', isAuthenticated, async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

        res.render('dashboard/settings', {
            title: 'Settings - AgroLink',
            userData: users[0],
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Settings error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load settings'
        });
    }
});

// Update user profile
router.post('/settings', isAuthenticated, async (req, res) => {
    try {
        const { fullname, phone } = req.body;

        await db.query(
            'UPDATE users SET fullname = ?, phone = ? WHERE id = ?',
            [fullname, phone, req.session.user.id]
        );

        // Update session
        req.session.user.fullname = fullname;

        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

        res.render('dashboard/settings', {
            title: 'Settings - AgroLink',
            userData: users[0],
            error: null,
            success: 'Profile updated successfully!'
        });
    } catch (error) {
        console.error('Update settings error:', error);

        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

        res.render('dashboard/settings', {
            title: 'Settings - AgroLink',
            userData: users[0],
            error: 'Failed to update profile',
            success: null
        });
    }
});

// Sales and Orders page (Shared by Seller and Admin)
router.get('/sales', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userType = req.session.user.userType;

        let query = `
            SELECT o.*, p.name as product_name, u.fullname as buyer_name, u.email as buyer_email
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN users u ON o.buyer_id = u.id
        `;

        let params = [];

        // If not admin, restrict to own sales
        if (userType !== 'admin') {
            query += ' WHERE o.seller_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY o.created_at DESC';

        const [orders] = await db.query(query, params);

        res.render('dashboard/sales', {
            title: 'Sales & Orders - AgroLink',
            orders,
            currentPage: 'sales'
        });
    } catch (error) {
        console.error('Sales page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load sales page'
        });
    }
});

// Manage Users page (Admin only)
router.get('/users', isAuthenticated, async (req, res) => {
    try {
        // Simple check for admin role
        if (req.session.user.userType !== 'admin') {
            return res.redirect('/dashboard');
        }

        const [users] = await db.query(`
            SELECT id, fullname, email, phone, user_type, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);

        res.render('dashboard/users', {
            title: 'Manage Users - AgroLink',
            users,
            currentPage: 'users'
        });
    } catch (error) {
        console.error('Users page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load users page'
        });
    }
});


// Messages Inbox
router.get('/messages', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [chats] = await db.query(`
            SELECT c.id, c.product_id, p.name as product_name, 
                   u.fullname as other_user_name, u.id as other_user_id,
                   (SELECT message FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM chats c
            JOIN products p ON c.product_id = p.id
            JOIN users u ON (c.buyer_id = ? AND c.seller_id = u.id) OR (c.seller_id = ? AND c.buyer_id = u.id)
            WHERE c.buyer_id = ? OR c.seller_id = ?
            ORDER BY last_message_time DESC
        `, [userId, userId, userId, userId]);

        res.render('dashboard/inbox', {
            title: 'Messages - AgroLink',
            chats,
            currentPage: 'messages'
        });
    } catch (error) {
        console.error('Inbox error:', error);
        res.render('error', { title: 'Error', message: 'Unable to load inbox' });
    }
});

// Single Conversation View
router.get('/messages/:id', isAuthenticated, async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.session.user.id;

        // Verify participation
        const [chat] = await db.query(`
            SELECT c.*, p.name as product_name, p.price as product_price, p.image_url,
                   u.fullname as other_user_name, u.id as other_user_id
            FROM chats c
            JOIN products p ON c.product_id = p.id
            JOIN users u ON (c.buyer_id = ? AND c.seller_id = u.id) OR (c.seller_id = ? AND c.buyer_id = u.id)
            WHERE c.id = ? AND (c.buyer_id = ? OR c.seller_id = ?)
        `, [userId, userId, chatId, userId, userId]);

        if (chat.length === 0) {
            return res.redirect('/dashboard/messages');
        }

        // Get messages
        const [messages] = await db.query(`
            SELECT m.*, u.fullname as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.chat_id = ?
            ORDER BY m.created_at ASC
        `, [chatId]);

        res.render('dashboard/conversation', {
            title: `Chat with ${chat[0].other_user_name} - AgroLink`,
            chat: chat[0],
            messages,
            currentPage: 'messages'
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.render('error', { title: 'Error', message: 'Unable to load conversation' });
    }
});

module.exports = router;
