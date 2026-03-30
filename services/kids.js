const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

const KIDS_TOPICS = [
  'amazing animal facts', 'how volcanoes work', 'why is the sky blue',
  'fascinating ocean creatures', 'how rainbows form', 'cool space facts',
  'how butterflies transform', 'why do we dream', 'amazing dinosaur facts',
  'how plants make food', 'why do leaves change color', 'how lightning works'
];

async function fetchKidsContent(claudeClient) {
  const topic = KIDS_TOPICS[Math.floor(Math.random() * KIDS_TOPICS.length)];
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: 'You are a fun kids YouTube Shorts narrator.\nCreate an exciting 60-second educational script about: ' + topic + '\nRules: Simple words for ages 6-12, start with "Did you know..." or "Whoa check this out!", 3-4 amazing facts, under 130 words, fun and energetic, end with "How cool is that?!". Return ONLY the narration text.'
    }]
  });
  return { topic, script: response.content[0].text.trim() };
}

module.exports = { fetchKidsContent };
