# Zombie Forest Game

A gesture-controlled survival game where you fight zombies in a dark forest using your hand movements through the camera. Instead of using a mouse or keyboard to aim and shoot, the game tracks your index finger and thumb to create a more interactive shooting experience.

## How to Play

The game uses your device camera to detect your hand gestures. Make sure your camera is turned on and your hand is clearly visible in front of it.

### 1. Point to Aim

Raise your hand in front of the camera and point using your index finger.

Your index finger works like the aiming direction. Move your hand left, right, up, or down to control where you are aiming on the screen.

For better detection:

* Keep your hand inside the camera frame.
* Make sure your index finger is clearly extended.
* Face your palm slightly toward the camera.
* Avoid very dark lighting or a cluttered background.

### 2. Use Thumb + Index Finger to Shoot

To shoot, bring your thumb close to your index finger, like making a small pinch gesture.

Think of it like this:

👉 Point your index finger toward the camera
Bring your thumb close to the index finger to shoot

When the game detects that your thumb and index finger are close enough, it triggers a shot.

## Tips for Best Experience

* Play in a well-lit room.
* Keep your hand visible to the camera at all times.
* Use a plain background if possible.
* Keep your index finger straight while aiming.
* Make a clear pinch gesture to shoot.
* Avoid moving your hand too fast, as it may reduce tracking accuracy.
* Allow camera permission when the browser asks for it.



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
