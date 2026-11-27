'use client';

import { useCallback, useMemo } from 'react';
import { NotesClient, type Note, type UpdateNote } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';

/** Updates a note using the caller's captured access token. */
export function useUpdateNote(): (
  id: string,
  note: UpdateNote,
  accessToken: string,
) => Promise<Note> {
  const apiClient = useApiClient();
  const client = useMemo(() => new NotesClient(apiClient), [apiClient]);
  return useCallback(
    async (id, note, accessToken) => {
      if (!accessToken?.trim()) throw new Error('An access token is required to update a note');
      return client.updateNote(id, note, accessToken);
    },
    [client],
  );
}
