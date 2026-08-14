# Hostinger Node.js deployment

This folder is a self-contained Coodi product website source export. It has no managed-platform runtime dependency and bundles its own product images in `client/public/assets`.

## Local validation

```bash
npm install
npm run check
npm run build
npm start
```

Open `http://localhost:3000`. The Express server uses the `PORT` environment variable supplied by the host and falls back to port `3000` locally.

## Hostinger Node.js setup

1. Upload this **entire `website-hostinger` folder** or clone the repository on the Hostinger Node.js application.
2. Select a Node.js 22 or newer runtime.
3. Set the application root to `website-hostinger`.
4. Run `npm install` as the installation command.
5. Run `npm run build` as the build command.
6. Use `npm start` as the application start command.
7. Point the domain to the Node.js application and restart it after each deployment.

The application serves the compiled React site from `dist/public` and supports direct visits to `/docs` through the Express history fallback.

## Deployment safety

Do not upload `node_modules`, `dist`, `.env`, credentials, signing certificates, or API keys. This marketing website does not require environment variables for its public content.
