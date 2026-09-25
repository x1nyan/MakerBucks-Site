# MakerBucks Showcase

Project cards for WPI MakerBucks, loaded from a local CSV file.
Everything runs from `index.html`, which shows, top to bottom:

1. A title banner with a background photo, a logo in the corner, and the title
2. **Featured Projects**: a side-scrolling row of projects marked **TRUE** in the Featured column
3. Search, category filter, and sort
4. A grid of all projects

For complete architecture, data, styling, and maintenance details, see
[`MASTER_DOCUMENTATION.md`](MASTER_DOCUMENTATION.md).

## Changing the content
Edit `Makerbucks Database - Sheet1.csv`. The page reads it every time it loads.

## Project photos
Create one folder per project under `images/projects/` using the project slug.
List the filenames in that project's `Photos` CSV column, separated by commas.

For example, the project `3lb Combat Robot for NHRL` uses:

```
images/projects/3lb-combat-robot-for-nhrl/cover.jpg
images/projects/3lb-combat-robot-for-nhrl/side.jpg
```

Its `Photos` cell should contain `cover.jpg, side.jpg`.
Full `http://` and `https://` photo URLs are still supported.

## Title banner
Set the title and background photos in `BANNER` at the bottom of `js/config.js`.
The header logo is configured in `HEADER_LOGO`. Images can be paths in this repo
or full GitHub image links.

## Files
```
index.html        the page (runs everything)
css/cards.css     shared: colors, cards, flip view, photos
css/showcase.css  title banner, search/filter bar, grid
css/featured.css  Featured Projects row
js/config.js      settings: CSV path + photo root + banner images
js/banner.js      fills in the title banner
js/cards.js       card building, flip view, loading the CSV
js/featured.js    Featured Projects row + arrows
js/showcase.js    search, filters, sort, grid
images/
  Banner.jfif     banner background photo
  Gears-05.png    header logo
  projects/       one local photo folder per project
```
Scripts load in this order in `index.html`: `config.js`, `banner.js`, `cards.js`, `featured.js`, `showcase.js`.
