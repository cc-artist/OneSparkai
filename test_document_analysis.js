// Test script for document analysis service
const documentAnalysisService = require('./server/services/documentAnalysisService');
const fs = require('fs');

async function testDocumentAnalysis() {
    try {
        // Read the test file
        const testFile = './test_decision_tree_english.txt';
        const content = fs.readFileSync(testFile, 'utf8').toString();
        
        console.log('=== Test Document Analysis ===');
        console.log('Test file:', testFile);
        console.log('File length:', content.length, 'characters');
        console.log('\n--- File Content (First 200 chars) ---');
        console.log(content.substring(0, 200) + '...');
        
        // Create file info
        const fileInfo = {
            name: 'test_decision_tree.txt',
            size: content.length,
            type: 'text/plain'
        };
        
        // Analyze content
        console.log('\n--- Analyzing Content ---');
        const analysis = documentAnalysisService.analyzeContent(content, fileInfo);
        
        console.log('\n--- Analysis Results ---');
        console.log('Keywords:', analysis.keywords);
        console.log('Key Phrases:', analysis.keyPhrases);
        console.log('Themes:', analysis.themes);
        console.log('Style:', analysis.style);
        console.log('Entities:', analysis.entities);
        console.log('Language:', analysis.language);
        console.log('Has Chinese:', analysis.hasChinese);
        console.log('Word Count:', analysis.wordCount);
        console.log('Content Summary:', analysis.contentSummary);
        
        // Generate reverse prompt
        console.log('\n--- Generating Reverse Prompt ---');
        const reversePromptResult = documentAnalysisService.generateReversePrompt(analysis, content);
        
        console.log('\n--- Reverse Prompt Results ---');
        console.log('Reverse Prompt:', reversePromptResult.reversePrompt);
        console.log('\nStructured Details:');
        console.log('Basic Structure:', JSON.stringify(reversePromptResult.structuredDetails.basicStructure, null, 2));
        console.log('Functional Elements:', JSON.stringify(reversePromptResult.structuredDetails.functionalElements, null, 2));
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('Error during testing:', error);
    }
}

// Run the test
testDocumentAnalysis();
