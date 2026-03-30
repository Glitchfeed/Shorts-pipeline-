const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
let trendingCache = { topics: [], fetchedAt: null };

const AI_SOURCES = [
  { name: 'TheVerge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'VentureBeat AI', url: 'https://feeds.feedburner.com/venturebeat/SZYF' },
];

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) || /<title>(.*?)<\/title>/.exec(item) || [])[1] || '';
    const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) || /<description>(.*?)<\/description>/.exec(item) || [])[1] || '';
    const cleanDesc = desc.replace(/<[^>]*>/g, '').trim();
    if (title && cleanDesc.length > 50) items.push({ title: title.trim(), description: cleanDesc.substring(0, 500) });
  }
  return items;
}

async function fetchFromSources() {
  const source = AI_SOURCES[Math.floor(Math.random() * AI_SOURCES.length)];
  try {
    const response = await axios.get(source.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    const items = parseRSS(response.data);
    if (items.length > 0) return items[Math.floor(Math.random() * Math.min(items.length, 10))];
  } catch(e) { console.log(source.name + ' failed'); }
  return null;
}

async function refreshTrending() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: 'What are the 6 most viral shocking AI news stories trending RIGHT NOW? Return ONLY a JSON array of 6 objects with keys: title, description, viralAngle. No markdown.' }]
    });
    const raw = response.content[0].text.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) trendingCache = { topics: JSON.parse(match[0]), fetchedAt: new Date() };
  } catch(e) { console.error('AI trending failed:', e.message); }
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
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: 'Give me one shocking recent AI news story for YouTube Shorts. Return ONLY JSON: {"title": "shocking title max 10 words", "description": "2-3 sentences"}. No markdown.' }]
  });
  return JSON.parse(response.content[0].text.trim().replace(/```json|```/g, '').trim());
}

async function formatAIScript(newsItem, claudeClient) {
  const response = await claudeClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: 'You are a YouTube Shorts narrator for a viral AI facts channel.\nTitle: ' + newsItem.title + '\nContent: ' + newsItem.description + '\nRules: Start with "AI just did something insane..." or "Nobody is talking about this...", under 150 words, urgent and exciting, end with "And this is just the beginning...". Return ONLY narration text.' }]
  });
  return response.content[0].text.trim();
}

module.exports = { fetchAINews, formatAIScript };
