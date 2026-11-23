import * as z from 'zod/mini';
import { resolveAuthToken } from './auth-token';
import type { ApiClient } from './client';
import {
  CreateNoteSchema,
  GetNotesOptionsSchema,
  NoteSchema,
  NotesPageSchema,
  UpdateNoteSchema,
} from './schemas/note';
import type {
  Collection,
  CreateNote,
  GetNotesOptions,
  Note,
  NotePassage,
  UpdateNote,
} from './types';

const NOTES_PATH = '/v1/notes';

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

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** Lists one page of notes. An empty page can still have a `next_page_token`. */
  async getNotes(options: GetNotesOptions = {}, lat?: string): Promise<Collection<Note>> {
    const { version_id, passage_id, page_size, page_token } = GetNotesOptionsSchema.parse(options);
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

  /** Gets one note by its id. */
  async getNote(noteId: string, lat?: string): Promise<Note> {
    const response = await this.client.get<unknown>(notePath(noteId), undefined, authHeaders(lat));
    return NoteSchema.parse(response);
  }

  /** Creates a note using the caller's `request_id` for idempotent retries. */
  async createNote(data: CreateNote, lat?: string): Promise<Note> {
    const body = toNoteBody(CreateNoteSchema.parse(data));
    const response = await this.client.post<unknown>(NOTES_PATH, body, undefined, authHeaders(lat));
    return NoteSchema.parse(response);
  }

  /** Updates only the supplied fields. `null` clears nullable fields. */
  async updateNote(noteId: string, data: UpdateNote, lat?: string): Promise<Note> {
    const body = toNoteBody(UpdateNoteSchema.parse(data));
    const response = await this.client.patch<unknown>(
      notePath(noteId),
      body,
      undefined,
      authHeaders(lat),
    );
    return NoteSchema.parse(response);
  }

  /** Deletes a note by its id. The successful response has no body. */
  async deleteNote(noteId: string, lat?: string): Promise<void> {
    await this.client.delete<void>(notePath(noteId), undefined, authHeaders(lat));
  }
}
