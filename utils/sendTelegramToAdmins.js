const axios = require('axios');

const sendTelegramToAdmins = async (message, token, chatId) => {
  try {
    console.log('[🔔 Telegram Alert Triggered]', message);

    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    return res.data;
  } catch (error) {
    console.error('[Telegram Alert Failed]', error.response?.data || error.message);
  }
};

module.exports = sendTelegramToAdmins;
