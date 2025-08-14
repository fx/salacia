import { describe, it, expect } from 'vitest';

describe('Settings redirect', () => {
  it('should redirect /settings to /settings/providers', async () => {
    const response = await fetch('http://localhost:4321/settings', {
      redirect: 'manual',
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/settings/providers');
  });
});
