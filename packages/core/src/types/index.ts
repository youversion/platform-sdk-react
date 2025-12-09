// Re-export all schema-derived types from schemas
export type { BibleVersion } from '../schemas/version';
export type { BibleBook, CANON } from '../schemas/book';
export type { BibleChapter } from '../schemas/chapter';
export type { BibleVerse } from '../schemas/verse';
export type { BiblePassage } from '../schemas/passage';
export type { VOTD } from '../schemas/votd';
export type {
  BibleIndex,
  BibleIndexBook,
  BibleIndexChapter,
  BibleIndexVerse,
} from '../schemas/bible-index';
export type { Language } from '../schemas/language';
export type { User } from '../schemas/user';
export type { Highlight, CreateHighlight } from '../schemas/highlight';
export type { Collection } from '../schemas/collection';

// Re-export internal/non-API types
export type { ApiConfig } from './api-config';
export type {
  AuthenticationState,
  SignInWithYouVersionPermissionValues,
  AuthenticationScopes,
} from './auth';
export type { HighlightColor } from './highlight';
