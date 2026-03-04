/**
 * Phase 6 - Security Headers Tests
 *
 * Verifies that helmet.js is properly configured and security
 * headers are present in HTTP responses.
 */

import express from 'express';
import helmet from 'helmet';
import request from 'supertest';

// ─── Create minimal test app mimicking server.js helmet config ──────────────

const createTestApp = () => {
  const app = express();

  // Same helmet config as server.js
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/test', (req, res) => {
    res.json({ data: 'test' });
  });

  return app;
};

// ─── Security Headers Tests ─────────────────────────────────────────────────

describe('Security Headers (helmet.js)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  test('includes X-Content-Type-Options: nosniff', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('includes X-DNS-Prefetch-Control header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
  });

  test('includes X-Frame-Options header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('includes Strict-Transport-Security header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['strict-transport-security']).toContain('max-age=');
  });

  test('includes X-Download-Options header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-download-options']).toBe('noopen');
  });

  test('includes X-Permitted-Cross-Domain-Policies header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  test('does NOT include X-Powered-By header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('security headers present on API routes too', async () => {
    const response = await request(app).get('/api/test');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

// ─── Disabled Headers (for CDN compatibility) ───────────────────────────────

describe('Disabled Headers (CDN compatibility)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  test('does NOT set Cross-Origin-Embedder-Policy (would break CDN images)', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['cross-origin-embedder-policy']).toBeUndefined();
  });

  test('does NOT set Cross-Origin-Resource-Policy (would break CDN images)', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['cross-origin-resource-policy']).toBeUndefined();
  });

  test('does NOT set Content-Security-Policy (handled separately)', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-security-policy']).toBeUndefined();
  });
});
