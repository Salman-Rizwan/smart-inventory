# Smart Inventory frontend

React 19 and Vite, with TypeScript for new files. See the root `README.md` for the architecture and the project docs in `../docs/`.

```bash
npm install
npm run dev          # http://localhost:5173 (the backend's CORS allows only this origin)
npm run typecheck && npm test && npx oxlint && npm run build
```

Structure: `src/features/<name>/` (auth, alerts, notifications, inventory, orders, dashboard), `src/shared/` (components, hooks, API client), `src/layouts/`, `src/styles/` (design tokens first). Firebase web config is in `src/firebase.js`.
