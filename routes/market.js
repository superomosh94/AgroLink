const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/products/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

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

        // Fetch Reviews and Average
        const [reviews] = await db.query(`
            SELECT r.*, u.fullname as user_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = ? 
            ORDER BY r.created_at DESC
        `, [productId]);

        // Calculate Stats
        let avgRating = 0;
        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
            avgRating = (sum / reviews.length).toFixed(1);
        }

        res.render('market/product', {
            title: `${product.name} - AgroLink`,
            product,
            reviews,
            avgRating,
            reviewCount: reviews.length
        });
    } catch (error) {
        console.error('Product detail error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load product details'
        });
    }
});

// Submit Review
router.post('/:id/review', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const productId = req.params.id;
        const userId = req.session.user.id;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).send('Invalid rating');
        }

        await db.query(`
            INSERT INTO reviews (product_id, user_id, rating, comment) 
            VALUES (?, ?, ?, ?)
        `, [productId, userId, rating, comment]);

        res.redirect(`/market/${productId}`);

    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).send('Unable to submit review');
    }
});

// Edit product page
router.get('/:id/edit', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const productId = req.params.id;
        const userId = req.session.user.id;

        // Check ownership
        const [products] = await db.query('SELECT * FROM products WHERE id = ? AND seller_id = ?', [productId, userId]);

        if (products.length === 0) {
            // Check if product exists but belongs to someone else
            const [exists] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
            if (exists.length > 0) {
                return res.status(403).render('error', { title: 'Unauthorized', message: 'You can only edit your own products' });
            }
            return res.status(404).render('404', { title: 'Product Not Found' });
        }

        const product = products[0];

        res.render('market/edit', {
            title: `Edit ${product.name} - AgroLink`,
            product,
            error: null
        });
    } catch (error) {
        console.error('Edit page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load edit page'
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

// Add product POST handler with image upload
router.post('/add', upload.single('productImage'), async (req, res) => {
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
        const imagePath = req.file ? `/uploads/products/${req.file.filename}` : null;

        await db.query(`
            INSERT INTO products 
            (seller_id, name, description, category, price, stock_quantity, unit, location, 
             condition_type, is_organic, delivery_available, warranty_included, image_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
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
            warrantyIncluded,
            imagePath
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
