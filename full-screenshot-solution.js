// 全新的截图预览解决方案
// 完全替换现有功能，确保可靠性

// 等待页面加载完成
window.addEventListener('DOMContentLoaded', function() {
    console.log('全新截图预览解决方案已加载');
    
    // 1. 创建预览容器
    createPreviewSystem();
    
    // 2. 监听截图结果生成事件
    listenForScreenshotResults();
    
    // 3. 替换现有预览函数
    replaceExistingFunctions();
});

// 创建完整的预览系统
function createPreviewSystem() {
    console.log('创建预览系统');
    
    // 检查是否已存在预览容器
    if (document.getElementById('newPreviewContainer')) {
        console.log('预览容器已存在');
        return;
    }
    
    // 创建最外层容器
    const container = document.createElement('div');
    container.id = 'newPreviewContainer';
    container.style.cssText = `
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
        padding: 20px;
        box-sizing: border-box;
    `;
    
    // 创建内容容器
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 20px;
        max-width: 90%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: #ff4444;
        color: white;
        border: none;
        width: 35px;
        height: 35px;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: background 0.2s ease;
    `;
    closeBtn.onmouseenter = function() {
        this.style.background = '#cc0000';
    };
    closeBtn.onmouseleave = function() {
        this.style.background = '#ff4444';
    };
    closeBtn.onclick = function() {
        hideNewPreview();
    };
    
    // 创建图片元素
    const img = document.createElement('img');
    img.id = 'newPreviewImage';
    img.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        border-radius: 8px;
        margin: 20px 0;
    `;
    
    // 创建标题
    const title = document.createElement('div');
    title.id = 'newPreviewTitle';
    title.style.cssText = `
        font-size: 18px;
        color: #333;
        margin-bottom: 20px;
        text-align: center;
        font-weight: 600;
    `;
    
    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: auto;
    `;
    
    // 创建下载按钮
    const downloadBtn = document.createElement('a');
    downloadBtn.id = 'newPreviewDownload';
    downloadBtn.innerHTML = '<span class="en">Download</span> <span class="zh">下载</span>';
    downloadBtn.style.cssText = `
        padding: 10px 25px;
        background: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    `;
    downloadBtn.onmouseenter = function() {
        this.style.background = '#3d8b40';
    };
    downloadBtn.onmouseleave = function() {
        this.style.background = '#4CAF50';
    };
    
    // 创建新标签页打开按钮
    const openBtn = document.createElement('a');
    openBtn.id = 'newPreviewOpen';
    openBtn.innerHTML = '<span class="en">Open in Tab</span> <span class="zh">在新标签页打开</span>';
    openBtn.target = '_blank';
    openBtn.style.cssText = `
        padding: 10px 25px;
        background: #2196F3;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    `;
    openBtn.onmouseenter = function() {
        this.style.background = '#1976D2';
    };
    openBtn.onmouseleave = function() {
        this.style.background = '#2196F3';
    };
    
    // 组装元素
    actions.appendChild(downloadBtn);
    actions.appendChild(openBtn);
    content.appendChild(closeBtn);
    content.appendChild(img);
    content.appendChild(title);
    content.appendChild(actions);
    container.appendChild(content);
    
    // 添加到页面
    document.body.appendChild(container);
    
    console.log('预览系统创建完成');
    
    // 添加点击外部关闭功能
    container.addEventListener('click', function(e) {
        if (e.target === container) {
            hideNewPreview();
        }
    });
}

// 监听截图结果生成
function listenForScreenshotResults() {
    console.log('监听截图结果生成');
    
    // 使用MutationObserver监听DOM变化，检测截图结果生成
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // 检查是否有新的截图结果
                const screenshotResults = document.querySelector('#screenshot-finder .screenshot-results');
                if (screenshotResults) {
                    console.log('检测到截图结果，更新事件处理');
                    updateScreenshotEvents();
                }
            }
        });
    });
    
    // 监听整个文档的变化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('截图结果监听已设置');
}

// 更新所有截图的事件处理
function updateScreenshotEvents() {
    console.log('更新截图事件处理');
    
    // 查找所有截图图片
    const screenshots = document.querySelectorAll('#screenshot-finder .screenshot-img');
    console.log(`找到 ${screenshots.length} 个截图图片`);
    
    screenshots.forEach(function(img, index) {
        console.log(`更新截图 ${index} 的事件`);
        
        // 移除现有事件监听器
        img.onclick = null;
        
        // 添加新的点击事件
        img.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`截图 ${index} 被点击`);
            
            // 获取图片信息
            const imageUrl = img.src;
            const title = img.title || img.alt || `截图 ${index + 1}`;
            
            // 显示预览
            showNewPreview(imageUrl, title);
        };
        
        // 添加样式提示可点击
        img.style.cursor = 'pointer';
        img.style.transition = 'transform 0.2s ease';
        img.onmouseenter = function() {
            this.style.transform = 'scale(1.05)';
        };
        img.onmouseleave = function() {
            this.style.transform = 'scale(1)';
        };
    });
    
    console.log('截图事件更新完成');
}

// 显示预览
function showNewPreview(imageUrl, title) {
    console.log('显示新预览', { imageUrl, title });
    
    // 获取预览元素
    const container = document.getElementById('newPreviewContainer');
    const img = document.getElementById('newPreviewImage');
    const titleEl = document.getElementById('newPreviewTitle');
    const downloadBtn = document.getElementById('newPreviewDownload');
    const openBtn = document.getElementById('newPreviewOpen');
    
    // 检查元素是否存在
    if (!container || !img || !titleEl || !downloadBtn || !openBtn) {
        console.error('预览元素缺失');
        createPreviewSystem();
        return;
    }
    
    // 设置内容
    img.src = imageUrl;
    titleEl.textContent = title;
    downloadBtn.href = imageUrl;
    downloadBtn.download = title.replace(/\s+/g, '-').toLowerCase() + '.jpg';
    openBtn.href = imageUrl;
    
    // 显示预览
    container.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    console.log('预览显示完成');
}

// 隐藏预览
function hideNewPreview() {
    console.log('隐藏预览');
    
    const container = document.getElementById('newPreviewContainer');
    if (container) {
        container.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('预览隐藏完成');
    }
}

// 替换现有函数
function replaceExistingFunctions() {
    console.log('替换现有预览函数');
    
    // 替换所有现有预览函数
    window.showImagePreview = function(imageUrl, title) {
        console.log('调用原有 showImagePreview，重定向到新函数');
        showNewPreview(imageUrl, title);
    };
    
    window.showScreenshotPreview = function(imageUrl, title) {
        console.log('调用原有 showScreenshotPreview，重定向到新函数');
        showNewPreview(imageUrl, title);
    };
    
    window.closeImagePreview = function() {
        console.log('调用原有 closeImagePreview，重定向到新函数');
        hideNewPreview();
    };
    
    window.closeScreenshotPreview = function() {
        console.log('调用原有 closeScreenshotPreview，重定向到新函数');
        hideNewPreview();
    };
    
    console.log('现有函数替换完成');
    
    // 添加全局测试函数
    window.testNewPreview = function() {
        console.log('调用测试预览函数');
        showNewPreview('https://source.unsplash.com/1920x1080/?test', '测试预览图片');
    };
    
    // 添加测试按钮到页面
    addTestButton();
}

// 添加测试按钮
function addTestButton() {
    console.log('添加测试按钮');
    
    // 检查是否已存在测试按钮
    if (document.getElementById('testNewPreviewBtn')) {
        return;
    }
    
    // 创建测试按钮容器
    const testContainer = document.createElement('div');
    testContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000000;
        display: flex;
        gap: 10px;
    `;
    
    // 创建测试按钮
    const testBtn = document.createElement('button');
    testBtn.id = 'testNewPreviewBtn';
    testBtn.textContent = '测试新预览';
    testBtn.style.cssText = `
        padding: 10px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    
    testBtn.onclick = function() {
        window.testNewPreview();
    };
    
    testBtn.onmouseenter = function() {
        this.style.background = '#3d8b40';
    };
    
    testBtn.onmouseleave = function() {
        this.style.background = '#4CAF50';
    };
    
    // 添加到页面
    testContainer.appendChild(testBtn);
    document.body.appendChild(testContainer);
    
    console.log('测试按钮添加完成');
}

console.log('全新截图预览解决方案已准备就绪');
