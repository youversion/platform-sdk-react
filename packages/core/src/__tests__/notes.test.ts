import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { ApiClient, getHttpStatus, NotesClient, type Note } from '../index';
import { server } from './setup';

const apiHost = 'notes.example.test';
const collectionUrl = `https://${apiHost}/v1/notes`;
const noteId = 'note/1%';
const resourceUrl = `${collectionUrl}/note%2F1%25`;
const requestId = '2f8c5d2e-6f6c-4b4f-9b36-8c1b5a17d3f9';
const passageId = 'JHN.3.16+JHN.3.18';
const note = {
  id: noteId,
  title: 'Morning reflection',
  content: 'Trust in God.',
  color: '44aa44',
  passage: { version_id: 3034, passage_id: passageId },
  language_tag: 'en-US',
  tags: ['faith', 'hope'],
  status: 'private',
  created_dt: '2026-10-23T17:00:00Z',
  updated_dt: null,
} satisfies Note;
const wireNote = { ...note, passage: { bible_id: 3034, passage_id: passageId } };

function createClient(): NotesClient {
  return new NotesClient(new ApiClient({ apiHost, appKey: 'test-key' }));
}

it('follows a cursor from an empty filtered page and handles both forms of terminal page', async () => {
  const client = createClient();
  const cursor = 'next+/=';
  const filters = { version_id: 3034, passage_id: passageId, page_size: 2 };
  const color = '44AA44';
  server.use(
    http.get(collectionUrl, ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer reader');
      expect(request.headers.get('x-yvp-app-key')).toBe('test-key');
      const query = Object.fromEntries(new URL(request.url).searchParams);
      if (Object.keys(query).length === 0) return new HttpResponse(null, { status: 204 });
      const expectedFilters = { bible_id: '3034', passage_id: passageId, page_size: '2' };
      if (!('page_token' in query)) {
        expect(query).toEqual(expectedFilters);
        return HttpResponse.json({ data: [], next_page_token: cursor });
      }
      expect(query).toEqual({ ...expectedFilters, page_token: cursor });
      return HttpResponse.json({ data: [{ ...wireNote, color }] });
    }),
  );

  const first = await client.getNotes(filters, 'reader');
  expect(first).toEqual({ data: [], next_page_token: cursor });
  const last = await client.getNotes({ ...filters, page_token: first.next_page_token }, 'reader');
  expect(last).toEqual({ data: [{ ...note, color }], next_page_token: null });
  expect(await client.getNotes(undefined, 'reader')).toEqual({ data: [], next_page_token: null });
});

it.each([
  ['no body', () => new HttpResponse(null)],
  [
    'no JSON body',
    () => new HttpResponse(null, { headers: { 'Content-Type': 'application/json' } }),
  ],
  ['a JSON empty string', () => HttpResponse.json('')],
] as const)('rejects a 200 Notes page with %s instead of ending pagination', async (_, respond) => {
  server.use(http.get(collectionUrl, respond));
  await expect(createClient().getNotes({ page_token: 'next' }, 'reader')).rejects.toThrow(
    'invalid_type',
  );
});

it('creates, gets, partially updates, and deletes a note on the regular Notes routes', async () => {
  const client = createClient();
  const create = {
    request_id: requestId,
    title: note.title,
    content: note.content,
    color: note.color,
    passage: note.passage,
    language_tag: note.language_tag,
    tags: note.tags,
    status: note.status,
  };
  const update = { title: null, color: null, passage: null, language_tag: null, tags: null };
  let stored:
    | (Omit<typeof wireNote, keyof typeof update> & {
        [K in keyof typeof update]: (typeof wireNote)[K] | null;
      })
    | undefined;
  server.use(
    http.post(collectionUrl, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer writer');
      expect(await request.json()).toEqual({ ...create, passage: wireNote.passage });
      stored = wireNote;
      return HttpResponse.json(stored, { status: 201 });
    }),
    http.get(resourceUrl, ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer reader');
      return stored ? HttpResponse.json(stored) : new HttpResponse(null, { status: 404 });
    }),
    http.patch(resourceUrl, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer writer');
      expect(await request.json()).toEqual(update);
      stored = { ...wireNote, ...update };
      return HttpResponse.json(stored);
    }),
    http.delete(resourceUrl, ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer writer');
      stored = undefined;
      return new HttpResponse(null, { status: 204 });
    }),
  );

  const created = await client.createNote(create, 'writer');
  expect(created).toEqual(note);
  expect(await client.getNote(created.id, 'reader')).toEqual(note);
  const updated = await client.updateNote(created.id, update, 'writer');
  expect(updated).toEqual({ ...note, ...update });
  expect(await client.getNote(updated.id, 'reader')).toEqual(updated);
  expect(await client.deleteNote(updated.id, 'writer')).toBeUndefined();
  await expect(client.getNote(updated.id, 'reader').catch(getHttpStatus)).resolves.toBe(404);
});

it('rejects invalid writes, pagination, and missing auth before sending a request', async () => {
  const client = createClient();
  let requests = 0;
  server.use(
    http.all(`${collectionUrl}*`, () => {
      requests += 1;
      return new HttpResponse(null, { status: 500 });
    }),
  );

  await expect(client.getNotes()).rejects.toThrow('Authentication required');
  await expect(client.getNotes({ page_size: 100 }, 'reader')).rejects.toThrow('page_size');
  await expect(client.getNotes({ version_id: -1 }, 'reader')).rejects.toThrow('version_id');
  await expect(
    client.updateNote(noteId, { passage: { version_id: 0, passage_id: passageId } }, 'writer'),
  ).rejects.toThrow('version_id');
  await expect(client.updateNote(noteId, { color: '44AA44' }, 'writer')).rejects.toThrow('color');
  await expect(
    client.createNote({ request_id: 'not-a-uuid', content: 'Note', status: 'private' }, 'writer'),
  ).rejects.toThrow('request_id');
  await expect(client.updateNote(noteId, { title: undefined }, 'writer')).rejects.toThrow(
    'At least one note field is required',
  );
  const passage = { ...note.passage, unexpected: 'field' };
  await expect(client.updateNote(noteId, { passage }, 'writer')).rejects.toThrow('unexpected');
  expect(requests).toBe(0);
});

it.each([
  ['status', 'draft'],
  ['color', '#44AA44'],
])('rejects an invalid %s in a note response', async (field, value) => {
  server.use(http.get(resourceUrl, () => HttpResponse.json({ ...wireNote, [field]: value })));
  await expect(createClient().getNote(noteId, 'reader')).rejects.toThrow(field);
});

it('preserves lowercase RFC 3339 timestamps but still rejects invalid dates', async () => {
  const client = createClient();
  const timestamps = {
    created_dt: '2026-10-23t17:00:00z',
    updated_dt: '2026-10-24t19:30:00+02:00',
  };
  server.use(http.get(resourceUrl, () => HttpResponse.json({ ...wireNote, ...timestamps })));
  expect(await client.getNote(noteId, 'reader')).toEqual({ ...note, ...timestamps });

  server.use(
    http.get(resourceUrl, () =>
      HttpResponse.json({ ...wireNote, updated_dt: '2026-02-30t17:00:00z' }),
    ),
  );
  await expect(client.getNote(noteId, 'reader')).rejects.toThrow('updated_dt');
});
