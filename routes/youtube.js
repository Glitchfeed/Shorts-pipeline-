const express = require('express');
const router = express.Router();
const { isConnected, getChannelInfo } = require('../services/youtube');

const CHANNELS = ['glitchfeed', 'glitchmind', 'kids', 'warmtales'];

router.get('/status', async (req, res) => {
  const status = {};
  for (const ch of CHANNELS) {
    const connected = isConnected(ch);
    status[ch] = {
      connected,
      channel: connected ? await getChannelInfo(ch).catch(() => null) : null
    };
  }
  res.json(status);
});

module.exports = router;
