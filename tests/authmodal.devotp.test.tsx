import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from '../src/components/AuthModal';
import { vi } from 'vitest';

// Mock firebaseEnabled to false to force dev path on the client.
vi.mock('../src/lib/firebase', () => ({
  firebaseEnabled: false,
  firebaseAuth: null,
}));

describe('AuthModal dev-OTP regression', () => {
  beforeEach(() => {
    // Reset fetch mock
    (global as any).fetch = vi.fn();
  });

  it('does not render dev-code UI when server devOtp is false and rejects client-side', async () => {
    // Mock /api/auth/login to return devOtp: false
    (global as any).fetch = vi.fn()
      .mockResolvedValueOnce({ // /api/auth/login
        ok: true,
        json: async () => ({ isNew: false, user: { id: 'usr_test', phone: '+911234' }, devOtp: false })
      })
      .mockResolvedValueOnce({ // /api/auth/verify-otp (should not be called because client blocks)
        ok: true,
        json: async () => ({ success: true })
      });

    const onSuccess = vi.fn();
    render(<AuthModal onClose={() => {}} onSuccess={onSuccess} />);

    // Enter phone and request OTP
    const input = screen.getByPlaceholderText(/saurav.sharma@techcorp.com or \+919876543210/i);
    await userEvent.type(input, '+911234');
    const btn = screen.getByRole('button', { name: /request 6-digit code/i });
    await userEvent.click(btn);

    // Wait for OTP inputs to appear
    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(6));

    // Dev code banner should NOT be present
    expect(screen.queryByText(/Dev Code:/i)).toBeNull();

    // Fill OTP inputs with 123456
    const boxes = screen.getAllByRole('textbox');
    for (let i = 0; i < 6; i++) {
      await userEvent.type(boxes[i], String('123456'[i]));
    }

    // Click Verify
    const verify = screen.getByRole('button', { name: /verify & enter move buddy/i });
    await userEvent.click(verify);

    // The client should block the attempt and show our client-side error message
    await waitFor(() => expect(screen.getByText(/Dev OTP not enabled on server/i)).toBeTruthy());

    // Ensure backend verify endpoint was NOT called (client rejected)
    // Our fetch mock would have been called for login only once
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
  });
});
