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
New projects should be submitted through the Google Form. Once the URL is set
in `js/config.js`, a **Submit a project** link appears in the site header.

Current placeholder:
`PASTE_GOOGLE_FORM_LINK_HERE`

The site maintainer reviews the submission, uploads the submitted photo to the
repository, and adds the resulting CSV row. In `js/config.js`, replace the
empty `PROJECT_SUBMISSION_FORM_URL` value with the form link when it is ready.
The page reads `MakerBucks_Database.csv` every time it loads.

## Project photos
Set each row's `Image Folder Path` to a relative folder such as
`images/Project 2026/ABV Meter`. The folder must contain a `cover` image;
all other supported image files in the folder are added to that project's
carousel automatically.

The form should collect every required project field and the relative image
folder path. Upload the image files to that exact repository folder, using a
filename that starts with `cover` for the main image. Rows missing required
content or a readable cover image are skipped automatically.

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
js/config.js      settings: CSV path, banner images, and logo
js/banner.js      fills in the title banner
js/cards.js       card building, flip view, loading the CSV
js/featured.js    Featured Projects row + arrows
js/showcase.js    search, filters, sort, grid
images/
  Banner.jfif     banner background photo
  Gears-05.png    header logo
  Project 2026/   one local photo folder per project
```
Scripts load in this order in `index.html`: `config.js`, `banner.js`, `cards.js`, `featured.js`, `showcase.js`.
