# MakerBucks Showcase

Project cards for WPI MakerBucks, pulled live from a Google Sheet.
Everything runs from `index.html`, which shows, top to bottom:

1. A title banner with a background photo, a logo in the corner, and the title
2. **Featured Projects**: a side-scrolling row of projects marked **TRUE** in the Featured column
3. Search, category filter, and sort
4. A grid of all projects

## Changing the content
Edit the Google Sheet. The page reads it every time it loads.
The sheet must be shared as **Anyone with the link can view**.

## Pointing at a different sheet
Paste the sheet's link into `SHEET_URL` in `js/config.js`.

## Title banner
Set the title, background photo, and logo in `BANNER` at the bottom of `js/config.js`.
Images can be paths in this repo (e.g. `images/banner.jpg`) or full GitHub image links.

## Files
```
index.html        the page (runs everything)
css/cards.css     shared: colors, cards, flip view, photos
css/showcase.css  title banner, search/filter bar, grid
css/featured.css  Featured Projects row
js/config.js      settings: Google Sheet link + banner title/images
js/banner.js      fills in the title banner
js/cards.js       card building, flip view, loading the sheet
js/featured.js    Featured Projects row + arrows
js/showcase.js    search, filters, sort, grid
images/
  banner.jpg      banner background photo
  logo.png        logo for the banner corner
```
Scripts load in this order in `index.html`: `config.js`, `banner.js`, `cards.js`, `featured.js`, `showcase.js`.
