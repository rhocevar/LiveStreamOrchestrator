/**
 * Test Utilities
 *
 * Provides helper functions for testing.
 */

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a mock request object for Express
 */
export function createMockRequest(overrides: any = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
}

/**
 * Create a mock response object for Express
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock next function for Express middleware
 */
export function createMockNext() {
  return jest.fn();
}

/**
 * Create a mock SSE response object
 */
export function createMockSSEResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    flushHeaders: jest.fn().mockReturnThis(),
    writtenData: [] as string[],
  };

  // Capture written data
  res.write.mockImplementation((data: string) => {
    res.writtenData.push(data);
    return true;
  });

  return res;
}

/**
 * Parse SSE data from mock response
 */
export function parseSSEData(mockResponse: any): any[] {
  const events: any[] = [];

  for (const chunk of mockResponse.writtenData) {
    const lines = chunk.split('\n');
    let event: any = {};

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event.type = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        try {
          event.data = JSON.parse(line.substring(5).trim());
        } catch (e) {
          event.data = line.substring(5).trim();
        }
      } else if (line === '') {
        if (Object.keys(event).length > 0) {
          events.push(event);
          event = {};
        }
      }
    }

    if (Object.keys(event).length > 0) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Create a mock job for BullMQ
 */
export function createMockJob(data: any, options: any = {}) {
  return {
    id: options.id || 'test-job-id',
    name: options.name || 'test-job',
    data,
    opts: options,
    attemptsMade: 0,
    timestamp: Date.now(),
    processedOn: null,
    finishedOn: null,
    returnvalue: null,
    failedReason: null,
    stacktrace: null,
    updateProgress: jest.fn(),
    log: jest.fn(),
  };
}

/**
 * Suppress console output during tests
 */
export function suppressConsole() {
  const originalConsole = { ...console };

  beforeAll(() => {
    console.log = jest.fn();
    console.debug = jest.fn();
    console.info = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
  });
}

/**
 * Create a promise that can be resolved externally
 */
export function createDeferredPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}
