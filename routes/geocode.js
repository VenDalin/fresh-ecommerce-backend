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
    const result = response.data.results[0];
    const addressComponents = result?.address_components || [];
    
    // Log the full result for debugging
    console.log('Google Maps API result:', JSON.stringify(result, null, 2));
    
    let commune = '', district = '', city = '', province = '', country = '';

    addressComponents.forEach(component => {
      console.log('Address component:', component.long_name, 'Types:', component.types);
      
      if (component.types.includes('administrative_area_level_3')) {
        commune = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2')) {
        district = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        province = component.long_name;
      }
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
        if (!commune) commune = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
      }
    });

    console.log('Parsed location data:', { commune, district, city, province, country });
    res.json({ commune, district, city, province, country });
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

module.exports = router;