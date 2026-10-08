const axios = require('axios');

async function testVideoGeneration() {
    try {
        console.log('Testing video generation API...');
        
        const response = await axios.post('http://localhost:3000/api/v1/video-generator', {
            videoModel: 'model-1',
            videoTitle: 'Test Video',
            videoDescription: 'This is a test video',
            videoStyle: 'realistic',
            resolution: '1280x720',
            voiceOver: false,
            voiceScript: ''
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Video generation started successfully!');
        console.log('Response:', response.data);
        
        // Return taskId for further testing
        return response.data.taskId;
    } catch (error) {
        console.error('Error testing video generation:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function testGetVideoStatus(taskId) {
    try {
        console.log(`\nTesting get video status API for taskId: ${taskId}...`);
        
        const response = await axios.get(`http://localhost:3000/api/v1/video-generator/${taskId}`);
        
        console.log('Video status retrieved successfully!');
        console.log('Response:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('Error getting video status:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function runTests() {
    try {
        const taskId = await testVideoGeneration();
        
        // Wait a few seconds and check status
        console.log('\nWaiting for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await testGetVideoStatus(taskId);
        
        // Wait more and check again for completion
        console.log('\nWaiting for another 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalStatus = await testGetVideoStatus(taskId);
        
        if (finalStatus.status === 'completed' && finalStatus.videoUrl) {
            console.log('\n✅ Video generation completed successfully!');
            console.log('Video URL:', finalStatus.videoUrl);
        } else {
            console.log('\n⏳ Video generation is still in progress...');
        }
        
    } catch (error) {
        console.error('\n❌ Tests failed:', error);
    }
}

runTests();
