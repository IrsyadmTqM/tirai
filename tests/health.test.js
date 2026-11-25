import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { siapkanApp } from './bantuan.js';

describe('kerangka server', () => {
  let app;
  beforeAll(async () => {
    ({ app } = await siapkanApp());
  });

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
