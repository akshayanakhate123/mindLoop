/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import HomePage from '../src/app/home/page';
import React from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

describe('Home Page Daily Complete State', () => {
  it('renders celebration banner when today session exists', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('owlly_sessions', JSON.stringify([
      { date: today, accuracyScore: 85, structureScore: 90, question: 'Test' }
    ]));
    localStorage.setItem('owlly_questions', JSON.stringify([{ question: 'Test' }]));
    localStorage.setItem('owlly_start_date', new Date().toISOString());
    
    render(<HomePage />);
    
    expect(screen.getByText(/Day \d+ Complete!/i)).toBeInTheDocument();
    expect(screen.getByText(/Accuracy: 85%/i)).toBeInTheDocument();
    expect(screen.queryByText(/Continue Challenge/i)).not.toBeInTheDocument();
  });
});
