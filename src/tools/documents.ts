import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { readFileSync } from 'fs';
import { basename } from 'path';

const listDocumentCategoriesSchema = z.object({});

const uploadDocumentSchema = z.object({
  employee_id: z.number(),
  category_id: z.number(),
  file_path: z.string(),
  file_name: z.string().optional()
});

const uploadDocumentBase64Schema = z.object({
  employee_id: z.number(),
  category_id: z.number(),
  file_content: z.string(),
  file_name: z.string()
});

export class DocumentTools {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'list_document_categories',
        description: 'Get available document categories for uploading',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'upload_document',
        description: 'Upload a document to an employee profile from file path',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'ID of the employee'
            },
            category_id: {
              type: 'number',
              description: 'ID of the document category'
            },
            file_path: {
              type: 'string',
              description: 'Path to the file to upload'
            },
            file_name: {
              type: 'string',
              description: 'Optional custom file name'
            }
          },
          required: ['employee_id', 'category_id', 'file_path']
        }
      },
      {
        name: 'upload_document_base64',
        description: 'Upload a document to an employee profile from base64 content',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'ID of the employee'
            },
            category_id: {
              type: 'number',
              description: 'ID of the document category'
            },
            file_content: {
              type: 'string',
              description: 'Base64 encoded file content'
            },
            file_name: {
              type: 'string',
              description: 'File name with extension'
            }
          },
          required: ['employee_id', 'category_id', 'file_content', 'file_name']
        }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_document_categories':
        return this.listDocumentCategories(args);
      case 'upload_document':
        return this.uploadDocument(args);
      case 'upload_document_base64':
        return this.uploadDocumentBase64(args);
      default:
        throw new Error(`Unknown document tool: ${name}`);
    }
  }

  private async listDocumentCategories(args: any): Promise<any> {
    const cacheKey = 'document:categories';

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const categories = await this.rateLimiter.execute(() =>
      this.client.getDocumentCategories()
    );

    const result = {
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        required: cat.required || false
      })),
      total: categories.length
    };

    // Cache for 24 hours
    this.cache.set(cacheKey, result, 86400);

    return result;
  }

  private async uploadDocument(args: any): Promise<any> {
    const params = uploadDocumentSchema.parse(args);

    try {
      // Read file
      const fileBuffer = readFileSync(params.file_path);
      const fileName = params.file_name || basename(params.file_path);

      // Upload via API with rate limiting (60 req/min for documents)
      const document = await this.rateLimiter.execute(() =>
        this.client.uploadDocument(
          params.employee_id,
          params.category_id,
          fileBuffer,
          fileName
        )
      );

      return {
        success: true,
        document: {
          id: document.id,
          employee_id: document.employee_id,
          category: document.category,
          file_name: document.file_name,
          file_size: document.file_size,
          uploaded_at: document.uploaded_at
        },
        message: 'Document uploaded successfully'
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${params.file_path}`);
      }
      throw error;
    }
  }

  private async uploadDocumentBase64(args: any): Promise<any> {
    const params = uploadDocumentBase64Schema.parse(args);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(params.file_content, 'base64');

    // Upload via API
    const document = await this.rateLimiter.execute(() =>
      this.client.uploadDocument(
        params.employee_id,
        params.category_id,
        fileBuffer,
        params.file_name
      )
    );

    return {
      success: true,
      document: {
        id: document.id,
        employee_id: document.employee_id,
        category: document.category,
        file_name: document.file_name,
        file_size: document.file_size,
        uploaded_at: document.uploaded_at
      },
      message: 'Document uploaded successfully'
    };
  }
}