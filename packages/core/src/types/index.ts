import type {
  SignInWithYouVersionPermission,
  SignInWithYouVersionResult,
} from '../SignInWithYouVersionResult';

// Re-export all schema-derived types from schemas
export type { BibleVersion } from '../schemas/version';
export type { BibleBook, BibleBookIntro, CANON } from '../schemas/book';
export type { BibleChapter } from '../schemas/chapter';
export type { BibleVerse } from '../schemas/verse';
export type { BiblePassage } from '../schemas/passage';
export type { VOTD } from '../schemas/votd';
export type {
  BibleIndex,
  BibleIndexBook,
  BibleIndexBookIntro,
  BibleIndexChapter,
  BibleIndexVerse,
} from '../schemas/bible-index';
export type { Language } from '../schemas/language';
export type { User } from '../schemas/user';
export type { Highlight, CreateHighlight } from '../schemas/highlight';
export type { Collection } from '../schemas/collection';
export type { Organization, OrganizationAddress } from '../schemas/organization';
export type { Video, VideoPlaybackSource, VideoThumbnail } from '../schemas/video';
export type { Font, FontVariant, FontSource } from '../schemas/font';
export type { License } from '../schemas/license';
export type { AppSummary } from '../schemas/app';

export interface ApiConfig {
  apiHost?: string;
  appKey: string;
  timeout?: number;
  installationId?: string;
  redirectUri?: string;
  /**
   * Extra HTTP headers merged into every request. Values here override the
   * SDK's built-in headers when keys collide — useful for wrappers (e.g. the
   * React Native Expo SDK) that need to replace `X-YVP-Sdk` with their own
   * identifier.
   */
  additionalHeaders?: Record<string, string>;
}

export type SignInWithYouVersionPermissionValues =
  (typeof SignInWithYouVersionPermission)[keyof typeof SignInWithYouVersionPermission];

export interface AuthenticationState {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly accessToken: string | null;
  readonly idToken: string | null;
  readonly result: SignInWithYouVersionResult | null;
  readonly error: Error | null;
}

export type AuthenticationScopes = 'profile' | 'email';

export interface HighlightColor {
  id: number;
  color: string;
  label: string;
}
