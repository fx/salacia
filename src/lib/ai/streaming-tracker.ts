/**
 * Streaming response tracker for database logging.
 * Wraps streaming responses to capture the complete content and update the database.
 *
 * @module StreamingTracker
 */

import type { AnthropicResponse } from './types';
import { updateAiInteraction } from '../services/message-logger';
import { createLogger } from '../utils/logger';

const logger = createLogger('StreamingTracker');

/**
 * Interface for tracking streaming response state.
 */
interface StreamingState {
  id?: string;
  type?: string;
  role?: string;
  model?: string;
  content: Array<{ type: string; text: string }>;
  stop_reason?: string;
  stop_sequence?: string | null;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Creates a tracking wrapper around a streaming response that captures
 * the complete response data and updates the database when finished.
 *
 * @param stream - The original streaming response
 * @param interactionId - The database interaction ID to update
 * @returns A new ReadableStream that tracks the response
 */
export function createTrackingStream(
  stream: ReadableStream,
  interactionId: string
): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // State to track the complete response
  const state: StreamingState = {
    content: [],
    usage: {},
  };

  const currentContentBlock = { value: '' };

  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Stream finished, update database with complete response
            await updateDatabaseWithCompleteResponse(interactionId, state);
            controller.close();
            break;
          }

          // Forward the chunk to the client
          controller.enqueue(value);

          // Parse and track the streaming events
          const chunk = decoder.decode(value, { stream: true });
          parseStreamingChunk(chunk, state, currentContentBlock);
        }
      } catch (error) {
        logger.error('Error in streaming tracker:', error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },

    cancel() {
      // If stream is cancelled, still try to update what we have
      updateDatabaseWithCompleteResponse(interactionId, state).catch(error => {
        logger.error('Failed to update database on stream cancel:', error);
      });
    },
  });
}

/**
 * Parses individual streaming chunks to extract response data.
 */
function parseStreamingChunk(
  chunk: string,
  state: StreamingState,
  currentContentBlockRef: { value: string }
): void {
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));

        switch (data.type) {
          case 'message_start':
            state.id = data.message.id;
            state.type = data.message.type;
            state.role = data.message.role;
            state.model = data.message.model;
            state.usage.input_tokens = data.message.usage?.input_tokens;
            break;

          case 'content_block_start':
            if (data.content_block?.type === 'text') {
              currentContentBlockRef.value = '';
            }
            break;

          case 'content_block_delta':
            if (data.delta?.type === 'text_delta') {
              currentContentBlockRef.value += data.delta.text;
            }
            break;

          case 'content_block_stop':
            if (currentContentBlockRef.value) {
              state.content.push({
                type: 'text',
                text: currentContentBlockRef.value,
              });
              currentContentBlockRef.value = '';
            }
            break;

          case 'message_delta':
            if (data.delta?.stop_reason) {
              state.stop_reason = data.delta.stop_reason;
            }
            if (data.delta?.stop_sequence !== undefined) {
              state.stop_sequence = data.delta.stop_sequence;
            }
            if (data.usage?.output_tokens !== undefined) {
              state.usage.output_tokens = data.usage.output_tokens;
            }
            break;

          case 'message_stop':
            // Message is complete
            break;
        }
      } catch (parseError) {
        // Ignore malformed JSON chunks
        logger.debug('Failed to parse streaming chunk:', parseError);
      }
    }
  }
}

/**
 * Updates the database with the complete response data.
 */
async function updateDatabaseWithCompleteResponse(
  interactionId: string,
  state: StreamingState
): Promise<void> {
  try {
    // Construct the complete Anthropic response format
    const response: AnthropicResponse = {
      id: state.id || 'unknown',
      type: 'message',
      role: 'assistant',
      content: state.content,
      model: state.model || 'unknown',
      stop_reason: (state.stop_reason as any) || 'end_turn',
      stop_sequence: state.stop_sequence || null,
      usage: {
        input_tokens: state.usage.input_tokens || 0,
        output_tokens: state.usage.output_tokens || 0,
      },
    };

    await updateAiInteraction({
      interactionId,
      response,
    });

    logger.debug('Updated database with streaming response:', {
      interactionId,
      contentLength: state.content.reduce((acc, block) => acc + block.text.length, 0),
      outputTokens: state.usage.output_tokens,
    });
  } catch (error) {
    logger.error('Failed to update database with streaming response:', error);
  }
}