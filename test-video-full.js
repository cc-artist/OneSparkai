const http = require('http');
const fs = require('fs');
const path = require('path');

// Test server URL - matches our current Express server
const SERVER_URL = 'http://localhost:3000';

// Test 1: Create a video generation task
async function createVideoGenerationTask() {
    console.log('=== 测试1：创建视频生成任务 ===');
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/video-generator',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const requestData = {
        videoModel: 'animediff',
        videoTitle: 'Test Video',
        videoDescription: 'This is a test video',
        videoStyle: 'anime',
        resolution: '1080p',
        voiceOver: 'none',
        voiceScript: ''
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ 视频生成任务创建成功');
                    console.log('   Task ID:', result.taskId);
                    console.log('   Status:', result.status);
                    resolve(result);
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ 创建视频生成任务失败:', error);
            reject(error);
        });
        
        req.write(JSON.stringify(requestData));
        req.end();
    });
}

// Test 2: Check video status
async function checkVideoStatus(taskId) {
    console.log(`\n=== 测试2：检查视频状态 (Task ID: ${taskId}) ===`);
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/video-generator/${taskId}`,
        method: 'GET'
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ 视频状态检查成功 (${Math.round(result.progress)}%)`);
                    console.log('   Status:', result.status);
                    console.log('   Progress:', result.progress + '%');
                    if (result.videoUrl) {
                        console.log('   Video URL:', result.videoUrl);
                    }
                    resolve(result);
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ 检查视频状态失败:', error);
            reject(error);
        });
        
        req.end();
    });
}

// Test 3: Download and validate video
async function downloadAndValidateVideo(videoUrl, taskId) {
    console.log(`\n=== 测试3：下载并验证视频 ===`);
    console.log('   Video URL:', videoUrl);
    
    const parsedUrl = new URL(videoUrl);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET'
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`下载视频失败，状态码: ${res.statusCode}`));
                return;
            }
            
            const contentLength = parseInt(res.headers['content-length'] || '0');
            const contentType = res.headers['content-type'];
            
            console.log('   Content-Type:', contentType);
            console.log('   Content-Length:', contentLength, 'bytes');
            
            // Check if it's an MP4 file
            if (contentType !== 'video/mp4') {
                reject(new Error(`视频文件类型错误，预期: video/mp4，实际: ${contentType}`));
                return;
            }
            
            // Save the video to a file
            const videoPath = path.join(__dirname, `test-video-${taskId}.mp4`);
            const writeStream = fs.createWriteStream(videoPath);
            
            res.pipe(writeStream);
            
            writeStream.on('finish', () => {
                writeStream.close();
                
                // Validate MP4 file header
                const buffer = fs.readFileSync(videoPath, { encoding: null, flag: 'r' });
                const header = buffer.slice(0, 16).toString('hex');
                
                console.log('   File path:', videoPath);
                console.log('   File size:', fs.statSync(videoPath).size, 'bytes');
                console.log('   MP4 Header:', buffer.slice(0, 16).toString('hex'));
                
                // Check if it's a valid MP4 file (ftyp box at the beginning)
                const isMp4 = buffer.slice(4, 8).toString() === 'ftyp';
                if (isMp4) {
                    console.log('✅ 视频文件验证成功，是有效的MP4文件');
                    resolve(videoPath);
                } else {
                    console.error('❌ 视频文件验证失败，不是有效的MP4文件');
                    reject(new Error('无效的MP4文件'));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ 下载视频失败:', error);
            reject(error);
        });
        
        req.end();
    });
}

// Test 4: Test video URL accessibility
async function testVideoUrlAccessibility(videoUrl) {
    console.log(`\n=== 测试4：测试视频URL可访问性 ===`);
    console.log('   Testing URL:', videoUrl);
    
    const parsedUrl = new URL(videoUrl);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'HEAD'
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log('   Status:', res.statusCode);
            console.log('   Content-Type:', res.headers['content-type']);
            
            if (res.statusCode === 200 && res.headers['content-type'] === 'video/mp4') {
                console.log('✅ 视频URL可访问性测试通过');
                resolve(true);
            } else {
                console.error('❌ 视频URL可访问性测试失败');
                reject(new Error(`URL访问失败，状态码: ${res.statusCode}`));
            }
        });
        
        req.on('error', (error) => {
            console.error('❌ 测试视频URL可访问性失败:', error);
            reject(error);
        });
        
        req.end();
    });
}

// Main test function
async function runFullTest() {
    console.log('🚀 开始视频生成完整测试...');
    console.log('   服务器地址:', SERVER_URL);
    console.log('   当前时间:', new Date().toLocaleString());
    
    try {
        // Test 1: Create video generation task
        const taskResult = await createVideoGenerationTask();
        const taskId = taskResult.taskId;
        
        // Test 2: Check video status until completed or timeout
        let statusResult;
        let attempts = 0;
        const maxAttempts = 15;
        
        while (attempts < maxAttempts) {
            attempts++;
            statusResult = await checkVideoStatus(taskId);
            
            if (statusResult.status === 'completed') {
                break;
            }
            
            if (statusResult.status === 'failed') {
                throw new Error('视频生成失败');
            }
            
            // Wait for 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (statusResult.status !== 'completed') {
            throw new Error(`视频生成超时，最大尝试次数: ${maxAttempts}`);
        }
        
        const videoUrl = statusResult.videoUrl;
        
        // Test 3: Test video URL accessibility
        await testVideoUrlAccessibility(videoUrl);
        
        // Test 4: Download and validate video
        await downloadAndValidateVideo(videoUrl, taskId);
        
        console.log('\n🎉 所有测试通过！视频生成功能正常工作');
        console.log('   测试结果总结:');
        console.log('   ✅ 视频生成任务创建成功');
        console.log('   ✅ 视频状态检查正常');
        console.log('   ✅ 视频生成完成');
        console.log('   ✅ 视频URL可访问');
        console.log('   ✅ 视频文件有效（MP4格式）');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        return false;
    }
}

// Run the test
runFullTest().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ 测试过程中出现未捕获的错误:', error);
    process.exit(1);
});
