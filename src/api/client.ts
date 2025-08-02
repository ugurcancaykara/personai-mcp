import axios, { AxiosInstance, AxiosError } from 'axios';
import { PersonioAuth } from './auth.js';
import {
  PersonioApiResponse,
  PersonioEmployee,
  PersonioAbsence,
  PersonioAttendance,
  PersonioDocument,
  PersonioEmployeeParams,
  PersonioAbsenceParams,
  PersonioPaginationParams
} from './types.js';

export class PersonioApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'PersonioApiError';
  }
}

export class PersonioClient {
  private auth: PersonioAuth;
  private axios: AxiosInstance;
  private baseUrl: string;

  constructor(config: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    baseUrl?: string;
  }) {
    this.baseUrl = config.baseUrl || 'https://api.personio.de';
    this.auth = new PersonioAuth(config);
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000
    });

    // Add auth interceptor
    this.axios.interceptors.request.use(async (config) => {
      const headers = await this.auth.getAuthHeaders();
      Object.assign(config.headers, headers);
      return config;
    });

    // Add error interceptor
    this.axios.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = (data as any)?.error?.message || 'Unknown error';
      const errorCode = (data as any)?.error?.code;
      throw new PersonioApiError(status, errorMessage, errorCode);
    } else if (error.request) {
      throw new PersonioApiError(0, 'Network error occurred', 'NETWORK_ERROR');
    } else {
      throw new PersonioApiError(0, error.message, 'REQUEST_ERROR');
    }
  }

  // Employee Methods
  async getEmployees(params?: PersonioEmployeeParams): Promise<PersonioEmployee[]> {
    const response = await this.axios.get<PersonioApiResponse<PersonioEmployee[]>>('/v1/company/employees', {
      params
    });
    return response.data.data;
  }

  async getEmployee(id: number, attributes?: string[]): Promise<PersonioEmployee> {
    const response = await this.axios.get<PersonioApiResponse<PersonioEmployee>>(
      `/v1/company/employees/${id}`,
      { params: { attributes } }
    );
    return response.data.data;
  }

  async updateEmployee(id: number, data: Partial<PersonioEmployee['attributes']>): Promise<PersonioEmployee> {
    const response = await this.axios.patch<PersonioApiResponse<PersonioEmployee>>(
      `/v1/company/employees/${id}`,
      { employee: data }
    );
    return response.data.data;
  }

  async getEmployeeAbsenceBalance(employeeId: number): Promise<any> {
    const response = await this.axios.get<PersonioApiResponse<any>>(
      `/v1/company/employees/${employeeId}/absences/balance`
    );
    return response.data.data;
  }

  // Absence Methods
  async getAbsences(params?: PersonioAbsenceParams): Promise<PersonioAbsence[]> {
    const response = await this.axios.get<PersonioApiResponse<PersonioAbsence[]>>('/v1/company/time-offs', {
      params
    });
    return response.data.data;
  }

  async createAbsence(data: {
    employee_id: number;
    time_off_type_id: number;
    start_date: string;
    end_date: string;
    half_day_start?: boolean;
    half_day_end?: boolean;
    comment?: string;
  }): Promise<PersonioAbsence> {
    const response = await this.axios.post<PersonioApiResponse<PersonioAbsence>>(
      '/v1/company/absence-periods',
      data
    );
    return response.data.data;
  }

  async deleteAbsence(id: number): Promise<void> {
    await this.axios.delete(`/v1/company/absence-periods/${id}`);
  }

  // Attendance Methods
  async getAttendances(params?: {
    start_date?: string;
    end_date?: string;
    employees?: number[];
    projects?: number[];
  } & PersonioPaginationParams): Promise<PersonioAttendance[]> {
    const response = await this.axios.get<PersonioApiResponse<PersonioAttendance[]>>('/v1/company/attendances', {
      params
    });
    return response.data.data;
  }

  async createAttendance(data: {
    employee: number;
    date: string;
    start_time: string;
    end_time: string;
    break?: number;
    comment?: string;
    project_id?: number;
  }): Promise<PersonioAttendance> {
    const response = await this.axios.post<PersonioApiResponse<PersonioAttendance>>(
      '/v1/company/attendances',
      data
    );
    return response.data.data;
  }

  async updateAttendance(id: number, data: Partial<PersonioAttendance>): Promise<PersonioAttendance> {
    const response = await this.axios.patch<PersonioApiResponse<PersonioAttendance>>(
      `/v1/company/attendances/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteAttendance(id: number): Promise<void> {
    await this.axios.delete(`/v1/company/attendances/${id}`);
  }

  // Document Methods
  async getDocumentCategories(): Promise<any[]> {
    const response = await this.axios.get<PersonioApiResponse<any[]>>('/v1/company/document-categories');
    return response.data.data;
  }

  async uploadDocument(employeeId: number, categoryId: number, file: Buffer, fileName: string): Promise<PersonioDocument> {
    const formData = new FormData();
    formData.append('employee_id', employeeId.toString());
    formData.append('category_id', categoryId.toString());
    formData.append('file', new Blob([file]), fileName);

    const response = await this.axios.post<PersonioApiResponse<PersonioDocument>>(
      '/v1/company/documents',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data.data;
  }

  // Utility Methods
  async getCustomAttributes(): Promise<any[]> {
    const response = await this.axios.get<PersonioApiResponse<any[]>>('/v1/company/employees/custom-attributes');
    return response.data.data;
  }

  async getProjects(): Promise<any[]> {
    const response = await this.axios.get<PersonioApiResponse<any[]>>('/v1/company/attendances/projects');
    return response.data.data;
  }

  // Clean up
  async disconnect(): Promise<void> {
    await this.auth.revokeToken();
  }
}