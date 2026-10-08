const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// First, let's test the file reading locally to see what content is being sent
console.log('Testing local file reading...');
const fileContent = fs.readFileSync('test-chinese-utf8.txt', 'utf8');
console.log('File Content:', fileContent);
console.log('Has Chinese characters:', /[\\u4e00-\\u9fa5]/.test(fileContent));

async function testFileUpload() {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-chinese-utf8.txt'));

    const response = await axios.post('http://localhost:3000/api/v1/idea-to-prompt/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('\nFile upload successful!');
    console.log('Full Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\nFile upload failed!');
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testFileUpload();