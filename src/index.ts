#!/usr/bin/env node
import 'dotenv/config';
import { PersonioMCPServer } from './server.js';

async function main() {
  try {
    // Validate required environment variables
    const requiredEnvVars = process.env.PERSONIO_API_KEY 
      ? ['PERSONIO_API_KEY']
      : ['PERSONIO_CLIENT_ID', 'PERSONIO_CLIENT_SECRET'];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      console.error('Please create a .env file based on .env.example');
      process.exit(1);
    }

    // Create server configuration
    const config = {
      clientId: process.env.PERSONIO_CLIENT_ID,
      clientSecret: process.env.PERSONIO_CLIENT_SECRET,
      apiKey: process.env.PERSONIO_API_KEY,
      baseUrl: process.env.PERSONIO_API_URL,
      cache: {
        employeesTTL: parseInt(process.env.CACHE_TTL_EMPLOYEES || '300'),
        organizationTTL: parseInt(process.env.CACHE_TTL_ORGANIZATION || '3600'),
        policiesTTL: parseInt(process.env.CACHE_TTL_POLICIES || '86400')
      },
      rateLimit: {
        requestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
        burstLimit: parseInt(process.env.RATE_LIMIT_BURST || '15')
      }
    };

    // Create and start server
    const server = new PersonioMCPServer(config);
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\nShutting down Personio MCP server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\nShutting down Personio MCP server...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Personio MCP server:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PersonioMCPServer } from './server.js';
export { PersonioClient } from './api/client.js';
export * from './api/types.js';