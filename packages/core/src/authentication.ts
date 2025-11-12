import type { ApiClient } from './client';
import type { User } from './types';

/**
 * Client for authentication-related API calls.
 */
export class AuthClient {
  private client: ApiClient;

  /**
   * Creates an instance of AuthClient.
   * @param client - The ApiClient instance to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Retrieves the current authenticated user.
   *
   * @param lat - The long access token (LAT) used for authentication.
   * @returns A promise that resolves to the authenticated User.
   */
  async getUser(lat: string): Promise<User> {
    return this.client.get<User>(`/auth/me`, { lat: lat });
  }
}
