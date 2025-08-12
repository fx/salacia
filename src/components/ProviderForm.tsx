import React, { useState, useEffect } from 'react';

/**
 * Provider data interface
 */
interface Provider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  baseUrl?: string;
  models?: string[];
  settings?: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data interface
 */
interface FormData {
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string;
  models: string;
  isActive: boolean;
  isDefault: boolean;
}

/**
 * Props for ProviderForm component
 */
interface ProviderFormProps {
  provider?: Provider | null;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Provider form component for creating and editing AI providers.
 * Handles validation, submission, and error display.
 */
export function ProviderForm({ provider, onSubmit, onCancel }: ProviderFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'openai',
    apiKey: '',
    baseUrl: '',
    models: '',
    isActive: true,
    isDefault: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider type options
  const providerTypes = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'groq', label: 'Groq' },
  ];

  // Populate form data when editing
  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        type: provider.type,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || '',
        models: Array.isArray(provider.models) ? provider.models.join(', ') : '',
        isActive: provider.isActive,
        isDefault: provider.isDefault,
      });
    }
  }, [provider]);

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // Clear error on input
  };

  /**
   * Validate form data
   */
  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Provider name is required';
    }
    if (!formData.type) {
      return 'Provider type is required';
    }
    if (!formData.apiKey.trim()) {
      return 'API key is required';
    }
    if (formData.baseUrl && !isValidUrl(formData.baseUrl)) {
      return 'Base URL must be a valid URL';
    }
    return null;
  };

  /**
   * Check if string is a valid URL
   */
  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare submission data
      const submitData = {
        name: formData.name.trim(),
        type: formData.type,
        apiKey: formData.apiKey.trim(),
        baseUrl: formData.baseUrl.trim() || undefined,
        models: formData.models.trim()
          ? formData.models
              .split(',')
              .map(model => model.trim())
              .filter(model => model)
          : undefined,
        isActive: formData.isActive,
        isDefault: formData.isDefault,
      };

      const url = provider ? `/api/providers/${provider.id}` : '/api/providers';
      const method = provider ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        onSubmit();
      } else {
        setError(result.error || 'Failed to save provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div data-box="square" data-gap="2">
        {error && (
          <div data-box="square" variant="red">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div data-gap="1">
          <label htmlFor="name">
            <strong>Provider Name *</strong>
          </label>
          <input
            id="name"
            type="text"
            className="wui-input"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="e.g., OpenAI GPT-4"
            required
          />
          <small>A unique display name for this provider</small>
        </div>

        <div data-gap="1">
          <label htmlFor="type">
            <strong>Provider Type *</strong>
          </label>
          <select
            id="type"
            className="wui-input"
            value={formData.type}
            onChange={e => handleChange('type', e.target.value)}
            required
          >
            {providerTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <small>Select the AI provider service type</small>
        </div>

        <div data-gap="1">
          <label htmlFor="apiKey">
            <strong>API Key *</strong>
          </label>
          <input
            id="apiKey"
            type="password"
            className="wui-input"
            value={formData.apiKey}
            onChange={e => handleChange('apiKey', e.target.value)}
            placeholder="Enter your API key"
            required
          />
          <small>Your authentication key for this provider</small>
        </div>

        <div data-gap="1">
          <label htmlFor="baseUrl">
            <strong>Base URL</strong>
          </label>
          <input
            id="baseUrl"
            type="url"
            className="wui-input"
            value={formData.baseUrl}
            onChange={e => handleChange('baseUrl', e.target.value)}
            placeholder="e.g., https://api.openai.com/v1"
          />
          <small>Optional custom API endpoint URL</small>
        </div>

        <div data-gap="1">
          <label htmlFor="models">
            <strong>Available Models</strong>
          </label>
          <input
            id="models"
            type="text"
            className="wui-input"
            value={formData.models}
            onChange={e => handleChange('models', e.target.value)}
            placeholder="e.g., gpt-4, gpt-3.5-turbo"
          />
          <small>Comma-separated list of available models</small>
        </div>

        <div data-gap="1">
          <label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => handleChange('isActive', e.target.checked)}
            />
            <strong> Active</strong>
          </label>
          <small>Whether this provider is available for use</small>
        </div>

        <div data-gap="1">
          <label>
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={e => handleChange('isDefault', e.target.checked)}
            />
            <strong> Set as Default</strong>
          </label>
          <small>Make this the default provider for new requests</small>
        </div>

        <div data-align="end" data-gap="1">
          <button type="button" onClick={onCancel} className="wui-button" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="wui-button" disabled={loading}>
            {loading ? 'Saving...' : provider ? 'Update Provider' : 'Create Provider'}
          </button>
        </div>
      </div>
    </form>
  );
}
