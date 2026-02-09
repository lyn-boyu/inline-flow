import { Hono } from 'hono';
import { runHandler } from './src/api/run';

const app = new Hono();

// Auth middleware
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const expectedKey = process.env.HOST_API_KEY;

  if (!expectedKey) {
    return c.json({ ok: false, error: 'HOST_API_KEY not configured' }, 500);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  if (token !== expectedKey) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  await next();
});

// API routes
app.post('/api/run', runHandler);

// Health check
app.get('/health', (c) => {
  return c.json({ ok: true, status: 'healthy' });
});

const port = parseInt(process.env.PORT || '8787');

console.log(`🚀 Inline Flow Host running on http://127.0.0.1:${port}`);

export default {
  port,
  fetch: app.fetch,
};