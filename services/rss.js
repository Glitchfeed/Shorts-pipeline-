const axios = require('axios');

const AI_RSS_FEEDS = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.wired.com/feed/category/artificial-intelligence/latest/rss',
  'https://feeds.feedburner.com/venturebeat/SZYF',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
];

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) ||
                   /<title>(.*?)<\/title>/.exec(item) || [])[1] || '';
    const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) ||
                  /<description>(.*?)<\/description>/.exec(item) || [])[1] || '';
    const cleanDesc = desc.replace(/<[^>]*>/g, '').trim();
    if (title && cleanDesc.length > 100) {
      items.push({ title: title.trim(), description: cleanDesc });
    }
  }
  return items;
}

async function fetchAINews() {
  const feed = AI_RSS_FEEDS[Math.floor(Math.random() * AI_RSS_FEEDS.length)];
  const response = await axios.get(feed, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShortsPipeline/1.0)' },
    timeout: 10000
  });
  const items = parseRSS(response.data);
  if (items.length === 0) throw new Error('No AI news items found');
  return items[Math.floor(Math.random() * Math.min(items.length, 10))];
}

async function formatAIScript(newsItem, claudeClient) {
  const response = await claudeClient.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a YouTube Shorts narrator for an AI facts channel.
Convert this AI news into a mind-blowing 60-second narration script.
Title: ${newsItem.title}
Content: ${newsItem.description.substring(0, 2000)}
Rules:
- Start with something shocking like "AI just did something insane..."
- Keep it under 150 words
- Make it feel urgent and exciting
- Include 1-2 specific facts or numbers if available
- End with an impactful statement about the future
- Return ONLY the narration text, nothing else`
    }]
  });
  return response.content[0].text.trim();
}

module.exports = { fetchAINews, formatAIScript };
