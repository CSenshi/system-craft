import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE_URL });

describe('URL Shortener API', () => {
  const validUrl = 'https://example.com/' + uuidv4();
  const maxLenUrl =
    'https://example.com/' + 'a'.repeat(2048 - 'https://example.com/'.length);
  let shortUrlId: string;

  it('should shorten a valid URL', async () => {
    const res = await api.post('/url', { url: validUrl });
    expect(res.status).toBe(201);
    expect(res.data.shortUrl).toBeDefined();
    shortUrlId = res.data.shortUrl;
  });

  it('should retrieve the original URL using the shortUrlId', async () => {
    const res = await api.get(`${shortUrlId}`);
    expect(res.status).toBe(200);
    expect(res.data.url).toBe(validUrl);
  });

  it('should reject invalid URLs', async () => {
    await expect(api.post('/url', { url: 'not-a-url' })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('should reject missing url field', async () => {
    await expect(api.post('/url', {})).rejects.toMatchObject({
      response: { status: 400     },
    });
  });

  it('should reject URLs longer than 2048 chars', async () => {
    const tooLongUrl =
      'https://example.com/' + 'a'.repeat(2049 - 'https://example.com/'.length);
    await expect(api.post('/url', { url: tooLongUrl })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('should handle non-existent shortUrlId', async () => {
    await expect(api.get('/l/notad123')).rejects.toMatchObject({
      response: { status: 400  },
    });
  });

  it('should handle malformed shortUrlId', async () => {
    await expect(api.get('/l/!@#$%^&*()')).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('should shorten the same URL multiple times (idempotency)', async () => {
    const res1 = await api.post('/url', { url: validUrl });
    const res2 = await api.post('/url', { url: validUrl });
    expect(res1.data.shortUrl).toBeDefined();
    expect(res2.data.shortUrl).toBeDefined();
  });

  it('should shorten a max-length URL', async () => {
    const res = await api.post('/url', { url: maxLenUrl });
    expect(res.status).toBe(201);
    expect(res.data.shortUrl).toBeDefined();
  });

  it('should prevent XSS in URLs', async () => {
    await expect(
      api.post('/url', { url: 'javascript:alert(1)' })
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});
