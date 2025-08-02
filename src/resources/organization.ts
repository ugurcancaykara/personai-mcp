import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';

export class OrganizationResources {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getResources(): Resource[] {
    return [
      {
        uri: 'personio://organization/structure',
        name: 'Organization Structure',
        description: 'Hierarchical organization structure with departments and teams',
        mimeType: 'application/json'
      },
      {
        uri: 'personio://organization/departments',
        name: 'Department List',
        description: 'List of all departments with employee counts',
        mimeType: 'application/json'
      },
      {
        uri: 'personio://organization/headcount',
        name: 'Headcount Statistics',
        description: 'Organization headcount statistics and trends',
        mimeType: 'application/json'
      }
    ];
  }

  async handleResourceRead(uri: string): Promise<any> {
    switch (uri) {
      case 'personio://organization/structure':
        return this.getOrganizationStructure();
      case 'personio://organization/departments':
        return this.getDepartmentList();
      case 'personio://organization/headcount':
        return this.getHeadcountStatistics();
      default:
        throw new Error(`Unknown organization resource: ${uri}`);
    }
  }

  private async getOrganizationStructure(): Promise<any> {
    const cacheKey = CacheManager.getOrganizationKey();

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all employees to build org structure
    const employees = await this.rateLimiter.execute(() =>
      this.client.getEmployees({ limit: 1000 })
    );

    // Build department hierarchy
    const departments: Map<string, any> = new Map();
    const positions: Map<string, Set<string>> = new Map();

    employees.forEach((emp) => {
      const dept = emp.attributes.department?.value?.attributes?.name || 'No Department';
      const position = emp.attributes.position?.value || 'No Position';
      const status = emp.attributes.status?.value;

      if (!departments.has(dept)) {
        departments.set(dept, {
          name: dept,
          id: emp.attributes.department?.value?.attributes?.id,
          employees: [],
          positions: new Set<string>(),
          active_count: 0,
          total_count: 0
        });
      }

      const deptData = departments.get(dept)!;
      deptData.employees.push({
        id: emp.attributes.id?.value,
        name: `${emp.attributes.first_name?.value} ${emp.attributes.last_name?.value}`,
        position: position,
        status: status
      });
      deptData.positions.add(position);
      deptData.total_count++;
      if (status === 'active' || status === 'Active') {
        deptData.active_count++;
      }
    });

    // Convert to array and calculate statistics
    const structure = Array.from(departments.values()).map(dept => ({
      ...dept,
      positions: Array.from(dept.positions).sort()
    }));

    const result = {
      organization: {
        name: 'Company', // Would come from API in real implementation
        departments: structure.sort((a, b) => a.name.localeCompare(b.name)),
        total_employees: employees.length,
        total_departments: structure.length
      },
      last_updated: new Date().toISOString()
    };

    // Cache for 1 hour
    this.cache.set(cacheKey, result, 3600);

    return result;
  }

  private async getDepartmentList(): Promise<any> {
    const orgStructure = await this.getOrganizationStructure();
    
    const departments = orgStructure.organization.departments.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      employee_count: dept.total_count,
      active_employee_count: dept.active_count,
      positions: dept.positions.length,
      unique_positions: dept.positions
    }));

    return {
      departments: departments,
      total: departments.length,
      last_updated: orgStructure.last_updated
    };
  }

  private async getHeadcountStatistics(): Promise<any> {
    const orgStructure = await this.getOrganizationStructure();
    
    const stats = {
      total_headcount: orgStructure.organization.total_employees,
      departments: orgStructure.organization.total_departments,
      by_status: {} as Record<string, number>,
      by_department: {} as Record<string, number>,
      largest_department: null as any,
      smallest_department: null as any
    };

    // Calculate statistics
    let maxEmployees = 0;
    let minEmployees = Infinity;

    orgStructure.organization.departments.forEach((dept: any) => {
      stats.by_department[dept.name] = dept.total_count;
      
      if (dept.total_count > maxEmployees) {
        maxEmployees = dept.total_count;
        stats.largest_department = {
          name: dept.name,
          count: dept.total_count
        };
      }
      
      if (dept.total_count < minEmployees && dept.total_count > 0) {
        minEmployees = dept.total_count;
        stats.smallest_department = {
          name: dept.name,
          count: dept.total_count
        };
      }

      // Count by status
      dept.employees.forEach((emp: any) => {
        const status = emp.status || 'Unknown';
        stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      });
    });

    return {
      statistics: stats,
      last_updated: orgStructure.last_updated
    };
  }
}