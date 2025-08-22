/**
 * Model family detection and configuration utilities
 */

export type ModelFamily = 'qwen' | 'llama' | 'claude' | 'gpt' | 'mixtral' | 'unknown';

/**
 * Detect the model family from a model ID
 */
export function detectModelFamily(modelId: string): ModelFamily {
  const normalizedId = modelId.toLowerCase();

  if (normalizedId.includes('qwen')) {
    return 'qwen';
  }
  if (normalizedId.includes('llama') || normalizedId.includes('meta-llama')) {
    return 'llama';
  }
  if (normalizedId.includes('claude')) {
    return 'claude';
  }
  if (normalizedId.includes('gpt')) {
    return 'gpt';
  }
  if (normalizedId.includes('mixtral') || normalizedId.includes('mistral')) {
    return 'mixtral';
  }

  return 'unknown';
}

/**
 * Get model-specific system prompt additions for Claude-style tool calling
 */
export function getModelFamilySystemPrompt(modelFamily: ModelFamily): string | null {
  switch (modelFamily) {
    case 'qwen':
      // Qwen needs explicit instructions for Claude-style tool calling
      return `CRITICAL INSTRUCTIONS FOR TOOL USE:

When you need to use a tool, you MUST follow this EXACT format:

1. First, write any reasoning or response text if needed
2. Then use this EXACT XML-like format for each tool call:

<function_calls>
<invoke name="ToolName">
<parameter name="param1">value1</parameter>
<parameter name="param2">value2</parameter>
</invoke>
</function_calls>

IMPORTANT RULES:
- Replace "ToolName" with the actual tool name (e.g., "Read", "Bash", "Edit")
- Replace "param1", "param2" with actual parameter names
- Replace "value1", "value2" with actual values
- Extract ALL required parameters from the user's request
- If reading a file, extract the file_path parameter
- If running a command, extract the command parameter
- ALWAYS include all required parameters with their values

Example for reading a file:
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.txt</parameter>
</invoke>
</function_calls>

Example for running a command:
<function_calls>
<invoke name="Bash">
<parameter name="command">ls -la</parameter>
</invoke>
</function_calls>

Remember: You MUST extract and include the actual parameter values from the user's request!`;

    case 'llama':
      // Llama models may benefit from similar instructions
      return `When using tools, follow this format:

<function_calls>
<invoke name="ToolName">
<parameter name="param_name">value</parameter>
</invoke>
</function_calls>

Extract all required parameters from the user's request.`;

    case 'claude':
      // Claude models already understand the format natively
      return null;

    case 'gpt':
      // GPT models typically handle function calling well
      return null;

    case 'mixtral':
      // Mixtral may need some guidance
      return `For tool use, follow this XML format:

<function_calls>
<invoke name="ToolName">
<parameter name="param">value</parameter>
</invoke>
</function_calls>`;

    case 'unknown':
    default:
      // For unknown models, provide basic instructions
      return `When using tools, use this XML format:

<function_calls>
<invoke name="ToolName">
<parameter name="param">value</parameter>
</invoke>
</function_calls>`;
  }
}

/**
 * Check if a model family needs system prompt augmentation
 */
export function needsSystemPromptAugmentation(modelFamily: ModelFamily): boolean {
  return modelFamily !== 'claude' && modelFamily !== 'gpt';
}
