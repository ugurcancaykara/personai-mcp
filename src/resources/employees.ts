import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';

export class EmployeeResources {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getResources(): Resource[] {
    return [
      {
        uri: 'personio://employees/directory',
        name: 'Employee Directory',
        description: 'Complete list of all employees with basic information',
        mimeType: 'application/json'
      },
      {
        uri: 'personio://employees/by-department',
        name: 'Employees by Department',
        description: 'Employees organized by department',
        mimeType: 'application/json'
      },
      {
        uri: 'personio://employees/active',
        name: 'Active Employees',
        description: 'List of currently active employees',
        mimeType: 'application/json'
      }
    ];
  }

  async handleResourceRead(uri: string): Promise<any> {
    switch (uri) {
      case 'personio://employees/directory':
        return this.getEmployeeDirectory();
      case 'personio://employees/by-department':
        return this.getEmployeesByDepartment();
      case 'personio://employees/active':
        return this.getActiveEmployees();
      default:
        throw new Error(`Unknown employee resource: ${uri}`);
    }
  }

  private async getEmployeeDirectory(): Promise<any> {
    const cacheKey = 'resource:employees:directory';

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all employees
    const employees = await this.rateLimiter.execute(() =>
      this.client.getEmployees({ limit: 1000 })
    );

    const directory = employees.map((emp) => ({
      id: emp.attributes.id?.value,
      name: `${emp.attributes.first_name?.value} ${emp.attributes.last_name?.value}`,
      email: emp.attributes.email?.value,
      department: emp.attributes.department?.value?.attributes?.name,
      position: emp.attributes.position?.value,
      status: emp.attributes.status?.value
    }));

    const result = {
      employees: directory,
      total: directory.length,
      last_updated: new Date().toISOString()
    };

    // Cache for 5 minutes
    this.cache.set(cacheKey, result, 300);

    return result;
  }

  private async getEmployeesByDepartment(): Promise<any> {
    const directory = await this.getEmployeeDirectory();
    
    // Group by department
    const byDepartment: Record<string, any[]> = {};
    
    directory.employees.forEach((emp: any) => {
      const dept = emp.department || 'No Department';
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }
      byDepartment[dept].push(emp);
    });

    // Convert to array format
    const departments = Object.entries(byDepartment).map(([name, employees]) => ({
      department: name,
      employee_count: employees.length,
      employees: employees
    }));

    return {
      departments: departments.sort((a, b) => a.department.localeCompare(b.department)),
      total_departments: departments.length,
      total_employees: directory.employees.length,
      last_updated: directory.last_updated
    };
  }

  private async getActiveEmployees(): Promise<any> {
    const directory = await this.getEmployeeDirectory();
    
    // Filter active employees
    const activeEmployees = directory.employees.filter(
      (emp: any) => emp.status === 'active' || emp.status === 'Active'
    );

    return {
      employees: activeEmployees,
      total: activeEmployees.length,
      percentage_active: ((activeEmployees.length / directory.employees.length) * 100).toFixed(1),
      last_updated: directory.last_updated
    };
  }
}