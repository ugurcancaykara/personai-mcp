import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { PersonioAbsence } from '../api/types.js';

const listAbsencesSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  employee_ids: z.array(z.number()).optional(),
  status: z.enum(['approved', 'pending', 'rejected', 'canceled']).optional(),
  limit: z.number().min(1).max(50).optional().default(50),
  offset: z.number().min(0).optional().default(0)
});

const createAbsenceSchema = z.object({
  employee_id: z.number(),
  time_off_type_id: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  half_day_start: z.boolean().optional().default(false),
  half_day_end: z.boolean().optional().default(false),
  comment: z.string().optional()
});

const deleteAbsenceSchema = z.object({
  absence_id: z.number()
});

const getAbsenceTypesSchema = z.object({});

export class AbsenceTools {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'list_absences',
        description: 'List absences with optional filtering by date, employee, and status',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date for filtering (YYYY-MM-DD)'
            },
            end_date: {
              type: 'string',
              description: 'End date for filtering (YYYY-MM-DD)'
            },
            employee_ids: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by specific employee IDs'
            },
            status: {
              type: 'string',
              enum: ['approved', 'pending', 'rejected', 'canceled'],
              description: 'Filter by absence status'
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (1-50)',
              default: 50
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip',
              default: 0
            }
          }
        }
      },
      {
        name: 'create_absence_request',
        description: 'Create a new absence/time-off request',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'ID of the employee'
            },
            time_off_type_id: {
              type: 'number',
              description: 'ID of the time-off type (vacation, sick leave, etc.)'
            },
            start_date: {
              type: 'string',
              description: 'Start date of absence (YYYY-MM-DD)'
            },
            end_date: {
              type: 'string',
              description: 'End date of absence (YYYY-MM-DD)'
            },
            half_day_start: {
              type: 'boolean',
              description: 'Is the start date a half day?',
              default: false
            },
            half_day_end: {
              type: 'boolean',
              description: 'Is the end date a half day?',
              default: false
            },
            comment: {
              type: 'string',
              description: 'Optional comment for the request'
            }
          },
          required: ['employee_id', 'time_off_type_id', 'start_date', 'end_date']
        }
      },
      {
        name: 'delete_absence',
        description: 'Cancel/delete an absence request',
        inputSchema: {
          type: 'object',
          properties: {
            absence_id: {
              type: 'number',
              description: 'ID of the absence to delete'
            }
          },
          required: ['absence_id']
        }
      },
      {
        name: 'get_absence_types',
        description: 'Get available time-off types (vacation, sick leave, etc.)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_absences':
        return this.listAbsences(args);
      case 'create_absence_request':
        return this.createAbsence(args);
      case 'delete_absence':
        return this.deleteAbsence(args);
      case 'get_absence_types':
        return this.getAbsenceTypes(args);
      default:
        throw new Error(`Unknown absence tool: ${name}`);
    }
  }

  private async listAbsences(args: any): Promise<any> {
    const params = listAbsencesSchema.parse(args);
    const cacheKey = CacheManager.getAbsencesKey(params);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const absences = await this.rateLimiter.execute(() =>
      this.client.getAbsences({
        start_date: params.start_date,
        end_date: params.end_date,
        employees: params.employee_ids,
        status: params.status,
        limit: params.limit,
        offset: params.offset
      })
    );

    // Transform and cache
    const result = {
      absences: absences.map(this.transformAbsence),
      total: absences.length,
      limit: params.limit,
      offset: params.offset
    };

    // Only cache if not filtering by status (as status changes frequently)
    if (!params.status) {
      this.cache.set(cacheKey, result, 60); // Cache for 1 minute
    }

    return result;
  }

  private async createAbsence(args: any): Promise<any> {
    const params = createAbsenceSchema.parse(args);

    // Create via API
    const absence = await this.rateLimiter.execute(() =>
      this.client.createAbsence(params)
    );

    // Invalidate related caches
    this.cache.delete(CacheManager.getAbsencesKey());

    return {
      success: true,
      absence: this.transformAbsence(absence),
      message: 'Absence request created successfully'
    };
  }

  private async deleteAbsence(args: any): Promise<any> {
    const params = deleteAbsenceSchema.parse(args);

    // Delete via API
    await this.rateLimiter.execute(() =>
      this.client.deleteAbsence(params.absence_id)
    );

    // Invalidate cache
    this.cache.delete(CacheManager.getAbsencesKey());

    return {
      success: true,
      message: 'Absence deleted successfully'
    };
  }

  private async getAbsenceTypes(args: any): Promise<any> {
    // This would typically come from a separate API endpoint
    // For now, return common types
    const types = [
      { id: 1, name: 'Vacation', category: 'paid' },
      { id: 2, name: 'Sick Leave', category: 'paid' },
      { id: 3, name: 'Personal Day', category: 'paid' },
      { id: 4, name: 'Unpaid Leave', category: 'unpaid' },
      { id: 5, name: 'Parental Leave', category: 'paid' },
      { id: 6, name: 'Bereavement', category: 'paid' },
      { id: 7, name: 'Public Holiday', category: 'paid' },
      { id: 8, name: 'Work from Home', category: 'other' }
    ];

    return {
      absence_types: types,
      total: types.length
    };
  }

  private transformAbsence(absence: PersonioAbsence): any {
    return {
      id: absence.id,
      status: absence.status,
      employee: {
        id: absence.employee.id,
        name: `${absence.employee.first_name} ${absence.employee.last_name}`,
        email: absence.employee.email
      },
      dates: {
        start: absence.start_date,
        end: absence.end_date,
        half_day_start: absence.half_day_start,
        half_day_end: absence.half_day_end
      },
      duration: {
        days: absence.days_count,
        is_half_day: absence.half_day_start || absence.half_day_end
      },
      type: {
        id: absence.time_off_type.id,
        name: absence.time_off_type.name,
        category: absence.time_off_type.category
      },
      comment: absence.comment,
      created_at: absence.created_at,
      updated_at: absence.updated_at
    };
  }
}