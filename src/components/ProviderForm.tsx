import React, { useState, useEffect } from 'react';

/**
 * Provider data interface with OAuth support
 */
interface Provider {
  id: string;
  name: string;
  type: string;
  authType: 'api_key' | 'oauth';
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  settings?: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthTokenExpiresAt?: string;
  oauthScope?: string;
  oauthClientId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data interface with OAuth support
 */
interface FormData {
  name: string;
  type: string;
  authType: 'api_key' | 'oauth';
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
  onSubmit: (provider?: Provider) => void;
  onCancel: () => void;
}

/**
 * Provider form component for creating and editing AI providers.
 * Handles validation, submission, and error display.
 */
export function ProviderForm({ provider, onSubmit, onCancel }: ProviderFormProps) {
  // Track the current provider (either from props or newly created)
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(provider || null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'openai',
    authType: 'api_key',
    apiKey: '',
    baseUrl: '',
    models: '',
    isActive: true,
    isDefault: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCallbackInput, setShowCallbackInput] = useState(false);
  const [callbackCode, setCallbackCode] = useState('');
  const [oauthStatus, setOauthStatus] = useState<{
    hasValidTokens: boolean;
    isTokenExpired: boolean;
    expiresAt?: string;
    supportsOAuth: boolean;
  } | null>(null);

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
        authType: provider.authType || 'api_key',
        apiKey: provider.apiKey || '',
        baseUrl: provider.baseUrl || '',
        models: Array.isArray(provider.models) ? provider.models.join(', ') : '',
        isActive: provider.isActive,
        isDefault: provider.isDefault,
      });

      // Fetch OAuth status for existing providers
      if (provider.id) {
        fetchOAuthStatus(provider.id);
        // Update current provider when prop changes
        setCurrentProvider(provider);
      }
    }
  }, [provider]);

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // Clear error on input
    setSuccessMessage(null); // Clear success message on input
  };

  /**
   * Fetch OAuth status for a provider
   */
  const fetchOAuthStatus = async (providerId: string) => {
    try {
      const response = await fetch(`/api/providers/${providerId}/oauth-status`);
      const result = await response.json();
      if (result.success) {
        setOauthStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch OAuth status:', error);
    }
  };

  /**
   * Initialize OAuth flow
   */
  const handleOAuthInit = async () => {
    const activeProvider = provider || currentProvider;
    if (!activeProvider?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/providers/${activeProvider.id}/oauth-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send empty object to avoid JSON parse error
      });
      const result = await response.json();

      if (result.success && result.data.authorizationUrl) {
        // Validate the OAuth authorization URL before opening
        if (validateOAuthUrl(result.data.authorizationUrl, activeProvider)) {
          window.open(result.data.authorizationUrl, '_blank');
          // Show callback code input field
          setShowCallbackInput(true);
          setSuccessMessage(
            'Authorization page opened in new tab. After authorizing, paste the callback code below.'
          );
        } else {
          setError('Received invalid OAuth authorization URL.');
        }
      } else {
        setError(result.error || 'Failed to initialize OAuth');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle OAuth callback code submission
   */
  const handleCallbackSubmit = async () => {
    const activeProvider = provider || currentProvider;
    if (!activeProvider?.id || !callbackCode.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/providers/${activeProvider.id}/oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callbackCode: callbackCode.trim() }),
      });
      const result = await response.json();

      if (result.success) {
        setSuccessMessage('OAuth authentication successful!');
        setShowCallbackInput(false);
        setCallbackCode('');
        // Refresh OAuth status
        fetchOAuthStatus(activeProvider.id);
      } else {
        setError(result.error || 'Failed to process callback code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revoke OAuth tokens
   */
  const handleOAuthRevoke = async () => {
    const activeProvider = provider || currentProvider;
    if (!activeProvider?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/providers/${activeProvider.id}/oauth-revoke`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        setOauthStatus(null);
        // Update form to show API key mode
        setFormData(prev => ({ ...prev, authType: 'api_key' }));
      } else {
        setError(result.error || 'Failed to revoke OAuth tokens');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
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
    if (formData.authType === 'api_key' && !formData.apiKey.trim()) {
      return 'API key is required for API key authentication';
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
   * Validate OAuth authorization URL matches expected endpoints
   */
  const validateOAuthUrl = (url: string, provider: Provider): boolean => {
    if (!isValidUrl(url)) {
      return false;
    }

    try {
      const urlObj = new URL(url);

      // Allow Claude/Anthropic OAuth endpoints
      if (provider.type === 'anthropic') {
        const allowedHosts = [
          'claude.ai',
          'console.anthropic.com',
          'localhost', // Development
        ];
        return allowedHosts.some(
          host => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
        );
      }

      // For other providers, allow their respective OAuth endpoints
      // This can be expanded as more OAuth providers are added
      return false;
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
        authType: formData.authType,
        ...(formData.authType === 'api_key' && { apiKey: formData.apiKey.trim() }),
        baseUrl: formData.baseUrl.trim(),
        models: (() => {
          const trimmedModels = formData.models.trim();
          return trimmedModels
            ? trimmedModels
                .split(',')
                .map(model => model.trim())
                .filter(model => model)
            : undefined;
        })(),
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

      if (response.ok) {
        const savedProvider = await response.json();
        // For new OAuth providers, update the current provider state
        // so the Connect button appears with the correct provider ID
        if (!provider && savedProvider.authType === 'oauth') {
          setCurrentProvider(savedProvider);
          // Show success message for OAuth provider creation
          setError(null);
          setSuccessMessage(
            'Provider created successfully! Now connect to Claude Max to complete setup.'
          );
          // Don't close the form - let user connect OAuth
          onSubmit(savedProvider);
        } else {
          onSubmit();
        }
      } else {
        const result = await response.json();
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
          <div data-box="square" data-variant="red">
            <strong>Error:</strong> {error}
          </div>
        )}

        {successMessage && (
          <div data-box="square" data-variant="green">
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        <div data-gap="1">
          <label htmlFor="name">
            <strong>Provider Name *</strong>
          </label>
          <input
            id="name"
            type="text"
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
            value={formData.type}
            onChange={e => {
              handleChange('type', e.target.value);
              // Reset auth type when provider changes
              handleChange('authType', 'api_key');
            }}
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

        {formData.type === 'anthropic' && (
          <div data-gap="1">
            <label>
              <strong>Authentication Method *</strong>
            </label>
            <div data-gap="1">
              <label>
                <input
                  type="radio"
                  name="authType"
                  value="api_key"
                  checked={formData.authType === 'api_key'}
                  onChange={e => handleChange('authType', e.target.value as 'api_key' | 'oauth')}
                />
                <strong> API Key</strong>
              </label>
              <label>
                <input
                  type="radio"
                  name="authType"
                  value="oauth"
                  checked={formData.authType === 'oauth'}
                  onChange={e => handleChange('authType', e.target.value as 'api_key' | 'oauth')}
                />
                <strong> OAuth (Claude Max)</strong>
              </label>
            </div>
            <small>Choose authentication method for Anthropic Claude</small>
          </div>
        )}

        {formData.authType === 'api_key' && (
          <div data-gap="1">
            <label htmlFor="apiKey">
              <strong>API Key *</strong>
            </label>
            <input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={e => handleChange('apiKey', e.target.value)}
              placeholder="Enter your API key"
              required
            />
            <small>Your authentication key for this provider</small>
          </div>
        )}

        {formData.authType === 'oauth' && (provider || currentProvider) && (
          <div data-gap="1">
            <label>
              <strong>OAuth Authentication</strong>
            </label>

            {oauthStatus?.hasValidTokens ? (
              <div data-box="square" data-variant="green" data-gap="1">
                <div>
                  <strong>✓ OAuth Connected</strong>
                </div>
                <div>
                  <small>
                    {oauthStatus.expiresAt && (
                      <>
                        Expires: {new Date(oauthStatus.expiresAt).toLocaleString()}
                        {oauthStatus.isTokenExpired && ' (Expired)'}
                      </>
                    )}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={handleOAuthRevoke}
                  disabled={loading}
                  size-="compact"
                >
                  {loading ? 'Revoking...' : 'Revoke Access'}
                </button>
              </div>
            ) : (
              <div data-box="square" data-gap="1">
                <div>
                  <strong>OAuth Setup Required</strong>
                </div>
                <small>Connect to Claude Max to use OAuth authentication</small>

                {!showCallbackInput ? (
                  <button
                    type="button"
                    onClick={handleOAuthInit}
                    disabled={loading}
                    box-="square"
                    variant-="blue"
                  >
                    {loading ? 'Connecting...' : 'Connect to Claude Max'}
                  </button>
                ) : (
                  <div data-gap="1">
                    <small>
                      After authorizing, copy the entire callback URL and paste it here:
                    </small>
                    <div data-gap="1">
                      <input
                        type="text"
                        value={callbackCode}
                        onChange={e => setCallbackCode(e.target.value)}
                        placeholder="Paste callback URL or code here"
                        disabled={loading}
                      />
                      <div data-gap="1" data-align="space-between">
                        <button
                          type="button"
                          onClick={handleCallbackSubmit}
                          disabled={loading || !callbackCode.trim()}
                          box-="square"
                          variant-="green"
                        >
                          {loading ? 'Processing...' : 'Submit Code'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCallbackInput(false);
                            setCallbackCode('');
                            setSuccessMessage(null);
                          }}
                          disabled={loading}
                          box-="square"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <small>OAuth provides secure authentication without storing API keys</small>
          </div>
        )}

        <div data-gap="1">
          <label htmlFor="baseUrl">
            <strong>Base URL</strong>
          </label>
          <input
            id="baseUrl"
            type="url"
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
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : provider ? 'Update Provider' : 'Create Provider'}
          </button>
        </div>
      </div>
    </form>
  );
}
