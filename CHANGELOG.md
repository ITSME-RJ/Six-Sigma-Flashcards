# Rebuilt Six Sigma Flashcards

## Files to upload
Replace the existing `cards1.js`, `cards2.js`, `cards3.js`, `cards4.js`, and `app.js` files in the repository root.

## Audit summary
- Audited all four original PPSX source decks.
- Created 203 usable flashcards: Group 1 48, Group 2 49, Group 3 48, Group 4 58.
- Removed the duplicate animation fragment `Systems Thi / nking`.
- Repaired split or corrupted titles such as `Control Ch art`, `Run Char ts`, `C rossed Gage R&R Study`, and `High-Perfor mance Teams`.
- Added accurate text definitions for diagram-only and heading-only slides.
- Corrected several technically imprecise entries, including Bar Chart, Scatter Plot, Risk Priority Number, Process Stability, and control-limit wording.
- Added a dedicated plain-English field (`p`) and real-world example field (`e`) to every card.
- Updated `app.js` to display those card-specific fields rather than reusing broad keyword-generated explanations.

## Card format
Each card now uses:
```js
{ t: "Term", d: "Definition", p: "Plain English", e: "Real-world example", g: 1 }
```

## Important note
Replacing the deck changes card IDs after the removed duplicate slide. Existing local study history may attach to a different concept. Use the app's Reset Study Data option after uploading these files for a clean start.
