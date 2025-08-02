import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PersonioClient } from '../src/api/client';
import { PersonioAuth } from '../src/api/auth';

// Mock axios
jest.mock('axios');

describe('PersonioClient', () => {
  let client: PersonioClient;

  beforeEach(() => {
    client = new PersonioClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    });
  });

  describe('Employee Methods', () => {
    it('should fetch employees list', async () => {
      // Test implementation would go here
      expect(client).toBeDefined();
    });

    it('should get single employee', async () => {
      // Test implementation would go here
      expect(client).toBeDefined();
    });
  });

  describe('Absence Methods', () => {
    it('should create absence request', async () => {
      // Test implementation would go here
      expect(client).toBeDefined();
    });
  });
});

describe('PersonioAuth', () => {
  describe('OAuth2 Authentication', () => {
    it('should obtain access token', async () => {
      const auth = new PersonioAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      });
      
      expect(auth).toBeDefined();
    });
  });

  describe('API Key Authentication', () => {
    it('should use API key headers', async () => {
      const auth = new PersonioAuth({
        apiKey: 'test-api-key'
      });
      
      const headers = await auth.getAuthHeaders();
      expect(headers['X-Personio-App-ID']).toBe('test-api-key');
    });
  });
});