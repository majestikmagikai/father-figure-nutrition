# Father Figure Nutrition
![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)

<img width="640" height="472" alt="Image" src="https://github.com/user-attachments/assets/3e5e7328-c6ea-4eee-8a90-4c168b4582a5" />

A veteran-owned supplement brand storefront built with React, Vite, and Shopify Storefront API.

## Products

- **Creatine Hardbody** — Micronized creatine monohydrate gummies, 5g per serving
- **Multi Vitamin Plus** — Daily multivitamin with 23 essential vitamins & minerals, 80% organic
- **15 Day Fresh Start Cleanse** — Digestive reset with organic herbs and fiber

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — build tool & dev server
- **Tailwind CSS** + **shadcn/ui** — styling and UI components
- **Zustand** — cart state management
- **Shopify Storefront API** — cart and checkout
- **Supabase** — backend / edge functions
- **TanStack Query** — data fetching
- **Vitest** — unit testing

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Environment Variables

Create a `.env.local` file in the root:

```env
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

> Shopify Storefront credentials are configured in `src/lib/shopify.ts`.

## Project Structure

```
src/
├── assets/         # Images and static assets
├── components/     # UI components (Hero, ProductGrid, FAQ, etc.)
├── hooks/          # Custom React hooks
├── integrations/   # Supabase client
├── lib/            # Shopify API, product data, utilities
├── pages/          # Route pages (Index, ProductDetail, NotFound)
└── stores/         # Zustand cart store
supabase/
├── functions/      # Edge functions (audit-ingredients, crawl-ingredients)
└── migrations/     # Database migrations
```

## Deployment

Build the project and deploy the `dist/` folder to your hosting provider of choice (Vercel, Netlify, etc.).

```bash
npm run build
```
