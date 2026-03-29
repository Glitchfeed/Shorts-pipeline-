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

async function fetchRedditStory() {
  const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
  console.log('Generating story about: ' + theme);
  return await generateOriginalStory(theme);
}

async function generateOriginalStory(theme) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: 'Write a completely original, realistic first-person Reddit-style story about: ' + theme + '\n\nRequirements:\n- First person perspective, feels like a real personal experience\n- 200-350 words\n- Has a satisfying twist or ending\n- Dramatic, engaging, emotionally resonant\n- Specific details that make it feel real\n- Return ONLY the story text, no title, no intro, no explanation'
    }]
  });

  const story = response.content[0].text.trim();

  const titleResponse = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: 'Write a short punchy Reddit-style title for this story. Max 12 words. Make it dramatic and clickable. Return ONLY the title, nothing else:\n\n' + story
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
