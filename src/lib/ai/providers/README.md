# AI Provider Custom Implementations

This directory contains provider-specific implementations that bypass the Vercel AI SDK.

## When to Create a Custom Provider

Create a custom provider implementation when:

- The provider uses OAuth authentication
- Special headers need to be controlled precisely
- System prompts need to be injected
- The API has non-standard behaviors
- The Vercel AI SDK doesn't support required features

## Architecture

Each provider should have its own directory with at least:

- `client.ts` - The main client implementation

Example structure:

```
providers/
├── anthropic/
│   └── client.ts    # AnthropicClient for OAuth/spoofing
├── openai/          # Future custom OpenAI implementation
│   └── client.ts
└── index.ts         # Export all providers
```

## Implementation Guidelines

Custom providers should:

1. Implement API calls using `fetch`
2. Handle both regular and streaming responses
3. Include proper error handling and logging
4. Document why SDK bypass is necessary
5. Follow the same interface patterns for consistency

## Current Implementations

### Anthropic (`anthropic/client.ts`)

Bypasses SDK to:

- Handle OAuth Bearer tokens
- Spoof Claude Code with specific headers
- Inject "You are Claude Code" system prompts
- Control exact API request format
