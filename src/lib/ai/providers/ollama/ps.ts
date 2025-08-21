/**
 * Utilities for querying Ollama's running models via /api/ps
 */

export interface OllamaPsModel {
  name: string;
  model?: string;
}

export interface OllamaPsResponse {
  models: OllamaPsModel[];
}

/**
 * Return a list of currently running model names from an Ollama server.
 */
export async function getOllamaRunningModels(
  baseUrl = 'http://localhost:11434'
): Promise<string[]> {
  const normalizedBase = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
  const url = `${normalizedBase}/api/ps`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = (await res.json()) as OllamaPsResponse;
    return Array.isArray(data?.models) ? data.models.map(m => m.name).filter(Boolean) : [];
  } catch {
    return [];
  }
}
