/**
 * Platform-agnostic authentication strategy interface
 *
 * Implementations should handle platform-specific authentication flows
 * and return the callback URL containing the authentication result.
 */
export interface AuthenticationStrategy {
  /**
   * Opens the authentication flow and returns the callback URL
   *
   * @param authUrl - The YouVersion authorization URL to open
   * @returns Promise that resolves to the callback URL with auth result
   * @throws Error if authentication fails or is cancelled
   */
  authenticate(authUrl: URL): Promise<URL>;
}

/**
 * Registry for platform-specific authentication strategies
 *
 * This singleton registry manages the current authentication strategy
 * and ensures only one strategy is active at a time.
 */
export class AuthenticationStrategyRegistry {
  private static strategy: AuthenticationStrategy | null = null;

  /**
   * Registers a platform-specific authentication strategy
   *
   * @param strategy - The authentication strategy to register
   * @throws Error if strategy is null, undefined, or missing required methods
   */
  static register(strategy: AuthenticationStrategy): void {
    if (!strategy) {
      throw new Error('Authentication strategy cannot be null or undefined');
    }

    if (typeof strategy.authenticate !== 'function') {
      throw new Error('Authentication strategy must implement authenticate method');
    }

    this.strategy = strategy;
  }

  /**
   * Gets the currently registered authentication strategy
   *
   * @returns The registered authentication strategy
   * @throws Error if no strategy has been registered
   */
  static get(): AuthenticationStrategy {
    if (!this.strategy) {
      throw new Error(
        'No authentication strategy registered. Please register a platform-specific strategy using AuthenticationStrategyRegistry.register()',
      );
    }
    return this.strategy;
  }

  /**
   * Checks if a strategy is currently registered
   *
   * @returns true if a strategy is registered, false otherwise
   */
  static isRegistered(): boolean {
    return this.strategy !== null;
  }

  /**
   * Resets the registry by removing the current strategy
   *
   * This method is primarily intended for testing scenarios
   * where you need to clean up between test cases.
   */
  static reset(): void {
    this.strategy = null;
  }
}
