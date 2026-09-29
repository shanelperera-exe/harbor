import { vi } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme, resolveTheme, type Theme } from './ThemeContext';

const STORAGE_KEY = 'harbor_theme';

/** Replaces matchMedia so the system colour scheme can be controlled per test. */
function mockMatchMedia(prefersDark: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
  } as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => mql,
  });

  return {
    mql,
    listeners,
    /** Simulates an OS-level appearance change. */
    emitChange(newPrefersDark: boolean) {
      (mql as unknown as { matches: boolean }).matches = newPrefersDark;
      listeners.forEach((listener) => listener());
    },
  };
}

/** Renders useTheme inside a provider and returns the latest context value. */
function renderUseTheme() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
  return renderHook(() => useTheme(), { wrapper });
}

describe('resolveTheme', () => {
  it('resolves an explicit light theme to light', () => {
    mockMatchMedia(true);
    expect(resolveTheme('light')).toBe('light');
  });

  it('resolves an explicit dark theme to dark', () => {
    mockMatchMedia(false);
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves the system theme to dark when the OS prefers dark', () => {
    mockMatchMedia(true);
    expect(resolveTheme('system')).toBe('dark');
  });

  it('resolves the system theme to light when the OS prefers light', () => {
    mockMatchMedia(false);
    expect(resolveTheme('system')).toBe('light');
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  it('defaults to the system theme when nothing is stored', () => {
    const { result } = renderUseTheme();

    expect(result.current.theme).toBe('system');
  });

  it('uses a stored theme on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderUseTheme();

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('falls back to system for an unrecognised stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'neon-pink');
    const { result } = renderUseTheme();

    expect(result.current.theme).toBe('system');
  });

  it('applies the dark class to the document element for a dark theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    renderUseTheme();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the dark class for a light theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderUseTheme();

    act(() => result.current.setTheme('light'));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the selected theme to localStorage', () => {
    const { result } = renderUseTheme();

    act(() => result.current.setTheme('dark'));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(result.current.theme).toBe('dark');
  });

  it('resolves the system theme through the OS preference', () => {
    mockMatchMedia(true);
    const { result } = renderUseTheme();

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('reacts to an OS appearance change while in system mode', () => {
    const media = mockMatchMedia(false);
    const { result } = renderUseTheme();

    expect(result.current.resolvedTheme).toBe('light');

    act(() => media.emitChange(true));

    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('ignores OS appearance changes once an explicit theme is chosen', () => {
    const media = mockMatchMedia(false);
    const { result } = renderUseTheme();

    act(() => result.current.setTheme('light'));
    act(() => media.emitChange(true));

    // An explicit choice must win over the OS preference.
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('picks up a theme change made by another tab', () => {
    const { result } = renderUseTheme();

    localStorage.setItem(STORAGE_KEY, 'dark');
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does not update state when a storage event reports the same theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderUseTheme();

    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current.theme).toBe('dark');
  });

  it('dispatches a theme change event when the theme is set', () => {
    const listener = vi.fn();
    window.addEventListener('harbor-theme-change', listener);
    const { result } = renderUseTheme();

    act(() => result.current.setTheme('dark'));

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('harbor-theme-change', listener);
  });

  it('removes its listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderUseTheme();
    unmount();

    const added = addSpy.mock.calls.map((call) => call[0]);
    const removed = removeSpy.mock.calls.map((call) => call[0]);

    added.forEach((event) => expect(removed).toContain(event));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('renders its children', () => {
    render(
      <ThemeProvider>
        <div>themed content</div>
      </ThemeProvider>,
    );

    expect(screen.getByText('themed content')).toBeInTheDocument();
  });
});

describe('useTheme', () => {
  it('throws when used outside a ThemeProvider', () => {
    // React logs the thrown error; silence it for this expected-failure case.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within a ThemeProvider');

    consoleError.mockRestore();
  });

  it('returns the theme, resolved theme and setter inside a provider', () => {
    mockMatchMedia(false);
    const { result } = renderUseTheme();

    expect(result.current).toEqual({
      theme: 'system' as Theme,
      resolvedTheme: 'light',
      setTheme: expect.any(Function),
    });
  });
});
