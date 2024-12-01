const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup session management
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // 'secure: true' requires HTTPS
}));

// In-memory user data (In real-world apps, you'd store this in a database)
const users = {
  admin77: {
    username: "admin77",
    password: "$2a$10$sdwT4e8o6yDHLcZ4DFhZeL6/RF4l2f9ZyExGjThTQJq0Di2rTVyU6", // bcrypt-hashed password for 'gabh2024'
    role: "admin"
  },
  student1: {
    username: "student1",
    password: "$2a$10$Qp7LZvOd5zPzZPbbpzXmnAqL5cq2.r.zZ1J8yzwA0OFtW51Dd1vPO", // bcrypt-hashed password for 'student2024'
    role: "student"
  }
};

// Middleware to verify JWT Token
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login.html');

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.redirect('/login.html');
    req.user = user;
    next();
  });
};

// Login Route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users[username];
  if (!user) return res.status(400).send('User not found');

  // Check password with bcrypt
  bcrypt.compare(password, user.password, (err, result) => {
    if (!result) return res.status(400).send('Incorrect password');

    // Generate JWT token for user
    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Store the JWT in the cookie
    res.cookie('token', token, { httpOnly: true });
    
    // Redirect based on role
    if (user.role === "admin") {
      return res.redirect('/admin_dashboard.html');
    } else {
      return res.redirect('/student_dashboard.html');
    }
  });
});

// Admin Dashboard - Only accessible for Admin users
app.get('/admin_dashboard', authenticateJWT, (req, res) => {
  if (req.user.role !== "admin") return res.redirect('/login.html');
  res.sendFile(__dirname + '/public/admin_dashboard.html');
});

// Student Dashboard - Only accessible for Student users
app.get('/student_dashboard', authenticateJWT, (req, res) => {
  if (req.user.role !== "student") return res.redirect('/login.html');
  res.sendFile(__dirname + '/public/student_dashboard.html');
});

// Sign-Out (Logout) Route
app.get('/logout', (req, res) => {
  res.clearCookie('token'); // Clear the JWT cookie
  res.redirect('/login.html'); // Redirect to login page
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
