import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../config/firebase.js', () => ({
  app: {},
  storage: {},
  analytics: null,
  messaging: null,
  getAuthInstance: vi.fn(),
  getDbInstance: vi.fn(),
  getFunctionsInstance: vi.fn(),
}));

import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen).toBeDefined();
  });
});
