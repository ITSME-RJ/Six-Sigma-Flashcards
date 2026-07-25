# Six Sigma Study App, Version 2

A mobile-first Six Sigma flashcard app with 204 cards, spaced repetition, quizzes, search, group filters, favorites, streaks, statistics, dark mode, offline support, and Home Screen installation.

## Updating the existing GitHub Pages site

Upload every file and the `icons` folder to the root of the existing `Six-Sigma-Flashcards` repository. Choose **Commit changes**. Files with matching names should replace the old versions. The GitHub Pages URL stays the same.

## Important

Keep these files together in the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `cards1.js` through `cards4.js`
- `manifest.json`
- `service-worker.js`
- `icons/`

The app stores progress only in the browser on the current device. It attempts to import progress from the earlier version automatically.
