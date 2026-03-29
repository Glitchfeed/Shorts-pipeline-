const express = require('express');
const router = express.Router();
const { startScheduler, stopScheduler, getSchedulerState, triggerAutoGenerate } = require('../services/scheduler');

router.get('/status', (req, res) => {
  res.json(getSchedulerState());
});

router.post('/enable', (req, res) => {
  startScheduler();
  res.json({ success: true, message: 'Scheduler enabled' });
});

router.post('/disable', (req, res) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler disabled' });
});

router.post('/trigger/:channel', async (req, res) => {
  const { channel } = req.params;
  const validChannels = ['glitchfeed', 'glitchmind', 'kids'];
  if (!validChannels.includes(channel)) {
    return res.status(400).json({ error: 'Invalid channel. WarmTales is manual only.' });
  }
  res.json({ success: true, message: `Triggering ${channel}...` });
  triggerAutoGenerate(channel).catch(console.error);
});

module.exports = router;
