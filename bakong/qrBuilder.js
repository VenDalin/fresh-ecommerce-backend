const { buildField } = require('./helpers');
const { generateCRC16 } = require('./crc16');
const {
  PAYLOAD_FORMAT_INDICATOR,
  INITIATION_METHOD_DYNAMIC,
  COUNTRY_CODE,
  GUID_BAKONG,
  CURRENCY_CODES,
} = require('./constants');

function buildIndividualKHQR({
  accountId,               // e.g. 'username@aclb' or '85512345678@bakong'
  amount,                  // e.g. 15000
  currency = 'KHR',        // 'KHR' or 'USD'
  name = 'Individual User',
  city = 'Phnom Penh',
  billNumber = '',         // Optional bill/transaction number
  mobileNumber = '',       // Optional mobile number
  storeLabel = '',         // Optional store label
  terminalLabel = '',      // Optional terminal label
  merchantCategoryCode = '5999', // Default category code for general services
  expirationTimestamp = null, // Optional expiration timestamp
}) {
  const currencyCode = CURRENCY_CODES[currency.toUpperCase()];
  if (!currencyCode) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  // Round amount for KHR (no decimal places)
  const formattedAmount = currency.toUpperCase() === 'KHR' 
    ? Math.round(amount).toString() 
    : amount.toFixed(2);

  // Build additional data field (tag 62)
  let additionalData = '';
  if (billNumber) {
    additionalData += buildField('01', billNumber);
  }
  if (mobileNumber) {
    additionalData += buildField('02', mobileNumber);
  }
  if (storeLabel) {
    additionalData += buildField('03', storeLabel);
  }
  if (terminalLabel) {
    additionalData += buildField('04', terminalLabel);
  }
  if (expirationTimestamp) {
    const expDate = new Date(expirationTimestamp);
    const expString = expDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    additionalData += buildField('05', expString);
  }

  const payload = [
    buildField('00', PAYLOAD_FORMAT_INDICATOR),
    buildField('01', INITIATION_METHOD_DYNAMIC),
    buildField('29',
      buildField('00', GUID_BAKONG) +
      buildField('01', accountId)
    ),
    buildField('52', merchantCategoryCode),
    buildField('53', currencyCode),
    buildField('54', formattedAmount),
    buildField('58', COUNTRY_CODE),
    buildField('59', name),
    buildField('60', city),
  ];

  // Only add additional data field if we have any additional data
  if (additionalData) {
    payload.push(buildField('62', additionalData));
  }

  // Add CRC placeholder
  payload.push('6304');

  const raw = payload.join('');
  const crc = generateCRC16(raw);
  return raw + crc;
}

module.exports = { buildIndividualKHQR };
