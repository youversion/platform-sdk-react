import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Only setup MSW if INTEGRATION_TESTS env var is not set
if (!process.env.INTEGRATION_TESTS) {
  const unhandled: string[] = [];
  beforeAll(() => {
    server.listen({
      onUnhandledRequest(request, print) {
        unhandled.push(`${request.method} ${new URL(request.url).pathname}`);
        print.error();
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    // A client may catch the network error. The missing mock must still fail its test.
    if (unhandled.length)
      throw new Error(`Unhandled mocked HTTP: ${unhandled.splice(0).join(', ')}`);
  });

  afterAll(() => {
    server.close();
  });
}
