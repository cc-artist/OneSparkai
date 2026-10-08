// 全新的极简截图预览系统
// 移除所有复杂逻辑，只保留最核心的功能

// 初始化预览系统
document.addEventListener('DOMContentLoaded', function() {
    // 创建预览容器元素
    createPreviewContainer();
    
    // 初始化调试日志
    logDebug('全新预览系统已初始化');
});

// 创建预览容器
function createPreviewContainer() {
    // 检查是否已存在预览容器
    if (document.getElementById('newPreviewContainer')) {
        return;
    }
    
    // 创建预览容器HTML
    const previewHTML = `
        <div id="newPreviewContainer" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            overflow: auto;
            box-sizing: border-box;
        ">
            <div style="
                position: relative;
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 90%;
                max-height: 90vh;
                box-sizing: border-box;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            ">
                <button id="newPreviewClose" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #ff4444;
                    color: white;
                    border: none;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    padding: 0;
                ">&times;</button>
                <img id="newPreviewImage" alt="Preview" style="
                    max-width: 100%;
                    max-height: 70vh;
                    object-fit: contain;
                    border-radius: 4px;
                    display: block;
                    margin: 0 auto 15px;
                ">
                <div id="newPreviewCaption" style="
                    text-align: center;
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 15px;
                "></div>
                <div style="
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    flex-wrap: wrap;
                ">
                    <a id="newPreviewDownload" href="#" style="
                        padding: 8px 16px;
                        background: #4CAF50;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-size: 14px;
                        display: inline-block;
                    ">
                        下载
                    </a>
                    <a id="newPreviewOpen" href="#" target="_blank" style="
                        padding: 8px 16px;
                        background: #2196F3;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-size: 14px;
                        display: inline-block;
                    ">
                        在新标签页打开
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // 添加到body末尾
    document.body.insertAdjacentHTML('beforeend', previewHTML);
    
    // 添加关闭事件监听
    document.getElementById('newPreviewClose').addEventListener('click', function() {
        hideNewPreview();
    });
    
    // 添加点击外部关闭功能
    document.getElementById('newPreviewContainer').addEventListener('click', function(e) {
        if (e.target === this) {
            hideNewPreview();
        }
    });
    
    // 添加ESC键关闭功能
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideNewPreview();
        }
    });
    
    logDebug('预览容器已创建');
}

// 显示预览
window.showImagePreview = function(imageUrl, title) {
    // 确保预览容器存在
    createPreviewContainer();
    
    logDebug('showImagePreview被调用: ' + imageUrl);
    
    // 清理URL和标题
    const cleanUrl = imageUrl.replace(/[`',]/g, '').trim();
    const cleanTitle = title ? title.replace(/[`',]/g, '').trim() : '';
    
    logDebug('清理后的URL: ' + cleanUrl);
    
    // 获取预览元素
    const container = document.getElementById('newPreviewContainer');
    const image = document.getElementById('newPreviewImage');
    const caption = document.getElementById('newPreviewCaption');
    const download = document.getElementById('newPreviewDownload');
    const openTab = document.getElementById('newPreviewOpen');
    
    // 设置预览内容
    image.src = cleanUrl;
    image.alt = cleanTitle;
    caption.textContent = cleanTitle;
    download.href = cleanUrl;
    download.download = cleanTitle.replace(/\s+/g, '-').toLowerCase() + '.jpg';
    openTab.href = cleanUrl;
    
    // 显示预览容器
    container.style.display = 'flex';
    
    // 防止页面滚动
    document.body.style.overflow = 'hidden';
    
    logDebug('预览已显示');
};

// 隐藏预览
window.hideNewPreview = function() {
    const container = document.getElementById('newPreviewContainer');
    if (container) {
        container.style.display = 'none';
        document.body.style.overflow = 'auto';
        logDebug('预览已隐藏');
    }
};

// 简化的调试日志功能
window.logDebug = function(message) {
    console.log('[预览系统]', message);
    
    // 更新调试面板（如果存在）
    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        const timestamp = new Date().toLocaleTimeString();
        debugLog.innerHTML += `<br>[${timestamp}] ${message}`;
        debugLog.scrollTop = debugLog.scrollHeight;
    }
};

// 确保showScreenshotPreview也指向正确的函数（向后兼容）
window.showScreenshotPreview = window.showImagePreview;