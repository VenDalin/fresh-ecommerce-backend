// Example Express route for /api/geocode
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/api/geocode', async (req, res) => {
  const { latitude, longitude } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=en`;
    const response = await axios.get(url);
    const addressComponents = response.data.results[0]?.address_components || [];
    let commune = '', district = '', city = '', country = '';

    addressComponents.forEach(component => {
      if (component.types.includes('administrative_area_level_3')) {
        commune = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2')) {
        district = component.long_name;
      }
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
      }
    });

    res.json({ commune, district, city, country });
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

module.exports = router;