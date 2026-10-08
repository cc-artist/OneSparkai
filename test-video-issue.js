const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 测试视频生成大模型是否真实运作
async function testVideoGenerationService() {
  console.log('=== 测试视频生成大模型真实运作情况 ===\n');
  
  // 检查视频生成服务实现
  const animateDiffServicePath = path.join(__dirname, 'server', 'services', 'animateDiffService.js');
  const videoGeneratorServicePath = path.join(__dirname, 'server', 'services', 'videoGeneratorService.js');
  const videoGeneratorManagerPath = path.join(__dirname, 'server', 'services', 'videoGeneratorManager.js');
  
  console.log('1. 检查AnimateDiffService实现：');
  const animateDiffContent = fs.readFileSync(animateDiffServicePath, 'utf8');
  if (animateDiffContent.includes('mock implementation') || animateDiffContent.includes('this.pipeline = true')) {
    console.log('   ❌ AnimateDiffService使用的是mock实现，没有真实的AI模型在运作');
    console.log('   代码位置：animateDiffService.js:85');
  } else {
    console.log('   ✅ AnimateDiffService使用的是真实AI模型实现');
  }
  
  console.log('\n2. 检查VideoGeneratorService实现：');
  const videoGeneratorContent = fs.readFileSync(videoGeneratorServicePath, 'utf8');
  if (videoGeneratorContent.includes('mockGenerateVideo') && videoGeneratorContent.includes('apiKey')) {
    console.log('   ⚠️  VideoGeneratorService设计上是调用外部API，但需要配置API密钥');
    console.log('   如果没有配置API密钥，就会使用mock实现');
    
    // 检查配置文件
    const configPath = path.join(__dirname, 'server', 'config', 'index.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    if (configContent.includes('apiKey') && configContent.includes('kling')) {
      console.log('   配置文件中包含Kling AI的API配置，但需要实际填写有效的API密钥');
    }
  } else {
    console.log('   ✅ VideoGeneratorService使用的是真实AI模型实现');
  }
  
  console.log('\n3. 检查VideoGeneratorManager实现：');
  const videoGeneratorManagerContent = fs.readFileSync(videoGeneratorManagerPath, 'utf8');
  if (videoGeneratorManagerContent.includes('service: null') && videoGeneratorManagerContent.includes('Pika AI') && videoGeneratorManagerContent.includes('Stable Video Diffusion')) {
    console.log('   ❌ Pika AI和Stable Video Diffusion服务没有实际初始化，只有AnimateDiff服务可用');
    console.log('   代码位置：videoGeneratorManager.js:20-31');
  } else {
    console.log('   ✅ 所有视频生成服务都已正确初始化');
  }
}

// 测试生成的视频文件是否有效
async function testGeneratedVideoFiles() {
  console.log('\n=== 测试生成的视频文件是否有效 ===\n');
  
  // 检查uploads/videos目录下的视频文件
  const videosDir = path.join(__dirname, 'server', 'uploads', 'videos');
  
  if (!fs.existsSync(videosDir)) {
    console.log('❌ 视频文件目录不存在');
    return;
  }
  
  const videoFiles = fs.readdirSync(videosDir);
  console.log(`找到 ${videoFiles.length} 个视频文件：`);
  
  let hasInvalidFiles = false;
  for (const file of videoFiles) {
    if (path.extname(file) === '.mp4') {
      const filePath = path.join(videosDir, file);
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      console.log(`   ${file} - ${fileSize} 字节`);
      
      // 检查文件大小，如果太小（小于1KB），则可能是无效的视频文件
      if (fileSize < 1024) {
        console.log(`   ⚠️  视频文件太小，可能是无效的MP4文件`);
        
        // 检查文件内容
        const content = fs.readFileSync(filePath);
        console.log(`   文件内容：${content.toString('hex')}`);
        
        // 检查是否只有MP4头
        if (fileSize === 52) {
          console.log(`   ❌ 这只是一个MP4文件头，没有实际的视频内容`);
        }
        
        hasInvalidFiles = true;
      }
    }
  }
  
  if (!hasInvalidFiles) {
    console.log('\n✅ 所有视频文件看起来都有效');
  } else {
    console.log('\n❌ 存在无效的视频文件');
  }
}

// 测试视频播放器不能播放视频的原因
async function testVideoPlayerIssue() {
  console.log('\n=== 测试视频播放器不能播放视频的原因 ===\n');
  
  // 检查视频生成控制器
  const videoGeneratorControllerPath = path.join(__dirname, 'server', 'controllers', 'video-generator.js');
  const videoGeneratorContent = fs.readFileSync(videoGeneratorControllerPath, 'utf8');
  
  console.log('1. 检查视频生成控制器实现：');
  if (videoGeneratorContent.includes('mp4Header') && videoGeneratorContent.includes('Buffer.from')) {
    console.log('   ⚠️  视频生成控制器只是生成了MP4文件头，没有实际的视频内容');
    console.log('   代码位置：video-generator.js:262-315');
    
    // 找到具体的代码
    const mp4HeaderMatch = videoGeneratorContent.match(/const mp4Header = Buffer.from\([\s\S]*?\);/);
    if (mp4HeaderMatch) {
      console.log('   MP4头生成代码：');
      console.log(`   ${mp4HeaderMatch[0]}`);
    }
  } else {
    console.log('   ✅ 视频生成控制器生成完整的视频文件');
  }
  
  console.log('\n2. 检查静态文件服务配置：');
  const appJsPath = path.join(__dirname, 'server', 'app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  if (appJsContent.includes('express.static') && appJsContent.includes('/uploads')) {
    console.log('   ✅ 静态文件服务已正确配置，uploads目录可以通过/uploads路径访问');
    console.log('   代码位置：app.js:46');
  } else {
    console.log('   ❌ 静态文件服务配置不正确');
  }
  
  console.log('\n3. 测试视频文件访问：');
  // 找到一个视频文件进行测试
  const videosDir = path.join(__dirname, 'server', 'uploads', 'videos');
  const videoFiles = fs.readdirSync(videosDir);
  const mp4File = videoFiles.find(file => path.extname(file) === '.mp4');
  
  if (mp4File) {
    const testFilePath = path.join(videosDir, mp4File);
    const fileSize = fs.statSync(testFilePath).size;
    
    console.log(`   测试文件：${mp4File}`);
    console.log(`   文件大小：${fileSize} 字节`);
    
    // 检查文件是否是有效的MP4文件
    const content = fs.readFileSync(testFilePath);
    const isMp4 = content.slice(4, 8).toString() === 'ftyp';
    
    if (isMp4) {
      console.log('   ✅ 是有效的MP4文件格式');
      
      // 检查是否有moov和mdat box
      const hasMoov = content.includes('moov');
      const hasMdat = content.includes('mdat');
      
      console.log(`   包含moov box：${hasMoov}`);
      console.log(`   包含mdat box：${hasMdat}`);
      
      if (!hasMdat) {
        console.log('   ❌ 缺少mdat box，没有实际的视频数据');
        console.log('   这是视频不能播放的主要原因');
      }
    } else {
      console.log('   ❌ 不是有效的MP4文件格式');
    }
  } else {
    console.log('   ⚠️  没有找到测试用的MP4文件');
  }
}

// 运行所有测试
async function runAllTests() {
  await testVideoGenerationService();
  await testGeneratedVideoFiles();
  await testVideoPlayerIssue();
  
  console.log('\n=== 测试总结 ===\n');
  console.log('1. 视频生成大模型现状：');
  console.log('   - AnimateDiffService：使用mock实现，没有真实AI模型');
  console.log('   - VideoGeneratorService：需要配置API密钥才能调用真实AI服务');
  console.log('   - Pika AI和Stable Video Diffusion：未初始化，不可用');
  
  console.log('\n2. 视频不能播放的原因：');
  console.log('   - 生成的视频文件只是MP4头（52字节），没有实际的视频内容');
  console.log('   - 缺少mdat box，播放器无法解析视频数据');
  console.log('   - 静态文件服务配置正确，但文件本身无效');
  
  console.log('\n3. 解决方案：');
  console.log('   - 实现真实的AI模型调用或配置有效的API密钥');
  console.log('   - 生成完整的视频文件，包含实际的视频内容和mdat box');
  console.log('   - 或者使用FFmpeg等工具生成真实的测试视频文件');
}

// 执行测试
runAllTests().catch(console.error);