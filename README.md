This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Port67 studio website

The main landing page and public studio routes live in `src/app/(studio)` with shared components in `src/components/studio`. The supplied brand logo and licensed fonts are self-hosted in `public/brand` and `public/fonts`.

Run `npm test` for enquiry validation, safe delivery failures and server-rendered checks of the nine studio pages. Run `npm run build` before pushing. The legacy application still requires its existing Firebase configuration for a full build and operation; preserve those environment settings on Render.

The contact form is unavailable until privacy/legal details and a real delivery processor are configured. See `docs/enquiry-delivery.md` for the activation contract. No tracker or analytics vendor has been enabled.

Render should continue using its existing linked `main` branch with `npm ci && npm run build` as the build command and `npm start -- --port $PORT` as the start command. This remodel does not create or modify a Render service.
