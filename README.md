# Building the Bridge

A mobile-installable Progressive Web App for practicing categorization and
comparison language skills. Plain HTML/CSS/JavaScript, no build step, no
backend — all data lives in the browser's `localStorage`.

## Run it locally

Because the app registers a service worker, it needs to be served over
`http://` (not opened as a `file://` path). Any static file server works, e.g.:

```bash
npx serve .
```

or, with Python installed:

```bash
python -m http.server 8080
```

Then open the printed `http://localhost:...` address in a browser.

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then in the GitHub repo: **Settings → Pages → Build and deployment → Source:
Deploy from a branch**, branch `main`, folder `/ (root)`. Save. GitHub gives
you a URL like `https://<your-username>.github.io/<your-repo>/` — that's the
link to open on your phone.

(All paths in this app are relative, so it works fine hosted at a subpath
like `/your-repo/` — no config changes needed.)

## Install on your phone

**iOS (Safari):**
1. Open the GitHub Pages URL in Safari.
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app icon now appears on your home screen and opens full-screen, no browser chrome.

**Android (Chrome):**
1. Open the GitHub Pages URL in Chrome.
2. Tap the **⋮** menu in the top right.
3. Tap **Add to Home screen** (or you may see an **Install app** banner/button — tap that instead).
4. Confirm by tapping **Add** / **Install**.

Once installed, the app works fully offline after the first load (it
precaches its own files; skill/category selections, mastery, and the session
log are all stored on-device in `localStorage`).

## How the data works

- **Skills** (Home tab) and **Categories** (Categories tab) are just
  on/off toggles — changing them resets your place in the practice sequence
  but never erases mastery or logged history.
- **Mastery**: an item needs 5 consecutive *Independent* answers to be
  marked mastered and drop out of the normal rotation. Any other result
  resets its streak to 0.
- **Review check-ins**: every 3rd time the active sequence completes a full
  loop, up to 3 randomly chosen mastered items are pulled back in as a quick
  check. Answering independently keeps them mastered; anything else
  un-masters them.
- **Reset all saved progress** (Progress tab) clears mastery + the session
  log only — it leaves your skill/category selections alone.

## Project structure

```
index.html          App shell + all four tab panels
css/styles.css       All styling
js/data.js           Skills, categories, fixed word lists, drill generators
js/storage.js        localStorage read/write helpers
js/app.js            State, rendering, practice-session logic
manifest.json        PWA manifest (name, icons, standalone display)
sw.js                Service worker (offline caching)
icons/               App icons (192/512/512-maskable/180/favicon)
```
