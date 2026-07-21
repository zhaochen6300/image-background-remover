# Image Background Remover

A no-storage image background removal MVP built with Next.js, Tailwind CSS, Cloudflare Workers, and Remove.bg.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `REMOVE_BG_API_KEY` to a valid Remove.bg API key.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

Images are sent to the Route Handler and streamed to Remove.bg. The application does not use a database, object storage, or persistent image cache.

## Cloudflare deployment

1. Authenticate Wrangler: `npx wrangler login`.
2. Set the production secret: `npx wrangler secret put REMOVE_BG_API_KEY`.
3. Deploy: `npm run deploy`.

`REMOVE_BG_API_KEY` is server-only; do not create any `NEXT_PUBLIC_` variant of this variable.
