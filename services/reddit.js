const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

const STORY_THEMES = [
  'workplace revenge story', 'entitled person gets karma',
  'neighbor dispute with satisfying ending', 'family drama with plot twist',
  'friend betrayal and redemption', 'malicious compliance at work',
  'landlord gets what they deserve', 'coworker sabotage backfires',
  'petty revenge that worked perfectly', 'standing up to a bully',
  'customer service horror story', 'roommate drama with twist ending',
  'dating disaster that turned funny', 'boss gets humiliated publicly',
  'Karen gets shut down spectacularly'
];

let trendingCache = { topics: [], fetchedAt: null };

async function refreshTrending() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: 'What are the 6 most viral Reddit story themes trending RIGHT NOW? Think AITA, petty revenge, malicious compliance, workplace drama. Return ONLY a JSON array of 6 objects with keys: theme, angle, hook. No markdown.' }]
    });
    const raw = response.content[0].text.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) trendingCache = { topics: JSON.parse(match[0]), fetchedAt: new Date() };
  } catch(e) { console.error('Reddit trending failed:', e.message); }
}

refreshTrending();
setInterval(refreshTrending, 2 * 60 * 60 * 1000);

async function fetchRedditStory() {
  let theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
  let hook = 'So this actually happened...';
  if (trendingCache.topics && trendingCache.topics.length > 0) {
    const item = trendingCache.topics[Math.floor(Math.random() * trendingCache.topics.length)];
    theme = item.theme + ' - ' + item.angle;
    hook = item.hook || hook;
  }
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: 'Write a completely original first-person Reddit-style story about: ' + theme + '\nStart with: "' + hook + '"\nRequirements: 200-350 words, satisfying twist, specific details, feels real. Return ONLY the story text.' }]
  });
  const story = response.content[0].text.trim();
  const titleResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Write a punchy Reddit-style title max 12 words. Return ONLY the title:\n\n' + story }]
  });
  return { title: titleResponse.content[0].text.trim(), content: story, subreddit: 'r/pettyrevenge' };
}

async function formatRedditScript(story, claudeClient) {
  const response = await claudeClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: 'You are a YouTube Shorts narrator.\nConvert this story into a dramatic 60-second narration.\nTitle: ' + story.title + '\nContent: ' + story.content + '\nRules: Start with hook, under 150 words, dramatic, punchy conclusion. Return ONLY narration text.' }]
  });
  return response.content[0].text.trim();
}

module.exports = { fetchRedditStory, formatRedditScript };
