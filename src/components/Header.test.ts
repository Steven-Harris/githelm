import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Header from './Header.svelte';

describe('Header Component', () => {
  it('should display the site logo and title', () => {
    render(Header, { props: { signedIn: false, login: vi.fn(), logout: vi.fn() } });
    expect(screen.getByAltText('site logo')).toBeInTheDocument();
    expect(screen.getByText('GitHelm')).toBeInTheDocument();
  });

  it('should display the login button when not signed in', () => {
    render(Header, { props: { signedIn: false, login: vi.fn(), logout: vi.fn() } });
    expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
  });

  it('should display the logout button when signed in', () => {
    render(Header, { props: { signedIn: true, login: vi.fn(), logout: vi.fn() } });
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should call login function when login button is clicked', async () => {
    const loginMock = vi.fn();
    render(Header, { props: { signedIn: false, login: loginMock, logout: vi.fn() } });
    const loginButton = screen.getByText('Login with GitHub');
    await fireEvent.click(loginButton);
    expect(loginMock).toHaveBeenCalled();
  });

  it('should call logout function when logout button is clicked', async () => {
    const logoutMock = vi.fn();
    render(Header, { props: { signedIn: true, login: vi.fn(), logout: logoutMock } });
    const logoutButton = screen.getByText('Logout');
    await fireEvent.click(logoutButton);
    expect(logoutMock).toHaveBeenCalled();
  });
});