import NodeCache from 'node-cache';

interface CacheConfig {
  employeesTTL?: number;
  organizationTTL?: number;
  policiesTTL?: number;
}

export class CacheManager {
  private cache: NodeCache;
  private config: CacheConfig;

  constructor(config?: CacheConfig) {
    this.config = {
      employeesTTL: config?.employeesTTL || 300, // 5 minutes
      organizationTTL: config?.organizationTTL || 3600, // 1 hour
      policiesTTL: config?.policiesTTL || 86400, // 24 hours
    };

    this.cache = new NodeCache({
      stdTTL: 300, // Default 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: true
    });
  }

  set(key: string, value: any, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || this.getDefaultTTL(key));
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  private getDefaultTTL(key: string): number {
    if (key.includes('employees')) return this.config.employeesTTL!;
    if (key.includes('organization')) return this.config.organizationTTL!;
    if (key.includes('policies')) return this.config.policiesTTL!;
    return 300; // Default 5 minutes
  }

  // Cache key generators
  static getEmployeesKey(params?: any): string {
    return `employees:${JSON.stringify(params || {})}`;
  }

  static getEmployeeKey(id: number): string {
    return `employee:${id}`;
  }

  static getAbsencesKey(params?: any): string {
    return `absences:${JSON.stringify(params || {})}`;
  }

  static getOrganizationKey(): string {
    return 'organization:structure';
  }

  static getPoliciesKey(): string {
    return 'policies:absence-types';
  }
}