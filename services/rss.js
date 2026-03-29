const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

let trendingCache = { topics: [], fetchedAt: null };

const AI_SOURCES = [
  { name: 'TheVerge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'VentureBeat AI', url: 'https://feeds.feedburner.com/venturebeat/SZYF' },
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
    if (title && cleanDesc.length > 50) {
      items.push({ title: title.trim(), description: cleanDesc.substring(0, 500) });
    }
  }
  return items;
}

async function fetchFromSources() {
  const source = AI_SOURCES[Math.floor(Math.random() * AI_SOURCES.length)];
  try {
    const response = await axios.get(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShortsPipeline/1.0)' },
      timeout: 8000
    });
    const items = parseRSS(response.data);
    if (items.length > 0) {
      const item = items[Math.floor(Math.random() * Math.min(items.length, 10))];
      console.log('Fetched from ' + source.name + ': ' + item.title);
      return item;
    }
  } catch (e) {
    console.log(source.name + ' failed, using Claude trending...');
  }
  return null;
}

async function refreshTrending() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: 'What are the 6 most viral and shocking AI news stories trending RIGHT NOW on social media, YouTube Shorts, TechCrunch, TheVerge, and OpenAI announcements? Focus on things that would make people say "wait what?!" Return ONLY a JSON array of 6 objects with keys: title (shocking clickbait max 10 words), description (2-3 sentences of actual news), viralAngle (why this goes viral). No markdown, just JSON array.'
      }]
    });
    const raw = response.content[0].text.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      trendingCache = { topics: JSON.parse(match[0]), fetchedAt: new Date() };
      console.log('AI trending refreshed: ' + trendingCache.topics.length + ' topics');
    }
  } catch (e) {
    console.error('AI trending refresh failed:', e.message);
  }
}

refreshTrending();
setInterval(refreshTrending, 2 * 60 * 60 * 1000);

async function fetchAINews() {
  const realNews = await fetchFromSources();
  if (realNews) return realNews;

  if (trendingCache.topics && trendingCache.topics.length > 0) {
    const item = trendingCache.topics[Math.floor(Math.random() * trendingCache.topics.length)];
    return { title: item.title, description: item.description + ' ' + (item.viralAngle || '') };
  }

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: 'Give me one shocking recent AI news story that would go viral on YouTube Shorts. Return ONLY a JSON object with keys: title (shocking max 10 words), description (2-3 sentences). No markdown.'
    }]
  });
  const raw = response.content[0].text.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

async function formatAIScript(newsItem, claudeClient) {
  const response = await claudeClient.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: 'You are a YouTube Shorts narrator for a viral AI facts channel.\nConvert this AI news into a mind-blowing 60-second narration script.\nTitle: ' + newsItem.title + '\nContent: ' + newsItem.description + '\nRules:\n- Start with "AI just did something insane..." or "Nobody is talking about this..."\n- Keep it under 150 words\n- Make it urgent, exciting, slightly scary\n- Include specific facts or numbers\n- End with "And this is just the beginning..."\n- Return ONLY the narration text, nothing else'
    }]
  });
  return response.content[0].text.trim();
}

module.exports = { fetchAINews, formatAIScript };
