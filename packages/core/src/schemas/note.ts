import * as z from 'zod/mini';
import { object, strictObject } from './object';

const passageId = z.string().check(z.refine((value) => value.trim().length > 0));
const versionId = z.int32().check(z.positive('Version ID must be a positive integer'));
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
  version_id: versionId,
  /** Single verse, same-chapter range, or same-chapter verses joined by `+`. */
  passage_id: passageId,
});

const NotePassageSchema = z.pipe(
  object({ bible_id: z.int32(), passage_id: z.string() }),
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
  content: nonEmptyContent,
  /** `private` is visible only to the author; `public` is visible to others. */
  status,
});

export const UpdateNoteSchema = strictObject({
  ...optionalWriteFields,
  content: z.optional(nonEmptyContent),
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
  title,
  content: z.string(),
  /** Six hex digits without `#`, preserving the case returned by the API. */
  color: z.optional(z.nullable(z.string().check(z.regex(/^[0-9a-f]{6}$/i)))),
  passage: z.optional(z.nullable(NotePassageSchema)),
  language_tag: z.optional(z.nullable(z.string())),
  tags: z.optional(z.nullable(z.array(z.string()))),
  status,
  created_dt: z.optional(timestamp),
  updated_dt: z.optional(z.nullable(timestamp)),
});

export const NotesPageSchema = object({
  data: z.array(NoteSchema),
  next_page_token: z.optional(z.nullable(z.string())),
});

export const GetNotesOptionsSchema = object({
  /** Filter by Bible version. Sent on the wire as `bible_id`. */
  version_id: z.optional(versionId),
  /** Filter by overlapping verses, range, or chapter. */
  passage_id: z.optional(passageId),
  /** Results per page, from 1 to 99. The API default is 25. */
  page_size: z.optional(z.int().check(z.gte(1), z.lte(99))),
  /** Cursor from the previous response. Keep both filters unchanged when paging. */
  page_token: z.optional(z.nullable(z.string())),
});

export type NotePassage = z.infer<typeof NotePassageInputSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type CreateNote = z.infer<typeof CreateNoteSchema>;
/** Omit fields to leave them unchanged; pass `null` to clear nullable fields. */
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;
export type GetNotesOptions = z.infer<typeof GetNotesOptionsSchema>;
