import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { PersonioAttendance } from '../api/types.js';

const listAttendancesSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  employee_ids: z.array(z.number()).optional(),
  project_ids: z.array(z.number()).optional(),
  limit: z.number().min(1).max(50).optional().default(50),
  offset: z.number().min(0).optional().default(0)
});

const createAttendanceSchema = z.object({
  employee_id: z.number(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  break_duration: z.number().optional().default(0),
  comment: z.string().optional(),
  project_id: z.number().optional()
});

const updateAttendanceSchema = z.object({
  attendance_id: z.number(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  break_duration: z.number().optional(),
  comment: z.string().optional(),
  project_id: z.number().optional()
});

const deleteAttendanceSchema = z.object({
  attendance_id: z.number()
});

const getProjectsSchema = z.object({});

export class AttendanceTools {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'list_attendances',
        description: 'List attendance records with optional filtering',
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
            project_ids: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by specific project IDs'
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
        name: 'create_attendance',
        description: 'Create a new attendance entry (clock in/out)',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'ID of the employee'
            },
            date: {
              type: 'string',
              description: 'Date of attendance (YYYY-MM-DD)'
            },
            start_time: {
              type: 'string',
              description: 'Start time (HH:MM)'
            },
            end_time: {
              type: 'string',
              description: 'End time (HH:MM)'
            },
            break_duration: {
              type: 'number',
              description: 'Break duration in minutes',
              default: 0
            },
            comment: {
              type: 'string',
              description: 'Optional comment'
            },
            project_id: {
              type: 'number',
              description: 'Optional project ID'
            }
          },
          required: ['employee_id', 'date', 'start_time', 'end_time']
        }
      },
      {
        name: 'update_attendance',
        description: 'Update an existing attendance entry',
        inputSchema: {
          type: 'object',
          properties: {
            attendance_id: {
              type: 'number',
              description: 'ID of the attendance to update'
            },
            start_time: {
              type: 'string',
              description: 'New start time (HH:MM)'
            },
            end_time: {
              type: 'string',
              description: 'New end time (HH:MM)'
            },
            break_duration: {
              type: 'number',
              description: 'New break duration in minutes'
            },
            comment: {
              type: 'string',
              description: 'New comment'
            },
            project_id: {
              type: 'number',
              description: 'New project ID'
            }
          },
          required: ['attendance_id']
        }
      },
      {
        name: 'delete_attendance',
        description: 'Delete an attendance entry',
        inputSchema: {
          type: 'object',
          properties: {
            attendance_id: {
              type: 'number',
              description: 'ID of the attendance to delete'
            }
          },
          required: ['attendance_id']
        }
      },
      {
        name: 'get_projects',
        description: 'Get available projects for time tracking',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_attendances':
        return this.listAttendances(args);
      case 'create_attendance':
        return this.createAttendance(args);
      case 'update_attendance':
        return this.updateAttendance(args);
      case 'delete_attendance':
        return this.deleteAttendance(args);
      case 'get_projects':
        return this.getProjects(args);
      default:
        throw new Error(`Unknown attendance tool: ${name}`);
    }
  }

  private async listAttendances(args: any): Promise<any> {
    const params = listAttendancesSchema.parse(args);

    // Fetch from API
    const attendances = await this.rateLimiter.execute(() =>
      this.client.getAttendances({
        start_date: params.start_date,
        end_date: params.end_date,
        employees: params.employee_ids,
        projects: params.project_ids,
        limit: params.limit,
        offset: params.offset
      })
    );

    // Transform
    const result = {
      attendances: attendances.map(this.transformAttendance),
      total: attendances.length,
      limit: params.limit,
      offset: params.offset
    };

    return result;
  }

  private async createAttendance(args: any): Promise<any> {
    const params = createAttendanceSchema.parse(args);

    // Create via API
    const attendance = await this.rateLimiter.execute(() =>
      this.client.createAttendance({
        employee: params.employee_id,
        date: params.date,
        start_time: params.start_time,
        end_time: params.end_time,
        break: params.break_duration,
        comment: params.comment,
        project_id: params.project_id
      })
    );

    return {
      success: true,
      attendance: this.transformAttendance(attendance),
      message: 'Attendance entry created successfully'
    };
  }

  private async updateAttendance(args: any): Promise<any> {
    const params = updateAttendanceSchema.parse(args);

    const updateData: any = {};
    if (params.start_time) updateData.start_time = params.start_time;
    if (params.end_time) updateData.end_time = params.end_time;
    if (params.break_duration !== undefined) updateData.break = params.break_duration;
    if (params.comment) updateData.comment = params.comment;
    if (params.project_id) updateData.project_id = params.project_id;

    // Update via API
    const attendance = await this.rateLimiter.execute(() =>
      this.client.updateAttendance(params.attendance_id, updateData)
    );

    return {
      success: true,
      attendance: this.transformAttendance(attendance),
      message: 'Attendance entry updated successfully'
    };
  }

  private async deleteAttendance(args: any): Promise<any> {
    const params = deleteAttendanceSchema.parse(args);

    // Delete via API
    await this.rateLimiter.execute(() =>
      this.client.deleteAttendance(params.attendance_id)
    );

    return {
      success: true,
      message: 'Attendance entry deleted successfully'
    };
  }

  private async getProjects(args: any): Promise<any> {
    const projects = await this.rateLimiter.execute(() =>
      this.client.getProjects()
    );

    return {
      projects: projects,
      total: projects.length
    };
  }

  private transformAttendance(attendance: PersonioAttendance): any {
    const startTime = new Date(`${attendance.date}T${attendance.start_time}`);
    const endTime = new Date(`${attendance.date}T${attendance.end_time}`);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) - attendance.break;
    const durationHours = durationMinutes / 60;

    return {
      id: attendance.id,
      employee_id: attendance.employee,
      date: attendance.date,
      times: {
        start: attendance.start_time,
        end: attendance.end_time,
        break_minutes: attendance.break
      },
      duration: {
        total_minutes: durationMinutes,
        total_hours: parseFloat(durationHours.toFixed(2)),
        formatted: `${Math.floor(durationHours)}h ${Math.round(durationMinutes % 60)}m`
      },
      project: attendance.project ? {
        id: attendance.project.id,
        name: attendance.project.name
      } : null,
      comment: attendance.comment,
      created_at: attendance.created_at,
      updated_at: attendance.updated_at
    };
  }
}