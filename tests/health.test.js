import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';

describe('kerangka server', () => {
  const app = createApp();

  it('GET /api/health menjawab ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', app: 'Tirai' });
  });

  it('endpoint API yang tidak ada menjawab 404', async () => {
    const res = await request(app).get('/api/tidak-ada');
    expect(res.status).toBe(404);
  });

  it('tidak membocorkan header X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
