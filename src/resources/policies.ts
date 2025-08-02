import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { PersonioClient } from '../api/client.js';
import { CacheManager } from '../utils/cache.js';
import { RateLimiter } from '../utils/rateLimiter.js';

export class PolicyResources {
  constructor(
    private client: PersonioClient,
    private cache: CacheManager,
    private rateLimiter: RateLimiter
  ) {}

  getResources(): Resource[] {
    return [
      {
        uri: 'personio://policies/absence-types',
        name: 'Absence Types',
        description: 'Available absence and time-off types with policies',
        mimeType: 'application/json'
      },
      {
        uri: 'personio://policies/working-hours',
        name: 'Working Hours Policy',
        description: 'Standard working hours and overtime policies',
        mimeType: 'application/json'
      },
      {
        uri: 'personio://policies/holidays',
        name: 'Holiday Calendar',
        description: 'Company holidays and observances',
        mimeType: 'application/json'
      }
    ];
  }

  async handleResourceRead(uri: string): Promise<any> {
    switch (uri) {
      case 'personio://policies/absence-types':
        return this.getAbsenceTypes();
      case 'personio://policies/working-hours':
        return this.getWorkingHoursPolicy();
      case 'personio://policies/holidays':
        return this.getHolidayCalendar();
      default:
        throw new Error(`Unknown policy resource: ${uri}`);
    }
  }

  private async getAbsenceTypes(): Promise<any> {
    const cacheKey = CacheManager.getPoliciesKey();

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // In a real implementation, this would come from the API
    // For now, we'll provide standard absence types
    const absenceTypes = [
      {
        id: 1,
        name: 'Annual Leave',
        category: 'paid',
        entitlement_days: 25,
        carryover_allowed: true,
        carryover_limit: 5,
        requires_approval: true,
        advance_notice_days: 14,
        documentation_required: false
      },
      {
        id: 2,
        name: 'Sick Leave',
        category: 'paid',
        entitlement_days: 10,
        carryover_allowed: false,
        requires_approval: false,
        advance_notice_days: 0,
        documentation_required: true,
        documentation_after_days: 3
      },
      {
        id: 3,
        name: 'Personal Day',
        category: 'paid',
        entitlement_days: 3,
        carryover_allowed: false,
        requires_approval: true,
        advance_notice_days: 2,
        documentation_required: false
      },
      {
        id: 4,
        name: 'Unpaid Leave',
        category: 'unpaid',
        entitlement_days: null,
        carryover_allowed: false,
        requires_approval: true,
        advance_notice_days: 30,
        documentation_required: true
      },
      {
        id: 5,
        name: 'Parental Leave',
        category: 'paid',
        entitlement_days: 90,
        carryover_allowed: false,
        requires_approval: true,
        advance_notice_days: 60,
        documentation_required: true
      },
      {
        id: 6,
        name: 'Bereavement Leave',
        category: 'paid',
        entitlement_days: 5,
        carryover_allowed: false,
        requires_approval: false,
        advance_notice_days: 0,
        documentation_required: false
      },
      {
        id: 7,
        name: 'Public Holiday',
        category: 'paid',
        entitlement_days: null,
        carryover_allowed: false,
        requires_approval: false,
        advance_notice_days: 0,
        documentation_required: false
      },
      {
        id: 8,
        name: 'Work from Home',
        category: 'other',
        entitlement_days: null,
        carryover_allowed: false,
        requires_approval: true,
        advance_notice_days: 1,
        documentation_required: false
      }
    ];

    const result = {
      absence_types: absenceTypes,
      total: absenceTypes.length,
      categories: {
        paid: absenceTypes.filter(t => t.category === 'paid').length,
        unpaid: absenceTypes.filter(t => t.category === 'unpaid').length,
        other: absenceTypes.filter(t => t.category === 'other').length
      },
      last_updated: new Date().toISOString()
    };

    // Cache for 24 hours
    this.cache.set(cacheKey, result, 86400);

    return result;
  }

  private async getWorkingHoursPolicy(): Promise<any> {
    // Standard working hours policy
    const policy = {
      standard_hours: {
        per_day: 8,
        per_week: 40,
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      working_time: {
        start: '09:00',
        end: '18:00',
        break_duration: 60,
        flexible_hours: true,
        core_hours: {
          start: '10:00',
          end: '16:00'
        }
      },
      overtime: {
        allowed: true,
        approval_required: true,
        rate_weekday: 1.5,
        rate_weekend: 2.0,
        rate_holiday: 2.5,
        monthly_limit: 20,
        compensation_type: 'paid' // or 'time_off'
      },
      remote_work: {
        allowed: true,
        max_days_per_week: 3,
        approval_required: true,
        equipment_provided: true
      },
      last_updated: new Date().toISOString()
    };

    return policy;
  }

  private async getHolidayCalendar(): Promise<any> {
    const currentYear = new Date().getFullYear();
    
    // Standard holidays (would come from API)
    const holidays = [
      { date: `${currentYear}-01-01`, name: "New Year's Day", type: 'public' },
      { date: `${currentYear}-01-06`, name: 'Epiphany', type: 'public' },
      { date: `${currentYear}-04-07`, name: 'Good Friday', type: 'public' },
      { date: `${currentYear}-04-10`, name: 'Easter Monday', type: 'public' },
      { date: `${currentYear}-05-01`, name: 'Labour Day', type: 'public' },
      { date: `${currentYear}-05-18`, name: 'Ascension Day', type: 'public' },
      { date: `${currentYear}-05-29`, name: 'Whit Monday', type: 'public' },
      { date: `${currentYear}-10-03`, name: 'German Unity Day', type: 'public' },
      { date: `${currentYear}-10-31`, name: 'Reformation Day', type: 'regional' },
      { date: `${currentYear}-11-01`, name: "All Saints' Day", type: 'regional' },
      { date: `${currentYear}-12-25`, name: 'Christmas Day', type: 'public' },
      { date: `${currentYear}-12-26`, name: 'Boxing Day', type: 'public' },
      { date: `${currentYear}-12-24`, name: 'Christmas Eve', type: 'company' },
      { date: `${currentYear}-12-31`, name: "New Year's Eve", type: 'company' }
    ];

    return {
      year: currentYear,
      holidays: holidays.sort((a, b) => a.date.localeCompare(b.date)),
      total_holidays: holidays.length,
      by_type: {
        public: holidays.filter(h => h.type === 'public').length,
        regional: holidays.filter(h => h.type === 'regional').length,
        company: holidays.filter(h => h.type === 'company').length
      },
      last_updated: new Date().toISOString()
    };
  }
}