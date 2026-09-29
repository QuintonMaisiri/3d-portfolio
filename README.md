# The Adventurer's Codex

Quinton Tinotenda Maisiri's portfolio: a single-page, scroll-driven 3D journey
through eight regions, with a plain "Read as a page" view of the same content.

## Run it

```bash
npm install        # also copies the Draco decoder into public/draco and patches r3f-perf
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint
npm run typecheck
```

Node 20.9 or later.

## Edit the content

All copy lives in `content/`. Edit it there; the page view, the journey panels
and the 3D echoes (one tree per project, one orb per skill, one tablet per
milestone, one crystal per testimonial, one peak per case) all follow.

| File | Section |
|---|---|
| `content/profile.ts` | Name, headline, tagline, links (hero) |
| `content/about.ts` | About |
| `content/skills.ts` | Skill groups |
| `content/projects.ts` | Projects |
| `content/problems.ts` | Problem-solving cases |
| `content/experience.ts` | Timeline |
| `content/testimonials.ts` | Testimonials (real quotes only) |
| `content/contact.ts` | Contact copy |
| `content/narration.ts` | The subtitle lines between regions |

Anything still to fill in shows on the site as `[TODO: ...]`.

## 3D models

Every region uses CC0 models from Quaternius packs, built into
`public/models/` by `npm run models` (see `scripts/build-models.mjs`: unzip
the packs into `assets-inbox/_work/`, then run it; it simplifies, compresses
textures to WebP and Draco-compresses each model). Each region's props come
from one module in `components/regions/models/`, which keeps the same exports
as its procedural fallback in `components/regions/placeholders/`. To change a
prop, edit the module; to fall back to the placeholder, point the region's
import at `./placeholders/<region>`.

## Deploy (Vercel)

1. Push this folder to a Git repository (GitHub, GitLab or Bitbucket).
2. In Vercel, **Add New Project** and import the repository. The defaults
   (Next.js, `npm run build`) are correct.
3. Add an environment variable `NEXT_PUBLIC_SITE_URL` set to the final URL
   (for example `https://quintonmaisiri.dev`). It drives the canonical URL,
   Open Graph image URL, `robots.txt` and the sitemap.
4. Deploy. Add your custom domain under the project's **Domains** settings,
   then redeploy so the metadata picks up the final URL.

## How it works

See `CLAUDE.md` for the architecture, decisions and status.
