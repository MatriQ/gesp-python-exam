import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import progressRoutes from './routes/progress.js';
import errorBookRoutes from './routes/error-book.js';
import { prisma } from './lib/prisma.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', progressRoutes);
app.use('/api/error-book', errorBookRoutes);
app.use('/api/questions', questionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/sessions', async (_req, res) => {
  try {
    const sessions = await prisma.question.findMany({
      select: { session: true },
      distinct: ['session'],
      orderBy: { session: 'asc' },
    });
    res.json({ sessions: sessions.map((s) => s.session) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;
