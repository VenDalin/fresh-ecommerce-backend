const admin = require('firebase-admin');


// Path to your service account file
const serviceAccount = require('./firebase-adminsdk.json');

// Initialize the app if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;