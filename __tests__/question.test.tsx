/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import QuestionPage from '../src/app/question/page';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

// Mock hook
jest.mock('../src/app/hooks/useLocalStorage', () => ({
  useLocalStorage: (key: string) => {
    if (key === 'owlly_api_key') return ['fake-key', jest.fn()];
    if (key === 'owlly_provider') return ['gemini', jest.fn()];
    if (key === 'owlly_questions') return [[{ question: "Q1" }], jest.fn()];
    if (key === 'owlly_start_date') return [new Date().toISOString(), jest.fn()];
    return ['', jest.fn()];
  }
}));

// Mock fetch API globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
  })
) as jest.Mock;

describe('QuestionPage Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the countdown timer correctly and evaluates on reaching zero', async () => {
    render(<QuestionPage />);
    
    // Check initial timer
    expect(screen.getByText('05:00')).toBeInTheDocument();

    // Fast forward by 1 minute
    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });
    
    expect(screen.getByText('04:00')).toBeInTheDocument();

    // Fast forward exactly to 00:00 (remaining 4 minutes)
    act(() => {
      jest.advanceTimersByTime(240 * 1000);
    });
    
    // Check zero state
    expect(screen.getByText('00:00')).toBeInTheDocument();
    
    // Since fetch is mocked and we pushed to zero, auto-evaluation should have kicked in
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/evaluate', expect.objectContaining({
      method: 'POST'
    }));
  });
});
