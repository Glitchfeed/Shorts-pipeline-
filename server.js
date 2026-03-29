require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/status', require('./routes/status'));
app.use('/api/scheduler', require('./routes/scheduler'));
app.use('/api/youtube', require('./routes/youtube'));
app.use('/output', express.static(tempDir));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Shorts Pipeline running on port ${PORT}`);
});
