// Tes RBAC: setiap peran terhadap setiap endpoint.
// Harapan: tanpa sesi 401, peran tanpa hak 403, peran berhak 2xx.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { AKUN_PERAN, masukSebagai, siapkanApp } from './bantuan.js';
import { ENDPOINT } from './matriks-rbac.js';

const PERAN = Object.keys(AKUN_PERAN);

describe('matriks RBAC: peran x endpoint', () => {
  let app;
  const agen = {};
  beforeAll(async () => {
    ({ app } = await siapkanApp());
    for (const peran of PERAN) agen[peran] = await masukSebagai(app, AKUN_PERAN[peran]);
  });

  const kirim = (klien, e) => {
    const req = klien[e.metode](e.jalur);
    return e.body ? req.send(e.body) : req;
  };

  for (const e of ENDPOINT) {
    it(`tanpa sesi: ${e.metode.toUpperCase()} ${e.jalur} -> 401`, async () => {
      const res = await kirim(request(app), e);
      expect(res.status).toBe(401);
    });

    for (const peran of PERAN) {
      const berhak = e.boleh.includes(peran);
      it(`${peran}: ${e.metode.toUpperCase()} ${e.jalur} -> ${berhak ? 'diizinkan' : '403'}`, async () => {
        const res = await kirim(agen[peran], e);
        if (berhak) {
          expect(res.status, JSON.stringify(res.body)).toBeGreaterThanOrEqual(200);
          expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
        } else {
          expect(res.status).toBe(403);
        }
      });
    }
  }
});
