/**
 * Tests for Custom Error Classes
 */

import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  LiveKitError,
  DatabaseError,
  AuthorizationError,
} from '../../../utils/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with default status code 500', () => {
      const error = new AppError('Something went wrong');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create an error with custom status code', () => {
      const error = new AppError('Custom error', 418);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with default message', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 404 error with custom message', () => {
      const error = new NotFoundError('Livestream not found');

      expect(error.message).toBe('Livestream not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with default message', () => {
      const error = new ValidationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 400 error with custom message', () => {
      const error = new ValidationError('Invalid room name');

      expect(error.message).toBe('Invalid room name');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('ConflictError', () => {
    it('should create a 409 error with default message', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 409 error with custom message', () => {
      const error = new ConflictError('User already joined');

      expect(error.message).toBe('User already joined');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('LiveKitError', () => {
    it('should create a 502 error with default message', () => {
      const error = new LiveKitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(LiveKitError);
      expect(error.message).toBe('LiveKit operation failed');
      expect(error.statusCode).toBe(502);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 502 error with custom message', () => {
      const error = new LiveKitError('Failed to create room');

      expect(error.message).toBe('Failed to create room');
      expect(error.statusCode).toBe(502);
    });
  });

  describe('DatabaseError', () => {
    it('should create a 500 error with default message', () => {
      const error = new DatabaseError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Database operation failed');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 500 error with custom message', () => {
      const error = new DatabaseError('Failed to save livestream');

      expect(error.message).toBe('Failed to save livestream');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('AuthorizationError', () => {
    it('should create a 403 error with default message', () => {
      const error = new AuthorizationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe('Not authorized to perform this action');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 403 error with custom message', () => {
      const error = new AuthorizationError('Only creator can delete livestream');

      expect(error.message).toBe('Only creator can delete livestream');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('Error Hierarchy', () => {
    it('should allow catching all custom errors with AppError', () => {
      const errors = [
        new NotFoundError(),
        new ValidationError(),
        new ConflictError(),
        new LiveKitError(),
        new DatabaseError(),
        new AuthorizationError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(AppError);
        expect(error.isOperational).toBe(true);
      });
    });

    it('should distinguish between different error types', () => {
      const notFoundError = new NotFoundError();
      const validationError = new ValidationError();

      expect(notFoundError).toBeInstanceOf(NotFoundError);
      expect(notFoundError).not.toBeInstanceOf(ValidationError);

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError).not.toBeInstanceOf(NotFoundError);
    });
  });
});
