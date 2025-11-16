import { z } from 'zod';
import type { ApiClient } from './client';
import type { Collection, Highlight, CreateHighlight } from './types';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

/**
 * Options for getting highlights.
 */
export type GetHighlightsOptions = {
  version_id?: number;
  passage_id?: string;
};

/**
 * Options for deleting highlights.
 */
export type DeleteHighlightOptions = {
  version_id?: number;
};

/**
 * Client for interacting with Highlights API endpoints.
 * Note: All endpoints require OAuth authentication with appropriate scopes.
 */
export class HighlightsClient {
  private client: ApiClient;

  private versionIdSchema = z.number().int().positive('Version ID must be a positive integer');
  private passageIdSchema = z.string().trim().min(1, 'Passage ID must be a non-empty string');
  private colorSchema = z
    .string()
    .regex(/^[0-9a-f]{6}$/i, 'Color must be a 6-character hex string without #');

  /**
   * Creates a new HighlightsClient instance.
   * @param client The API client to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Gets the authentication token, either from the provided parameter or from the platform configuration.
   * @param lat Optional explicit long access token. If not provided, retrieves from YouVersionPlatformConfiguration.
   * @returns The authentication token.
   * @throws Error if no token is available.
   */
  private getAuthToken(lat?: string): string {
    if (lat) {
      return lat;
    }
    const token = YouVersionPlatformConfiguration.accessToken;
    if (!token) {
      throw new Error(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );
    }
    return token;
  }

  private validateVersionId(value: number): void {
    try {
      this.versionIdSchema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Version ID must be a positive integer');
      }
      throw error;
    }
  }

  private validatePassageId(value: string): void {
    try {
      this.passageIdSchema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Passage ID must be a non-empty string');
      }
      throw error;
    }
  }

  private validateColor(value: string): void {
    try {
      this.colorSchema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Color must be a 6-character hex string without #');
      }
      throw error;
    }
  }

  /**
   * Fetches a collection of highlights for a user.
   * The response will return a color per verse without ranges.
   * Requires OAuth with read_highlights scope.
   * @param options Query parameters for filtering highlights.
   * @param lat Optional long access token. If not provided, retrieves from YouVersionPlatformConfiguration.
   * @returns A collection of Highlight objects.
   */
  async getHighlights(
    options?: GetHighlightsOptions,
    lat?: string,
  ): Promise<Collection<Highlight>> {
    const token = this.getAuthToken(lat);
    const params: Record<string, string | number> = {
      lat: token,
    };

    if (options?.version_id !== undefined) {
      this.validateVersionId(options.version_id);
      params.version_id = options.version_id;
    }

    if (options?.passage_id !== undefined) {
      this.validatePassageId(options.passage_id);
      params.passage_id = options.passage_id;
    }

    return this.client.get<Collection<Highlight>>(`/v1/highlights`, params);
  }

  /**
   * Creates or updates a highlight on a passage.
   * Verse ranges may be used in the passage_id attribute.
   * Requires OAuth with write_highlights scope.
   * @param data The highlight data to create or update.
   * @param lat Optional long access token. If not provided, retrieves from YouVersionPlatformConfiguration.
   * @returns The created or updated Highlight object.
   */
  async createHighlight(data: CreateHighlight, lat?: string): Promise<Highlight> {
    this.validateVersionId(data.version_id);
    this.validatePassageId(data.passage_id);
    this.validateColor(data.color);

    const token = this.getAuthToken(lat);

    return this.client.post<Highlight>(`/v1/highlights`, data, { lat: token });
  }

  /**
   * Clears highlights for a passage.
   * Requires OAuth with write_highlights scope.
   * @param passageId The passage identifier (USFM format, e.g., "MAT.1.1" or "MAT.1.1-5").
   * @param options Optional query parameters including bible_id.
   * @param lat Optional long access token. If not provided, retrieves from YouVersionPlatformConfiguration.
   * @returns Promise that resolves when highlights are deleted (204 response).
   */
  async deleteHighlight(
    passageId: string,
    options?: DeleteHighlightOptions,
    lat?: string,
  ): Promise<void> {
    this.validatePassageId(passageId);

    const token = this.getAuthToken(lat);
    const params: Record<string, string | number> = {
      lat: token,
    };

    if (options?.version_id !== undefined) {
      this.validateVersionId(options.version_id);
      params.version_id = options.version_id;
    }

    await this.client.delete<void>(`/v1/highlights/${passageId}`, params);
  }
}
