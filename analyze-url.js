const IdeaToPromptService = require('./server/services/ideaToPromptService');
const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeBaiduArticle(url) {
  try {
    console.log(`正在分析URL: ${url}`);
    
    // 获取网页内容，使用更完善的headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.baidu.com/'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // 提取文章标题
    const title = $('h1.article-title').text().trim() || $('h1').text().trim() || $('title').text().trim();
    
    // 尝试从JSON-LD中提取内容
    let content = '';
    const scriptTags = $('script[type="application/ld+json"]');
    scriptTags.each((i, el) => {
      try {
        const jsonText = $(el).text();
        const json = JSON.parse(jsonText);
        if (json && (json.articleBody || json.description)) {
          content = json.articleBody || json.description;
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    });
    
    // 如果JSON-LD失败，尝试直接提取
    if (!content) {
      const contentSelectors = [
        'div.article-content',
        'div.content',
        'article',
        'div.article-body',
        'div.main-content',
        'div.article',
        'div.content-wrap',
        'div#content',
        'div[id*="content"]'
      ];
      
      for (const selector of contentSelectors) {
        const text = $(selector).text().trim();
        if (text && text.length > 100) {
          content = text;
          break;
        }
      }
    }
    
    console.log(`文章标题: ${title}`);
    console.log(`文章内容长度: ${content.length} 字符`);
    
    // 打印前500个字符的内容作为调试
    if (content) {
      console.log('\n内容预览:');
      console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
    } else {
      console.error('无法提取文章内容');
      return;
    }
    
    // 使用IdeaToPromptService生成提示词
    const service = new IdeaToPromptService();
    const result = await service.generatePrompt(content, 'copywriting');
    
    console.log('\n=== 生成的提示词 ===');
    console.log('英文提示词:');
    console.log(result.englishPrompt);
    console.log('\n中文提示词:');
    console.log(result.chinesePrompt);
    console.log('\n置信度:', result.confidence);
    
  } catch (error) {
    console.error('分析失败:', error.message);
    console.error(error.stack);
  }
}

// 分析用户提供的URL
const url = 'https://baijiahao.baidu.com/s?id=1863574595742937849&wfr=spider&for=pc';
analyzeBaiduArticle(url);
