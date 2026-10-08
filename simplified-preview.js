// 极简的截图预览功能
// 直接在全局作用域定义，确保 onclick 事件能访问

// 1. 创建预览容器（如果不存在）
function createPreviewContainer() {
    // 检查容器是否已存在
    if (document.getElementById('simplePreview')) {
        return;
    }
    
    // 创建最简单的预览容器
    const container = document.createElement('div');
    container.id = 'simplePreview';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        overflow: auto;
    `;
    
    // 创建内容容器
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 90%;
        max-height: 90vh;
        text-align: center;
    `;
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
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
    `;
    closeBtn.onclick = hidePreview;
    
    // 创建图片元素
    const img = document.createElement('img');
    img.id = 'previewImg';
    img.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        margin-bottom: 15px;
    `;
    
    // 创建标题
    const title = document.createElement('div');
    title.id = 'previewTitle';
    title.style.cssText = `
        font-size: 16px;
        color: #333;
        margin-bottom: 15px;
    `;
    
    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
    `;
    
    // 创建下载按钮
    const downloadBtn = document.createElement('a');
    downloadBtn.id = 'previewDownload';
    downloadBtn.textContent = '下载 / Download';
    downloadBtn.className = 'btn btn-primary';
    downloadBtn.style.cssText = `
        padding: 8px 16px;
        background: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
    `;
    
    // 创建新标签页打开按钮
    const openBtn = document.createElement('a');
    openBtn.id = 'previewOpen';
    openBtn.textContent = '在新标签页打开 / Open in Tab';
    openBtn.className = 'btn btn-secondary';
    openBtn.target = '_blank';
    openBtn.style.cssText = `
        padding: 8px 16px;
        background: #2196F3;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
    `;
    
    // 组装元素
    actions.appendChild(downloadBtn);
    actions.appendChild(openBtn);
    content.appendChild(closeBtn);
    content.appendChild(img);
    content.appendChild(title);
    content.appendChild(actions);
    container.appendChild(content);
    
    // 添加到文档
    document.body.appendChild(container);
    
    // 添加点击外部关闭功能
    container.onclick = function(e) {
        if (e.target === container) {
            hidePreview();
        }
    };
}

// 2. 显示预览
function showPreview(imageUrl, title) {
    console.log('显示预览:', imageUrl);
    
    // 确保容器存在
    createPreviewContainer();
    
    // 获取元素
    const container = document.getElementById('simplePreview');
    const img = document.getElementById('previewImg');
    const titleEl = document.getElementById('previewTitle');
    const downloadBtn = document.getElementById('previewDownload');
    const openBtn = document.getElementById('previewOpen');
    
    // 清理 URL（移除 onclick 属性中可能的引号）
    const cleanUrl = imageUrl.replace(/[`',]/g, '').trim();
    const cleanTitle = title ? title.replace(/[`',]/g, '').trim() : '预览图片';
    
    // 设置内容
    img.src = cleanUrl;
    img.alt = cleanTitle;
    titleEl.textContent = cleanTitle;
    downloadBtn.href = cleanUrl;
    downloadBtn.download = cleanTitle.replace(/\s+/g, '-').toLowerCase() + '.jpg';
    openBtn.href = cleanUrl;
    
    // 显示容器
    container.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    console.log('预览显示成功');
}

// 3. 隐藏预览
function hidePreview() {
    console.log('隐藏预览');
    
    const container = document.getElementById('simplePreview');
    if (container) {
        container.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('预览隐藏成功');
    }
}

// 4. 更新所有现有图片的 onclick 事件
function updateImageOnclicks() {
    console.log('更新所有图片的 onclick 事件');
    
    // 查找所有带有 screenshot-img 类的图片
    const images = document.querySelectorAll('.screenshot-img');
    images.forEach((img, index) => {
        console.log(`更新图片 ${index} 的 onclick`);
        // 设置 onclick 事件为新的预览函数
        img.onclick = function() {
            showPreview(this.src, this.title || this.alt);
        };
    });
}

// 5. 替换现有函数，确保向后兼容
window.showImagePreview = showPreview;
window.showScreenshotPreview = showPreview;
window.closeImagePreview = hidePreview;
window.closeScreenshotPreview = hidePreview;

// 6. 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('页面加载完成，初始化预览功能');
        createPreviewContainer();
        updateImageOnclicks();
    });
} else {
    console.log('页面已加载，初始化预览功能');
    createPreviewContainer();
    updateImageOnclicks();
}

// 7. 添加全局测试函数，方便调试
window.testPreview = function() {
    showPreview('https://source.unsplash.com/1920x1080/?test', '测试图片');
};