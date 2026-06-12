/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingPage from '../src/app/onboarding/page';
import React from 'react';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('Onboarding Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves all 4 fields to localStorage on finish', async () => {
    render(<OnboardingPage />);
    
    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), { target: { value: 'Akshaya' } });
    fireEvent.click(screen.getByText('Next'));
    
    // Step 2: Track, Domain, Duration
    // Wait for the comboboxes to appear since framer-motion AnimatePresence is used
    const comboboxes = await screen.findAllByRole('combobox');
    fireEvent.change(comboboxes[2], { target: { value: '14' } });
    fireEvent.click(screen.getByText('Next'));
    
    // Step 3: API Key
    const apiKeyInput = await screen.findByPlaceholderText(/API Key \(Optional\)/i);
    fireEvent.change(apiKeyInput, { target: { value: 'sk-123' } });
    fireEvent.click(screen.getByText('Next'));
    
    // Step 4: Finish
    const finishBtn = await screen.findByText(/Let's Go/i);
    fireEvent.click(finishBtn);

    expect(localStorage.getItem('owlly_name')).toBe('"Akshaya"');
    expect(localStorage.getItem('owlly_duration')).toBe('"14"');
    expect(localStorage.getItem('owlly_track')).toBe('"Guesstimates"');
    expect(localStorage.getItem('owlly_domain')).toBe('"Finance"');
    expect(localStorage.getItem('owlly_api_key')).toBe('"sk-123"');
    expect(localStorage.getItem('owlly_provider')).toBe('"gemini"');
    expect(mockPush).toHaveBeenCalledWith('/home');
  });
});
