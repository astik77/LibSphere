// server.js
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware (This lets us read JSON data)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Database (Make sure MongoDB is running!)
mongoose.connect('mongodb://127.0.0.1:27017/libsphere')
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Error:", err));

// --- Database Models ---
const ContentSchema = new mongoose.Schema({
    title: String,
    type: String, // 'note', 'book', 'video'
    link: String,
    status: { type: String, default: 'pending' } // pending or approved
});
const Content = mongoose.model('Content', ContentSchema);

// --- Routes (API Endpoints) ---

// 1. Login Logic
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded Admin
    if (username === 'admin77' && password === 'gabh2024') {
        return res.json({ success: true, role: 'admin' });
    }
    // Simple user login (In a real app, we would check DB)
    if (username && password) {
        return res.json({ success: true, role: 'user', username });
    }
    res.json({ success: false });
});

// 2. Upload Request
app.post('/api/upload', async (req, res) => {
    const { title, type, link, role } = req.body;
    const status = role === 'admin' ? 'approved' : 'pending';
    const newContent = new Content({ title, type, link, status });
    await newContent.save();
    res.json({ success: true });
});

// 3. Get Content (Only approved)
app.get('/api/content/:type', async (req, res) => {
    const data = await Content.find({ type: req.params.type, status: 'approved' });
    res.json(data);
});

// 4. Admin: Get Pending Requests
app.get('/api/admin/requests', async (req, res) => {
    const data = await Content.find({ status: 'pending' });
    res.json(data);
});

// 5. Admin: Approve Request
app.post('/api/admin/approve', async (req, res) => {
    await Content.findByIdAndUpdate(req.body.id, { status: 'approved' });
    res.json({ success: true });
});

// --- Chat System (Socket.io) ---
io.on('connection', (socket) => {
    socket.on('join', (user) => {
        io.emit('message', { user: 'System', text: `${user} joined the Sphere.` });
    });

    socket.on('chatMessage', (data) => {
        io.emit('message', data); // Broadcast to everyone
    });

    // Image moderation logic
    socket.on('uploadImage', (data) => {
        // Send to moderators/admins ONLY for approval
        io.emit('reviewImage', data); 
    });

    socket.on('approveImage', (data) => {
        // Once admin approves, show to everyone
        io.emit('showImage', data);
    });
});

server.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));