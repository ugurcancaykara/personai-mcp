# Personio MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with Personio HR platform, enabling AI assistants to interact with HR data and perform various HR operations.

## Features

### 🛠️ Tools

#### Employee Management
- `list_employees` - List all employees with filtering and pagination
- `get_employee` - Get detailed information about a specific employee
- `search_employees` - Search employees by name, email, or department
- `get_employee_absence_balance` - Check remaining vacation days
- `update_employee` - Update employee information (with permissions)

#### Absence Management
- `list_absences` - View absence calendar with filters
- `create_absence_request` - Submit time-off requests
- `delete_absence` - Cancel absence requests
- `get_absence_types` - List available leave types

#### Attendance Tracking
- `list_attendances` - View attendance records
- `create_attendance` - Clock in/out entries
- `update_attendance` - Modify attendance records
- `delete_attendance` - Remove attendance entries
- `get_projects` - List projects for time tracking

#### Document Management
- `list_document_categories` - Get document types
- `upload_document` - Upload documents to employee profiles
- `upload_document_base64` - Upload documents from base64 content

### 📦 Resources

- `personio://employees/directory` - Cached employee directory
- `personio://employees/by-department` - Employees organized by department
- `personio://employees/active` - Active employees only
- `personio://organization/structure` - Organization hierarchy
- `personio://organization/departments` - Department list with stats
- `personio://organization/headcount` - Headcount statistics
- `personio://policies/absence-types` - Leave policy definitions
- `personio://policies/working-hours` - Working hours and overtime policies
- `personio://policies/holidays` - Company holiday calendar

### 💬 Prompts

- `absence_request` - Template for creating absence requests
- `performance_review` - Performance review template generator

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/personio-mcp.git
cd personio-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your Personio credentials in `.env`:

### Option 1: OAuth2 Authentication (Recommended)
```env
PERSONIO_CLIENT_ID=your_client_id_here
PERSONIO_CLIENT_SECRET=your_client_secret_here
```

### Option 2: API Key Authentication
```env
PERSONIO_API_KEY=your_api_key_here
```

### Optional Configuration
```env
# API URL (default: https://api.personio.de)
PERSONIO_API_URL=https://api.personio.de

# Cache settings (in seconds)
CACHE_TTL_EMPLOYEES=300      # 5 minutes
CACHE_TTL_ORGANIZATION=3600  # 1 hour
CACHE_TTL_POLICIES=86400     # 24 hours

# Rate limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=15
```

## Usage with Claude Desktop

1. Build the project:
```bash
npm run build
```

2. Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "personio": {
      "command": "node",
      "args": ["/path/to/personio-mcp/dist/index.js"],
      "env": {
        "PERSONIO_CLIENT_ID": "your_client_id",
        "PERSONIO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

Or if using API key:

```json
{
  "mcpServers": {
    "personio": {
      "command": "node",
      "args": ["/path/to/personio-mcp/dist/index.js"],
      "env": {
        "PERSONIO_API_KEY": "your_api_key"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Example Usage

Once connected, you can ask Claude to:

- "List all employees in the Engineering department"
- "Show me the absence requests for next month"
- "Create a vacation request for John Doe from March 1-15"
- "What's the current headcount by department?"
- "Upload the contract PDF to Sarah's employee profile"
- "Show me who clocked in late this week"
- "Get the company holiday calendar"

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## API Rate Limits

The server respects Personio's API rate limits:
- General: 60 requests per minute
- Document upload: 60 requests per minute
- Burst limit: 15 requests per second

Rate limiting is handled automatically with request queuing.

## Caching

The server implements intelligent caching to improve performance:
- Employee data: 5 minutes
- Organization structure: 1 hour
- Policies and holidays: 24 hours

Cache durations can be customized via environment variables.

## Security

- API credentials are stored securely in environment variables
- OAuth2 tokens are automatically refreshed before expiration
- All API errors are properly sanitized before returning to the client
- Rate limiting prevents API abuse

## Troubleshooting

### Authentication Errors
- Ensure your API credentials are correct
- For OAuth2, verify client ID and secret have proper permissions
- Check if your IP is whitelisted in Personio settings

### Rate Limiting
- The server automatically queues requests when rate limits are approached
- If you see 429 errors, the server will retry with exponential backoff

### Missing Data
- Some fields may require specific permissions in Personio
- Check that required employee attributes are whitelisted in your API settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [github.com/yourusername/personio-mcp/issues](https://github.com/yourusername/personio-mcp/issues)
- Personio API Docs: [developer.personio.de](https://developer.personio.de)
- MCP Documentation: [modelcontextprotocol.io](https://modelcontextprotocol.io)