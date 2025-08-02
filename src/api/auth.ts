import axios from 'axios';
import { PersonioAuthToken } from './types.js';

export class PersonioAuth {
  private clientId?: string;
  private clientSecret?: string;
  private apiKey?: string;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    baseUrl?: string;
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.personio.de';
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.apiKey) {
      // Use API key authentication (v1 API)
      return {
        'X-Personio-App-ID': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
    }

    // Use OAuth2 authentication (v2 API)
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    // Request new token
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Client ID and Client Secret are required for OAuth2 authentication');
    }

    try {
      const response = await axios.post<PersonioAuthToken>(
        `${this.baseUrl}/v2/auth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.data.success || !response.data.data.token) {
        throw new Error('Failed to obtain access token');
      }

      this.accessToken = response.data.data.token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.data.expires_in - 300) * 1000);

      return this.accessToken;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Authentication failed: ${error.response.data?.error?.message || error.message}`);
      }
      throw new Error(`Authentication error: ${error.message}`);
    }
  }

  async revokeToken(): Promise<void> {
    if (!this.accessToken) {
      return;
    }

    try {
      await axios.post(
        `${this.baseUrl}/v2/auth/revoke`,
        { token: this.accessToken },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } finally {
      this.accessToken = undefined;
      this.tokenExpiry = undefined;
    }
  }
}