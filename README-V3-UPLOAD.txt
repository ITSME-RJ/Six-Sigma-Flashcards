# Six Sigma Study App, Version 3

Upload these four replacement files to the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `service-worker.js`

Keep the existing card files, manifest, and icons unchanged.

## Version 3 highlights

- Fixes filtered browsing so a selected card starts at that card and continues through the remaining filtered deck
- Preserves swipe navigation and filtered order
- Adds Continue Study
- Adds Cards Due Today, Weak Concepts, Favorites, Daily Goal, Streak, Mastery, and Estimated Readiness
- Adds bookmark controls directly in Browse
- Adds search across terms, definitions, and group names
- Adds sorting by original order, alphabetic order, weakness, and due date
- Improves adaptive Again, Hard, Good, and Easy scheduling
- Adds quiz source and length controls
- Adds explanations after each quiz answer
- Adds quiz score summary and review of incorrect answers
- Adds group mastery, a 28-day heat map, weakest concepts, and readiness statistics
- Keeps the existing `sixSigmaV2` local-storage key and migrates missing Version 3 fields automatically

## Upload steps

1. Open the GitHub repository.
2. Upload the four files from this package to the repository root.
3. Confirm replacement of files with the same names.
4. Commit directly to `main`.
5. Reload the GitHub Pages site. On iPhone, fully close and reopen the installed PWA if the old cached version remains.
