// 测试完整的视频生成、预览和下载流程
const fetch = require('node-fetch');
// 确保 fetch 可用
if (typeof fetch !== 'function') {
    console.error('Fetch function not available');
    process.exit(1);
}

async function testFullWorkflow() {
    console.log('=== 开始测试完整视频生成流程 ===\n');
    
    try {
        // 1. 测试视频生成API
        console.log('1. 测试视频生成API...');
        try {
            const generateResponse = await fetch('http://localhost:3000/api/v1/video-generator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoModel: 'animatediff',
                    videoTitle: '测试视频',
                    videoDescription: '这是一个测试视频，用于测试完整的视频生成流程',
                    videoStyle: 'realistic',
                    resolution: '1080p',
                    voiceOver: 'none',
                    voiceScript: ''
                })
            });
            
            console.log('响应状态:', generateResponse.status, generateResponse.statusText);
            
            if (!generateResponse.ok) {
                const errorText = await generateResponse.text();
                throw new Error(`视频生成API失败: ${generateResponse.status} ${generateResponse.statusText}\n${errorText}`);
            }
            
            const generateData = await generateResponse.json();
            console.log('视频生成任务创建成功:', {
                taskId: generateData.taskId,
                status: generateData.status
            });
            
            const taskId = generateData.taskId;
            
            // 2. 测试视频状态查询API
            console.log('\n2. 测试视频状态查询API...');
            let statusData;
            let maxAttempts = 10;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`查询状态 (${attempts}/${maxAttempts})...`);
                
                try {
                    const statusResponse = await fetch(`http://localhost:3000/api/v1/video-generator/${taskId}`);
                    
                    if (!statusResponse.ok) {
                        const errorText = await statusResponse.text();
                        throw new Error(`状态查询API失败: ${statusResponse.status} ${statusResponse.statusText}\n${errorText}`);
                    }
                    
                    statusData = await statusResponse.json();
                    console.log('状态:', {
                        status: statusData.status,
                        progress: statusData.progress,
                        estimatedTime: statusData.estimatedTime
                    });
                    
                    if (statusData.status === 'completed') {
                        console.log('视频生成完成!');
                        break;
                    }
                    
                    if (statusData.status === 'failed') {
                        throw new Error('视频生成失败');
                    }
                    
                    // 等待2秒后再次查询
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (statusError) {
                    console.error('状态查询错误:', statusError.message);
                    // 继续尝试
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            if (attempts >= maxAttempts) {
                throw new Error('视频生成超时');
            }
            
            // 3. 测试视频下载功能
            console.log('\n3. 测试视频下载功能...');
            if (statusData.videoUrl) {
                console.log('视频URL:', statusData.videoUrl);
                
                // 测试视频文件是否可以访问
                try {
                    const videoResponse = await fetch(statusData.videoUrl);
                    if (!videoResponse.ok) {
                        throw new Error(`视频文件访问失败: ${videoResponse.status} ${videoResponse.statusText}`);
                    }
                    
                    const videoBuffer = await videoResponse.buffer();
                    console.log('视频文件大小:', videoBuffer.length, 'bytes');
                    console.log('视频下载测试成功!');
                } catch (videoError) {
                    console.error('视频下载错误:', videoError.message);
                    // 继续测试其他功能
                }
            } else {
                throw new Error('视频URL未生成');
            }
            
            // 4. 测试视频历史API
            console.log('\n4. 测试视频历史API...');
            try {
                const historyResponse = await fetch('http://localhost:3000/api/v1/video-generator/history');
                
                if (!historyResponse.ok) {
                    const errorText = await historyResponse.text();
                    throw new Error(`历史API失败: ${historyResponse.status} ${historyResponse.statusText}\n${errorText}`);
                }
                
                const historyData = await historyResponse.json();
                console.log('历史记录数量:', historyData.history ? historyData.history.length : 0);
                if (historyData.history && historyData.history.length > 0) {
                    console.log('最近的视频记录:', historyData.history[0]);
                }
            } catch (historyError) {
                console.error('历史API错误:', historyError.message);
                // 继续执行
            }
            
            console.log('\n=== 完整视频生成流程测试成功! ===');
            
        } catch (apiError) {
            console.error('API测试错误:', apiError.message);
            throw apiError;
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
        process.exit(1);
    }
}

// 运行测试
testFullWorkflow();
