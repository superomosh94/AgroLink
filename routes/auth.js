const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Login page
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title: 'Login - AgroLink',
        error: null
    });
});

// Register page
router.get('/register', (req, res) => {
    res.render('auth/register', {
        title: 'Register - AgroLink',
        error: null
    });
});

// Login POST handler
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.render('auth/login', {
                title: 'Login - AgroLink',
                error: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Compare password with hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.render('auth/login', {
                title: 'Login - AgroLink',
                error: 'Invalid email or password'
            });
        }

        // Create session
        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            userType: user.user_type
        };

        // Redirect to dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login - AgroLink',
            error: 'An error occurred. Please try again.'
        });
    }
});

// Register POST handler
router.post('/register', async (req, res) => {
    const { fullname, email, phone, userType, password, confirmPassword } = req.body;

    try {
        // Validate passwords match
        if (password !== confirmPassword) {
            return res.render('auth/register', {
                title: 'Register - AgroLink',
                error: 'Passwords do not match'
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUsers.length > 0) {
            return res.render('auth/register', {
                title: 'Register - AgroLink',
                error: 'Email already registered'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        await db.query(
            'INSERT INTO users (fullname, email, phone, password_hash, user_type) VALUES (?, ?, ?, ?, ?)',
            [fullname, email, phone, passwordHash, userType]
        );

        // Redirect to login
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            title: 'Register - AgroLink',
            error: 'An error occurred. Please try again.'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
