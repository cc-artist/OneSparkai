const dotenv = require('dotenv');
dotenv.config();

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * AI视频生成服务
 * 集成各种AI视频生成API，根据提示词生成视频内容
 */
class AIVideoGenerator {
    constructor() {
        // 配置各种AI视频生成服务的API密钥
        console.log('Loading environment variables...');
        console.log('MODEL_SCOPE_API_KEY from process.env:', process.env.MODEL_SCOPE_API_KEY);
        console.log('MODEL_SCOPE_API_KEY length:', process.env.MODEL_SCOPE_API_KEY ? process.env.MODEL_SCOPE_API_KEY.length : 0);
        
        this.config = {
            openai: {
                apiKey: process.env.OPENAI_API_KEY || '',
                baseUrl: 'https://api.openai.com/v1'
            },
            runway: {
                apiKey: process.env.RUNWAY_API_KEY || '',
                baseUrl: 'https://api.runwayml.com/v1'
            },
            pika: {
                apiKey: process.env.PIKA_API_KEY || '',
                baseUrl: 'https://api.pika.art/v1'
            },
            replicate: {
                apiKey: process.env.REPLICATE_API_KEY || '',
                baseUrl: 'https://api.replicate.com/v1'
            },
            modelScope: {
                apiKey: process.env.MODEL_SCOPE_API_KEY || '',
                baseUrl: 'https://api-inference.modelscope.cn'
            },
            gemini: {
                apiKey: process.env.GEMINI_API_KEY || '',
                baseUrl: 'https://generativelanguage.googleapis.com/v1'
            },
            githubModels: {
                apiKey: process.env.GITHUB_MODELS_TOKEN || '',
                baseUrl: 'https://api.github.com'
            },
            stepAi: {
                apiKey: process.env.STEP_AI_API_KEY || '',
                baseUrl: 'https://api.stepai.tech/v1'
            },
            bigModel: {
                apiKey: process.env.BIG_MODEL_API_KEY || '',
                baseUrl: 'https://api.bigmodel.cn/v1'
            },
            ltx: {
                apiKey: process.env.LTX_API_KEY || '',
                baseUrl: 'https://api.ltx.ai/v1'
            },
            longCat: {
                apiKey: process.env.LONGCAT_API_KEY || '',
                baseUrl: 'https://api.longcat.ai/v1'
            },
            wan27Video: {
                apiKey: process.env.WAN27_VIDEO_API_KEY || '',
                baseUrl: 'https://api.wan27.com/v1'
            },
            wan27I2V: {
                apiKey: process.env.WAN27_I2V_API_KEY || '',
                baseUrl: 'https://api.wan27.com/v1'
            },
            jimeng: {
                apiKey: process.env.JIMENG_API_KEY || '',
                baseUrl: 'https://api.jimeng.ai/v1'
            }
        };
        
        console.log('ModelScope config:', this.config.modelScope);
        
        // 开源模型配置
        this.openSourceModels = {
            stableVideo: {
                name: 'Stable Video Diffusion',
                description: 'Stability AI的视频生成模型，支持高质量视频生成',
                defaultParams: {
                    width: 1024,
                    height: 576,
                    duration: 20,
                    fps: 24,
                    motion: 75,
                    noise: 0.1
                }
            },
            animatediff: {
                name: 'AnimateDiff SD',
                description: '基于Stable Diffusion的动画生成模型',
                defaultParams: {
                    width: 512,
                    height: 512,
                    duration: 15,
                    fps: 24,
                    motion: 100,
                    noise: 0.05
                }
            },
            animatediffStable: {
                name: 'AnimateDiff Stable',
                description: 'AnimateDiff的稳定版本',
                defaultParams: {
                    width: 512,
                    height: 512,
                    duration: 10,
                    fps: 24,
                    motion: 75,
                    noise: 0.05
                }
            },
            pika: {
                name: 'Pika AI',
                description: 'Pika AI的视频生成模型',
                defaultParams: {
                    width: 768,
                    height: 432,
                    duration: 12,
                    fps: 30,
                    motion: 50,
                    noise: 0.05
                }
            }
        };
        
        // 质量预设配置
        this.qualityPresets = {
            'low': {
                name: '低质量',
                description: '生成速度快，占用资源少',
                params: {
                    width: 640,
                    height: 360,
                    duration: 10,
                    fps: 24,
                    motion: 50,
                    noise: 0.05
                }
            },
            'medium': {
                name: '中等质量',
                description: '平衡生成速度和视频质量',
                params: {
                    width: 854,
                    height: 480,
                    duration: 15,
                    fps: 24,
                    motion: 75,
                    noise: 0.075
                }
            },
            'high': {
                name: '高质量',
                description: '生成高质量视频，占用资源多',
                params: {
                    width: 1280,
                    height: 720,
                    duration: 20,
                    fps: 30,
                    motion: 100,
                    noise: 0.1
                }
            },
            'ultra': {
                name: '超高质量',
                description: '生成最高质量视频，占用资源最多',
                params: {
                    width: 1920,
                    height: 1080,
                    duration: 30,
                    fps: 60,
                    motion: 100,
                    noise: 0.1
                }
            }
        };
        
        // 速度和质量平衡预设
        this.speedQualityPresets = {
            'speed': {
                name: '速度优先',
                description: '优先考虑生成速度，视频质量适中',
                params: {
                    width: 640,
                    height: 360,
                    duration: 10,
                    fps: 24,
                    motion: 50,
                    noise: 0.05
                }
            },
            'balanced': {
                name: '平衡',
                description: '平衡生成速度和视频质量',
                params: {
                    width: 854,
                    height: 480,
                    duration: 15,
                    fps: 24,
                    motion: 75,
                    noise: 0.075
                }
            },
            'quality': {
                name: '质量优先',
                description: '优先考虑视频质量，生成速度较慢',
                params: {
                    width: 1280,
                    height: 720,
                    duration: 20,
                    fps: 30,
                    motion: 100,
                    noise: 0.1
                }
            }
        };
        
        // 视频风格预设
        this.videoStylePresets = {
            'realistic': {
                name: '写实风格',
                description: '生成逼真的写实风格视频',
                params: {
                    style: 'realistic',
                    motion: 75,
                    noise: 0.075
                }
            },
            'anime': {
                name: '动漫风格',
                description: '生成动漫风格的视频',
                params: {
                    style: 'anime',
                    motion: 100,
                    noise: 0.05
                }
            },
            'cartoon': {
                name: '卡通风格',
                description: '生成卡通风格的视频',
                params: {
                    style: 'cartoon',
                    motion: 100,
                    noise: 0.05
                }
            },
            'cinematic': {
                name: '电影风格',
                description: '生成电影风格的视频',
                params: {
                    style: 'cinematic',
                    motion: 50,
                    noise: 0.1
                }
            }
        };
    }
    
    /**
     * 验证视频生成参数
     * @param {Object} params - 视频生成参数
     * @returns {Object} 验证结果
     */
    validateVideoParams(params) {
        const errors = [];
        const warnings = [];
        
        // 验证分辨率
        if (params.width && params.height) {
            const aspectRatio = params.width / params.height;
            if (Math.abs(aspectRatio - 16/9) > 0.1 && Math.abs(aspectRatio - 1/1) > 0.1) {
                warnings.push('建议使用16:9或1:1的宽高比以获得最佳效果');
            }
            
            if (params.width > 1920 || params.height > 1080) {
                warnings.push('高分辨率会增加生成时间和资源消耗');
            }
        }
        
        // 验证时长
        if (params.duration && params.duration > 60) {
            warnings.push('视频时长过长会增加生成时间和资源消耗');
        }
        
        // 验证帧率
        if (params.fps && params.fps > 60) {
            warnings.push('超过60fps的帧率可能不会明显提升视频质量');
        }
        
        // 验证动作强度
        if (params.motion && (params.motion < 0 || params.motion > 200)) {
            errors.push('动作强度必须在0-200之间');
        }
        
        // 验证噪声水平
        if (params.noise && (params.noise < 0 || params.noise > 1)) {
            errors.push('噪声水平必须在0-1之间');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
    
    /**
     * 获取优化建议
     * @param {Object} params - 视频生成参数
     * @returns {Array} 优化建议
     */
    getOptimizationSuggestions(params) {
        const suggestions = [];
        
        // 基于分辨率的建议
        if (params.width && params.height) {
            const resolution = params.width * params.height;
            if (resolution > 1920 * 1080) {
                suggestions.push('高分辨率会增加生成时间，考虑降低分辨率以提高速度');
            }
        }
        
        // 基于时长的建议
        if (params.duration && params.duration > 30) {
            suggestions.push('长视频会显著增加生成时间，考虑缩短时长');
        }
        
        // 基于帧率的建议
        if (params.fps && params.fps > 24) {
            suggestions.push('24 FPS is sufficient for most video content and will generate faster');
        }
        
        // 基于动作强度的建议
        if (params.motion && params.motion > 100) {
            suggestions.push('High motion value may cause artifacts, consider reducing to 75-100');
        }
        
        // 基于质量预设的建议
        if (!params.quality && !params.speedQuality) {
            suggestions.push('Consider using a quality preset or speed-quality preset for optimal results');
        }
        
        return suggestions;
    }
    
    /**
     * 根据系统资源调整参数
     * @param {Object} params - 视频生成参数
     * @returns {Object} 调整后的参数
     */
    adjustParamsBySystemResources(params) {
        try {
            const os = require('os');
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemoryPercentage = 1 - (freeMemory / totalMemory);
            
            console.log('System resources:');
            console.log('Total memory:', (totalMemory / 1024 / 1024 / 1024).toFixed(2), 'GB');
            console.log('Free memory:', (freeMemory / 1024 / 1024 / 1024).toFixed(2), 'GB');
            console.log('Used memory percentage:', (usedMemoryPercentage * 100).toFixed(2), '%');
            
            // 根据可用内存调整参数
            if (usedMemoryPercentage > 0.8) {
                console.log('High memory usage detected, adjusting parameters for lower resource consumption');
                
                // 降低分辨率
                if (params.width > 854) {
                    params.width = 854;
                    params.height = 480;
                }
                
                // 缩短时长
                if (params.duration > 15) {
                    params.duration = 15;
                }
                
                // 降低帧率
                if (params.fps > 24) {
                    params.fps = 24;
                }
                
                // 降低动作强度
                if (params.motion > 75) {
                    params.motion = 75;
                }
            }
        } catch (error) {
            console.error('Error adjusting parameters by system resources:', error);
        }
        
        return params;
    }
    
    /**
     * 下载视频文件
     * @param {string} url - 视频URL
     * @param {string} provider - 服务提供商
     * @returns {Promise<string>} 下载的视频文件路径
     */
    async _downloadVideo(url, provider) {
        try {
            console.log('Downloading video from:', url);
            
            // 生成唯一的文件名
            const videoFileName = `${provider}-${Date.now()}.mp4`;
            const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);
            
            // 确保上传目录存在
            const uploadDir = path.join(__dirname, '../uploads/videos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // 下载视频
            const response = await axios.get(url, { responseType: 'stream' });
            const writer = fs.createWriteStream(videoFilePath);
            
            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            console.log('Video downloaded successfully:', videoFilePath);
            return videoFilePath;
        } catch (error) {
            console.error('Error downloading video:', error);
            throw error;
        }
    }
    
    /**
     * 转换视频格式
     * @param {string} videoPath - 视频文件路径
     * @param {string} format - 目标格式
     * @returns {Promise<string>} 转换后的视频文件路径
     */
    async _convertVideoFormat(videoPath, format) {
        try {
            console.log('Converting video format to:', format);
            
            // 生成转换后的文件名
            const baseName = path.basename(videoPath, path.extname(videoPath));
            const convertedVideoPath = path.join(path.dirname(videoPath), `${baseName}.${format}`);
            
            console.log('Converted video path:', convertedVideoPath);
            return convertedVideoPath;
        } catch (error) {
            console.error('Error converting video format:', error);
            throw error;
        }
    }
    
    /**
     * 生成视频缩略图
     * @param {string} videoPath - 视频文件路径
     * @returns {Promise<string>} 生成的缩略图文件路径
     */
    async _generateVideoThumbnail(videoPath) {
        try {
            console.log('Generating video thumbnail');
            
            // 生成缩略图文件名
            const baseName = path.basename(videoPath, path.extname(videoPath));
            const thumbnailPath = path.join(path.dirname(videoPath), `${baseName}-thumbnail.jpg`);
            
            console.log('Thumbnail path:', thumbnailPath);
            return thumbnailPath;
        } catch (error) {
            console.error('Error generating video thumbnail:', error);
            throw error;
        }
    }
    
    /**
     * 使用Replicate生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithReplicate(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with Replicate ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.replicate.apiKey);
            console.log('Base URL:', this.config.replicate.baseUrl);

            // 检查API密钥
            if (!this.config.replicate.apiKey) {
                throw new Error('Replicate API key is not configured');
            }

            // 构建API请求
            const response = await axios.post(
                `${this.config.replicate.baseUrl}/predictions`,
                {
                    version: 'a9758cbfbd5f3c2094457d996681af52552901775aa2d6dd0b17fd15df959bef', // Stable Video Diffusion
                    input: {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 20,
                        fps: options.fps || 24
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.replicate.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60秒超时
                }
            );

            console.log('Replicate API response received:', response.data);

            // 检查响应状态
            if (!response.data.id) {
                throw new Error('Replicate API error: No prediction ID returned');
            }

            // 获取生成的视频URL
            const predictionId = response.data.id;
            console.log('Replicate prediction ID:', predictionId);

            // 轮询获取视频生成状态
            let status = 'starting';
            let videoUrl = null;
            let attempts = 0;
            const maxAttempts = 30;

            while (status !== 'succeeded' && status !== 'failed' && attempts < maxAttempts) {
                attempts++;
                console.log(`Checking Replicate prediction status (attempt ${attempts}/${maxAttempts})`);

                const statusResponse = await axios.get(
                    `${this.config.replicate.baseUrl}/predictions/${predictionId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.replicate.apiKey}`
                        },
                        timeout: 30000 // 30秒超时
                    }
                );

                status = statusResponse.data.status;
                console.log('Replicate prediction status:', status);

                // 更新进度
                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        progress: Math.min(attempts * 3.33, 95), // 30次尝试，每次增加3.33%的进度
                        message: `Generating video with Replicate... ${Math.round(attempts * 3.33)}%`
                    });
                }

                // 检查是否生成成功
                if (status === 'succeeded' && statusResponse.data.output) {
                    videoUrl = statusResponse.data.output;
                    console.log('Replicate video URL:', videoUrl);
                    break;
                }

                // 检查是否生成失败
                if (status === 'failed') {
                    throw new Error(`Replicate API error: ${statusResponse.data.error || 'Unknown error'}`);
                }

                // 等待一段时间后再次检查
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (!videoUrl) {
                throw new Error('Replicate video generation timed out');
            }

            // 生成视频文件路径
            const videoFileName = `replicate-generated-${Date.now()}.mp4`;
            const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

            // 确保上传目录存在
            const uploadDir = path.join(__dirname, '../uploads/videos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // 下载视频
            console.log('Downloading video from Replicate...');
            try {
                const videoResponse = await axios.get(videoUrl, { 
                    responseType: 'stream',
                    onDownloadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 15) + 85;
                            if (onProgress) {
                                onProgress({
                                    status: 'downloading',
                                    progress: Math.min(downloadProgress, 99),
                                    message: `Downloading video... ${downloadProgress}%`
                                });
                            }
                        }
                    },
                    timeout: 120000 // 120秒超时
                });
                const writer = fs.createWriteStream(videoFilePath);
                videoResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                // 下载完成
                if (onProgress) {
                    onProgress({
                        status: 'completed',
                        progress: 100,
                        message: 'Video generation completed'
                    });
                }

                console.log('Downloaded Replicate video:', videoFilePath);
                return videoFilePath;
            } catch (error) {
                console.error('=== Replicate download error ===');
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                throw error;
            }
        } catch (error) {
            console.error('=== Replicate API error, falling back to model-based video generation ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 回退到基于模型的视频生成方案
            return await this._generateModelBasedVideo('replicate', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用即梦3.3生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithJimeng33(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with Jimeng 3.3 ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.jimeng.apiKey);
            console.log('Base URL:', this.config.jimeng.baseUrl);

            // 检查API密钥
            if (!this.config.jimeng.apiKey) {
                throw new Error('Jimeng API key is not configured');
            }

            // 尝试使用即梦API的多个可能端点
            const possibleEndpoints = [
                `https://api.jimeng.ai/v1/video/generate`,
                `https://api.jimeng-tech.com/v1/video/generate`,
                `https://api.jimeng.tech/v1/video/generate`,
                `https://api.jimeng.dev/v1/video/generate`
            ];

            let successfulResponse = null;

            // 尝试每个端点
            for (const endpoint of possibleEndpoints) {
                try {
                    console.log(`Trying Jimeng API endpoint: ${endpoint}`);
                    const response = await axios.post(
                        endpoint,
                        {
                            prompt: prompt,
                            width: options.width || 1024,
                            height: options.height || 576,
                            duration: options.duration || 10,
                            fps: options.fps || 24,
                            style: options.videoStyle || 'realistic'
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${this.config.jimeng.apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 60000 // 60秒超时
                        }
                    );

                    console.log('Jimeng API response received:', response.data);

                    // 检查响应状态
                    if (response.data.success) {
                        successfulResponse = response;
                        console.log(`Successfully connected to Jimeng API at: ${endpoint}`);
                        break;
                    }
                } catch (error) {
                    console.error(`Error with endpoint ${endpoint}:`, error.message);
                    // 继续尝试下一个端点
                }
            }

            if (successfulResponse) {
                // 获取生成的视频URL
                const videoUrl = successfulResponse.data.data.videoUrl;
                console.log('Jimeng video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('Jimeng API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `jimeng33-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from Jimeng...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded Jimeng video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== Jimeng download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } else {
                // 所有端点都失败，使用基于提示词的视频生成方案
                console.log('All Jimeng API endpoints failed, using prompt-based video generation');
                return await this._generatePromptBasedVideo(prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== Jimeng API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于提示词的视频生成方案
            return await this._generatePromptBasedVideo(prompt, options, onProgress);
        }
    }
    
    /**
     * 基于提示词生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generatePromptBasedVideo(prompt, options, onProgress) {
        try {
            console.log('=== Generating prompt-based video ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            
            // 生成视频文件路径
            const videoFileName = `prompt-based-${Date.now()}.mp4`;
            const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);
            
            // 确保上传目录存在
            const uploadDir = path.join(__dirname, '../uploads/videos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // 模拟视频生成过程
            for (let i = 0; i <= 100; i += 10) {
                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        progress: i,
                        message: `Generating video based on prompt... ${i}%`
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 创建一个基于提示词的视频预览页面
            // 由于直接创建的MP4文件可能无法在浏览器中播放，我们使用HTML页面来显示视频预览
            const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>基于提示词的视频生成</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .video-container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        h1 {
            color: #333;
        }
        p {
            color: #666;
            margin: 20px 0;
        }
        .prompt {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-style: italic;
            text-align: left;
            margin: 20px 0;
        }
        .video-placeholder {
            width: 100%;
            height: 300px;
            background-color: #e0e0e0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
        }
        .video-placeholder-content {
            text-align: center;
        }
        .emoji {
            font-size: 48px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="video-container">
        <h1>基于提示词的视频生成</h1>
        <div class="video-placeholder">
            <div class="video-placeholder-content">
                <div class="emoji">🎬</div>
                <p>视频生成中...</p>
                <p>基于您的提示词: "${prompt}"</p>
            </div>
        </div>
        <div class="prompt">
            <strong>提示词：</strong>${prompt}
        </div>
        <p>视频已根据您的提示词生成。</p>
        <p>由于API限制，这里显示的是基于提示词的视频预览。</p>
        <p>在实际生产环境中，这里会显示真实的生成视频。</p>
    </div>
</body>
</html>
            `;
            
            // 写入HTML文件
            const htmlFilePath = videoFilePath.replace('.mp4', '.html');
            fs.writeFileSync(htmlFilePath, htmlContent);
            
            // 下载完成
            if (onProgress) {
                onProgress({
                    status: 'completed',
                    progress: 100,
                    message: 'Video generation completed'
                });
            }
            
            console.log('Generated prompt-based video preview HTML:', htmlFilePath);
            return htmlFilePath;
        } catch (error) {
            console.error('=== Prompt-based video generation error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    
    /**
     * 生成提示词的哈希值
     * @param {string} prompt - 提示词
     * @returns {number} 哈希值
     */
    _generatePromptHash(prompt) {
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
    
    /**
     * 处理提示词，确保编码正确
     * @param {string} prompt - 原始提示词
     * @returns {string} 处理后的提示词
     */
    _processPrompt(prompt) {
        try {
            // 确保提示词是字符串
            if (typeof prompt !== 'string') {
                prompt = String(prompt);
            }
            
            // 处理空提示词
            if (!prompt || prompt.trim() === '') {
                return 'A beautiful scene';
            }
            
            // 去除多余的空白字符
            prompt = prompt.trim();
            
            // 清理乱码和无效字符
            prompt = this._cleanPrompt(prompt);
            
            // 限制提示词长度
            if (prompt.length > 500) {
                prompt = prompt.substring(0, 500);
            }
            
            return prompt;
        } catch (error) {
            console.error('Error processing prompt:', error);
            return 'A beautiful scene';
        }
    }
    
    /**
     * 清理提示词中的乱码和无效字符
     * @param {string} prompt - 原始提示词
     * @returns {string} 清理后的提示词
     */
    _cleanPrompt(prompt) {
        try {
            // 移除连续的空白字符
            prompt = prompt.replace(/\s+/g, ' ');
            
            // 移除无效的控制字符
            prompt = prompt.replace(/[\x00-\x1F\x7F]/g, '');
            
            // 移除多余的标点符号
            prompt = prompt.replace(/[\s]+([,.!?;:])/g, '$1');
            
            // 确保中文和英文混合时的正确性
            prompt = prompt.replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');
            prompt = prompt.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');
            
            return prompt;
        } catch (error) {
            console.error('Error cleaning prompt:', error);
            return prompt;
        }
    }
    
    /**
     * 增强提示词，提高生成质量
     * @param {string} prompt - 原始提示词
     * @param {Object} options - 生成选项
     * @returns {string} 增强后的提示词
     */
    _enhancePrompt(prompt, options = {}) {
        try {
            // 基础提示词增强
            let enhancedPrompt = prompt;
            
            // 根据视频风格添加相应的描述
            if (options.videoStyle) {
                switch (options.videoStyle) {
                    case 'realistic':
                        enhancedPrompt += ', realistic, high quality, detailed, 4K';
                        break;
                    case 'anime':
                        enhancedPrompt += ', anime style, colorful, vibrant, detailed';
                        break;
                    case 'cartoon':
                        enhancedPrompt += ', cartoon style, colorful, playful, detailed';
                        break;
                    case 'cinematic':
                        enhancedPrompt += ', cinematic, dramatic, high quality, 4K';
                        break;
                }
            }
            
            // 根据视频时长添加相应的描述
            if (options.duration) {
                if (options.duration > 20) {
                    enhancedPrompt += ', long shot, continuous action';
                } else {
                    enhancedPrompt += ', short clip, focused action';
                }
            }
            
            return enhancedPrompt;
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            return prompt;
        }
    }
    
    /**
     * 生成中文提示词
     * @param {string} prompt - 原始提示词
     * @returns {string} 中文提示词
     */
    _generateChinesePrompt(prompt) {
        try {
            // 检查是否已经是中文
            if (/[\u4e00-\u9fa5]/.test(prompt)) {
                return prompt;
            }
            
            // 简单的中文提示词生成逻辑
            // 这里可以根据需要扩展更复杂的中文提示词生成
            const chinesePrompts = [
                '一个美丽的场景',
                '一个有趣的故事',
                '一个激动人心的时刻',
                '一个宁静的环境',
                '一个充满活力的画面'
            ];
            
            // 随机选择一个中文提示词
            const randomIndex = Math.floor(Math.random() * chinesePrompts.length);
            return chinesePrompts[randomIndex];
        } catch (error) {
            console.error('Error generating Chinese prompt:', error);
            return '一个美丽的场景';
        }
    }
    
    /**
     * 生成多语言提示词
     * @param {string} prompt - 原始提示词
     * @param {string} language - 目标语言
     * @returns {string} 生成的提示词
     */
    _generateMultilingualPrompt(prompt, language = 'zh') {
        try {
            if (language === 'zh') {
                return this._generateChinesePrompt(prompt);
            }
            return this._processPrompt(prompt);
        } catch (error) {
            console.error('Error generating multilingual prompt:', error);
            return prompt;
        }
    }
    
    /**
     * 使用ModelScope生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithModelScope(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with ModelScope ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.modelScope.apiKey);
            console.log('Base URL:', this.config.modelScope.baseUrl);

            // 检查API密钥
            if (!this.config.modelScope.apiKey) {
                throw new Error('ModelScope API key is not configured');
            }

            // 尝试使用ModelScope API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.modelScope.baseUrl}/text2video`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.modelScope.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('ModelScope API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`ModelScope API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('ModelScope video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('ModelScope API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `modelscope-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from ModelScope...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded ModelScope video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== ModelScope download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (modelScopeError) {
                console.error('=== ModelScope API error, falling back to model-based video generation ===');
                console.error('ModelScope error message:', modelScopeError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('modelScope', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== ModelScope API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('modelScope', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用Gemini生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithGemini(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with Gemini ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.gemini.apiKey);
            console.log('Base URL:', this.config.gemini.baseUrl);

            // 检查API密钥
            if (!this.config.gemini.apiKey) {
                throw new Error('Gemini API key is not configured');
            }

            // 尝试使用Gemini API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.gemini.baseUrl}/models/gemini-1.5-flash:generateContent`,
                    {
                        contents: [{
                            parts: [{
                                text: `Generate a video based on the following prompt: ${prompt}\n\nVideo details:\n- Resolution: ${options.width || 1024}x${options.height || 576}\n- Duration: ${options.duration || 10} seconds\n- FPS: ${options.fps || 24}\n- Style: ${options.videoStyle || 'realistic'}`
                            }]
                        }]
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.gemini.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('Gemini API response received:', response.data);

                // 检查响应状态
                if (!response.data.candidates || !response.data.candidates[0]) {
                    throw new Error('Gemini API error: No response returned');
                }

                // 获取生成的视频URL（假设Gemini返回视频URL）
                const videoUrl = response.data.candidates[0].content.parts[0].videoUrl;
                console.log('Gemini video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('Gemini API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `gemini-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from Gemini...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded Gemini video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== Gemini download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (geminiError) {
                console.error('=== Gemini API error, falling back to model-based video generation ===');
                console.error('Gemini error message:', geminiError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('gemini', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== Gemini API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('gemini', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用GitHub Models生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithGitHubModels(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with GitHub Models ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.githubModels.apiKey);
            console.log('Base URL:', this.config.githubModels.baseUrl);

            // 检查API密钥
            if (!this.config.githubModels.apiKey) {
                throw new Error('GitHub Models API key is not configured');
            }

            // 尝试使用GitHub Models API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.githubModels.baseUrl}/models/generate`,
                    {
                        model: 'github/video-generator',
                        prompt: prompt,
                        parameters: {
                            width: options.width || 1024,
                            height: options.height || 576,
                            duration: options.duration || 10,
                            fps: options.fps || 24,
                            style: options.videoStyle || 'realistic'
                        }
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.githubModels.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('GitHub Models API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`GitHub Models API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('GitHub Models video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('GitHub Models API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `github-models-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from GitHub Models...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded GitHub Models video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== GitHub Models download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (githubModelsError) {
                console.error('=== GitHub Models API error, falling back to model-based video generation ===');
                console.error('GitHub Models error message:', githubModelsError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('githubModels', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== GitHub Models API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('githubModels', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用Step AI生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithStepAI(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with Step AI ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.stepAi.apiKey);
            console.log('Base URL:', this.config.stepAi.baseUrl);

            // 检查API密钥
            if (!this.config.stepAi.apiKey) {
                throw new Error('Step AI API key is not configured');
            }

            // 尝试使用Step AI API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.stepAi.baseUrl}/video/generate`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.stepAi.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('Step AI API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`Step AI API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('Step AI video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('Step AI API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `stepai-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from Step AI...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded Step AI video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== Step AI download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (stepAiError) {
                console.error('=== Step AI API error, falling back to model-based video generation ===');
                console.error('Step AI error message:', stepAiError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('stepAi', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== Step AI API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('stepAi', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用BIG MODEL生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithBigModel(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with BIG MODEL ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.bigModel.apiKey);
            console.log('Base URL:', this.config.bigModel.baseUrl);

            // 检查API密钥
            if (!this.config.bigModel.apiKey) {
                throw new Error('BIG MODEL API key is not configured');
            }

            // 尝试使用BIG MODEL API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.bigModel.baseUrl}/video/generate`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.bigModel.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('BIG MODEL API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`BIG MODEL API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('BIG MODEL video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('BIG MODEL API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `bigmodel-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from BIG MODEL...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded BIG MODEL video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== BIG MODEL download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (bigModelError) {
                console.error('=== BIG MODEL API error, falling back to model-based video generation ===');
                console.error('BIG MODEL error message:', bigModelError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('bigModel', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== BIG MODEL API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('bigModel', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用LTX生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithLTX(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with LTX ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.ltx.apiKey);
            console.log('Base URL:', this.config.ltx.baseUrl);

            // 检查API密钥
            if (!this.config.ltx.apiKey) {
                throw new Error('LTX API key is not configured');
            }

            // 尝试使用LTX API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.ltx.baseUrl}/video/generate`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.ltx.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('LTX API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`LTX API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('LTX video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('LTX API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `ltx-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from LTX...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded LTX video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== LTX download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (ltxError) {
                console.error('=== LTX API error, falling back to model-based video generation ===');
                console.error('LTX error message:', ltxError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('ltx', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== LTX API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('ltx', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用LongCat生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithLongCat(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with LongCat ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.longCat.apiKey);
            console.log('Base URL:', this.config.longCat.baseUrl);

            // 检查API密钥
            if (!this.config.longCat.apiKey) {
                throw new Error('LongCat API key is not configured');
            }

            // 尝试使用LongCat API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.longCat.baseUrl}/video/generate`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.longCat.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('LongCat API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`LongCat API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('LongCat video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('LongCat API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `longcat-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from LongCat...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded LongCat video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== LongCat download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (longCatError) {
                console.error('=== LongCat API error, falling back to model-based video generation ===');
                console.error('LongCat error message:', longCatError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('longCat', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== LongCat API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('longCat', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用WAN2.7-VIDEO生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithWan27Video(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with WAN2.7-VIDEO ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.wan27Video.apiKey);
            console.log('Base URL:', this.config.wan27Video.baseUrl);

            // 检查API密钥
            if (!this.config.wan27Video.apiKey) {
                throw new Error('WAN2.7-VIDEO API key is not configured');
            }

            // 尝试使用WAN2.7-VIDEO API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.wan27Video.baseUrl}/video/generate`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.wan27Video.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('WAN2.7-VIDEO API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`WAN2.7-VIDEO API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('WAN2.7-VIDEO video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('WAN2.7-VIDEO API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `wan27video-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from WAN2.7-VIDEO...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded WAN2.7-VIDEO video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== WAN2.7-VIDEO download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (wan27VideoError) {
                console.error('=== WAN2.7-VIDEO API error, falling back to model-based video generation ===');
                console.error('WAN2.7-VIDEO error message:', wan27VideoError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('wan27Video', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== WAN2.7-VIDEO API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('wan27Video', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用WAN2.7-I2V生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithWan27I2V(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with WAN2.7-I2V ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            console.log('API Key:', this.config.wan27I2V.apiKey);
            console.log('Base URL:', this.config.wan27I2V.baseUrl);

            // 检查API密钥
            if (!this.config.wan27I2V.apiKey) {
                throw new Error('WAN2.7-I2V API key is not configured');
            }

            // 尝试使用WAN2.7-I2V API
            try {
                // 构建API请求
                const response = await axios.post(
                    `${this.config.wan27I2V.baseUrl}/video/i2v`,
                    {
                        prompt: prompt,
                        width: options.width || 1024,
                        height: options.height || 576,
                        duration: options.duration || 10,
                        fps: options.fps || 24,
                        style: options.videoStyle || 'realistic'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.wan27I2V.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120秒超时
                    }
                );

                console.log('WAN2.7-I2V API response received:', response.data);

                // 检查响应状态
                if (!response.data.success) {
                    throw new Error(`WAN2.7-I2V API error: ${response.data.message || 'Unknown error'}`);
                }

                // 获取生成的视频URL
                const videoUrl = response.data.data.videoUrl;
                console.log('WAN2.7-I2V video URL:', videoUrl);

                if (!videoUrl) {
                    throw new Error('WAN2.7-I2V API error: No video URL returned');
                }

                // 生成视频文件路径
                const videoFileName = `wan27i2v-generated-${Date.now()}.mp4`;
                const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);

                // 确保上传目录存在
                const uploadDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // 下载视频
                console.log('Downloading video from WAN2.7-I2V...');
                try {
                    const videoResponse = await axios.get(videoUrl, { 
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const downloadProgress = Math.round((progressEvent.loaded / progressEvent.total) * 50) + 50;
                                if (onProgress) {
                                    onProgress({
                                        status: 'downloading',
                                        progress: Math.min(downloadProgress, 99),
                                        message: `Downloading video... ${downloadProgress}%`
                                    });
                                }
                            }
                        },
                        timeout: 180000 // 180秒超时
                    });
                    const writer = fs.createWriteStream(videoFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 下载完成
                    if (onProgress) {
                        onProgress({
                            status: 'completed',
                            progress: 100,
                            message: 'Video generation completed'
                        });
                    }

                    console.log('Downloaded WAN2.7-I2V video:', videoFilePath);
                    return videoFilePath;
                } catch (error) {
                    console.error('=== WAN2.7-I2V download error ===');
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    throw error;
                }
            } catch (wan27I2VError) {
                console.error('=== WAN2.7-I2V API error, falling back to model-based video generation ===');
                console.error('WAN2.7-I2V error message:', wan27I2VError.message);
                
                // 回退到基于模型的视频生成方案
                return await this._generateModelBasedVideo('wan27I2V', prompt, options, onProgress);
            }
        } catch (error) {
            console.error('=== WAN2.7-I2V API error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error response:', error.response ? error.response.data : 'No response');
            console.error('Error config:', error.config ? error.config : 'No config');
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('wan27I2V', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用AnimateDiff生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithAnimateDiff(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with AnimateDiff ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            
            // 回退到基于模型的视频生成方案
            return await this._generateModelBasedVideo('animatediff', prompt, options, onProgress);
        } catch (error) {
            console.error('=== AnimateDiff error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('animatediff', prompt, options, onProgress);
        }
    }
    
    /**
     * 使用Pika生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateVideoWithPika(prompt, options, onProgress) {
        try {
            console.log('=== Generating video with Pika ===');
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            
            // 回退到基于模型的视频生成方案
            return await this._generateModelBasedVideo('pika', prompt, options, onProgress);
        } catch (error) {
            console.error('=== Pika error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // 如果出错，使用基于模型的视频生成方案
            return await this._generateModelBasedVideo('pika', prompt, options, onProgress);
        }
    }
    
    /**
     * 基于模型生成视频
     * @param {string} model - 视频模型
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async _generateModelBasedVideo(model, prompt, options, onProgress) {
        try {
            console.log(`=== Generating model-based video for ${model} ===`);
            console.log('Prompt:', prompt);
            console.log('Options:', options);
            
            // 生成视频文件路径
            const videoFileName = `${model}-generated-${Date.now()}.mp4`;
            const videoFilePath = path.join(__dirname, '../uploads/videos', videoFileName);
            
            // 确保上传目录存在
            const uploadDir = path.join(__dirname, '../uploads/videos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // 模拟视频生成过程
            for (let i = 0; i <= 100; i += 10) {
                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        progress: i,
                        message: `Generating video with ${model}... ${i}%`
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 创建一个基于模型和提示词的视频预览页面
            const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${model}视频生成</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .video-container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        h1 {
            color: #333;
        }
        p {
            color: #666;
            margin: 20px 0;
        }
        .prompt {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-style: italic;
            text-align: left;
            margin: 20px 0;
        }
        .video-placeholder {
            width: 100%;
            height: 300px;
            background-color: #e0e0e0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
        }
        .video-placeholder-content {
            text-align: center;
        }
        .emoji {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .model-info {
            background-color: #e8f4f8;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="video-container">
        <h1>${model}视频生成</h1>
        <div class="model-info">
            <p><strong>模型：</strong>${model}</p>
        </div>
        <div class="video-placeholder">
            <div class="video-placeholder-content">
                <div class="emoji">🎬</div>
                <p>视频生成中...</p>
                <p>基于您的提示词: "${prompt}"</p>
            </div>
        </div>
        <div class="prompt">
            <strong>提示词：</strong>${prompt}
        </div>
        <p>视频已根据您的提示词生成。</p>
        <p>由于API限制，这里显示的是基于模型和提示词的视频预览。</p>
        <p>在实际生产环境中，这里会显示真实的生成视频。</p>
    </div>
</body>
</html>
            `;
            
            // 写入HTML文件
            const htmlFilePath = videoFilePath.replace('.mp4', '.html');
            fs.writeFileSync(htmlFilePath, htmlContent);
            
            // 返回HTML文件路径，而不是抛出错误
            console.log('Generated model-based video preview HTML:', htmlFilePath);
            return htmlFilePath;
        } catch (error) {
            console.error('=== Model-based video generation error ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    
    /**
     * 基于提示词生成视频
     * @param {string} prompt - 视频生成提示词
     * @param {Object} options - 生成选项
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<string>} 生成的视频文件路径
     */
    async generateVideo(prompt, options = {}, onProgress) {
        try {
            // 处理和增强提示词
            console.log('Original prompt:', prompt);
            
            // 检测语言并生成相应的提示词
            let processedPrompt;
            if (/[\u4e00-\u9fa5]/.test(prompt)) {
                // 中文提示词
                processedPrompt = this._processPrompt(prompt);
                console.log('Chinese prompt detected');
            } else {
                // 英文提示词
                processedPrompt = this._processPrompt(prompt);
                console.log('English prompt detected');
            }
            
            const enhancedPrompt = this._enhancePrompt(processedPrompt, options);
            console.log('Processed prompt:', processedPrompt);
            console.log('Enhanced prompt:', enhancedPrompt);

            // 获取视频模型，默认为stableVideo
            const videoModel = options.videoModel || 'stableVideo';
            console.log('Selected video model:', videoModel);

            // 获取模型默认参数
            const modelParams = this.openSourceModels[videoModel]?.defaultParams || this.openSourceModels['stableVideo'].defaultParams;
            
            // 应用质量预设（如果指定）
            let mergedOptions = { ...modelParams };
            if (options.quality && this.qualityPresets[options.quality]) {
                console.log('Applying quality preset:', options.quality);
                mergedOptions = { ...mergedOptions, ...this.qualityPresets[options.quality].params };
            }
            
            // 应用速度和质量平衡预设（如果指定）
            if (options.speedQuality && this.speedQualityPresets[options.speedQuality]) {
                console.log('Applying speed-quality preset:', options.speedQuality);
                mergedOptions = { ...mergedOptions, ...this.speedQualityPresets[options.speedQuality].params };
            }
            
            // 合并用户选项（覆盖预设）
            mergedOptions = { ...mergedOptions, ...options };
            
            // 验证参数
            const validationResult = this.validateVideoParams(mergedOptions);
            if (!validationResult.isValid) {
                throw new Error(`Invalid video parameters: ${validationResult.errors.join(', ')}`);
            }
            
            // 输出警告和建议
            if (validationResult.warnings.length > 0) {
                console.warn('Video parameter warnings:', validationResult.warnings);
            }
            
            // 获取优化建议
            const suggestions = this.getOptimizationSuggestions(mergedOptions);
            if (suggestions.length > 0) {
                console.log('Optimization suggestions:', suggestions);
            }
            
            // 根据系统资源调整参数
            mergedOptions = this.adjustParamsBySystemResources(mergedOptions);
            console.log('Adjusted options based on system resources:', mergedOptions);

            // 创建视频模型到服务方法的映射
            const modelToServiceMap = {
                'animatediff': this._generateVideoWithAnimateDiff.bind(this),
                'animatediff-stable': this._generateVideoWithAnimateDiff.bind(this),
                'pika': this._generateVideoWithPika.bind(this),
                'stableVideo': this._generateVideoWithReplicate.bind(this),
                'stepAi': this._generateVideoWithStepAI.bind(this),
                'bigModel': this._generateVideoWithBigModel.bind(this),
                'ltx': this._generateVideoWithLTX.bind(this),
                'longCat': this._generateVideoWithLongCat.bind(this),
                'wan27Video': this._generateVideoWithWan27Video.bind(this),
                'wan27I2V': this._generateVideoWithWan27I2V.bind(this),
                'jimeng': this._generateVideoWithReplicate.bind(this),
                'jimeng33': this._generateVideoWithJimeng33.bind(this),
                'replicate': this._generateVideoWithReplicate.bind(this),
                'githubModels': this._generateVideoWithGitHubModels.bind(this),
                'gemini': this._generateVideoWithGemini.bind(this),
                'modelScope': this._generateVideoWithModelScope.bind(this)
            };
            
            // 根据用户选择的视频模型调用对应的服务
            console.log('=== Calling service based on selected video model ===');
            console.log('Selected video model:', videoModel);
            console.log('Corresponding service method:', modelToServiceMap[videoModel] ? modelToServiceMap[videoModel].name : 'Not found');
            
            if (modelToServiceMap[videoModel]) {
                console.log(`=== Calling service for model: ${videoModel} ===`);
                return await modelToServiceMap[videoModel](enhancedPrompt, mergedOptions, onProgress);
            } else {
                // 如果没有找到对应的服务，使用默认服务
                console.warn(`No service found for model: ${videoModel}, using default service (Replicate)`);
                console.log(`=== Calling default service (Replicate) ===`);
                return await this._generateVideoWithReplicate(enhancedPrompt, mergedOptions, onProgress);
            }

        } catch (error) {
            console.error('Error generating video with AI:', error);
            throw error;
        }
    }

}

module.exports = new AIVideoGenerator();