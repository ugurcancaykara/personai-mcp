export class PersonioMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PersonioMCPError';
  }
}

export function formatError(error: any): { code: string; message: string; details?: any } {
  if (error instanceof PersonioMCPError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  if (error.response) {
    // Axios error
    return {
      code: `HTTP_${error.response.status}`,
      message: error.response.data?.message || error.message,
      details: error.response.data
    };
  }

  if (error.code) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred'
  };
}