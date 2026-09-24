# MakerBucks Showcase

Project cards for WPI MakerBucks, pulled live from a Google Sheet.
Everything runs from `index.html`, which shows, top to bottom:

1. A title card (`images/title-card.jpg`)
2. **Featured Projects**: a side-scrolling row of projects marked **TRUE** in the Featured column
3. Search, category filter, and sort
4. A grid of all projects

## Changing the content
Edit the Google Sheet. The page reads it every time it loads.
The sheet must be shared as **Anyone with the link can view**.

## Pointing at a different sheet
Paste the sheet's link into `SHEET_URL` in `js/config.js`.

## Title card photo
Upload it as `images/title-card.jpg` (lowercase).

## Files
```
index.html        the page (runs everything)
css/cards.css     shared: colors, cards, flip view, photos
css/showcase.css  title card, search/filter bar, grid
css/featured.css  Featured Projects row
js/config.js      Google Sheet link
js/cards.js       card building, flip view, loading the sheet
js/featured.js    Featured Projects row + arrows
js/showcase.js    search, filters, sort, grid
images/
  title-card.jpg  title card photo
```
Scripts load in this order in `index.html`: `config.js`, `cards.js`, `featured.js`, `showcase.js`.
