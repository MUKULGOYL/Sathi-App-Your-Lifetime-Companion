import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGenerateApi, ApiError } from '../src/services/apiClient';

describe('API Client Retry & Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed data on 200 OK response', async () => {
    const mockData = { answer: 'Here is your answer', stepByStep: [] };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true, data: mockData }),
    } as Response);

    const result = await callGenerateApi('ask', 'en', { query: 'test-200' });
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('never retries on 429 Too Many Requests and parses Retry-After header', async () => {
    const headers = new Headers();
    headers.set('Retry-After', '25');

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers,
      json: async () => ({
        error: 'Too many requests. Please pause for a moment.',
        errorHi: 'बहुत सारे अनुरोध। कृपया थोड़ी देर प्रतीक्षा करें।',
        code: 'AI_BUSY',
        retryAfterSeconds: 25,
      }),
    } as Response);

    let caughtError: unknown;
    try {
      await callGenerateApi('ask', 'en', { query: 'test-429' });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const apiErr = caughtError as ApiError;
    expect(apiErr.status).toBe(429);
    expect(apiErr.code).toBe('AI_BUSY');
    expect(apiErr.retryAfterSeconds).toBe(25);
    // MUST NOT RETRY: fetch called exactly 1 time
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 400 Bad Request client errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({ error: 'Missing feature', errorHi: 'अनुरोध अमान्य है' }),
    } as Response);

    await expect(
      callGenerateApi('ask', 'en', { query: 'test-400' })
    ).rejects.toThrow(ApiError);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 404 Not Found client errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({ error: 'Not found' }),
    } as Response);

    await expect(
      callGenerateApi('ask', 'en', { query: 'test-404' })
    ).rejects.toThrow(ApiError);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries at most once on 500 server error and succeeds on second attempt', async () => {
    const mockData = { greeting: 'Good morning' };

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: 'Server error' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, data: mockData }),
      } as Response);

    const result = await callGenerateApi('briefing', 'en', { query: 'test-500-retry' }, { timeoutMs: 5000 });
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries at most once on network fetch failure and succeeds', async () => {
    const mockData = { answer: 'Recovered after network blip' };

    vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, data: mockData }),
      } as Response);

    const result = await callGenerateApi('ask', 'en', { query: 'test-network-retry' });
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('deduplicates identical in-flight requests (same feature + payload hash)', async () => {
    const mockData = { answer: 'Deduplicated response' };

    // Simulate network delay on the first call
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, data: mockData }),
      } as Response;
    });

    const identicalPayload = { query: 'How to take metformin safely?' };

    // Trigger two identical requests concurrently
    const [p1, p2] = await Promise.all([
      callGenerateApi('ask', 'en', identicalPayload),
      callGenerateApi('ask', 'en', identicalPayload),
    ]);

    expect(p1).toEqual(mockData);
    expect(p2).toEqual(mockData);

    // Only 1 fetch call should have been made to the backend!
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT deduplicate requests with different payloads', async () => {
    const mockData1 = { answer: 'Answer 1' };
    const mockData2 = { answer: 'Answer 2' };

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, data: mockData1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, data: mockData2 }),
      } as Response);

    const [r1, r2] = await Promise.all([
      callGenerateApi('ask', 'en', { query: 'Question A' }),
      callGenerateApi('ask', 'en', { query: 'Question B' }),
    ]);

    expect(r1).toEqual(mockData1);
    expect(r2).toEqual(mockData2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
