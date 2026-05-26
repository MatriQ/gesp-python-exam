import express from 'express';
import { worker } from './worker.js';

const app = express();
app.use(express.json());

app.get('/judge/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = process.env.JUDGE_PORT || 3001;

app.listen(port, () => {
  console.log(`Judge service listening on port ${port}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await worker.close();
  process.exit(0);
});
