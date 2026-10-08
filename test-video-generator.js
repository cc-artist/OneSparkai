const aiVideoGenerator = require('./server/services/ai-video-generator');

// 测试不同提示词的视频生成
async function testVideoGeneration() {
    console.log('开始测试视频生成功能...');
    
    // 测试提示词列表
    const testPrompts = [
        'A beautiful sunset over the ocean with waves crashing on the beach',
        'A futuristic city with flying cars and neon lights',
        'A peaceful forest with birds singing and sunlight filtering through trees',
        'A busy street in Tokyo with people and traffic',
        'A space station orbiting Earth with astronauts working outside'
    ];
    
    // 测试配置选项
    const testOptions = [
        { quality: 'medium', videoModel: 'stableVideo' },
        { quality: 'high', videoModel: 'animatediff' },
        { speedQuality: 'balanced', videoModel: 'text2video-zero' }
    ];
    
    // 测试结果
    const testResults = [];
    
    // 运行测试
    for (let i = 0; i < testPrompts.length; i++) {
        const prompt = testPrompts[i];
        const options = testOptions[i % testOptions.length];
        
        console.log(`\n测试 ${i + 1}: 提示词: "${prompt}"`);
        console.log(`配置:`, options);
        
        try {
            const startTime = Date.now();
            
            // 生成视频
            const videoPath = await aiVideoGenerator.generateVideo(prompt, options, (progress) => {
                console.log(`进度: ${progress.progress}% - ${progress.message}`);
            });
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log(`生成完成，视频路径: ${videoPath}`);
            console.log(`生成时间: ${duration.toFixed(2)} 秒`);
            
            testResults.push({
                prompt,
                options,
                success: true,
                videoPath,
                duration
            });
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            
            testResults.push({
                prompt,
                options,
                success: false,
                error: error.message
            });
        }
    }
    
    // 输出测试结果
    console.log('\n=== 测试结果汇总 ===');
    testResults.forEach((result, index) => {
        console.log(`\n测试 ${index + 1}:`);
        console.log(`提示词: ${result.prompt}`);
        console.log(`配置:`, result.options);
        if (result.success) {
            console.log(`状态: 成功`);
            console.log(`视频路径: ${result.videoPath}`);
            console.log(`生成时间: ${result.duration.toFixed(2)} 秒`);
        } else {
            console.log(`状态: 失败`);
            console.log(`错误: ${result.error}`);
        }
    });
    
    // 统计成功率
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    const successRate = (successCount / totalCount) * 100;
    
    console.log(`\n=== 测试统计 ===`);
    console.log(`总测试数: ${totalCount}`);
    console.log(`成功数: ${successCount}`);
    console.log(`成功率: ${successRate.toFixed(2)}%`);
    
    return testResults;
}

// 测试系统资源检测
async function testSystemResources() {
    console.log('\n=== 测试系统资源检测 ===');
    const resources = aiVideoGenerator.getSystemResources();
    console.log('系统资源:', resources);
    return resources;
}

// 测试参数验证
function testParameterValidation() {
    console.log('\n=== 测试参数验证 ===');
    
    const testParams = [
        { width: 1920, height: 1080, duration: 30, fps: 30 }, // 有效参数
        { width: 320, height: 240, duration: 60, fps: 60 },   // 无效参数（宽度太小）
        { width: 2048, height: 1080, duration: 1, fps: 15 },  // 无效参数（宽度太大）
        { width: 1920, height: 1080, duration: 61, fps: 30 }  // 无效参数（时长太长）
    ];
    
    testParams.forEach((params, index) => {
        console.log(`\n参数集 ${index + 1}:`, params);
        const validation = aiVideoGenerator.validateVideoParams(params);
        console.log('验证结果:', validation);
    });
}

// 测试优化建议
function testOptimizationSuggestions() {
    console.log('\n=== 测试优化建议 ===');
    
    const testOptions = [
        { width: 1920, height: 1080, duration: 30, fps: 30 }, // 高资源消耗
        { width: 1024, height: 576, duration: 15, fps: 24 },  // 中等资源消耗
        { width: 640, height: 360, duration: 10, fps: 24 }    // 低资源消耗
    ];
    
    testOptions.forEach((options, index) => {
        console.log(`\n选项集 ${index + 1}:`, options);
        const suggestions = aiVideoGenerator.getOptimizationSuggestions(options);
        console.log('优化建议:', suggestions);
    });
}

// 运行所有测试
async function runAllTests() {
    console.log('开始运行视频生成系统测试...');
    
    await testSystemResources();
    testParameterValidation();
    testOptimizationSuggestions();
    await testVideoGeneration();
    
    console.log('\n所有测试完成!');
}

// 执行测试
runAllTests().catch(console.error);
