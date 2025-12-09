const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
    res.render('index', { title: 'AgroLink - Agricultural Marketplace' });
});

// About page
router.get('/about', (req, res) => {
    res.render('about', { title: 'About Us - AgroLink' });
});

module.exports = router;
