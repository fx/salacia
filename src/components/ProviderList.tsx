import React from 'react';

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
 * Props for ProviderList component
 */
interface ProviderListProps {
  providers: Provider[];
  onEdit: (provider: Provider) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onSetDefault: (id: string) => void;
}

/**
 * Provider list component displaying all configured AI providers.
 * Provides actions for editing, deleting, testing, and setting default providers.
 */
export function ProviderList({
  providers,
  onEdit,
  onDelete,
  onTest,
  onSetDefault,
}: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <div data-box="square" data-align="center">
        <p>No providers configured.</p>
        <small>Add a provider to get started.</small>
      </div>
    );
  }

  return (
    <div data-box="square">
      <table data-compact="true">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Default</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map(provider => (
            <tr key={provider.id}>
              <td>
                <strong>{provider.name}</strong>
                {provider.baseUrl && (
                  <div>
                    <small>{provider.baseUrl}</small>
                  </div>
                )}
              </td>
              <td>
                <span data-is="badge" data-variant="blue">
                  {provider.type.toUpperCase()}
                </span>
              </td>
              <td>
                <span data-is="badge" data-variant={provider.isActive ? 'green' : 'surface0'}>
                  {provider.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </td>
              <td>
                {provider.isDefault ? (
                  <span data-is="badge" data-variant="yellow">
                    DEFAULT
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetDefault(provider.id)}
                    data-compact="true"
                    disabled={!provider.isActive}
                  >
                    Set Default
                  </button>
                )}
              </td>
              <td>
                <div data-align="start" data-gap="1">
                  <button
                    type="button"
                    onClick={() => onTest(provider.id)}
                    data-compact="true"
                    disabled={!provider.isActive}
                    title="Test provider connectivity"
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(provider)}
                    data-compact="true"
                    title="Edit provider settings"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(provider.id)}
                    data-compact="true"
                    title="Delete provider"
                    disabled={provider.isDefault}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
