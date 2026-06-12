/**
 * @jest-environment jsdom
 */
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import QuestionPage from '../src/app/question/page';
import React from 'react';

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

// Mock localStorage hook to avoid interference
jest.mock('../src/app/hooks/useLocalStorage', () => ({
  useLocalStorage: (key: string, initial: any) => {
    if (key === 'owlly_questions') return [[{question: 'Test'}], jest.fn()];
    if (key === 'owlly_api_key') return ['test-key', jest.fn()];
    return [initial, jest.fn()];
  }
}));

describe('Question Page Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves transcript draft to localStorage every 3 seconds', async () => {
    render(<QuestionPage />);
    
    const textarea = screen.getByPlaceholderText(/Your spoken words will appear here/i);
    
    act(() => {
      fireEvent.change(textarea, { target: { value: 'My persistent approach' } });
    });

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(localStorage.getItem('owlly_draft_transcript')).toBe('My persistent approach');
  });

  it('clears draft after successful submission', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ AccuracyScore: 80, StructureScore: 80 })
    })) as jest.Mock;

    localStorage.setItem('owlly_draft_transcript', 'Existing draft');
    
    render(<QuestionPage />);
    
    const submitBtn = screen.getByText(/Evaluate My Answer/i);
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(localStorage.getItem('owlly_draft_transcript')).toBeNull();
    });
  });
});
