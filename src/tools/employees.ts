import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { PersonioEmployee } from '../api/types.js';

const listEmployeesSchema = z.object({
  limit: z.number().min(1).max(50).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  attributes: z.array(z.string()).optional(),
  updated_since: z.string().optional()
});

const getEmployeeSchema = z.object({
  employee_id: z.number(),
  attributes: z.array(z.string()).optional()
});

const searchEmployeesSchema = z.object({
  query: z.string().min(1),
  attributes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).optional().default(20)
});

const getEmployeeAbsenceBalanceSchema = z.object({
  employee_id: z.number()
});

const updateEmployeeSchema = z.object({
  employee_id: z.number(),
  data: z.record(z.any())
});

export class EmployeeTools {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'list_employees',
        description: 'List all employees with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of employees to return (1-50)',
              default: 50
            },
            offset: {
              type: 'number',
              description: 'Number of employees to skip',
              default: 0
            },
            attributes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific attributes to include'
            },
            updated_since: {
              type: 'string',
              description: 'Return only employees updated after this date (ISO 8601)'
            }
          }
        }
      },
      {
        name: 'get_employee',
        description: 'Get detailed information about a specific employee',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'The ID of the employee'
            },
            attributes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific attributes to include'
            }
          },
          required: ['employee_id']
        }
      },
      {
        name: 'search_employees',
        description: 'Search for employees by name, email, or department',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (name, email, or department)'
            },
            attributes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific attributes to include'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 20
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_employee_absence_balance',
        description: 'Get the absence balance for a specific employee',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'The ID of the employee'
            }
          },
          required: ['employee_id']
        }
      },
      {
        name: 'update_employee',
        description: 'Update employee information (requires appropriate permissions)',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'number',
              description: 'The ID of the employee to update'
            },
            data: {
              type: 'object',
              description: 'Employee attributes to update',
              additionalProperties: true
            }
          },
          required: ['employee_id', 'data']
        }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_employees':
        return this.listEmployees(args);
      case 'get_employee':
        return this.getEmployee(args);
      case 'search_employees':
        return this.searchEmployees(args);
      case 'get_employee_absence_balance':
        return this.getEmployeeAbsenceBalance(args);
      case 'update_employee':
        return this.updateEmployee(args);
      default:
        throw new Error(`Unknown employee tool: ${name}`);
    }
  }

  private async listEmployees(args: any): Promise<any> {
    const params = listEmployeesSchema.parse(args);
    const cacheKey = CacheManager.getEmployeesKey(params);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API with rate limiting
    const employees = await this.rateLimiter.execute(() =>
      this.client.getEmployees(params)
    );

    // Transform and cache the result
    const result = {
      employees: employees.map(this.transformEmployee),
      total: employees.length,
      limit: params.limit,
      offset: params.offset
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  private async getEmployee(args: any): Promise<any> {
    const params = getEmployeeSchema.parse(args);
    const cacheKey = CacheManager.getEmployeeKey(params.employee_id);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const employee = await this.rateLimiter.execute(() =>
      this.client.getEmployee(params.employee_id, params.attributes)
    );

    const result = this.transformEmployee(employee);
    this.cache.set(cacheKey, result);
    return result;
  }

  private async searchEmployees(args: any): Promise<any> {
    const params = searchEmployeesSchema.parse(args);
    
    // Get all employees (from cache if available)
    const allEmployees = await this.listEmployees({ 
      limit: 1000, 
      attributes: params.attributes 
    });

    // Search locally
    const query = params.query.toLowerCase();
    const results = allEmployees.employees.filter((emp: any) => {
      const firstName = emp.first_name?.toLowerCase() || '';
      const lastName = emp.last_name?.toLowerCase() || '';
      const email = emp.email?.toLowerCase() || '';
      const department = emp.department?.name?.toLowerCase() || '';
      
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query) ||
        department.includes(query) ||
        `${firstName} ${lastName}`.includes(query)
      );
    });

    return {
      employees: results.slice(0, params.limit),
      total: results.length,
      query: params.query
    };
  }

  private async getEmployeeAbsenceBalance(args: any): Promise<any> {
    const params = getEmployeeAbsenceBalanceSchema.parse(args);
    
    return this.rateLimiter.execute(() =>
      this.client.getEmployeeAbsenceBalance(params.employee_id)
    );
  }

  private async updateEmployee(args: any): Promise<any> {
    const params = updateEmployeeSchema.parse(args);
    
    // Update via API
    const updated = await this.rateLimiter.execute(() =>
      this.client.updateEmployee(params.employee_id, params.data)
    );

    // Invalidate cache
    this.cache.delete(CacheManager.getEmployeeKey(params.employee_id));
    this.cache.delete(CacheManager.getEmployeesKey());

    return this.transformEmployee(updated);
  }

  private transformEmployee(employee: PersonioEmployee): any {
    const attrs = employee.attributes;
    return {
      id: attrs.id?.value,
      first_name: attrs.first_name?.value,
      last_name: attrs.last_name?.value,
      email: attrs.email?.value,
      department: attrs.department?.value?.attributes?.name,
      department_id: attrs.department?.value?.attributes?.id,
      position: attrs.position?.value,
      status: attrs.status?.value,
      // Include any custom attributes
      ...Object.entries(attrs).reduce((acc, [key, value]) => {
        if (!['id', 'first_name', 'last_name', 'email', 'department', 'position', 'status'].includes(key)) {
          acc[key] = value.value;
        }
        return acc;
      }, {} as any)
    };
  }
}