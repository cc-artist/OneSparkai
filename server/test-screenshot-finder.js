const axios = require('axios');
require('dotenv').config();

// Test Screenshot Finder API
async function testScreenshotFinder() {
  try {
    const keywords = 'fitness workout';
    const resolution = '1080p';
    const imageStyle = 'photorealistic';
    
    console.log('Testing Screenshot Finder API with:');
    console.log('Keywords:', keywords);
    console.log('Resolution:', resolution);
    console.log('Image Style:', imageStyle);
    
    // Make API call to Screenshot Finder
    console.log('Making API call to Screenshot Finder...');
    const response = await axios.post('http://localhost:3000/api/v1/screenshot-finder', {
      keywords,
      resolution,
      imageStyle
    });
    
    console.log('API call successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing Screenshot Finder API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testScreenshotFinder();
