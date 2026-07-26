Six Sigma Flashcards Version 3.1 review fixes

Replace these four files in the repository root:
- app.js
- styles.css
- index.html
- service-worker.js

Fixes:
- Resets the answer panel to the top whenever the next card loads
- Makes the full answer area independently scrollable on iPhone
- Prevents vertical scrolling from accidentally flipping or rating a card
- Replaces repeated definition text with shorter plain-English explanations
- Replaces the repeated memory prompt with concept-specific real-world examples
- Updates the service-worker cache name so GitHub Pages serves the new files

Existing progress remains stored under the same sixSigmaV2 local-storage key.
