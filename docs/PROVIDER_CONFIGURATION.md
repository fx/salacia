# Provider Configuration

This document explains how to configure AI providers for the Salacia API server.

## Quick Start

The simplest way to configure a provider is through environment variables:

```bash
# For Anthropic Claude
ANTHROPIC_API_KEY=your-api-key npm run dev

# For OpenAI
OPENAI_API_KEY=your-api-key npm run dev

# For Groq
GROQ_API_KEY=your-api-key npm run dev
```

## Supported Providers

### 1. Anthropic (Claude)

Set the `ANTHROPIC_API_KEY` environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
npm run dev
```

Or in `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### 2. OpenAI

Set the `OPENAI_API_KEY` environment variable:

```bash
export OPENAI_API_KEY=sk-xxxxx
npm run dev
```

Or in `.env`:
```env
OPENAI_API_KEY=sk-xxxxx
```

### 3. Groq

Set the `GROQ_API_KEY` environment variable:

```bash
export GROQ_API_KEY=gsk_xxxxx
npm run dev
```

Or in `.env`:
```env
GROQ_API_KEY=gsk_xxxxx
```

## Database Provider Configuration

For production environments, providers can also be configured in the database through the `ai_providers` table. This allows for:

- Multiple provider configurations
- Provider-specific settings
- Fallback providers
- Dynamic provider switching

Example database configuration:

```sql
INSERT INTO ai_providers (
  name, 
  type, 
  api_key, 
  is_active, 
  is_default
) VALUES (
  'Primary Anthropic',
  'anthropic',
  'sk-ant-api03-xxxxx',
  true,
  true
);
```

## Testing with Claude Code

Once a provider is configured, you can test the integration with Claude Code:

```bash
# Set Claude to use your local API
export ANTHROPIC_BASE_URL=http://localhost:4321/api

# Run Claude with a test prompt
echo "What is 2 + 2?" | claude
```

## Running E2E Tests

To run the E2E tests with a configured provider:

```bash
# Start the server with a provider
ANTHROPIC_API_KEY=your-key npm run dev

# In another terminal, run the tests
npm test -- src/test/claude-code-e2e.test.ts
```

## Troubleshooting

### Error: "No AI provider configured"

This means no provider API key was found. Solutions:

1. Set one of the environment variables listed above
2. Check that your `.env` file is in the project root
3. Ensure the environment variable is exported before starting the server

### Error: "invalid x-api-key"

This means the API key is invalid or expired. Get a new key from your provider:

- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys
- Groq: https://console.groq.com/

### Error: Database connection failed

The database is optional for provider configuration. You can ignore database errors if using environment variables for providers.

## Security Notes

- Never commit API keys to version control
- Use `.env` files for local development (already in `.gitignore`)
- Use environment variables or secure vaults in production
- Rotate API keys regularly