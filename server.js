const express = require('express');
const path = require('path');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Import database connection
const db = require('./config/db');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'agrolink-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
});

app.use(sessionMiddleware);

// Share session with socket.io
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('New client connected');

    const user = socket.request.session.user;
    if (user) {
        // Join user to their own room for notifications
        socket.join(`user_${user.id}`);
        console.log(`User ${user.id} joined notification room`);
    }

    // Join specific chat room
    socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`User ${user ? user.id : 'Anon'} joined chat ${chatId}`);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
        try {
            if (!user) return;

            const { chatId, message, receiverId } = data;

            // Save to DB
            const [result] = await db.query(
                'INSERT INTO messages (chat_id, sender_id, message) VALUES (?, ?, ?)',
                [chatId, user.id, message]
            );

            const newMessage = {
                id: result.insertId,
                chat_id: chatId,
                sender_id: user.id,
                message: message,
                created_at: new Date(),
                sender_name: user.fullname
            };

            // Broadcast to chat room
            io.to(`chat_${chatId}`).emit('receive_message', newMessage);

            // Send notification to receiver
            io.to(`user_${receiverId}`).emit('notification', {
                type: 'message',
                text: `New message from ${user.fullname}`
            });

        } catch (error) {
            console.error('Socket message error:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user session available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat'); // New route file

// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/market', marketRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error',
        message: 'Something went wrong!'
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
});
