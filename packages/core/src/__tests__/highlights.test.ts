import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient } from '../client';
import { HighlightsClient } from '../highlights';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';

describe('HighlightsClient', () => {
  let apiClient: ApiClient;
  let highlightsClient: HighlightsClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseUrl: 'https://api-dev.youversion.com',
      appKey: 'test-app',
      version: 'v1',
      installationId: 'test-installation',
    });
    highlightsClient = new HighlightsClient(apiClient);
    // Set a default token for tests that don't explicitly pass one
    YouVersionPlatformConfiguration.setAccessToken('test-token');
  });

  afterEach(() => {
    // Clean up token after each test
    YouVersionPlatformConfiguration.setAccessToken(null);
    vi.clearAllMocks(); // Reset all mocked calls between tests
  });

  describe('getHighlights', () => {
    it('should fetch highlights with no options', async () => {
      const highlights = await highlightsClient.getHighlights();

      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]).toEqual({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });
    });

    it('should fetch highlights with version_id option', async () => {
      const highlights = await highlightsClient.getHighlights({ version_id: 1 });

      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]?.version_id).toBe(1);
    });

    it('should fetch highlights with passage_id option', async () => {
      const highlights = await highlightsClient.getHighlights({ passage_id: 'JHN.3.16' });

      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]?.passage_id).toBe('JHN.3.16');
    });

    it('should fetch highlights with both options', async () => {
      const highlights = await highlightsClient.getHighlights({
        version_id: 1,
        passage_id: 'JHN.3.16',
      });

      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]?.version_id).toBe(1);
      expect(highlights.data[0]?.passage_id).toBe('JHN.3.16');
    });

    it('should throw an error for invalid version_id', async () => {
      await expect(highlightsClient.getHighlights({ version_id: 0 })).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(highlightsClient.getHighlights({ version_id: -1 })).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(highlightsClient.getHighlights({ version_id: 1.5 })).rejects.toThrow();
    });

    it('should throw an error for invalid passage_id', async () => {
      await expect(highlightsClient.getHighlights({ passage_id: '' })).rejects.toThrow(
        'Passage ID must be a non-empty string',
      );
      await expect(highlightsClient.getHighlights({ passage_id: '   ' })).rejects.toThrow(
        'Passage ID must be a non-empty string',
      );
    });

    it('should include lat parameter when token provided explicitly', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      const highlights = await highlightsClient.getHighlights({ version_id: 1 }, 'explicit-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=explicit-token'),
        expect.any(Object),
      );
      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]?.version_id).toBe(1);

      fetchSpy.mockRestore();
    });

    it('should include lat parameter when token auto-retrieved from config', async () => {
      YouVersionPlatformConfiguration.setAccessToken('config-token');
      const fetchSpy = vi.spyOn(global, 'fetch');

      const highlights = await highlightsClient.getHighlights({ version_id: 1 });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=config-token'),
        expect.any(Object),
      );
      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]?.version_id).toBe(1);

      fetchSpy.mockRestore();
    });

    it('should throw an error when no token is available', async () => {
      YouVersionPlatformConfiguration.setAccessToken(null);

      await expect(highlightsClient.getHighlights({ version_id: 1 })).rejects.toThrow(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );
    });

    it('should use explicit token over config token', async () => {
      YouVersionPlatformConfiguration.setAccessToken('config-token');
      const fetchSpy = vi.spyOn(global, 'fetch');
      const highlights = await highlightsClient.getHighlights({ version_id: 1 }, 'explicit-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=explicit-token'),
        expect.any(Object),
      );
      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]?.version_id).toBe(1);

      fetchSpy.mockRestore();
    });
  });

  describe('createHighlight', () => {
    it('should create a highlight', async () => {
      const highlight = await highlightsClient.createHighlight({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });

      expect(highlight).toEqual({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });
    });

    it('should throw an error for invalid version_id', async () => {
      await expect(
        highlightsClient.createHighlight({
          version_id: 0,
          passage_id: 'MAT.1.1',
          color: 'fffe00',
        }),
      ).rejects.toThrow('Version ID must be a positive integer');

      await expect(
        highlightsClient.createHighlight({
          version_id: -1,
          passage_id: 'MAT.1.1',
          color: 'fffe00',
        }),
      ).rejects.toThrow('Version ID must be a positive integer');
    });

    it('should throw an error for invalid passage_id', async () => {
      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: '',
          color: 'fffe00',
        }),
      ).rejects.toThrow('Passage ID must be a non-empty string');

      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: '   ',
          color: 'fffe00',
        }),
      ).rejects.toThrow('Passage ID must be a non-empty string');
    });

    it('should throw an error for invalid color', async () => {
      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: 'invalid',
        }),
      ).rejects.toThrow('Color must be a 6-character hex string without #');

      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: '#fffe00',
        }),
      ).rejects.toThrow('Color must be a 6-character hex string without #');

      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: 'fff',
        }),
      ).rejects.toThrow('Color must be a 6-character hex string without #');

      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: 'fffe00a',
        }),
      ).rejects.toThrow('Color must be a 6-character hex string without #');
    });

    it('should accept valid hex colors', async () => {
      const validColors = ['fffe00', '5dff79', '00d6ff', 'FFC66F', 'ff95ef'];

      for (const color of validColors) {
        const highlight = await highlightsClient.createHighlight({
          version_id: 111,
          passage_id: 'MAT.1.1',
          color,
        });

        expect(highlight.color).toBe(color);
      }
    });

    it('should accept passage ranges in passage_id', async () => {
      const highlight = await highlightsClient.createHighlight({
        version_id: 111,
        passage_id: 'MAT.1.1-5',
        color: 'fffe00',
      });

      expect(highlight.passage_id).toBe('MAT.1.1-5');
    });

    it('should include lat parameter when token provided explicitly', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const highlight = await highlightsClient.createHighlight(
        {
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: 'fffe00',
        },
        'explicit-token',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=explicit-token'),
        expect.any(Object),
      );
      expect(highlight).toEqual({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });

      fetchSpy.mockRestore();
    });

    it('should include lat parameter when token auto-retrieved from config', async () => {
      YouVersionPlatformConfiguration.setAccessToken('config-token');
      const fetchSpy = vi.spyOn(global, 'fetch');
      const highlight = await highlightsClient.createHighlight({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=config-token'),
        expect.any(Object),
      );
      expect(highlight).toEqual({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });

      fetchSpy.mockRestore();
    });

    it('should throw an error when no token is available', async () => {
      YouVersionPlatformConfiguration.setAccessToken(null);

      await expect(
        highlightsClient.createHighlight({
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: 'fffe00',
        }),
      ).rejects.toThrow(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );
    });

    it('should use explicit token over config token', async () => {
      YouVersionPlatformConfiguration.setAccessToken('config-token');
      const fetchSpy = vi.spyOn(global, 'fetch');
      const highlight = await highlightsClient.createHighlight(
        {
          version_id: 111,
          passage_id: 'MAT.1.1',
          color: 'fffe00',
        },
        'explicit-token',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=explicit-token'),
        expect.any(Object),
      );
      expect(highlight).toEqual({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });

      fetchSpy.mockRestore();
    });
  });

  describe('deleteHighlight', () => {
    it('should delete a highlight', async () => {
      let capturedStatus: number | undefined;
      const originalFetch = global.fetch;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (...args) => {
        const response = await originalFetch(...args);
        capturedStatus = response.status;
        return response;
      });

      await highlightsClient.deleteHighlight('MAT.1.1');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=test-token'),
        expect.any(Object),
      );
      expect(capturedStatus).toBe(204);

      fetchSpy.mockRestore();
    });

    it('should delete a highlight with version_id option', async () => {
      let capturedStatus: number | undefined;
      const originalFetch = global.fetch;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (...args) => {
        const response = await originalFetch(...args);
        capturedStatus = response.status;
        return response;
      });

      await highlightsClient.deleteHighlight('MAT.1.1', { version_id: 111 });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=test-token'),
        expect.any(Object),
      );
      expect(capturedStatus).toBe(204);

      fetchSpy.mockRestore();
    });

    it('should throw an error for invalid passage_id', async () => {
      await expect(highlightsClient.deleteHighlight('')).rejects.toThrow(
        'Passage ID must be a non-empty string',
      );

      await expect(highlightsClient.deleteHighlight('   ')).rejects.toThrow(
        'Passage ID must be a non-empty string',
      );
    });

    it('should throw an error for invalid version_id in options', async () => {
      await expect(highlightsClient.deleteHighlight('MAT.1.1', { version_id: 0 })).rejects.toThrow(
        'Version ID must be a positive integer',
      );

      await expect(highlightsClient.deleteHighlight('MAT.1.1', { version_id: -1 })).rejects.toThrow(
        'Version ID must be a positive integer',
      );
    });

    it('should accept passage ranges in passage_id', async () => {
      let capturedStatus: number | undefined;
      const originalFetch = global.fetch;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (...args) => {
        const response = await originalFetch(...args);
        capturedStatus = response.status;
        return response;
      });

      await highlightsClient.deleteHighlight('MAT.1.1-5');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=test-token'),
        expect.any(Object),
      );
      expect(capturedStatus).toBe(204);

      fetchSpy.mockRestore();
    });

    it('should include lat parameter when token provided explicitly', async () => {
      let capturedStatus: number | undefined;
      const originalFetch = global.fetch;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (...args) => {
        const response = await originalFetch(...args);
        capturedStatus = response.status;
        return response;
      });

      await highlightsClient.deleteHighlight('MAT.1.1', undefined, 'explicit-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=explicit-token'),
        expect.any(Object),
      );
      expect(capturedStatus).toBe(204);

      fetchSpy.mockRestore();
    });

    it('should include lat parameter when token auto-retrieved from config', async () => {
      YouVersionPlatformConfiguration.setAccessToken('config-token');
      let capturedStatus: number | undefined;
      const originalFetch = global.fetch;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (...args) => {
        const response = await originalFetch(...args);
        capturedStatus = response.status;
        return response;
      });

      await highlightsClient.deleteHighlight('MAT.1.1');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=config-token'),
        expect.any(Object),
      );
      expect(capturedStatus).toBe(204);

      fetchSpy.mockRestore();
    });

    it('should throw an error when no token is available', async () => {
      YouVersionPlatformConfiguration.setAccessToken(null);

      await expect(highlightsClient.deleteHighlight('MAT.1.1')).rejects.toThrow(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );
    });

    it('should use explicit token over config token', async () => {
      YouVersionPlatformConfiguration.setAccessToken('config-token');
      let capturedStatus: number | undefined;
      const originalFetch = global.fetch;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (...args) => {
        const response = await originalFetch(...args);
        capturedStatus = response.status;
        return response;
      });

      await highlightsClient.deleteHighlight('MAT.1.1', undefined, 'explicit-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lat=explicit-token'),
        expect.any(Object),
      );
      expect(capturedStatus).toBe(204);

      fetchSpy.mockRestore();
    });
  });
});
