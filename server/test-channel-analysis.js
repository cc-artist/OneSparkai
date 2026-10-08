const axios = require('axios');

async function testChannelAnalysis() {
  try {
    const channelUrl = 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers channel
    const analysisType = 'basic';
    
    console.log(`Testing channel analysis for: ${channelUrl}`);
    
    const response = await axios.post('http://localhost:3000/api/v1/channel-analysis/analyze', {
      channelUrl,
      analysisType
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Analysis result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if the result contains real data (not mock data)
    if (response.data.channelName && response.data.channelName !== 'Unknown') {
      console.log('\n✅ Success: API returned real channel data!');
      console.log(`Channel Name: ${response.data.channelName}`);
      console.log(`Subscribers: ${response.data.subscribers}`);
      console.log(`Total Views: ${response.data.totalViews}`);
      console.log(`Total Videos: ${response.data.totalVideos}`);
    } else {
      console.log('\n❌ Warning: API may have returned mock data');
    }
    
  } catch (error) {
    console.error('Error testing channel analysis:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testChannelAnalysis();
