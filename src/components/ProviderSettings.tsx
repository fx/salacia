import React, { useState, useEffect } from 'react';
import { ProviderList } from './ProviderList';
import { ProviderForm } from './ProviderForm';

/**
 * Provider management interface data structures
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

interface ProviderResponse {
  success: boolean;
  data?: {
    providers: Provider[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

interface SingleProviderResponse {
  success: boolean;
  data?: Provider;
  error?: string;
}

/**
 * Main provider settings management component.
 * Provides interface for viewing, creating, editing, and deleting AI providers.
 */
export function ProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);

  /**
   * Fetch providers from API
   */
  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/providers');
      const result: ProviderResponse = await response.json();

      if (result.success && result.data) {
        setProviders(result.data.providers);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch providers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a provider
   */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) {
      return;
    }

    try {
      const response = await fetch(`/api/providers/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 204) {
        await fetchProviders(); // Refresh the list
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  /**
   * Test provider connectivity
   */
  const handleTest = async (id: string) => {
    try {
      const response = await fetch(`/api/providers/${id}/test`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success && result.data.success) {
        alert('Provider test successful!');
      } else {
        alert(`Provider test failed: ${result.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Test failed: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  };

  /**
   * Set provider as default
   */
  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/providers/${id}/default`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        await fetchProviders(); // Refresh the list
      } else {
        setError(result.error || 'Failed to set default provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  /**
   * Handle form submission (create or update)
   */
  const handleFormSubmit = async () => {
    await fetchProviders(); // Refresh the list
    setShowForm(false);
    setEditingProvider(null);
  };

  /**
   * Start editing a provider
   */
  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  /**
   * Start creating a new provider
   */
  const handleCreate = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  /**
   * Cancel form
   */
  const handleCancel = () => {
    setShowForm(false);
    setEditingProvider(null);
  };

  // Fetch providers on component mount
  useEffect(() => {
    fetchProviders();
  }, []);

  if (loading) {
    return (
      <div data-box="square" data-align="center">
        <p>Loading providers...</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <div data-gap="2">
        <div data-align="space-between">
          <h2>{editingProvider ? 'Edit Provider' : 'Create Provider'}</h2>
          <button type="button" onClick={handleCancel} className="wui-button">
            Back to List
          </button>
        </div>

        <ProviderForm
          provider={editingProvider}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div data-gap="2">
      <div data-align="space-between">
        <h2>AI Providers</h2>
        <button type="button" onClick={handleCreate} className="wui-button">
          Add Provider
        </button>
      </div>

      {error && (
        <div data-box="square" data-variant="red">
          <strong>Error:</strong> {error}
        </div>
      )}

      <ProviderList
        providers={providers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTest={handleTest}
        onSetDefault={handleSetDefault}
      />
    </div>
  );
}
