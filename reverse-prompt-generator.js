// Reverse Prompt Generator JavaScript
// Handles file uploads and reverse prompt generation

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', function() {
    console.log('Reverse Prompt Generator initialized');
    
    // Initialize event listeners
    initEventListeners();
});

// Initialize all event listeners
function initEventListeners() {
    // File upload inputs
    const videoUpload = document.getElementById('videoUpload');
    const imageUpload = document.getElementById('imageUpload');
    const documentUpload = document.getElementById('documentUpload');
    const audioUpload = document.getElementById('audioUpload');
    
    // Reverse prompt button
    const reversePromptBtn = document.getElementById('reversePromptBtn');
    
    // Add event listeners if elements exist
    if (videoUpload) {
        videoUpload.addEventListener('change', handleFileSelect);
    }
    if (imageUpload) {
        imageUpload.addEventListener('change', handleFileSelect);
    }
    if (documentUpload) {
        documentUpload.addEventListener('change', handleFileSelect);
    }
    if (audioUpload) {
        audioUpload.addEventListener('change', handleFileSelect);
    }
    if (reversePromptBtn) {
        reversePromptBtn.addEventListener('click', generateReversePrompt);
    }
    
    console.log('Event listeners initialized');
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    console.log('File selected:', file.name, file.type);
    
    // Show upload status
    const statusElement = document.getElementById('fileUploadStatus');
    if (statusElement) {
        statusElement.textContent = `Selected file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        statusElement.style.color = '#22c55e';
    }
    
    // Store the selected file in a global variable for later use
    window.selectedFile = file;
}

// Generate reverse prompt from file
async function generateReversePrompt() {
    if (!window.selectedFile) {
        alert('Please select a file first!');
        return;
    }
    
    const file = window.selectedFile;
    console.log('Generating reverse prompt for file:', file.name);
    
    // Show loading state
    const btn = document.getElementById('reversePromptBtn');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<span class="en">Generating...</span> <span class="zh">生成中...</span>';
    btn.disabled = true;
    
    // Show upload progress container
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'block';
        console.log('Upload progress container displayed');
    }
    
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Create a custom fetch function with progress tracking
        const response = await uploadWithProgress('http://localhost:3000/api/idea-to-prompt/upload', formData, file.size);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse response
        const result = await response.json();
        console.log('Reverse prompt generated successfully:', result);
        
        // Show results
        showReverseResultsWithData(result);
        
    } catch (error) {
        console.error('Error generating reverse prompt:', error);
        alert(`Failed to generate reverse prompt: ${error.message}`);
    } finally {
        // Restore button state
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        
        // Hide upload progress container
        const progressContainer = document.getElementById('uploadProgressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
}

// Upload file with progress tracking
async function uploadWithProgress(url, formData, fileSize) {
    return new Promise((resolve, reject) => {
        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        // Setup progress event listener
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const total = event.total || fileSize;
                const percentComplete = Math.round((event.loaded / total) * 100);
                updateProgressBar(percentComplete, event.loaded, total);
            }
        });
        
        // Setup load event listener
        xhr.addEventListener('load', () => {
            // Create a response object similar to fetch
            const response = new Response(xhr.responseText, {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: xhr.getAllResponseHeaders()
            });
            resolve(response);
        });
        
        // Setup error event listener
        xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
        });
        
        // Setup timeout event listener
        xhr.addEventListener('timeout', () => {
            reject(new Error('Request timed out'));
        });
        
        // Open and send the request
        xhr.open('POST', url);
        xhr.send(formData);
    });
}

// Update progress bar
function updateProgressBar(percentComplete, loaded, total) {
    console.log(`Progress updated: ${percentComplete}% (${loaded}/${total})`);
    
    // Update progress bar width
    const progressBar = document.getElementById('uploadProgressBar');
    if (progressBar) {
        progressBar.style.width = `${percentComplete}%`;
        console.log('Progress bar width updated to', `${percentComplete}%`);
    } else {
        console.error('Progress bar element not found!');
    }
    
    // Update progress text
    const progressText = document.getElementById('uploadProgressText');
    if (progressText) {
        const loadedMB = (loaded / (1024 * 1024)).toFixed(2);
        const totalMB = (total / (1024 * 1024)).toFixed(2);
        const progressTextContent = `${loadedMB} MB / ${totalMB} MB (${percentComplete}%)`;
        progressText.textContent = progressTextContent;
        console.log('Progress text updated to:', progressTextContent);
    } else {
        console.error('Progress text element not found!');
    }
}

// Show reverse prompt results with data
function showReverseResultsWithData(data) {
    // Show results section
    const resultsSection = document.getElementById('reversePromptResults');
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    
    // Update confidence info
    const confidenceInfo = document.getElementById('confidenceInfo');
    if (confidenceInfo) {
        confidenceInfo.textContent = data.confidence || 'High (95%)';
    }
    
    // Update generated reverse prompt - separate Chinese and English
    const reversePrompt = data.reversePrompt || '';
    const chinesePrompt = document.getElementById('chineseReversePrompt');
    const englishPrompt = document.getElementById('englishReversePrompt');
    
    if (chinesePrompt && englishPrompt) {
        // Separate Chinese and English prompts
        const { chinese, english } = separateChineseEnglish(reversePrompt);
        chinesePrompt.value = chinese || '';
        englishPrompt.value = english || '';
    }
    
    // Update structured details
    const structuredDetails = data.structuredDetails;
    if (structuredDetails) {
        // Basic Structure Paradigm
        if (structuredDetails.basicStructure) {
            updateElement('singleWords', structuredDetails.basicStructure.singleWords || '');
            updateElement('phrasePrompts', structuredDetails.basicStructure.phrasePrompts || '');
            updateElement('completeSentences', structuredDetails.basicStructure.completeSentences || '');
        }
        
        // Application Structure Paradigm
        if (structuredDetails.applicationStructure) {
            updateElement('copywritingStyle', structuredDetails.applicationStructure.copywritingStyle || '');
        }
        
        // Functional Elements
        if (structuredDetails.functionalElements) {
            updateElement('subject', structuredDetails.functionalElements.subject || '');
            updateElement('style', structuredDetails.functionalElements.style || '');
            updateElement('sceneAction', structuredDetails.functionalElements.sceneAction || '');
            updateElement('details', structuredDetails.functionalElements.details || '');
        }
        
        // Positive & Negative Prompts
        if (structuredDetails.positiveNegative) {
            updateElement('positivePrompts', structuredDetails.positiveNegative.positive || '');
            updateElement('negativePrompts', structuredDetails.positiveNegative.negative || '');
        }
    }
    
    console.log('Reverse prompt results displayed successfully');
}

// Helper function to separate Chinese and English text
function separateChineseEnglish(text) {
    // Check if text contains both Chinese and English
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    
    if (!hasChinese) {
        // Only English
        return { chinese: '', english: text };
    }
    
    if (!hasEnglish) {
        // Only Chinese
        return { chinese: text, english: '' };
    }
    
    // Try to split by common delimiters
    const delimiters = ['\n', '\r\n', '\r', ' | ', ' |', '| ', ' |', '|', '\t'];
    let chinese = '';
    let english = '';
    
    for (const delimiter of delimiters) {
        if (text.includes(delimiter)) {
            const parts = text.split(delimiter);
            for (const part of parts) {
                if (/[\u4e00-\u9fa5]/.test(part)) {
                    chinese += part.trim() + '\n';
                } else {
                    english += part.trim() + '\n';
                }
            }
            return { chinese: chinese.trim(), english: english.trim() };
        }
    }
    
    // If no delimiters found, return original text in both
    return { chinese: text, english: text };
}

// Helper function to update element content
function updateElement(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = content;
    }
}

// Clear all multi-modal inputs
function clearMultiModalInputs() {
    // Clear file inputs
    const fileInputs = ['videoUpload', 'imageUpload', 'documentUpload', 'audioUpload'];
    fileInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
        }
    });
    
    // Clear URL inputs
    const urlInputs = ['videoUrlInput', 'imageUrlInput', 'documentUrlInput', 'audioUrlInput'];
    urlInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
        }
    });
    
    // Clear URL list
    const urlList = document.getElementById('urlList');
    if (urlList) {
        urlList.innerHTML = '';
    }
    
    // Clear file upload status
    const statusElement = document.getElementById('fileUploadStatus');
    if (statusElement) {
        statusElement.textContent = '';
    }
    
    // Clear selected file
    window.selectedFile = null;
    
    // Hide results section
    const resultsSection = document.getElementById('reversePromptResults');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    console.log('All multi-modal inputs cleared');
}

// Test file upload function
function testFileUpload() {
    console.log('Test file upload called');
    alert('Test file upload functionality not yet implemented');
}

// Add URL to list (placeholder function)
function addUrl(type) {
    console.log('Add URL called for type:', type);
    // This function would normally add a URL to the list for processing
    // For now, we'll just show an alert
    alert('Add URL functionality not yet implemented');
}

// Make functions globally accessible
window.clearMultiModalInputs = clearMultiModalInputs;
window.testFileUpload = testFileUpload;
window.addUrl = addUrl;