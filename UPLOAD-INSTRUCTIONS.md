# Six Sigma Premium Content Upgrade

Replace these files in the root of your GitHub repository:

- app.js
- cards1.js
- cards2.js
- cards3.js
- cards4.js
- service-worker.js

This update adds authored learning fields to all 203 cards:

- Accurate source definition
- Plain-English explanation
- Real-world example
- Memory tip
- Exam trap
- Related concepts

The app dynamically creates the three new learning panels, so index.html and styles.css do not need to be replaced.

After uploading, fully close and reopen the installed web app. The service-worker cache was renamed to `six-sigma-premium-v4`, which should force the new files to load. If the old content remains, clear the Safari website data for the GitHub Pages site once.
