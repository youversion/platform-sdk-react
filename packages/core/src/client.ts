import type { ApiConfig } from './types';
import { SDK_VERSION_HEADER_NAME, buildSdkVersionHeaderValue } from './version';

type PrimitiveQueryParam = string | number | boolean;
type QueryParams = Record<string, PrimitiveQueryParam | PrimitiveQueryParam[]>;
type RequestData = Record<string, string | number | boolean | object>;
type RequestHeaders = Record<string, string>;

/**
 * ApiClient is a lightweight HTTP client for interacting with the API using fetch.
 * It provides convenient methods for GET and POST requests with typed responses.
 */
export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: RequestHeaders;
  public config: ApiConfig;

  /**
   * Creates an instance of ApiClient.
   *
   * @param config - The API configuration object containing baseUrl, timeout, and appKey.
   */
  constructor(config: ApiConfig) {
    this.config = {
      ...config,
    };
    const apiHost = config.apiHost || 'api.youversion.com';
    if (!apiHost) {
      throw new Error('ApiClient requires a host name. Provide an apiHost in the config.');
    }
    this.baseURL = 'https://' + apiHost;
    this.timeout = config.timeout || 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-YVP-App-Key': this.config.appKey,
      'X-YVP-Installation-Id': this.config.installationId || 'web-sdk-default',
      [SDK_VERSION_HEADER_NAME]: buildSdkVersionHeaderValue(),
      ...config.additionalHeaders,
    };
  }

  /**
   * Builds the query string from parameters
   */
  private buildQueryString(params?: QueryParams): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Makes an HTTP request with timeout support
   */
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.text();
          if (errorBody) {
            try {
              const errorJson = JSON.parse(errorBody) as { message?: string; error?: string };
              const detailedMessage = errorJson.message || errorJson.error || errorBody;
              if (isDevelopment) {
                errorMessage = detailedMessage;
              } else {
                errorMessage = `Request failed with status ${response.status}`;
              }
            } catch {
              if (isDevelopment) {
                errorMessage = errorBody;
              }
            }
          }
        } catch (error) {
          if (isDevelopment && error instanceof Error) {
            console.error('Failed to read error response:', error.message);
          }
        }
        const error = Object.assign(new Error(errorMessage), {
          status: response.status,
          statusText: response.statusText,
        });
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = (await response.json()) as T;
        return data;
      } else {
        const text = await response.text();
        return text as unknown as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Sends a GET request to the specified API path with optional query parameters.
   *
   * @typeParam T - The expected response type.
   * @param path - The API endpoint path (relative to baseURL).
   * @param params - Optional query parameters to include in the request.
   * @returns A promise resolving to the response data of type T.
   */
  async get<T>(path: string, params?: QueryParams, headers?: RequestHeaders): Promise<T> {
    const url = `${this.baseURL}${path}${this.buildQueryString(params)}`;
    return this.request<T>(url, {
      method: 'GET',
      headers,
    });
  }

  /**
   * Sends a POST request to the specified API path with optional data and query parameters.
   *
   * @typeParam T - The expected response type.
   * @param path - The API endpoint path (relative to baseURL).
   * @param data - Optional request body data to send.
   * @param params - Optional query parameters to include in the request.
   * @returns A promise resolving to the response data of type T.
   */
  async post<T>(path: string, data?: RequestData, params?: QueryParams): Promise<T> {
    const url = `${this.baseURL}${path}${this.buildQueryString(params)}`;
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Sends a DELETE request to the specified API path with optional query parameters.
   *
   * @typeParam T - The expected response type.
   * @param path - The API endpoint path (relative to baseURL).
   * @param params - Optional query parameters to include in the request.
   * @returns A promise resolving to the response data of type T (may be empty for 204 responses).
   */
  async delete<T>(path: string, params?: QueryParams): Promise<T> {
    const url = `${this.baseURL}${path}${this.buildQueryString(params)}`;
    return this.request<T>(url, {
      method: 'DELETE',
    });
  }
}
