'use client';

import { useCallback, useMemo } from 'react';
import { NotesClient, type CreateNote, type Note } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';

/** Creates a note using the caller's captured access token. */
export function useCreateNote(): (note: CreateNote, accessToken: string) => Promise<Note> {
  const apiClient = useApiClient();
  const client = useMemo(() => new NotesClient(apiClient), [apiClient]);
  return useCallback(
    async (note, accessToken) => {
      if (!accessToken?.trim()) throw new Error('An access token is required to create a note');
      return client.createNote(note, accessToken);
    },
    [client],
  );
}
