const { Server } = require('socket.io');
const User = require('./models/user'); // ✅ Add this line if not already imported

let ioInstance;
const liveLocations = new Map();

function init(server) {
  ioInstance = new Server(server, {
    cors: { origin: '*' }
  });

  ioInstance.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    socket.on('updateLocation', async (data) => {
      const { userId, name, role, latitude, longitude } = data;

      if (!userId || latitude == null || longitude == null) return;

      // ✅ Save to in-memory map
      liveLocations.set(userId, {
        userId: { _id: userId },
        name,
        role,
        latitude,
        longitude,
        updatedAt: new Date()
      });

      // ✅ Emit to all clients
      ioInstance.emit('locationUpdated', liveLocations.get(userId));

      // ✅ Save to MongoDB
      try {
        await User.findByIdAndUpdate(userId, {
          latitude,
          longitude,
          updatedAt: new Date()
        });
      } catch (err) {
        console.error('❌ Failed to update user location in DB:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected:', socket.id);
    });
  });
}

function getIo() {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
}

function getAllLiveLocations() {
  return Array.from(liveLocations.values());
}

module.exports = {
  init,
  getIo,
  getAllLiveLocations
};
