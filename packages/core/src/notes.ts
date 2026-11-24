import * as z from 'zod/mini';
import { resolveAuthToken } from './auth-token';
import { assertUsableVersion } from './bible-chapter';
import type { ApiClient } from './client';
import {
  CreateNoteSchema,
  NotePassageIdSchema,
  NoteSchema,
  NotesPageSchema,
  NoteVersionIdSchema,
  UpdateNoteSchema,
} from './schemas/note';
import { object } from './schemas/object';
import type { Collection, CreateNote, Note, NotePassage, UpdateNote } from './types';

const NOTES_PATH = '/v1/notes';

const GetNotesOptionsSchema = object({
  /** Filter by Bible version. Sent on the wire as `bible_id`. */
  version_id: z.optional(NoteVersionIdSchema),
  /** Filter by overlapping verses, range, or chapter. */
  passage_id: z.optional(NotePassageIdSchema),
  /** Results per page, from 1 to 99. The API default is 25. */
  page_size: z.optional(z.int().check(z.gte(1), z.lte(99))),
  /** Cursor from the previous response. Keep both filters unchanged when paging. */
  page_token: z.optional(z.nullable(z.string())),
});

/** Optional filters and pagination for listing a user's notes. */
export type GetNotesOptions = z.infer<typeof GetNotesOptionsSchema>;

type NotesQuery = {
  bible_id?: number;
  passage_id?: string;
  page_size?: number;
  page_token?: string;
};

type BearerAuthHeaders = { Authorization: string };

const NoteIdSchema = z
  .string()
  .check(
    z.refine(
      (id) => id.trim().length > 0 && id !== '.' && id !== '..',
      'Note ID must be a non-empty resource identifier',
    ),
  );

function notePath(noteId: string): string {
  return `${NOTES_PATH}/${encodeURIComponent(NoteIdSchema.parse(noteId))}`;
}

function authHeaders(lat?: string): BearerAuthHeaders {
  return { Authorization: `Bearer ${resolveAuthToken(lat, 'accessing notes')}` };
}

function toNoteBody<T extends { passage?: NotePassage | null | undefined }>(data: T) {
  const { passage, ...fields } = data;
  return passage === undefined
    ? fields
    : {
        ...fields,
        passage: passage && { bible_id: passage.version_id, passage_id: passage.passage_id },
      };
}

/**
 * Client for the authenticated user's notes (`/v1/notes`).
 * Reads require `read_notes`; writes require `write_notes`.
 * Pass a long access token per call, or use the signed-in platform session.
 */
export class NotesClient {
  private client: ApiClient;

  /** @param client - HTTP client configured for the YouVersion Platform API. */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Lists one page of notes with `read_notes` access. An empty page can still have a continuation token.
   * @param options - Passage and version filters, page size, and optional cursor.
   * @param lat - Long access token. Defaults to the signed-in session.
   * @returns The notes and the next page token, or `null` when the list ends.
   * @throws If input, authentication, the request, or the response is invalid.
   */
  async getNotes(options: GetNotesOptions = {}, lat?: string): Promise<Collection<Note>> {
    const { version_id, passage_id, page_size, page_token } = GetNotesOptionsSchema.parse(options);
    if (version_id !== undefined) await assertUsableVersion(this.client, version_id);
    const query: NotesQuery = {};
    if (version_id !== undefined) query.bible_id = version_id;
    if (passage_id !== undefined) query.passage_id = passage_id;
    if (page_size !== undefined) query.page_size = page_size;
    if (page_token != null) query.page_token = page_token;
    const { status, data } = await this.client.getWithStatus<unknown>(
      NOTES_PATH,
      query,
      authHeaders(lat),
    );
    if (status === 204) {
      return { data: [], next_page_token: null };
    }
    const page = NotesPageSchema.parse(data);
    return { data: page.data, next_page_token: page.next_page_token ?? null };
  }

  /**
   * Gets one note with `read_notes` access.
   * @param noteId - Opaque ID returned by the Notes API.
   * @param lat - Long access token. Defaults to the signed-in session.
   * @returns The requested note.
   * @throws If input, authentication, the request, or the response is invalid.
   */
  async getNote(noteId: string, lat?: string): Promise<Note> {
    const response = await this.client.get<unknown>(notePath(noteId), undefined, authHeaders(lat));
    return NoteSchema.parse(response);
  }

  /**
   * Creates a note with `write_notes` access.
   * @param data - Note fields. Reuse `request_id` to retry the same create.
   * @param lat - Long access token. Defaults to the signed-in session.
   * @returns The saved note, including its ID.
   * @throws If input, authentication, the request, or the response is invalid.
   */
  async createNote(data: CreateNote, lat?: string): Promise<Note> {
    const parsed = CreateNoteSchema.parse(data);
    if (parsed.passage) await assertUsableVersion(this.client, parsed.passage.version_id);
    const body = toNoteBody(parsed);
    const response = await this.client.post<unknown>(NOTES_PATH, body, undefined, authHeaders(lat));
    return NoteSchema.parse(response);
  }

  /**
   * Updates a note with `write_notes` access.
   * @param noteId - Opaque ID returned by the Notes API.
   * @param data - Fields to change. Omit a field to keep it; use `null` to clear a nullable field.
   * @param lat - Long access token. Defaults to the signed-in session.
   * @returns The updated note.
   * @throws If input, authentication, the request, or the response is invalid.
   */
  async updateNote(noteId: string, data: UpdateNote, lat?: string): Promise<Note> {
    const parsed = UpdateNoteSchema.parse(data);
    if (parsed.passage) await assertUsableVersion(this.client, parsed.passage.version_id);
    const body = toNoteBody(parsed);
    const response = await this.client.patch<unknown>(
      notePath(noteId),
      body,
      undefined,
      authHeaders(lat),
    );
    return NoteSchema.parse(response);
  }

  /**
   * Deletes a note with `write_notes` access.
   * @param noteId - Opaque ID returned by the Notes API.
   * @param lat - Long access token. Defaults to the signed-in session.
   * @returns A promise that resolves when the note is deleted.
   * @throws If the ID is invalid, authentication is missing, or the request fails.
   */
  async deleteNote(noteId: string, lat?: string): Promise<void> {
    await this.client.delete<void>(notePath(noteId), undefined, authHeaders(lat));
  }
}
