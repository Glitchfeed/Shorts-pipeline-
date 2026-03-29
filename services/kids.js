const KIDS_TOPICS = [
  'amazing animal facts', 'how volcanoes work', 'why is the sky blue',
  'fascinating ocean creatures', 'how rainbows form', 'cool space facts',
  'how butterflies transform', 'why do we dream', 'amazing dinosaur facts',
  'how plants make food', 'why do leaves change color', 'how lightning works'
];

async function fetchKidsContent(claudeClient) {
  const topic = KIDS_TOPICS[Math.floor(Math.random() * KIDS_TOPICS.length)];
  const response = await claudeClient.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a fun kids YouTube Shorts narrator.
Create an exciting 60-second educational script about: ${topic}
Rules:
- Use simple words kids aged 6-12 understand
- Start with "Did you know..." or "Whoa, check this out!"
- Include 3-4 amazing facts
- Keep it under 130 words
- Make it fun and energetic
- End with "How cool is that?!" or similar
- Return ONLY the narration text, nothing else`
    }]
  });
  return { topic, script: response.content[0].text.trim() };
}

module.exports = { fetchKidsContent };
