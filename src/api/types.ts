// Personio API Types

export interface PersonioAuthToken {
  success: boolean;
  data: {
    token: string;
    expires_in: number;
  };
}

export interface PersonioEmployee {
  type: 'Employee';
  attributes: {
    id: {
      label: string;
      value: number;
      type: 'integer';
    };
    first_name: {
      label: string;
      value: string;
      type: 'standard';
    };
    last_name: {
      label: string;
      value: string;
      type: 'standard';
    };
    email: {
      label: string;
      value: string;
      type: 'standard';
    };
    department?: {
      label: string;
      value: {
        type: 'Department';
        attributes: {
          id: number;
          name: string;
        };
      };
      type: 'standard';
    };
    position?: {
      label: string;
      value: string;
      type: 'standard';
    };
    status?: {
      label: string;
      value: string;
      type: 'standard';
    };
    [key: string]: any; // Allow custom attributes
  };
}

export interface PersonioAbsence {
  id: number;
  status: 'approved' | 'pending' | 'rejected' | 'canceled';
  comment?: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_start: boolean;
  half_day_end: boolean;
  time_off_type: {
    id: number;
    name: string;
    category: string;
  };
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PersonioAttendance {
  id: number;
  employee: number;
  date: string;
  start_time: string;
  end_time: string;
  break: number;
  comment?: string;
  project?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PersonioDocument {
  id: string;
  employee_id: number;
  category: {
    id: number;
    name: string;
  };
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

export interface PersonioApiResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    current_page?: number;
    total_pages?: number;
    total_elements?: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface PersonioPaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface PersonioEmployeeParams extends PersonioPaginationParams {
  attributes?: string[];
  updated_since?: string;
}

export interface PersonioAbsenceParams extends PersonioPaginationParams {
  start_date?: string;
  end_date?: string;
  employees?: number[];
  status?: 'approved' | 'pending' | 'rejected' | 'canceled';
  time_off_types?: number[];
}