import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
  Resource,
  Prompt
} from '@modelcontextprotocol/sdk/types.js';
import { PersonioClient } from './api/client.js';
import { CacheManager } from './utils/cache.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { formatError } from './utils/errors.js';

// Import tool handlers
import { EmployeeTools } from './tools/employees.js';
import { AbsenceTools } from './tools/absences.js';
import { AttendanceTools } from './tools/attendance.js';
import { DocumentTools } from './tools/documents.js';

// Import resource handlers
import { EmployeeResources } from './resources/employees.js';
import { OrganizationResources } from './resources/organization.js';
import { PolicyResources } from './resources/policies.js';

export class PersonioMCPServer {
  private server: Server;
  private client: PersonioClient;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  
  // Tool handlers
  private employeeTools: EmployeeTools;
  private absenceTools: AbsenceTools;
  private attendanceTools: AttendanceTools;
  private documentTools: DocumentTools;
  
  // Resource handlers
  private employeeResources: EmployeeResources;
  private organizationResources: OrganizationResources;
  private policyResources: PolicyResources;

  constructor(config: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    baseUrl?: string;
    cache?: {
      employeesTTL?: number;
      organizationTTL?: number;
      policiesTTL?: number;
    };
    rateLimit?: {
      requestsPerMinute?: number;
      burstLimit?: number;
    };
  }) {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'personio-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    // Initialize dependencies
    this.client = new PersonioClient(config);
    this.cache = new CacheManager(config.cache);
    this.rateLimiter = new RateLimiter(
      config.rateLimit?.requestsPerMinute,
      config.rateLimit?.burstLimit
    );

    // Initialize tool handlers
    this.employeeTools = new EmployeeTools(this.client, this.cache, this.rateLimiter);
    this.absenceTools = new AbsenceTools(this.client, this.cache, this.rateLimiter);
    this.attendanceTools = new AttendanceTools(this.client, this.cache, this.rateLimiter);
    this.documentTools = new DocumentTools(this.client, this.cache, this.rateLimiter);

    // Initialize resource handlers
    this.employeeResources = new EmployeeResources(this.client, this.cache, this.rateLimiter);
    this.organizationResources = new OrganizationResources(this.client, this.cache, this.rateLimiter);
    this.policyResources = new PolicyResources(this.client, this.cache, this.rateLimiter);

    // Set up request handlers
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getAllTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.handleToolCall(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        const formattedError = formatError(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${formattedError.message}\nCode: ${formattedError.code}`
            }
          ],
          isError: true
        };
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: this.getAllResources()
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const result = await this.handleResourceRead(uri);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        const formattedError = formatError(error);
        throw new Error(`${formattedError.code}: ${formattedError.message}`);
      }
    });

    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: this.getAllPrompts()
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;
      const prompt = this.getAllPrompts().find(p => p.name === name);
      
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
      }

      return { ...prompt };
    });
  }

  private getAllTools(): Tool[] {
    return [
      ...this.employeeTools.getTools(),
      ...this.absenceTools.getTools(),
      ...this.attendanceTools.getTools(),
      ...this.documentTools.getTools()
    ];
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    // Route to appropriate handler
    if (name.startsWith('employee_') || name === 'list_employees' || name === 'search_employees') {
      return this.employeeTools.handleToolCall(name, args);
    }
    if (name.startsWith('absence_') || name === 'list_absences' || name === 'create_absence_request') {
      return this.absenceTools.handleToolCall(name, args);
    }
    if (name.startsWith('attendance_') || name === 'list_attendances' || name === 'create_attendance') {
      return this.attendanceTools.handleToolCall(name, args);
    }
    if (name.startsWith('document_') || name === 'list_documents' || name === 'upload_document') {
      return this.documentTools.handleToolCall(name, args);
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  private getAllResources(): Resource[] {
    return [
      ...this.employeeResources.getResources(),
      ...this.organizationResources.getResources(),
      ...this.policyResources.getResources()
    ];
  }

  private async handleResourceRead(uri: string): Promise<any> {
    if (uri.startsWith('personio://employees')) {
      return this.employeeResources.handleResourceRead(uri);
    }
    if (uri.startsWith('personio://organization')) {
      return this.organizationResources.handleResourceRead(uri);
    }
    if (uri.startsWith('personio://policies')) {
      return this.policyResources.handleResourceRead(uri);
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  private getAllPrompts(): Prompt[] {
    return [
      {
        name: 'absence_request',
        description: 'Create a well-formatted absence request',
        arguments: [
          {
            name: 'employee_name',
            description: 'Name of the employee',
            required: true
          },
          {
            name: 'start_date',
            description: 'Start date of absence',
            required: true
          },
          {
            name: 'end_date',
            description: 'End date of absence',
            required: true
          },
          {
            name: 'reason',
            description: 'Reason for absence',
            required: false
          }
        ]
      },
      {
        name: 'performance_review',
        description: 'Generate a performance review template',
        arguments: [
          {
            name: 'employee_name',
            description: 'Name of the employee',
            required: true
          },
          {
            name: 'review_period',
            description: 'Period being reviewed',
            required: true
          }
        ]
      }
    ];
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Personio MCP server started');
  }

  async stop(): Promise<void> {
    await this.client.disconnect();
    console.error('Personio MCP server stopped');
  }
}