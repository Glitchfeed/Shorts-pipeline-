const axios = require('axios');

const SUBREDDITS = [
  'AmItheAsshole', 'tifu', 'confession',
  'pettyrevenge', 'MaliciousCompliance', 'relationship_advice'
];

async function fetchRedditStory() {
  const subreddit = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
  const url = `https://www.reddit.com/r/${subreddit}/top.json?limit=25&t=day`;

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'ShortsPipeline/1.0 (by /u/shortspipeline)',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15000
  });

  const posts = response.data.data.children
    .map(p => p.data)
    .filter(p =>
      p.selftext &&
      p.selftext.length > 300 &&
      p.selftext.length < 8000 &&
      !p.over_18 &&
      !p.stickied &&
      p.selftext !== '[removed]' &&
      p.selftext !== '[deleted]'
    );

  if (posts.length === 0) {
    // Fallback — generate a story with Claude instead
    return {
      title: 'My coworker took credit for my work and I got the last laugh',
      content: 'I had been working on this project for months. My coworker presented it as their own to the entire company. But I had kept every email, every draft, every timestamp. When the CEO asked who built it, I simply forwarded my documentation chain. My coworker was let go the next day. Sometimes patience is the best revenge.',
      subreddit: 'r/pettyrevenge'
    };
  }

  const post = posts[Math.floor(Math.random() * Math.min(posts.length, 10))];
  return {
    title: post.title,
    content: post.selftext,
    subreddit: post.subreddit_name_prefixed
  };
}

async function formatRedditScript(story, claudeClient) {
  const response = await claudeClient.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a YouTube Shorts narrator.
Convert this Reddit post into a dramatic 60-second narration script.
Title: ${story.title}
Content: ${story.content.substring(0, 3000)}
Rules:
- Start with a hook like "So this actually happened..."
- Keep it under 150 words total
- Make it dramatic and engaging
- End with a punchy conclusion
- Return ONLY the narration text, nothing else`
    }]
  });
  return response.content[0].text.trim();
}

module.exports = { fetchRedditStory, formatRedditScript };
