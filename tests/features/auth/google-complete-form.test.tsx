import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleCompleteForm } from '@/features/auth/components/google-complete-form';
import type { GoogleProfileRequired } from '@/features/auth/google-api';

vi.mock('next-intl', () => ({
  // Echo the key so assertions read against stable identifiers rather than copy.
  useTranslations: () => (key: string) => key,
}));

const pending: GoogleProfileRequired = {
  needsProfile: true,
  ticket: 'tkt-abc',
  profile: {
    name: 'Walter Gropius',
    email: 'walter@bauhaus.de',
    picture: 'p.jpg',
  },
  suggestedUsername: 'walter',
};

function renderForm(
  overrides: Partial<Parameters<typeof GoogleCompleteForm>[0]> = {},
) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const clearUsernameError = vi.fn();
  render(
    <GoogleCompleteForm
      pending={pending}
      isCompleting={false}
      usernameError={null}
      clearUsernameError={clearUsernameError}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel, clearUsernameError };
}

const field = (id: string) => document.getElementById(id) as HTMLInputElement;

describe('GoogleCompleteForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pre-fills the name Google supplied and lets the user edit it', () => {
    const { onSubmit } = renderForm();

    expect(field('name').value).toBe('Walter Gropius');

    fireEvent.change(field('name'), { target: { value: 'Walter G' } });
    fireEvent.change(field('password'), { target: { value: 'Bauhaus!1919' } });
    fireEvent.submit(field('username').closest('form') as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'walter',
      name: 'Walter G',
      password: 'Bauhaus!1919',
    });
  });

  it('pre-fills the suggested username', () => {
    renderForm();
    expect(field('username').value).toBe('walter');
  });

  // Google already verified the address — that is why this flow skips OTP — so
  // it must not be presented as something the user can change.
  it('shows the Google email as read-only text, not an input', () => {
    renderForm();

    expect(screen.getByText('walter@bauhaus.de')).toBeInTheDocument();
    expect(field('email')).toBeNull();
  });

  it('rejects a password that misses the backend policy', () => {
    const { onSubmit } = renderForm();

    fireEvent.change(field('password'), { target: { value: 'weak' } });
    fireEvent.submit(field('username').closest('form') as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('validation.passwordMinLength'),
    ).toBeInTheDocument();
  });

  it('rejects a username with invalid characters', () => {
    const { onSubmit } = renderForm();

    fireEvent.change(field('username'), { target: { value: 'not valid!' } });
    fireEvent.change(field('password'), { target: { value: 'Bauhaus!1919' } });
    fireEvent.submit(field('username').closest('form') as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('validation.usernameFormat')).toBeInTheDocument();
  });

  it('rejects a too-short username', () => {
    const { onSubmit } = renderForm();

    fireEvent.change(field('username'), { target: { value: 'ab' } });
    fireEvent.change(field('password'), { target: { value: 'Bauhaus!1919' } });
    fireEvent.submit(field('username').closest('form') as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('validation.usernameMinLength'),
    ).toBeInTheDocument();
  });

  it('rejects a blank name', () => {
    const { onSubmit } = renderForm();

    fireEvent.change(field('name'), { target: { value: ' ' } });
    fireEvent.change(field('password'), { target: { value: 'Bauhaus!1919' } });
    fireEvent.submit(field('username').closest('form') as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('validation.nameMinLength')).toBeInTheDocument();
  });

  it('trims whitespace before submitting', () => {
    const { onSubmit } = renderForm();

    fireEvent.change(field('username'), { target: { value: '  walter  ' } });
    fireEvent.change(field('name'), { target: { value: '  Walter  ' } });
    fireEvent.change(field('password'), { target: { value: 'Bauhaus!1919' } });
    fireEvent.submit(field('username').closest('form') as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'walter',
      name: 'Walter',
      password: 'Bauhaus!1919',
    });
  });

  it('surfaces a server-side username clash against the field', () => {
    renderForm({ usernameError: 'googleSignup.usernameTaken' });
    expect(screen.getByText('googleSignup.usernameTaken')).toBeInTheDocument();
  });

  it('clears the server-side clash as soon as the username is edited', () => {
    const { clearUsernameError } = renderForm({
      usernameError: 'googleSignup.usernameTaken',
    });

    fireEvent.change(field('username'), { target: { value: 'walter2' } });

    expect(clearUsernameError).toHaveBeenCalled();
  });

  it('disables the fields while the account is being created', () => {
    renderForm({ isCompleting: true });

    expect(field('username').disabled).toBe(true);
    expect(field('name').disabled).toBe(true);
    expect(field('password').disabled).toBe(true);
  });

  it('lets the user back out of the pending signup', () => {
    const { onCancel } = renderForm();

    fireEvent.click(screen.getByText('otp.back'));

    expect(onCancel).toHaveBeenCalled();
  });
});
