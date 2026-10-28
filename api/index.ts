import express from 'express';
import cors from 'cors';
import { apiRouter } from '../server/api.ts';
import { getDb } from '../server/db.ts';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

let dbInitPromise: Promise<any> | null = null;
app.use(async (_req, _res, next) => {
  try {
    if (!dbInitPromise) {
      dbInitPromise = getDb();
    }
    await dbInitPromise;
    next();
  } catch (err) {
    next(err);
  }
});

// Version & health check endpoint for Vercel auto-update check
const healthCheck = (_req: express.Request, res: express.Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    status: 'healthy',
    app: 'CampusHub Africa',
    version: '1.0.1',
    environment: process.env.VERCEL ? 'vercel' : 'production',
    timestamp: new Date().toISOString()
  });
};

app.get('/api/health', healthCheck);
app.get('/health', healthCheck);

// Mount router on both /api and root so Vercel rewrites work consistently
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;

