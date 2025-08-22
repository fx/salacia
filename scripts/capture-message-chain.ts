#!/usr/bin/env tsx
import { Sequelize, Op, DataTypes } from 'sequelize';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelizeConfig } from '../src/lib/db/sequelize-config';
import { AiInteraction } from '../src/lib/db/models/AiInteraction';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MessageChainSnapshot {
  startMessageId: string;
  capturedAt: Date;
  messages: Array<{
    id: string;
    model: string;
    createdAt: Date;
    request: unknown;
    response: unknown;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    responseTimeMs?: number;
    statusCode?: number;
    error?: string;
  }>;
  metadata: {
    totalMessages: number;
    totalTokens: number;
    totalResponseTime: number;
    hasErrors: boolean;
  };
}

async function captureMessageChain(messageId: string): Promise<MessageChainSnapshot> {
  const sequelize = new Sequelize(sequelizeConfig.connectionString, {
    dialect: sequelizeConfig.dialect,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database');

    // Initialize the model with the sequelize instance
    AiInteraction.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
        },
        providerId: {
          type: DataTypes.UUID,
          field: 'provider_id',
        },
        model: {
          type: DataTypes.STRING(100),
        },
        request: {
          type: DataTypes.JSONB,
        },
        response: {
          type: DataTypes.JSONB,
        },
        promptTokens: {
          type: DataTypes.INTEGER,
          field: 'prompt_tokens',
        },
        completionTokens: {
          type: DataTypes.INTEGER,
          field: 'completion_tokens',
        },
        totalTokens: {
          type: DataTypes.INTEGER,
          field: 'total_tokens',
        },
        responseTimeMs: {
          type: DataTypes.INTEGER,
          field: 'response_time_ms',
        },
        statusCode: {
          type: DataTypes.INTEGER,
          field: 'status_code',
        },
        error: {
          type: DataTypes.TEXT,
        },
        createdAt: {
          type: DataTypes.DATE,
          field: 'created_at',
        },
      },
      {
        sequelize,
        tableName: 'ai_interactions',
        timestamps: false,
      }
    );

    // Get the starting message
    const startMessage = await AiInteraction.findByPk(messageId);
    
    if (!startMessage) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    console.log(`✓ Found starting message: ${startMessage.id}`);
    console.log(`  Model: ${startMessage.model}`);
    console.log(`  Created: ${startMessage.createdAt}`);

    // Get all messages in the chain
    // Look for messages until we find end_turn
    const messages: AiInteraction[] = [startMessage];
    let currentMessage = startMessage;
    let foundEndTurn = false;

    // Check if the request or response contains end_turn
    const hasEndTurn = (data: unknown): boolean => {
      const str = JSON.stringify(data);
      return str.includes('end_turn') || str.includes('stop_reason');
    };

    // Keep fetching messages until we find end_turn
    while (!foundEndTurn) {
      // Get the next message after the current one
      const nextMessage = await AiInteraction.findOne({
        where: {
          createdAt: {
            [Op.gt]: currentMessage.createdAt,
          },
        },
        order: [['created_at', 'ASC']],
      });

      if (!nextMessage) {
        console.log('  No more messages found, ending chain');
        break;
      }

      messages.push(nextMessage);
      currentMessage = nextMessage;

      // Check if this message has end_turn in response
      if (nextMessage.response && hasEndTurn(nextMessage.response)) {
        foundEndTurn = true;
        console.log(`  Found end_turn in message ${nextMessage.id}`);
      }
    }

    console.log(`✓ Captured ${messages.length} messages in chain`);

    // Calculate metadata
    let totalTokens = 0;
    let totalResponseTime = 0;
    let hasErrors = false;

    for (const msg of messages) {
      if (msg.totalTokens) totalTokens += msg.totalTokens;
      if (msg.responseTimeMs) totalResponseTime += msg.responseTimeMs;
      if (msg.error) hasErrors = true;
    }

    // Create snapshot
    const snapshot: MessageChainSnapshot = {
      startMessageId: messageId,
      capturedAt: new Date(),
      messages: messages.map((msg) => ({
        id: msg.id,
        model: msg.model,
        createdAt: msg.createdAt,
        request: msg.request,
        response: msg.response,
        promptTokens: msg.promptTokens,
        completionTokens: msg.completionTokens,
        totalTokens: msg.totalTokens,
        responseTimeMs: msg.responseTimeMs,
        statusCode: msg.statusCode,
        error: msg.error,
      })),
      metadata: {
        totalMessages: messages.length,
        totalTokens,
        totalResponseTime,
        hasErrors,
      },
    };

    // Save to file
    const outputDir = path.join(__dirname, 'data');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Use descriptive name if provided as second argument, otherwise use message ID
    const fileName = process.argv[3] || messageId;
    const outputFile = path.join(outputDir, `message-chain-${fileName}.json`);
    await fs.writeFile(outputFile, JSON.stringify(snapshot, null, 2));
    
    console.log(`✓ Snapshot saved to: ${outputFile}`);
    console.log(`\nSnapshot Summary:`);
    console.log(`  Total messages: ${snapshot.metadata.totalMessages}`);
    console.log(`  Total tokens: ${snapshot.metadata.totalTokens}`);
    console.log(`  Total response time: ${snapshot.metadata.totalResponseTime}ms`);
    console.log(`  Has errors: ${snapshot.metadata.hasErrors}`);

    return snapshot;
  } finally {
    await sequelize.close();
  }
}

// Main execution
async function main() {
  const messageId = process.argv[2];
  
  if (!messageId) {
    console.error('Usage: tsx capture-message-chain.ts <message-id> [output-name]');
    console.error('Example: tsx capture-message-chain.ts b0f5bba1-2d10-440e-b35e-2b1109b9899f simple-read-file');
    process.exit(1);
  }

  try {
    await captureMessageChain(messageId);
  } catch (error) {
    console.error('Error capturing message chain:', error);
    process.exit(1);
  }
}

// Run if executed directly (only when not imported as module)
if (process.argv[1] === __filename) {
  main().catch(console.error);
}

export { captureMessageChain };
export type { MessageChainSnapshot };