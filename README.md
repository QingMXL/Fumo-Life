<div align="center">

# Fumo² Life

*Cross the barrier — soft company from Gensokyo in Fumo form* · フモフモ幻想郷

**English** · [简体中文](README.zh-CN.md)

**Live demo:** [fumofumo.life](https://www.fumofumo.life/)

<img src="assets/hero.png" alt="Fumo² Life" width="100%" />

</div>

---

## What it is

**Fumo² Life** is a cozy, AI-driven social companion web app: you chat with Touhou characters as if they lived next door in **Fumo form**, browse a **Discover** feed of their “moments,” and keep a personal **album** of images from the feed, your own posts, and plush scene shots from chat.

It is built for **daily-life roleplay**—warm, in-lore tone without leaning on “I’m a plushie” meta—and ships with **中文 / 日本語 / English** UI and model prompts tuned per language.

---

## Features & highlights

### Messaging

- **1:1 threads** with each character: typing indicators, gifts, stickers / kaomoji, optional **AI-generated scene images** (Gemini image model, with optional **Nano Banana** endpoint if you configure it).
- **Replies** use per-character style prompts and **anti-repeat** hints so different roles are less likely to send the same line; proactive “incoming” messages use a **cross-character** memory list to reduce copy-paste chatter across the cast.
- **Bond** levels and **unread** previews persist in the cloud; chat history is stored in **Supabase** and mirrored in the browser for resilience (slow network or brief outages won’t wipe the thread you were just reading).

### Discover (Moments)

- A **Moments** feed mixing **seed posts** from the cast (with local artwork under `public/moments/`) and **your own** text/image posts.
- **Likes** and **comments** (you, characters, and AI-generated replies on your posts). Unread-style cues for **new character comments** on **your** moments.
- User photos are stored as **persisted image data** (not fragile `blob:` URLs) so images still load after refresh.

### Me & album

- Profile, language, notifications placeholders, privacy blurb, **clear all chats**, and **switch user**.
- **Album** aggregates: Discover seed art, images from **your** moments, and **AI / plush** images from chat—so the gallery reflects what you’ve actually collected in-app.

### Account & data

- **Register / login** with username + password (password hashed client-side; see `schema.sql` notes for production hardening).
- **Switch user** ends the session and **clears that account’s app data** in Supabase (messages, your moments, likes, bonds, unread, etc.) plus local caches—intended as a **fresh start** when you hand the device to another “keeper” or start over.
- Near **real-time** updates for messages and moments where Supabase Realtime is enabled.

### Look & feel

- **Cream “stitched” UI**: soft cards, sky-style headers, chat bubbles that read like a cozy diary—not a flat sticker pack.
- **Fumo-forward visuals**: prompts and art direction aim for **3D plush** (pile, stitching, dot eyes without harsh speculars), not generic chibi stickers.

---

## Tech stack

| Area | Choice |
|------|--------|
| Frontend | React 19, Vite, Tailwind, Motion, React Router |
| AI | Google **Gemini** (`@google/genai`) for chat, moment comments, and image generation |
| Backend / sync | **Supabase** (Postgres + optional Realtime) |
| Optional images | `VITE_NANO_BANANA_ENDPOINT` + `VITE_NANO_BANANA_API_KEY` for an external image API |

> Local dev: set `GEMINI_API_KEY` in `.env.local`. The app reads Supabase keys from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Quick start

**Prerequisites:** Node.js (LTS recommended)

```bash
git clone https://github.com/QingMXL/Fumo-Life.git
cd Fumo-Life
npm install
```

Copy the env template and set your keys:

```bash
cp .env.example .env.local
# Edit .env.local and set:
# GEMINI_API_KEY
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# Optional: VITE_NANO_BANANA_ENDPOINT, VITE_NANO_BANANA_API_KEY
```

Initialize Supabase tables:

```sql
-- Run all SQL in supabase/schema.sql inside Supabase SQL Editor
```

Run the dev server:

```bash
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

---

## Contributing

PRs welcome—especially **localized prompt tuning** per character to keep voices distinct and on-lore.

When adding a **new Fumo**, follow the Fumo form spec in the PRD. Strong image prompts usually specify:

- **Form** — high-detail 3D physical plush  
- **Materials** — soft pile, velvet, wool, visible stitching  
- **Light** — soft side light, diffuse  
- **Face** — dot eyes (no highlight catchlights), embroidered mouth, etc.

**Example prompt** (replace `[CHARACTER DETAILS HERE]`):

```text
(Highly detailed 3D rendering:1.2), (soft plush texture with visible velvet and wool fabrics:1.3), handcrafted quality, soft velvet body with fine stitching threads, chibi aesthetic, signature Fumo design with large head and short limbs, round black dot eyes without high reflections, embroidered mouth, photorealistic style, cute and comforting. [CHARACTER DETAILS HERE].
```

---

## Acknowledgements

- **ZUN 上海アリス幻樂団** — *Touhou Project*  
- **Fumo designers**

---

## License

MIT License
