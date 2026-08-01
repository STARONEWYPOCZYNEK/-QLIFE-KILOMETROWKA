# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

- `middleware.ts` nie istnieje — plik nazywa się `proxy.ts`, eksportowana funkcja to `proxy`.
- `eslint-plugin react-hooks/purity` blokuje `Date.now()`/`new Date()` bezpośrednio w ciele komponentu — wydzielać do funkcji pomocniczej poza komponentem.
