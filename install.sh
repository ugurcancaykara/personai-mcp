#!/bin/bash

echo "🚀 Personio MCP Server Installation"
echo "=================================="

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your Personio credentials"
fi

# Create symlink for global access (optional)
echo ""
echo "Installation complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Personio credentials"
echo "2. Add to Claude Desktop config:"
echo "   - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   - Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo "   - Linux: ~/.config/Claude/claude_desktop_config.json"
echo ""
echo "Example config:"
echo '{'
echo '  "mcpServers": {'
echo '    "personio": {'
echo '      "command": "node",'
echo "      \"args\": [\"$(pwd)/dist/index.js\"],"
echo '      "env": {'
echo '        "PERSONIO_CLIENT_ID": "your_client_id",'
echo '        "PERSONIO_CLIENT_SECRET": "your_client_secret"'
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "For more information, see README.md"