import * as z from 'zod/mini';
import { object, strictObject } from './object';

export const NotePassageIdSchema = z.string().check(z.refine((value) => value.trim().length > 0));
export const NoteVersionIdSchema = z
  .int32()
  .check(z.positive('Version ID must be a positive integer'));
const title = z.optional(z.nullable(z.string()));
const status = z.enum(['private', 'public']);
const isoTimestamp = z.iso.datetime({ offset: true });
// RFC 3339 allows lowercase t and z. Validate without rewriting the API value.
const timestamp = z
  .string()
  .check(
    z.refine((value) => isoTimestamp.safeParse(value.toUpperCase()).success, 'Invalid timestamp'),
  );

const NotePassageInputSchema = strictObject({
  /** Bible version identifier, sent on the wire as `bible_id`. */
  version_id: NoteVersionIdSchema,
  /** Single verse, same-chapter range, or same-chapter verses joined by `+`. */
  passage_id: NotePassageIdSchema,
});

const NotePassageSchema = z.pipe(
  object({ bible_id: NoteVersionIdSchema, passage_id: NotePassageIdSchema }),
  z.transform(({ bible_id, passage_id }): NotePassage => ({ version_id: bible_id, passage_id })),
);

const optionalWriteFields = {
  /** An optional short title. */
  title,
  /** Six hex digits without `#`, sent lowercase. */
  color: z.optional(z.nullable(z.string().check(z.toLowerCase(), z.regex(/^[0-9a-f]{6}$/)))),
  /** A note can attach to at most one passage. */
  passage: z.optional(z.nullable(NotePassageInputSchema)),
  /** Two-letter language code, optionally with an uppercase region (e.g. `en-US`). */
  language_tag: z.optional(z.nullable(z.string().check(z.regex(/^[a-z]{2}(-[A-Z]{2})?$/)))),
  /** Labels that are non-empty and contain no commas. */
  tags: z.optional(z.nullable(z.array(z.string().check(z.regex(/^[^,]+$/))))),
};

const nonEmptyContent = z.string().check(z.minLength(1));

export const CreateNoteSchema = strictObject({
  ...optionalWriteFields,
  /** Reuse this UUID to retry the same logical create without duplicating the note. */
  request_id: z.uuid(),
  /** Note text. May be empty when saving an attached passage. */
  content: z.string(),
  /** `private` is visible only to the author; `public` is visible to others. */
  status,
}).check(
  z.refine((note) => note.content.length > 0 || Boolean(note.passage), {
    path: ['content'],
    message: 'Content is required without an attached passage',
  }),
);

export const UpdateNoteSchema = strictObject({
  ...optionalWriteFields,
  /** Replacement note text. Must not be empty. */
  content: z.optional(nonEmptyContent),
  /** `private` is visible only to the author; `public` is visible to others. */
  status: z.optional(status),
}).check(
  z.refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'At least one note field is required',
  ),
);

export const NoteSchema = object({
  /** Opaque identifier. Pass it unchanged to get, update, or delete this note. */
  id: z.string(),
  /** Optional short title. */
  title,
  /** Text written by the note's author. */
  content: z.string(),
  /** Six hex digits without `#`, preserving the case returned by the API. */
  color: z.optional(z.nullable(z.string().check(z.regex(/^[0-9a-f]{6}$/i)))),
  /** The attached Scripture passage, if any. Malformed API passage data is omitted. */
  passage: z.catch(z.optional(z.nullable(NotePassageSchema)), undefined),
  /** Language tag for the note, if set. */
  language_tag: z.optional(z.nullable(z.string())),
  /** Labels applied to the note, if set. */
  tags: z.optional(z.nullable(z.array(z.string()))),
  /** `private` is visible only to the author; `public` is visible to others. */
  status,
  /** Creation timestamp in RFC 3339 format, when supplied by the API. */
  created_dt: z.optional(timestamp),
  /** Last update timestamp in RFC 3339 format, if supplied and non-null. */
  updated_dt: z.optional(z.nullable(timestamp)),
});

export const NotesPageSchema = z.pipe(
  object({
    data: z.array(z.unknown()),
    next_page_token: z.optional(z.nullable(z.string())),
  }),
  z.transform((page) => ({
    ...page,
    data: page.data.flatMap((item) => {
      const parsed = NoteSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  })),
);

/** Scripture passage attached to a note, using SDK version IDs. */
export type NotePassage = z.infer<typeof NotePassageInputSchema>;
/** A note returned by the regular Notes API. */
export type Note = z.infer<typeof NoteSchema>;
/** Fields for creating a note, including an idempotency UUID. */
export type CreateNote = z.infer<typeof CreateNoteSchema>;
/** Omit fields to leave them unchanged; pass `null` to clear nullable fields. */
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;
