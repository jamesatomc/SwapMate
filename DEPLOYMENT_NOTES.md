Netlify deployment notes for SwapMate

This repository contains a Next.js frontend inside the `frontend/` folder. The site uses Next.js 15 and must be built in that folder.

Quick setup on Netlify:

- Install the Netlify CLI or use the Netlify web UI.
- In the site settings, set "Base directory" to `frontend`.
- Set the "Build command" to `npm run build` and the "Publish directory" to `.next`.
- Add the Netlify Next.js plugin: `@netlify/plugin-nextjs` (it is referenced in `netlify.toml`).

Notes:
- Netlify's Next plugin handles server-side and static routes. For a fully static export you could use `next export` but that changes routing and some features.
- If you see a Netlify 404 page (like the attached screenshot), verify the Base directory and Publish directory shown above and ensure the build succeeds in the deploy logs.
- Locally you can test builds from the repo root:

```powershell
cd frontend; npm install; npm run build
```

If the build finishes, upload the generated `.next` folder to Netlify or trigger a deploy from the web UI.

Troubleshooting:
- If the build fails on Netlify because of Node version, set the Node version in `frontend/.nvmrc` or set the `NODE_VERSION` environment variable in Netlify site settings.
- If your app expects environment variables (RPC URLs, API keys), add them in Netlify's Environment settings.
