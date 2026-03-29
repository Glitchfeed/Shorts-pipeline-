const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_FILES = {
  glitchfeed: path.join(__dirname, '../tokens/youtube-tokens.json'),
  kids:        path.join(__dirname, '../tokens/youtube-kids-tokens.json'),
  glitchmind:  path.join(__dirname, '../tokens/youtube-ai-tokens.json'),
  warmtales:   path.join(__dirname, '../tokens/youtube-warmtales-tokens.json'),
};

const CHANNEL_HASHTAGS = {
  glitchfeed: '#shorts #reddit #fyp #redditstories #storytime #viral #drama #aita #tifu #relatable #storiesofreddit',
  glitchmind: '#shorts #ai #fyp #artificialintelligence #tech #chatgpt #openai #future #aitools #technology #viral',
  kids:        '#shorts #facts #fyp #didyouknow #learnfacts #kidsfacts #science #wowfacts #amazingfacts #education',
  warmtales:   '#shorts #heartwarming #fyp #warmtales #foryou #inspiring #wholesome #emotional #feelgood #story',
};

const CHANNEL_EMOJIS = {
  glitchfeed: '🎬',
  glitchmind: '🤖',
  kids:        '⭐',
  warmtales:   '🌸',
};

const CHANNEL_TAGS = {
  glitchfeed: ['shorts','reddit','fyp','redditstories','storytime','viral','drama','aita','tifu','relatable'],
  glitchmind: ['shorts','ai','fyp','artificialintelligence','tech','chatgpt','openai','future','aitools','technology'],
  kids:        ['shorts','facts','fyp','didyouknow','learnfacts','kidsfacts','science','wowfacts','amazingfacts','education'],
  warmtales:   ['shorts','heartwarming','fyp','warmtales','foryou','inspiring','wholesome','emotional','feelgood','story'],
};

function makeClient(channel) {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `http://localhost:8888/api/youtube/${channel}-callback`
  );
}

function isConnected(channel) {
  const file = TOKEN_FILES[channel];
  if (!file || !fs.existsSync(file)) return false;
  try {
    return !!JSON.parse(fs.readFileSync(file, 'utf8')).refresh_token;
  } catch { return false; }
}

async function getAuthedClient(channel) {
  const file = TOKEN_FILES[channel];
  if (!file || !fs.existsSync(file)) throw new Error(`No tokens found for ${channel}`);
  const client = makeClient(channel);
  const tokens = JSON.parse(fs.readFileSync(file, 'utf8'));
  client.setCredentials(tokens);
  const needsRefresh = !tokens.access_token ||
    (tokens.expiry_date && tokens.expiry_date < Date.now() + 60_000);
  if (needsRefresh && tokens.refresh_token) {
    const { credentials } = await client.refreshAccessToken();
    const merged = { ...tokens, ...credentials };
    fs.writeFileSync(file, JSON.stringify(merged, null, 2));
    client.setCredentials(merged);
  }
  return client;
}

async function uploadToYouTube(videoPath, title, channel, options = {}) {
  const auth = await getAuthedClient(channel);
  const yt = google.youtube({ version: 'v3', auth });
  const emoji = CHANNEL_EMOJIS[channel] || '🎬';
  const hashtags = CHANNEL_HASHTAGS[channel] || '#shorts #fyp';
  const tags = CHANNEL_TAGS[channel] || ['shorts', 'fyp'];
  const isKids = channel === 'kids';
  const fullTitle = `${emoji} ${title}`.slice(0, 100);

  console.log(`📤 Uploading to YouTube [${channel}]: ${fullTitle}`);

  const response = await yt.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: fullTitle,
        description: hashtags,
        tags,
        categoryId: '22',
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: options.privacyStatus || 'public',
        selfDeclaredMadeForKids: isKids,
        madeForKids: isKids,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = response.data.id;
  const url = `https://youtube.com/shorts/${videoId}`;
  console.log(`✅ Uploaded: ${url}`);

  // Post pinned comment with hashtags
  try {
    const yt2 = google.youtube({ version: 'v3', auth });
    await yt2.commentThreads.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: {
              textOriginal: `${hashtags}\n\nFollow for more! 🔔`
            }
          },
        },
      },
    });
  } catch (e) {
    console.warn('Comment post failed:', e.message);
  }

  return { videoId, url };
}

async function getChannelInfo(channel) {
  try {
    const auth = await getAuthedClient(channel);
    const yt = google.youtube({ version: 'v3', auth });
    const res = await yt.channels.list({ part: ['snippet'], mine: true });
    const ch = res.data.items?.[0];
    if (!ch) return null;
    return {
      channelId: ch.id,
      title: ch.snippet?.title,
      handle: ch.snippet?.customUrl || ch.id,
    };
  } catch (e) {
    console.error(`YouTube getChannelInfo error for ${channel}:`, e.message);
    return null;
  }
}

function saveToken(channel, tokens) {
  const file = TOKEN_FILES[channel];
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(tokens, null, 2));
}

module.exports = {
  uploadToYouTube,
  isConnected,
  getChannelInfo,
  saveToken,
  TOKEN_FILES,
  makeClient,
};
