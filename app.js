const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const socket = require('./socket'); // WebSocket setup file

const geocodeRoute = require('./routes/geocode');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socket.init(server);
app.set('io', io); // Optional access to io via req.app.get('io')

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve upload folder

// ─── ROUTES ─────────────────────────────────────────────────────────────────────
// Public Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/publicRoute'));
app.use('/api/customer-auth', require('./routes/customerAuth'));
app.use('/api/phone', require('./routes/passwordReset'));
app.use(geocodeRoute);

// Protected Routes
const requireLogin = require('./middleware/requireLogin');
app.use('/api/live-location', requireLogin, require('./routes/liveLocation'));
app.use('/api/order', requireLogin, require('./routes/order'));
app.use('/api/system', requireLogin, require('./routes/system'));
app.use('/api/timestamp', requireLogin, require('./routes/timestampRoute'));
app.use('/api/transaction', requireLogin, require('./routes/transaction'));
app.use('/api/permissions', requireLogin, require('./routes/permissionUpdates'));
app.use('/api/', requireLogin, require('./routes/dynamicRoute'));

// ─── FRONTEND SERVING (Vue/React SPA) ──────────────────────────────────────────
const frontendDist = path.join(__dirname, '../thesis_project/dist');
app.use(express.static(frontendDist)); // Serve static files

// Catch-all for SPA routing (must be last route)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.send('✅ Backend Running');
});

// ─── ENV VALIDATION ────────────────────────────────────────────────────────────
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️ Missing required env vars: ${missingEnvVars.join(', ')}`);
}

const twilioEnvVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
const missingTwilioVars = twilioEnvVars.filter(envVar => !process.env[envVar]);

if (missingTwilioVars.length > 0) {
  console.warn(`⚠️ Twilio vars missing: ${missingTwilioVars.join(', ')} — SMS will print only`);
}

// ─── MONGO CONNECTION ──────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
