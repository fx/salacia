import React, { useState, useEffect } from 'react';
import { ProviderList } from './ProviderList';
import { ProviderForm } from './ProviderForm';

/**
 * Provider entity as used by the settings UI and API.
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
 * Main provider settings management component.
 * - Lists providers
 * - Creates/edits providers
 * - Deletes providers
 * - Tests and sets default providers
 */
export function ProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  /**
   * Fetch providers from API.
   * Provider collection endpoints return an array directly.
   */
  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/providers');

      if (response.ok) {
        const result: Provider[] = await response.json();
        setProviders(result);
        setError(null);
      } else {
        // Parse error response consistently
        let err;
        try {
          err = await response.json();
        } catch {
          err = { error: 'Failed to fetch providers' };
        }
        setError(err?.error || 'Failed to fetch providers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiate delete confirmation for a provider.
   */
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  /**
   * Confirm and execute provider deletion (expects HTTP 204 on success).
   */
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;

    try {
      const response = await fetch(`/api/providers/${confirmDeleteId}`, {
        method: 'DELETE',
      });

      if (response.status === 204) {
        await fetchProviders();
        setError(null);
      } else {
        const result = await response.json().catch(() => ({ error: 'Failed to delete provider' }));
        setError(result.error || 'Failed to delete provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  /**
   * Cancel delete confirmation dialog.
   */
  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  /**
   * Test provider connectivity.
   * Test endpoint returns { success: boolean, error?: string } directly.
   */
  const handleTest = async (id: string) => {
    try {
      const response = await fetch(`/api/providers/${id}/test`, {
        method: 'POST',
      });

      const result: { success?: boolean; error?: string } | null = await response
        .json()
        .catch(() => null);

      if (response.ok) {
        if (result?.success) {
          setTestMessage({ type: 'success', message: 'Provider test successful!' });
        } else {
          setTestMessage({
            type: 'error',
            message: `Provider test failed: ${result?.error || 'Unknown error'}`,
          });
        }
      } else {
        const msg = result?.error || `HTTP ${response.status}`;
        setTestMessage({ type: 'error', message: `Provider test failed: ${msg}` });
      }
    } catch (err) {
      setTestMessage({
        type: 'error',
        message: `Test failed: ${err instanceof Error ? err.message : 'Network error'}`,
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => setTestMessage(null), 5000);
  };

  /**
   * Set provider as default. Endpoint returns Provider directly on success.
   */
  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/providers/${id}/default`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchProviders();
      } else {
        const result = await response.json().catch(() => ({ error: 'Failed to set default' }));
        setError(result.error || 'Failed to set default provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  /**
   * Handle form submission (create or update) and refresh list.
   */
  const handleFormSubmit = async () => {
    await fetchProviders();
    setShowForm(false);
    setEditingProvider(null);
  };

  /**
   * Start editing a provider.
   */
  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  /**
   * Start creating a new provider.
   */
  const handleCreate = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  /**
   * Cancel provider form.
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
          <button type="button" onClick={handleCancel} size-="compact">
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
        <button type="button" onClick={handleCreate} size-="compact">
          Add Provider
        </button>
      </div>

      {error && (
        <div data-box="square" data-variant="red">
          <strong>Error:</strong> {error}
        </div>
      )}

      {testMessage && (
        <div data-box="square" data-variant={testMessage.type === 'success' ? 'green' : 'red'}>
          <strong>{testMessage.type === 'success' ? 'Success:' : 'Error:'}</strong>{' '}
          {testMessage.message}
        </div>
      )}

      <ProviderList
        providers={providers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTest={handleTest}
        onSetDefault={handleSetDefault}
      />

      {confirmDeleteId && (
        <dialog open data-box="square" position-="center" size-="default">
          <div data-gap="2">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this provider?</p>
            <div data-align="space-between" data-gap="1">
              <button type="button" onClick={cancelDelete} size-="compact">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} data-variant="red" size-="compact">
                Delete
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
