// timestampController.js
const moment = require('moment-timezone');

// Function to generate the current timestamp in 'Asia/Phnom_Penh' time zone
exports.generateTimestamp = (req, res) => {
    try {
        const currentDateTimeICT = moment().tz('Asia/Phnom_Penh').format();
        res.json({ timestamp: currentDateTimeICT });
    } catch (err) {
        console.error("Error occurred while generating timestamp:", err);
        res.status(500).json({ message: 'An error occurred while generating timestamp' });
    }
};
