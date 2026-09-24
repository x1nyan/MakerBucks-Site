# MakerBucks Showcase

Project cards for WPI MakerBucks, pulled live from a Google Sheet.

- `index.html`: the main showcase (search, category filter, sort, grid)
- `featured.html`: only projects marked **TRUE** in the Featured column, in a side-scrolling row

## Changing the content
Edit the Google Sheet. The pages read it every time they load.
The sheet must be shared as **Anyone with the link can view**.

## Pointing at a different sheet
Paste the sheet's link into `SHEET_URL` in `js/config.js`. Both pages use it.

## Files
```
index.html        main page
featured.html     featured page
css/cards.css     shared: colors, cards, flip view, photos
css/showcase.css  main page layout
css/featured.css  featured page layout
js/config.js      shared: Google Sheet link
js/cards.js       shared: card building, flip view, loading the sheet
js/showcase.js    main page: search, filters, sort, grid
js/featured.js    featured page: featured row + arrows
```
Scripts must load in order: `config.js`, then `cards.js`, then the page script.
