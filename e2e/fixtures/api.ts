import { test as base, expect } from '@playwright/test';

const API_BASE = (process.env.E2E_API_URL || 'http://localhost:3000') + '/api';

interface Fixtures {
  api: {
    register: (email: string, password: string, name: string) => Promise<{ token: string; user: { id: number; email: string; name: string } }>;
    login: (email: string, password: string) => Promise<{ token: string; user: { id: number; email: string; name: string } }>;
    seedDb: () => Promise<void>;
    cleanDb: () => Promise<void>;
  };
}

export const apiTest = base.extend<Fixtures>({
  api: async ({}, use) => {
    const api = {
      async register(email: string, password: string, name: string) {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`);
        return res.json();
      },

      async login(email: string, password: string) {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
        return res.json();
      },

      async seedDb() {
        const res = await fetch(`${API_BASE}/test/seed`, { method: 'POST' });
        if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
      },

      async cleanDb() {
        const res = await fetch(`${API_BASE}/test/clean`, { method: 'POST' });
        if (!res.ok) throw new Error(`Clean failed: ${res.status}`);
      },
    };
    await use(api);
  },
});
