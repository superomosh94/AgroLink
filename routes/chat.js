const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Start a new chat or get existing one
router.post('/start', isAuthenticated, async (req, res) => {
    try {
        const { sellerId, productId } = req.body;
        const buyerId = req.session.user.id;

        // Prevent chatting with self
        if (parseInt(sellerId) === buyerId) {
            return res.redirect('/market/' + productId);
        }

        // Check if chat already exists
        const [existingChat] = await db.query(
            'SELECT id FROM chats WHERE buyer_id = ? AND seller_id = ? AND product_id = ?',
            [buyerId, sellerId, productId]
        );

        if (existingChat.length > 0) {
            return res.redirect(`/dashboard/messages/${existingChat[0].id}`);
        }

        // Create new chat
        const [result] = await db.query(
            'INSERT INTO chats (buyer_id, seller_id, product_id) VALUES (?, ?, ?)',
            [buyerId, sellerId, productId]
        );

        res.redirect(`/dashboard/messages/${result.insertId}`);
    } catch (error) {
        console.error('Start chat error:', error);
        res.redirect('/market');
    }
});

module.exports = router;
