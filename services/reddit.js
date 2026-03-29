const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

let trendingCache = { topics: [], fetchedAt: null };

// Fetch trending story themes every 2 hours
async function refreshTrending() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: 'What are the top 6 most viral Reddit story themes and relationship drama topics trending RIGHT NOW on social media and YouTube Shorts? Think AITA, petty revenge, malicious compliance, workplace drama. Return ONLY a JSON array of 6 objects with keys: theme (the story theme), angle (specific dramatic angle), hook (opening line for the story). No markdown, no backticks, just the JSON array.'
      }]
    });
    const raw = response.content[0].text.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      trendingCache = { topics: JSON.parse(match[0]), fetchedAt: new Date() };
      console.log('Reddit trending themes refreshed: ' + trendingCache.topics.length + ' themes');
    }
  } catch (e) {
    console.error('Reddit trending fetch failed:', e.message);
  }
}

// Refresh on startup and every 2 hours
refreshTrending();
setInterval(refreshTrending, 2 * 60 * 60 * 1000);

async function fetchRedditStory() {
  let theme = 'workplace revenge story';
  let hook = 'So this actually happened...';

  if (trendingCache.topics && trendingCache.topics.length > 0) {
    const item = trendingCache.topics[Math.floor(Math.random() * trendingCache.topics.length)];
    theme = item.theme + ' - ' + item.angle;
    hook = item.hook || hook;
  }

  console.log('Generating story about: ' + theme);

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: 'Write a completely original, realistic first-person Reddit-style story about: ' + theme + '\n\nStart with this hook: "' + hook + '"\n\nRequirements:\n- First person perspective, feels like a real personal experience\n- 200-350 words\n- Has a satisfying twist or ending\n- Dramatic, engaging, emotionally resonant\n- Specific details that make it feel real\n- Return ONLY the story text, no title, no intro, no explanation'
    }]
  });

  const story = response.content[0].text.trim();

  const titleResponse = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: 'Write a short punchy Reddit-style title for this story. Max 12 words. Make it dramatic and clickable. Return ONLY the title:\n\n' + story
    }]
  });

  return {
    title: titleResponse.content[0].text.trim(),
    content: story,
    subreddit: 'r/pettyrevenge'
  };
}

async function formatRedditScript(story, claudeClient) {
  const response = await claudeClient.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: 'You are a YouTube Shorts narrator.\nConvert this story into a dramatic 60-second narration script.\nTitle: ' + story.title + '\nContent: ' + story.content + '\nRules:\n- Start with a hook like "So this actually happened..."\n- Keep it under 150 words total\n- Make it dramatic and engaging\n- End with a punchy conclusion or moral\n- Return ONLY the narration text, nothing else'
    }]
  });
  return response.content[0].text.trim();
}

module.exports = { fetchRedditStory, formatRedditScript };
