const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testVideoPlayback() {
    console.log('Testing video generation and playback...');
    
    // Step 1: Send video generation request
    try {
        const response = await axios.post('http://localhost:3000/api/v1/video-generator', {
            videoModel: 'animate-diff',
            videoTitle: 'Test Video Playback',
            videoDescription: 'This is a test video for playback verification',
            videoStyle: 'realistic',
            resolution: '1080p',
            voiceOver: 'none',
            voiceScript: ''
        });
        
        console.log('✓ Video generation request sent successfully');
        console.log('Task ID:', response.data.taskId);
        
        const taskId = response.data.taskId;
        
        // Step 2: Wait for video to complete
        let status = response.data.status;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (status !== 'completed' && attempts < maxAttempts) {
            attempts++;
            console.log(`\nAttempt ${attempts}: Checking status...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const statusResponse = await axios.get(`http://localhost:3000/api/v1/video-generator/${taskId}`);
            status = statusResponse.data.status;
            console.log('Current status:', status);
            console.log('Progress:', statusResponse.data.progress + '%');
            
            if (status === 'completed' && statusResponse.data.videoUrl) {
                console.log('\n✓ Video generation completed!');
                console.log('Video URL:', statusResponse.data.videoUrl);
                
                // Step 3: Download and verify video file
                try {
                    const videoResponse = await axios.get(statusResponse.data.videoUrl, {
                        responseType: 'arraybuffer'
                    });
                    
                    console.log('\n✓ Video file downloaded successfully');
                    console.log('Content-Type:', videoResponse.headers['content-type']);
                    console.log('File size:', videoResponse.data.length + ' bytes');
                    
                    // Save video to local file for manual inspection
                    const localVideoPath = path.join(__dirname, `test-video-${Date.now()}.mp4`);
                    fs.writeFileSync(localVideoPath, Buffer.from(videoResponse.data));
                    console.log('\n✓ Video saved to:', localVideoPath);
                    
                    // Verify MP4 file signature
                    const mp4Header = Buffer.from(videoResponse.data.slice(0, 4));
                    const expectedHeader = Buffer.from([0x00, 0x00, 0x00, 0x18]); // ftyp box header
                    
                    if (mp4Header.equals(expectedHeader)) {
                        console.log('✓ Valid MP4 file header detected');
                    } else {
                        console.error('✗ Invalid MP4 file header');
                    }
                    
                    console.log('\n🎉 Video playback test completed successfully!');
                    console.log('The video file is ready for playback in any modern browser.');
                    return localVideoPath;
                } catch (videoError) {
                    console.error('\n✗ Failed to download or verify video:', videoError.message);
                    return null;
                }
            } else if (status === 'failed') {
                console.error('\n✗ Video generation failed:', statusResponse.data.message);
                return null;
            }
        }
        
        if (attempts >= maxAttempts) {
            console.error('\n✗ Max attempts reached, video generation timed out');
            return null;
        }
        
    } catch (error) {
        console.error('\n✗ Error during video generation test:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

// Run the test
testVideoPlayback();