import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { ApiClient, getHttpStatus, NotesClient, type Note, type UpdateNote } from '../index';
import { server } from './setup';
import { YouVersionPlatformConfiguration as config } from '../YouVersionPlatformConfiguration';

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

it('omits a null cursor, follows an empty filtered page, and handles terminal pages', async () => {
  const client = createClient();
  const cursor = 'next+/=';
  const filters = { version_id: 3034, passage_id: passageId, page_size: 2 };
  const color = '44AA44';
  server.use(
    http.get(collectionUrl, ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer reader');
      expect(request.headers.get('x-yvp-app-key')).toBe('test-key');
      const query = Object.fromEntries(new URL(request.url).searchParams);
      if (Object.keys(query).length === 0) {
        return new HttpResponse(null, {
          status: 204,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const expectedFilters = { bible_id: '3034', passage_id: passageId, page_size: '2' };
      if (!('page_token' in query)) {
        expect(query).toEqual(expectedFilters);
        return HttpResponse.json({ data: [], next_page_token: cursor });
      }
      expect(query).toEqual({ ...expectedFilters, page_token: cursor });
      return HttpResponse.json({ data: [{ ...wireNote, color }] });
    }),
  );

  const first = await client.getNotes({ ...filters, page_token: null }, 'reader');
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
    color: '44AA44',
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
      expect(await request.json()).toEqual({
        ...create,
        color: note.color,
        passage: wireNote.passage,
      });
      stored = { ...wireNote, color: create.color };
      return HttpResponse.json(stored, { status: 201 });
    }),
    http.get(resourceUrl, ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer reader');
      return stored ? HttpResponse.json(stored) : new HttpResponse(null, { status: 404 });
    }),
    http.patch(resourceUrl, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer writer');
      expect(await request.json()).toEqual({ color: note.color, passage: wireNote.passage });
      stored = wireNote;
      return HttpResponse.json(stored);
    }),
    http.delete(resourceUrl, ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer writer');
      stored = undefined;
      return new HttpResponse(null, { status: 204 });
    }),
  );

  const created = await client.createNote(create, 'writer');
  expect(created).toEqual({ ...note, color: create.color });
  const read = await client.getNote(created.id, 'reader');
  expect(read).toEqual(created);
  expect(
    await client.updateNote(read.id, { color: read.color, passage: read.passage }, 'writer'),
  ).toEqual(note);
  server.use(
    http.patch(resourceUrl, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer writer');
      expect(await request.json()).toEqual(update);
      stored = { ...wireNote, ...update };
      return HttpResponse.json(stored);
    }),
  );
  const updated = await client.updateNote(created.id, update, 'writer');
  expect(updated).toEqual({ ...note, ...update });
  expect(await client.getNote(updated.id, 'reader')).toEqual(updated);
  expect(await client.deleteNote(updated.id, 'writer')).toBeUndefined();
  await expect(client.getNote(updated.id, 'reader').catch(getHttpStatus)).resolves.toBe(404);
});

it('saves an attached passage without note text', async () => {
  server.use(
    http.post(collectionUrl, async ({ request }) => {
      expect(await request.json()).toEqual({
        request_id: requestId,
        content: '',
        status: 'private',
        passage: wireNote.passage,
      });
      return HttpResponse.json({ ...wireNote, content: '' }, { status: 201 });
    }),
  );

  const create = { request_id: requestId, content: '', status: 'private' } as const;
  await expect(createClient().createNote(create, 'writer')).rejects.toThrow('content');
  await expect(
    createClient().createNote({ ...create, passage: note.passage }, 'writer'),
  ).resolves.toMatchObject({ content: '', passage: note.passage });
});

it('propagates API authentication and permission failures for every Notes operation', async () => {
  const client = createClient();
  const create = { request_id: requestId, content: note.content, status: note.status };
  for (const status of [401, 403]) {
    server.use(
      http.all(`${collectionUrl}*`, () => HttpResponse.json({ message: 'Denied' }, { status })),
    );
    for (const operation of [
      () => client.getNotes({}, 'token'),
      () => client.getNote(noteId, 'token'),
      () => client.createNote(create, 'token'),
      () => client.updateNote(noteId, { title: null }, 'token'),
      () => client.deleteNote(noteId, 'token'),
    ]) {
      await expect(operation().catch(getHttpStatus)).resolves.toBe(status);
    }
  }
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
  for (const page_size of [0, 1.5, 100]) {
    await expect(client.getNotes({ page_size }, 'reader')).rejects.toThrow('page_size');
  }
  for (const version_id of [-1, 2 ** 31]) {
    await expect(client.getNotes({ version_id }, 'reader')).rejects.toThrow('version_id');
  }
  await expect(
    client.updateNote(noteId, { passage: { version_id: 0, passage_id: passageId } }, 'writer'),
  ).rejects.toThrow('version_id');
  await expect(client.updateNote(noteId, { color: '#44AA44' }, 'writer')).rejects.toThrow('color');
  await expect(
    client.createNote({ request_id: 'not-a-uuid', content: 'Note', status: 'private' }, 'writer'),
  ).rejects.toThrow('request_id');
  await expect(client.updateNote(noteId, { title: undefined }, 'writer')).rejects.toThrow(
    'At least one note field is required',
  );
  const passage = { ...note.passage, unexpected: 'field' };
  await expect(client.updateNote(noteId, { passage }, 'writer')).rejects.toThrow('unexpected');
  const unexpected = { title: 'Title', unexpected: 'field' };
  await expect(client.updateNote(noteId, unexpected, 'writer')).rejects.toThrow('unexpected');
  await expect(
    client.createNote(
      { ...unexpected, request_id: requestId, content: 'Note', status: 'private' },
      'writer',
    ),
  ).rejects.toThrow('unexpected');
  for (const [fields, field] of [
    [{ language_tag: 'fil' }, 'language_tag'],
    [{ language_tag: 'en-us' }, 'language_tag'],
    [{ tags: ['a,b'] }, 'tags'],
    [{ tags: [''] }, 'tags'],
    [{ content: '' }, 'content'],
    [{ passage: { ...note.passage, passage_id: '  ' } }, 'passage_id'],
  ] as const satisfies ReadonlyArray<readonly [UpdateNote, string]>) {
    await expect(client.updateNote(noteId, fields, 'writer')).rejects.toThrow(field);
  }
  expect(requests).toBe(0);
});

it('rejects blank and dot-segment note IDs before making a request', async () => {
  const client = createClient();
  let requests = 0;
  server.use(
    http.all(`https://${apiHost}/*`, () => {
      requests += 1;
      return new HttpResponse(null, { status: 500 });
    }),
  );

  await Promise.all([
    expect(client.getNote('', 'reader')).rejects.toThrow('Note ID'),
    expect(client.getNote('  ', 'reader')).rejects.toThrow('Note ID'),
    expect(client.getNote('.', 'reader')).rejects.toThrow('Note ID'),
    expect(client.deleteNote('..', 'writer')).rejects.toThrow('Note ID'),
  ]);
  expect(requests).toBe(0);
});

it.each([
  ['status', 'draft'],
  ['color', '#44AA44'],
  ['id', 123],
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

it('refuses blocked list and write versions before Notes requests, including language filters', async () => {
  const client = createClient();
  const previous = {
    excludedVersionIds: config.excludedVersionIds,
    permittedVersionIds: config.permittedVersionIds,
    permittedLanguageTags: config.permittedLanguageTags,
  };
  let noteRequests = 0;
  let metadataRequests = 0;
  let language: string | undefined = 'es';
  const create = {
    request_id: requestId,
    content: note.content,
    status: note.status,
    passage: note.passage,
  };
  server.use(
    http.get(`https://${apiHost}/v1/bibles/3034`, () => {
      metadataRequests += 1;
      return HttpResponse.json({ id: 3034, language_tag: language });
    }),
    http.all(`${collectionUrl}*`, ({ request }) => {
      noteRequests += 1;
      return request.method === 'GET'
        ? HttpResponse.json({ data: [wireNote] })
        : HttpResponse.json(wireNote);
    }),
  );
  try {
    for (const filters of [
      { excludedVersionIds: [3034], permittedVersionIds: [3034], permittedLanguageTags: undefined },
      { excludedVersionIds: undefined, permittedVersionIds: [], permittedLanguageTags: undefined },
      { excludedVersionIds: undefined, permittedVersionIds: [3034], permittedLanguageTags: ['en'] },
    ]) {
      Object.assign(config, filters);
      await expect(
        client.getNotes({ version_id: 3034 }, 'reader').catch(getHttpStatus),
      ).resolves.toBe(403);
      await expect(client.createNote(create, 'writer').catch(getHttpStatus)).resolves.toBe(403);
      await expect(
        client.updateNote(noteId, { passage: note.passage }, 'writer').catch(getHttpStatus),
      ).resolves.toBe(403);
      expect(noteRequests).toBe(0);
      if (filters.permittedLanguageTags === undefined) expect(metadataRequests).toBe(0);
    }
    language = undefined;
    await expect(client.createNote(create, 'writer').catch(getHttpStatus)).resolves.toBe(403);
    expect(noteRequests).toBe(0);

    language = 'en';
    expect(await client.getNotes({ version_id: 3034 }, 'reader')).toEqual({
      data: [note],
      next_page_token: null,
    });
    expect(await client.createNote(create, 'writer')).toEqual(note);
    expect(await client.updateNote(noteId, { passage: note.passage }, 'writer')).toEqual(note);
    expect(noteRequests).toBe(3);
  } finally {
    Object.assign(config, previous);
  }
});

it('preserves notes and pagination when a returned passage is malformed', async () => {
  const client = createClient();
  const malformed = [
    { passage_id: passageId },
    { bible_id: 3034, passage_id: 123 },
    { bible_id: -1, passage_id: passageId },
    { bible_id: 3034, passage_id: '  ' },
  ];
  const data = malformed.map((passage, index) => ({ ...wireNote, id: `note-${index}`, passage }));
  server.use(
    http.get(collectionUrl, () =>
      HttpResponse.json({ data: [...data, wireNote], next_page_token: 'continue' }),
    ),
    http.get(resourceUrl, () => HttpResponse.json(data[0])),
  );
  const page = await client.getNotes({}, 'reader');
  expect(page.next_page_token).toBe('continue');
  expect(page.data).toEqual([
    ...malformed.map((_, index) => ({ ...note, id: `note-${index}`, passage: undefined })),
    note,
  ]);
  expect(await client.getNote(noteId, 'reader')).toEqual({
    ...note,
    id: 'note-0',
    passage: undefined,
  });
});

it('skips malformed notes without losing valid neighbors or continuation pages', async () => {
  const client = createClient();
  const invalid = [
    null,
    { ...wireNote, id: 123 },
    { ...wireNote, content: undefined },
    { ...wireNote, status: 'draft' },
    { ...wireNote, created_dt: 'not-a-date' },
  ];
  const filters = { passage_id: passageId, page_size: 10 };
  server.use(
    http.get(collectionUrl, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get('passage_id')).toBe(passageId);
      expect(query.get('page_size')).toBe('10');
      switch (query.get('page_token')) {
        case null:
          return HttpResponse.json({
            data: [wireNote, ...invalid, { ...wireNote, id: 'second' }],
            next_page_token: 'all-invalid',
          });
        case 'all-invalid':
          return HttpResponse.json({ data: invalid, next_page_token: 'last' });
        case 'last':
          return HttpResponse.json({ data: [{ ...wireNote, id: 'last' }] });
        default:
          return new HttpResponse(null, { status: 400 });
      }
    }),
  );

  const first = await client.getNotes(filters, 'reader');
  expect(first).toEqual({
    data: [note, { ...note, id: 'second' }],
    next_page_token: 'all-invalid',
  });
  const empty = await client.getNotes({ ...filters, page_token: first.next_page_token }, 'reader');
  expect(empty).toEqual({ data: [], next_page_token: 'last' });
  expect(
    await client.getNotes({ ...filters, page_token: empty.next_page_token }, 'reader'),
  ).toEqual({ data: [{ ...note, id: 'last' }], next_page_token: null });

  for (const envelope of [{}, { data: null }, { data: {} }, { data: [], next_page_token: 123 }]) {
    server.use(http.get(collectionUrl, () => HttpResponse.json(envelope)));
    await expect(client.getNotes({}, 'reader')).rejects.toThrow();
  }
});
