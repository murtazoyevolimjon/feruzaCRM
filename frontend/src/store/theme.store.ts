function read(): 'light' | 'dark' {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function apply(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const themeStore = {
  init() {
    apply(read());
  },
  isDark(): boolean {
    return read() === 'dark';
  },
  toggle(): boolean {
    const next = read() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode */
    }
    apply(next);
    return next === 'dark';
  },
};
