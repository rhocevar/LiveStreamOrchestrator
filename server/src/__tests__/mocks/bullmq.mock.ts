/**
 * BullMQ Mock
 *
 * Provides mock implementations for BullMQ Queue and Worker classes.
 */

import { mockDeep, mockReset } from 'jest-mock-extended';

// Mock Queue class
export class MockQueue {
  name: string;
  private jobs = new Map<string, any>();

  constructor(name: string, options?: any) {
    this.name = name;
  }

  async add(jobName: string, data: any, options?: any): Promise<any> {
    const jobId = options?.jobId || `${jobName}-${Date.now()}`;
    const job = {
      id: jobId,
      name: jobName,
      data,
      opts: options,
    };
    this.jobs.set(jobId, job);
    return job;
  }

  async getJob(jobId: string): Promise<any> {
    return this.jobs.get(jobId);
  }

  async getJobs(): Promise<any[]> {
    return Array.from(this.jobs.values());
  }

  async getJobCounts(): Promise<any> {
    return {
      waiting: 0,
      active: 0,
      completed: this.jobs.size,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }

  async obliterate(): Promise<void> {
    this.jobs.clear();
  }

  async close(): Promise<void> {
    this.jobs.clear();
  }
}

// Mock Worker class
export class MockWorker {
  name: string;
  private processor: any;
  private isRunning = true;

  constructor(name: string, processor: any, options?: any) {
    this.name = name;
    this.processor = processor;
  }

  async run(): Promise<void> {
    this.isRunning = true;
  }

  async close(): Promise<void> {
    this.isRunning = false;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    return this;
  }

  off(event: string, handler?: (...args: any[]) => void): this {
    return this;
  }

  // Method to simulate job processing (for tests)
  async processJob(job: any): Promise<any> {
    if (this.isRunning && this.processor) {
      return await this.processor(job);
    }
  }
}

// Mock QueueEvents class
export class MockQueueEvents {
  name: string;

  constructor(name: string, options?: any) {
    this.name = name;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    return this;
  }

  off(event: string, handler?: (...args: any[]) => void): this {
    return this;
  }

  async close(): Promise<void> {
    // Mock close
  }
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock the bullmq module
jest.mock('bullmq', () => ({
  Queue: MockQueue,
  Worker: MockWorker,
  QueueEvents: MockQueueEvents,
}));

export { MockQueue, MockWorker, MockQueueEvents };
