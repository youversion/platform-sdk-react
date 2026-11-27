import { renderHook } from '@testing-library/react';
import { NotesClient, type CreateNote } from '@youversion/platform-core';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createYVWrapper } from './test/utils';
import { useCreateNote } from './useCreateNote';

it('requires a captured access token before calling the Notes client', async () => {
  const note: CreateNote = {
    request_id: 'e6decb7a-f5eb-46ed-ab2d-afc43039e7e4',
    status: 'private',
    content: 'My note',
  };
  const saved = { id: 'test-note', content: note.content, status: note.status };
  const create = vi.spyOn(NotesClient.prototype, 'createNote').mockResolvedValue(saved);
  onTestFinished(() => create.mockRestore());
  const { result } = renderHook(useCreateNote, { wrapper: createYVWrapper() });

  await expect(result.current(note, '')).rejects.toThrow('access token');
  await expect(result.current(note, '   ')).rejects.toThrow('access token');
  // @ts-expect-error -- JavaScript callers can omit the token.
  await expect(result.current(note)).rejects.toThrow('access token');
  expect(create).not.toHaveBeenCalled();

  await expect(result.current(note, 'captured-token')).resolves.toEqual(saved);
  expect(create).toHaveBeenCalledExactlyOnceWith(note, 'captured-token');
});
