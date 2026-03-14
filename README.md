# Zombie Forest 3D

A browser-based 3D arcade zombie shooter built with Vite + Three.js. Includes optional webcam + hand tracking input (HTTPS required for webcam permissions).

## Local development

```bash
npm install
npm run dev
```

## GitHub Pages deployment (HTTPS)

This project is configured to deploy to GitHub Pages using GitHub Actions.

### One-time repo setting: Vite `base` path

In `vite.config.js`, replace:

- `base: "/YOUR_REPO_NAME/"`

with your actual GitHub repository name. Example:

- Repo name: `zombie-forest-game`
- GitHub Pages URL: `https://YOUR_USERNAME.github.io/zombie-forest-game/`
- Vite base: `"/zombie-forest-game/"`

## How future updates go live

Any commit you push to the `main` branch triggers the GitHub Actions workflow to:

- install dependencies with `npm ci`
- build with `npm run build`
- deploy the `dist/` output to GitHub Pages

Once the workflow completes, the live site updates automatically.

