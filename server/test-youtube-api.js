const axios = require('axios');
require('dotenv').config();

// Test YouTube Data API directly
async function testYouTubeApi() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers channel
    
    console.log('Testing YouTube Data API with:');
    console.log('API Key:', apiKey);
    console.log('Channel ID:', channelId);
    
    if (!apiKey) {
      console.error('YouTube API Key is not set in environment variables');
      return;
    }
    
    // Make a direct API call to YouTube Data API
    console.log('Making API call to YouTube Data API...');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: apiKey
      },
      timeout: 15000, // 15 seconds timeout
      headers: {
        'User-Agent': 'Idea2Prompt/1.0.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('API call successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing YouTube Data API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request:', error.request);
      console.error('No response received from API');
    } else {
      console.error('Message:', error.message);
    }
    console.error('Config:', error.config);
  }
}

testYouTubeApi();
