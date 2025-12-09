const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Marketplace listing
router.get('/', async (req, res) => {
    try {
        const { category, sort, search } = req.query;

        let query = `
            SELECT p.*, u.fullname as seller_name 
            FROM products p 
            JOIN users u ON p.seller_id = u.id 
            WHERE p.status = 'active'
        `;
        const params = [];

        // Apply filters
        if (category) {
            query += ' AND p.category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Apply sorting
        if (sort === 'price-low') {
            query += ' ORDER BY p.price ASC';
        } else if (sort === 'price-high') {
            query += ' ORDER BY p.price DESC';
        } else {
            query += ' ORDER BY p.created_at DESC';
        }

        const [products] = await db.query(query, params);

        res.render('market/index', {
            title: 'Marketplace - AgroLink',
            products,
            filters: { category, sort, search }
        });
    } catch (error) {
        console.error('Marketplace error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load marketplace'
        });
    }
});

// Product detail
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        const [products] = await db.query(`
            SELECT p.*, u.fullname as seller_name, u.phone as seller_phone, u.email as seller_email
            FROM products p 
            JOIN users u ON p.seller_id = u.id 
            WHERE p.id = ?
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).render('404', { title: 'Product Not Found' });
        }

        const product = products[0];

        res.render('market/product', {
            title: `${product.name} - AgroLink`,
            product
        });
    } catch (error) {
        console.error('Product detail error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load product details'
        });
    }
});

// Add product page
router.get('/add/new', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.render('market/add', {
        title: 'Add Product - AgroLink',
        error: null
    });
});

// Add product POST handler
router.post('/add', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const {
            productName,
            category,
            description,
            price,
            stock,
            unit,
            location,
            condition
        } = req.body;

        const isOrganic = req.body.organic === 'on' ? 1 : 0;
        const deliveryAvailable = req.body.delivery === 'on' ? 1 : 0;
        const warrantyIncluded = req.body.warranty === 'on' ? 1 : 0;

        await db.query(`
            INSERT INTO products 
            (seller_id, name, description, category, price, stock_quantity, unit, location, 
             condition_type, is_organic, delivery_available, warranty_included, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
            req.session.user.id,
            productName,
            description,
            category,
            price,
            stock,
            unit,
            location,
            condition || 'new',
            isOrganic,
            deliveryAvailable,
            warrantyIncluded
        ]);

        res.redirect('/market');

    } catch (error) {
        console.error('Add product error:', error);
        res.render('market/add', {
            title: 'Add Product - AgroLink',
            error: 'Failed to add product. Please try again.'
        });
    }
});

module.exports = router;
