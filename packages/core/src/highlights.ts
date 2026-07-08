import { z } from 'zod';
import type { ApiClient } from './client';
import type { Collection, Highlight, CreateHighlight } from './types';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import {
  HighlightCollectionWireSchema,
  HighlightWireSchema,
  toHighlight,
} from './schemas/highlight';

/**
 * Options for getting highlights.
 * The API requires both a Bible version and a passage scope.
 */
export type GetHighlightsOptions = {
  /** Bible version identifier (sent to the API as `bible_id`). */
  version_id: number;
  /** Passage identifier in verse or chapter USFM format (e.g., "JHN.3" or "JHN.3.16"). */
  passage_id: string;
};

/**
 * Options for deleting highlights.
 */
export type DeleteHighlightOptions = {
  /** Bible version identifier (sent to the API as `bible_id`). */
  version_id: number;
};

/**
 * Client for interacting with Highlights API endpoints.
 * Note: All endpoints require OAuth authentication with appropriate scopes
 * (`read_highlights` / `write_highlights`), passed as an
 * `Authorization: Bearer <token>` header.
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
    const token =
      typeof localStorage === 'undefined' ? null : YouVersionPlatformConfiguration.accessToken;
    if (!token) {
      throw new Error(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );
    }
    return token;
  }

  private authHeaders(lat?: string): Record<string, string> {
    return { Authorization: `Bearer ${this.getAuthToken(lat)}` };
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
   * Generates a unique `request_id` for a create call, which the API requires on
   * every create. Note: a new id is minted per call, so this does not by itself
   * make caller-level retries idempotent — reuse the same id across retries of a
   * single logical create if end-to-end idempotency is needed.
   */
  private generateRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Extremely old runtimes only; uniqueness (not randomness quality) is what matters here.
    return `yvp-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  }

  /**
   * Fetches a collection of highlights for a user.
   * The response will return a color per verse without ranges.
   * Requires OAuth with read_highlights scope.
   * @param options Query parameters scoping the fetch. `version_id` and `passage_id`
   *   (verse or chapter USFM, e.g. "JHN.3") are both required by the API.
   * @param lat Optional long access token. If not provided, retrieves from YouVersionPlatformConfiguration.
   * @returns A collection of Highlight objects.
   */
  async getHighlights(options: GetHighlightsOptions, lat?: string): Promise<Collection<Highlight>> {
    this.validateVersionId(options.version_id);
    this.validatePassageId(options.passage_id);

    const response = await this.client.get<unknown>(
      `/v1/highlights`,
      { bible_id: options.version_id, passage_id: options.passage_id },
      this.authHeaders(lat),
    );

    const parsed = HighlightCollectionWireSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Unexpected highlights API response: ${parsed.error.message}`);
    }

    return {
      data: parsed.data.data.map(toHighlight),
      next_page_token: parsed.data.next_page_token ?? null,
    };
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

    const response = await this.client.post<unknown>(
      `/v1/highlights`,
      {
        request_id: this.generateRequestId(),
        highlight: {
          bible_id: data.version_id,
          passage_id: data.passage_id,
          color: data.color,
        },
      },
      undefined,
      this.authHeaders(lat),
    );

    const parsed = HighlightWireSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Unexpected highlights API response: ${parsed.error.message}`);
    }

    return toHighlight(parsed.data);
  }

  /**
   * Clears highlights for a passage.
   * Requires OAuth with write_highlights scope.
   * @param passageId The passage identifier (USFM format, e.g., "MAT.1.1" or "MAT.1.1-5").
   * @param options Query parameters; `version_id` is required by the API (sent as `bible_id`).
   * @param lat Optional long access token. If not provided, retrieves from YouVersionPlatformConfiguration.
   * @returns Promise that resolves when highlights are deleted (204 response).
   */
  async deleteHighlight(
    passageId: string,
    options: DeleteHighlightOptions,
    lat?: string,
  ): Promise<void> {
    this.validatePassageId(passageId);
    this.validateVersionId(options.version_id);

    await this.client.delete<void>(
      `/v1/highlights/${encodeURIComponent(passageId)}`,
      { bible_id: options.version_id },
      this.authHeaders(lat),
    );
  }
}
