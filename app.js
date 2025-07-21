const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const socket = require('./socket'); // ✅ your socket.js file
dotenv.config();

const app = express();
const server = http.createServer(app); // ✅ Use this instead of app.listen
const io = socket.init(server); // ✅ Initialize Socket.IO

app.set('io', io); // ✅ Optional if you want to access it via req.app.get('io')

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public Routes (no auth required) - These must be before the catch-all route
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/publicRoute'));
app.use('/api/customer-auth', require('./routes/customerAuth')); // Customer specific auth routes
app.use('/api/phone', require('./routes/passwordReset')); // Phone-based password reset

// Protected Routes (auth required)
app.use('/api/live-location', require('./middleware/requireLogin'), require('./routes/liveLocation'));
app.use('/api/order', require('./middleware/requireLogin'), require('./routes/order'));
app.use('/api/system', require('./middleware/requireLogin'), require('./routes/system'));
app.use('/api/timestamp', require('./middleware/requireLogin'), require('./routes/timestampRoute'));
app.use('/api/transaction', require('./middleware/requireLogin'), require('./routes/transaction'));
app.use('/api/permissions', require('./middleware/requireLogin'), require('./routes/permissionUpdates'));

// This catch-all route should come AFTER all specific routes
app.use('/api/', require('./middleware/requireLogin'), require('./routes/dynamicRoute'));

// Test Route
app.get('/', (req, res) => {
  res.send('✅ Backend Running');
});

// Check for required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Please add these variables to your .env file.');
}

// Check for optional Twilio environment variables
const twilioEnvVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
const missingTwilioEnvVars = twilioEnvVars.filter(envVar => !process.env[envVar]);

if (missingTwilioEnvVars.length > 0) {
  console.warn(`⚠️ Missing Twilio environment variables: ${missingTwilioEnvVars.join(', ')}`);
  console.warn('SMS functionality will run in debug mode (printing to console only).');
}

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI, {
  
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});