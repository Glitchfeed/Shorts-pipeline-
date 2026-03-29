const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { fetchRedditStory, formatRedditScript } = require('./reddit');
const { fetchAINews, formatAIScript } = require('./rss');
const { fetchKidsContent } = require('./kids');
const { createJob, updateJob } = require('./jobTracker');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

const SCHEDULE = [
  { hour: 8,  minute: 0, channel: 'glitchmind' },
  { hour: 9,  minute: 0, channel: 'glitchfeed' },
  { hour: 13, minute: 0, channel: 'kids'        },
  { hour: 16, minute: 0, channel: 'glitchfeed'  },
  { hour: 19, minute: 0, channel: 'glitchmind'  },
  { hour: 21, minute: 0, channel: 'kids'        },
];

let schedulerInterval = null;
let isRunning = false;
const schedulerState = { enabled: false, lastRun: null, nextRuns: [], log: [] };

function addLog(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  console.log(entry);
  schedulerState.log.unshift(entry);
  if (schedulerState.log.length > 50) schedulerState.log.pop();
}

function getNextRuns() {
  const now = new Date();
  const estOffset = -4 * 60;
  const estNow = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
  return SCHEDULE.map(s => {
    const next = new Date(estNow);
    next.setHours(s.hour, s.minute, 0, 0);
    if (next <= estNow) next.setDate(next.getDate() + 1);
    return { channel: s.channel, time: `${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')} EST`, nextRun: next.toISOString() };
  });
}

function checkSchedule() {
  if (!schedulerState.enabled || isRunning) return;
  const now = new Date();
  const estOffset = -4 * 60;
  const estNow = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
  const currentHour = estNow.getHours();
  const currentMinute = estNow.getMinutes();
  for (const slot of SCHEDULE) {
    if (slot.hour === currentHour && currentMinute === 0) {
      addLog(`⏰ Scheduler triggered for: ${slot.channel}`);
      triggerAutoGenerate(slot.channel);
      break;
    }
  }
}

async function triggerAutoGenerate(channel) {
  if (isRunning) { addLog(`⚠️ Already running, skipping ${channel}`); return; }
  isRunning = true;
  const jobId = uuidv4();
  const tempDir = path.join(__dirname, '../temp', jobId);
  fs.mkdirSync(tempDir, { recursive: true });
  addLog(`🚀 Auto-generating for ${channel}`);
  createJob(jobId);
  updateJob(jobId, { channel, status: 'running', step: `🤖 Fetching content for ${channel}...`, progress: 2 });

  try {
    let script = '';
    let title = '';

    if (channel === 'glitchfeed') {
      updateJob(jobId, { step: '📱 Scraping Reddit...', progress: 5 });
      const story = await fetchRedditStory();
      script = await formatRedditScript(story, client);
      title = story.title.substring(0, 80);
    } else if (channel === 'glitchmind') {
      updateJob(jobId, { step: '📡 Fetching AI news...', progress: 5 });
      const news = await fetchAINews();
      script = await formatAIScript(news, client);
      title = news.title.substring(0, 80);
    } else if (channel === 'kids') {
      updateJob(jobId, { step: '🧒 Generating kids content...', progress: 5 });
      const content = await fetchKidsContent(client);
      script = content.script;
      title = `Amazing ${content.topic} Facts!`;
    }

    updateJob(jobId, { step: '✅ Script ready', progress: 10, scriptText: script, title });
    const { runScriptPipeline } = require('./pipeline-runner');
    await runScriptPipeline(jobId, script, channel, tempDir);
    schedulerState.lastRun = new Date().toISOString();
    addLog(`✅ Done for ${channel}: job ${jobId}`);
  } catch (err) {
    addLog(`❌ Failed for ${channel}: ${err.message}`);
    updateJob(jobId, { status: 'failed', error: err.message, step: `❌ Failed: ${err.message}` });
  } finally {
    isRunning = false;
  }
}

function startScheduler() {
  if (schedulerInterval) return;
  schedulerState.enabled = true;
  schedulerState.nextRuns = getNextRuns();
  schedulerInterval = setInterval(() => {
    checkSchedule();
    schedulerState.nextRuns = getNextRuns();
  }, 60 * 1000);
  addLog('✅ Scheduler started');
}

function stopScheduler() {
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
  schedulerState.enabled = false;
  addLog('⏹️ Scheduler stopped​​​​​​​​​​​​​​​​
