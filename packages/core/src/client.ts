import { z } from 'zod';
import { parseCachePolicy, type CachePolicy } from './parse-cache-policy';
import type { ApiConfig } from './types';
import { SDK_VERSION_HEADER_NAME, buildSdkVersionHeaderValue } from './version';

type PrimitiveQueryParam = string | number | boolean;
type QueryParamValue = PrimitiveQueryParam | PrimitiveQueryParam[];
type QueryParams = Record<string, QueryParamValue>;
type JsonPrimitive = string | number | boolean;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type RequestData = Record<string, JsonValue>;
type RequestHeaders = Record<string, string>;

const HttpStatusCarrierSchema = z.object({
  status: z.number(),
});

const ErrorBodySchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Returns the HTTP status code attached to an error thrown by an API client,
 * or undefined when the error did not come from an HTTP response (network
 * failure, timeout, validation error). This is the supported way to branch on
 * status codes; the error's internal shape is not part of the public API.
 */
export function getHttpStatus(cause: unknown): number | undefined {
  const parsed = HttpStatusCarrierSchema.safeParse(cause);
  return parsed.success ? parsed.data.status : undefined;
}

function policyFromResponseHeaders(headers: Headers): CachePolicy {
  return parseCachePolicy(headers.get('cache-control'), headers.get('age'));
}

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
    const { data } = await this.requestWithHeaders<T>(url, options);
    return data;
  }

  /**
   * Same body decoding as request(), plus response headers for Cache-Control.
   */
  private async requestWithHeaders<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<{ data: T; headers: Headers }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers = new Headers(this.defaultHeaders);
      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value);
      });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.text();
          if (errorBody) {
            try {
              const errorJson = ErrorBodySchema.safeParse(JSON.parse(errorBody));
              const detailedMessage = errorJson.success
                ? errorJson.data.message || errorJson.data.error || errorBody
                : errorBody;
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
        // A successful (2xx) response can legitimately carry an EMPTY body even
        // with a JSON content-type — most notably a DELETE that returns
        // `200 application/json` with no payload. `response.json()` throws
        // "Unexpected end of JSON input" on an empty body, which would surface a
        // successful write as a failure (e.g. deleteHighlight rejecting on a
        // real delete). Read as text first and treat an empty body as "no data".
        const text = await response.text();
        if (!text) {
          // SAFETY: empty 2xx JSON bodies (DELETE 200 with no payload) are
          // treated as undefined for the caller-owned generic T.
          return { data: undefined as T, headers: response.headers };
        }
        // SAFETY: this client only decodes JSON text. Callers own T and parse
        // untrusted payloads with Zod at their boundary.
        return { data: JSON.parse(text) as T, headers: response.headers };
      } else {
        const text = await response.text();
        // SAFETY: non-JSON 2xx bodies are returned as raw text. Callers that
        // asked for T=string receive it; other T values are caller-owned.
        return { data: text as T, headers: response.headers };
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
   * GET that returns the decoded body plus the Cache-Control policy.
   * Non-2xx throws the same way as {@link get}; there is no policy on the error.
   */
  async getWithPolicy<T>(
    path: string,
    params?: QueryParams,
    headers?: RequestHeaders,
  ): Promise<{ data: T; policy: CachePolicy }> {
    const url = `${this.baseURL}${path}${this.buildQueryString(params)}`;
    const { data, headers: responseHeaders } = await this.requestWithHeaders<T>(url, {
      method: 'GET',
      headers,
    });
    return { data, policy: policyFromResponseHeaders(responseHeaders) };
  }

  /**
   * Sends a POST request to the specified API path with optional data and query parameters.
   *
   * @typeParam T - The expected response type.
   * @param path - The API endpoint path (relative to baseURL).
   * @param data - Optional request body data to send.
   * @param params - Optional query parameters to include in the request.
   * @param headers - Optional headers merged over the default headers.
   * @returns A promise resolving to the response data of type T.
   */
  async post<T>(
    path: string,
    data?: RequestData,
    params?: QueryParams,
    headers?: RequestHeaders,
  ): Promise<T> {
    const url = `${this.baseURL}${path}${this.buildQueryString(params)}`;
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  /**
   * Sends a DELETE request to the specified API path with optional query parameters.
   *
   * @typeParam T - The expected response type.
   * @param path - The API endpoint path (relative to baseURL).
   * @param params - Optional query parameters to include in the request.
   * @param headers - Optional headers merged over the default headers.
   * @returns A promise resolving to the response data of type T (may be empty for 204 responses).
   */
  async delete<T>(path: string, params?: QueryParams, headers?: RequestHeaders): Promise<T> {
    const url = `${this.baseURL}${path}${this.buildQueryString(params)}`;
    return this.request<T>(url, {
      method: 'DELETE',
      headers,
    });
  }
}
