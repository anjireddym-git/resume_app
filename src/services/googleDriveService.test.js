import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyDriveApiError, uploadHtmlAsGoogleDoc } from './googleDriveService';

describe('classifyDriveApiError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a reconnect for expired tokens', () => {
    expect(classifyDriveApiError(401, '')).toBe('authorization-required');
  });

  it('reports a disabled Drive API separately', () => {
    expect(classifyDriveApiError(403, '{"reason":"accessNotConfigured"}')).toBe('api-disabled');
  });

  it('requires a reconnect when scopes are insufficient', () => {
    expect(classifyDriveApiError(403, 'Request had insufficient authentication scopes.')).toBe('authorization-required');
  });

  it('keeps unrelated forbidden responses as permission failures', () => {
    expect(classifyDriveApiError(403, '{"reason":"forbidden"}')).toBe('permission-denied');
  });

  it('marks Drive 5xx responses as server errors', () => {
    expect(classifyDriveApiError(500, 'backendError')).toBe('server-error');
  });

  it('retries transient upload failures and returns the successful response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('backendError', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'file-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    const result = await uploadHtmlAsGoogleDoc(
      async () => 'token',
      new Blob(['<p>resume</p>'], { type: 'text/html; charset=UTF-8' }),
      'Resume',
      'folder-1'
    );

    expect(result).toEqual({ id: 'file-1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].body.type).toContain('multipart/related');
  });
});
