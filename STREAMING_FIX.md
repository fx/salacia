# Anthropic Streaming Proxy Fix

## Problem

The Anthropic streaming proxy was not returning verbatim responses from the Anthropic API. This caused issues with Claude Code tool execution, as the responses were being altered or corrupted during the streaming process.

## Root Cause

1. **Stream Consumption**: The original stream from Anthropic was being consumed and potentially modified by the tracking wrapper
2. **Text Decoding Issues**: UTF-8 characters spanning multiple chunks could cause corruption during the decode/re-encode process
3. **Processing Order**: The tracking logic was interfering with the raw stream forwarding

## Solution

### 1. AnthropicClient Enhancement (`src/lib/ai/providers/anthropic/client.ts`)

- Added explicit null check for `response.body`
- Ensured we return the raw `ReadableStream` directly from the fetch response
- Added better error handling for missing response body

### 2. Streaming Tracker Rewrite (`src/lib/ai/streaming-tracker.ts`)

**Key Changes:**

- **Priority Forwarding**: The original chunk is forwarded to the client FIRST via `controller.enqueue(value)` before any processing
- **Separate Parsing**: Text decoding and parsing for database logging happens separately and doesn't affect the stream
- **Line Buffering**: Process only complete lines to avoid parsing partial JSON that could cause errors
- **Error Isolation**: If parsing fails, the stream continues forwarding unaffected

**Critical Flow:**

```typescript
// CRITICAL: Forward the exact chunk to the client first, unmodified
controller.enqueue(value);

// Parse and track the streaming events for database logging only
// Use a separate decode operation that doesn't interfere with the stream
try {
  const chunkText = decoder.decode(value, { stream: true });
  // ... parsing logic for database tracking
} catch (parseError) {
  // If parsing fails, continue forwarding the stream without tracking
  logger.debug('Failed to parse chunk for tracking (stream continues):', parseError);
}
```

## Result

- ✅ Stream responses are now verbatim from Anthropic API
- ✅ Claude Code tool execution works correctly
- ✅ Database tracking still functions for logging
- ✅ No corruption of UTF-8 characters across chunks
- ✅ Graceful error handling that doesn't break streaming

## Testing

Run the streaming tests to verify the fix:

```bash
npm test -- --run src/test/streaming-database-tracking.test.ts
npm test -- --run src/test/api-messages.test.ts
```

For manual testing with tool execution:

```bash
node test-streaming-fix.js
```

## Technical Notes

The key insight was that **streaming responses must be treated as immutable byte streams**. Any processing for logging or tracking must happen in parallel without affecting the original stream. The tracking wrapper now acts as a "tee" that forwards the original stream unchanged while extracting data for database logging on the side.
