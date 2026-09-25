# MakerBucks Showcase - Master Documentation

## 1. Purpose

This is a static browser application for displaying MakerBucks projects from a local CSV file. It provides:

- A rotating banner image.
- Header links for the WPI site and project applications.
- A Featured Projects carousel.
- Search, category filtering, featured-only filtering, and sorting.
- Responsive project cards with image carousels.
- An expanded card view with a 3D flip to project details.

The application has no build step and no package dependencies.

## 2. Running the Site

The browser must load the CSV through HTTP. Opening `index.html` directly with a `file://` URL can block CSV loading.

From the project directory, use any static server. For example, with Python:

```text
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

The site loads project data when the page starts. Both the Featured section and the main grid share the same cached data request.

## 3. File Structure

```text
index.html
MakerBucks_Database.csv
MASTER_DOCUMENTATION.md
README.md

css/
  cards.css       Shared variables, cards, flip view, photos, and loading states.
  featured.css    Featured Projects section and horizontal scrolling.
  showcase.css    Controls, banner, main grid, and responsive layout.

js/
  config.js       CSV, photo, banner, and logo settings.
  banner.js       Banner image rotation and crossfade.
  logo.js         Header logo loading.
  cards.js        CSV parser, project model, cards, photo carousel, and flip view.
  featured.js     Featured project filtering and carousel arrows.
  showcase.js     Search, filters, sorting, and main grid rendering.

images/
  Banner.jfif    Banner image.
  baner2.JPG      Optional banner image.
  baner3.JPG      Optional banner image.
  baner4.JPG      Optional banner image.
  Gears-05.png    Header logo.
  Project 2026/   Local project-photo folders.
```

## 4. Script Load Order

Scripts are loaded at the bottom of `index.html` in this order:

1. `config.js` creates `window.MB.config`.
2. `logo.js` loads the configured header logo.
3. `banner.js` loads and rotates banner images.
4. `cards.js` creates shared card tools and `MB.loadProjects()`.
5. `featured.js` loads the Featured Projects row.
6. `showcase.js` loads the main grid and controls.

`cards.js` must run before `featured.js` and `showcase.js` because both use `MB.loadProjects()` and `MB.makeCardEl()`.

## 5. Configuration

Configuration lives in `js/config.js`:

```javascript
const CSV_URL = 'MakerBucks_Database.csv';
```

`BANNER` contains:

- `title`: document title and banner heading.
- `imageUrls`: banner image paths or remote image URLs.
- `intervalMs`: time between banner changes.
- `fadeMs`: banner image crossfade duration.

`HEADER_LOGO` contains:

- `logoUrl`: local or remote logo path.
- `logoAlt`: accessible logo description.

`MULTI_WORD_CATEGORIES` contains optional category names that include commas and need manual parsing protection.

## 6. CSV Format

The CSV header is:

```text
Project,Maker(s),Category,Featured,Overview,Scope,Materials,Fabrication Steps,Outcome,Photos,Url,Notes
```

Important fields:

- `Project`: required card title. Blank rows are ignored.
- `Maker(s)`: maker attribution.
- `Category`: one or more categories separated by commas.
- `Featured`: use `TRUE` to show the project in Featured Projects.
- `Overview`: front-card description.
- `Scope`: front-card scope text.
- `Materials`: expanded-card materials section.
- `Fabrication Steps`: expanded-card fabrication section.
- `Outcome`: expanded-card outcome section.
- `Image Folder Path`: relative folder containing the project's images.
- `Url`: retained as source data but not currently displayed by the UI.
- `Notes`: available in the CSV but not currently displayed by the UI.

The parser supports quoted fields containing commas and line breaks, which is required for the Materials and Fabrication Steps columns.

## 7. Project Photo Folders

Set the `Image Folder Path` to the project's relative image folder. The folder
must contain a supported image whose filename starts with `cover`; all other
supported images are discovered and added to the carousel in filename order.
For example:

```text
Image Folder Path: images/Project 2026/ABV Meter
  Cover.jpg
  72A36A92-B1B8-41D6-A9C8-8332A74370C1.jpeg
```

The site must be served through HTTP so it can read the folder's directory
listing. Remote photo URLs are not used.

## 8. New Project Submission Workflow

The designated Google Form should collect the required project fields and the relative
`Image Folder Path`. After reviewing a submission:

1. Upload the submitted image files to that exact folder in the repository.
2. Name the main image `cover` with a supported image extension.
3. Add the approved row to `MakerBucks_Database.csv` using the form values.
4. Serve the site through HTTP and reload it.

Rows missing required content or a readable cover image are skipped and do not
create tiles or error cards. Optional fields are `Featured`, `Url`, and `Notes`.

## 9. Data Flow

```text
config.js
  -> CSV_URL

cards.js
  -> fetch CSV
  -> parse quoted CSV rows
  -> normalize project fields
  -> resolve photo URLs
  -> calculate content score
  -> cache the Promise

featured.js
  -> reuse cached projects
  -> keep Featured = TRUE
  -> sort by score
  -> render horizontal cards

showcase.js
  -> reuse cached projects
  -> render all cards
  -> apply search, category, featured, and sort state
```

## 9. Main Grid Controls

`js/showcase.js` owns the main grid state:

- `allProjects`: all parsed projects.
- `selectedCategories`: selected category filters.
- `featuredOnly`: Featured-only checkbox state.
- `currentSort`: detail, featured, title A-Z, title Z-A, or maker.
- `searchDebounceTimer`: delays filtering until typing pauses.

Filtering does not rebuild cards. It toggles `.is-hidden` on existing cards and updates the result count.

Sorting rebuilds the main grid through `renderAll()`, then reapplies active filters.

The filter dropdown is created dynamically from the categories found in the CSV.

## 10. Card Rendering

`js/cards.js` builds both sides of each card:

### Front

- Photo carousel or a no-photo placeholder.
- Category tags.
- Maker name.
- Project title.
- Overview.
- Scope.

### Expanded back

- Project title and maker.
- Materials.
- Outcome.
- Fabrication Steps.

All CSV text inserted into HTML passes through `escapeHtml()`.

## 11. Card Flip Behavior

The card flip is shared by Featured and main-grid cards.

### JavaScript

`openCard()` in `js/cards.js`:

1. Records the original card position.
2. Creates an overlay and expanded card.
3. Clones the card front and builds the back.
4. Measures the required back-card size.
5. Locks page scrolling.
6. Adds `.flipped` on the next animation frames.
7. Adds `.settled` after the rotation finishes.

`closeCard()` reverses those steps and restores focus to the original title button.

### CSS

`css/cards.css` controls:

- Expanded-card position and size transitions.
- 3D perspective and `rotateY(180deg)`.
- Backface visibility.
- White back face.
- Delayed back-content fade.
- Overlay opacity and blur.

The CSS and JavaScript settle duration must remain coordinated. If the flip duration changes, update `ANIMATION_MS` in `cards.js` to finish after the CSS rotation.

## 12. Photo Carousels

Cards with more than one photo receive:

- Previous and next buttons.
- Dot navigation.
- A blurred backdrop based on the active image.

`goToSlide()` in `cards.js` updates the active image, dot, and backdrop. Carousel controls are handled through document-level event delegation so dynamically rebuilt cards continue to work.

## 13. Featured Projects

`js/featured.js`:

- Filters projects where `featured` is true.
- Sorts featured projects by content score.
- Hides the entire section if no projects are featured.
- Enables previous/next scrolling.
- Updates arrow disabled states during scrolling and resizing.

`css/featured.css` controls the responsive horizontal track, complete-card sizing, snap points, hidden scrollbar, and side spacing.

## 14. Banner and Logo

`js/banner.js` uses two image layers:

- The active image fades out.
- The preloaded next image fades in.
- The overlay and title remain stable above the images.

`js/logo.js` loads the configured header logo and hides it if it cannot load.

## 15. CSS Responsibilities

### `css/cards.css`

Shared color variables, body defaults, card faces, card typography, expanded flip view, overlay, photo carousel, loading state, and reduced-motion behavior.

### `css/showcase.css`

Search and filter controls, title banner, header bar, main grid, desktop/tablet/mobile breakpoints, and page-load animation.

### `css/featured.css`

Featured section layout, horizontal track, arrows, whole-card snapping, and responsive spacing.

## 16. Accessibility and Interaction Notes

- Buttons use real `<button>` elements.
- Links opening external sites use `target="_blank"` with `rel="noopener noreferrer"`.
- Focus-visible outlines use the burnt-orange accent.
- The expanded card is a dialog with an accessible label.
- Escape closes an expanded card.
- Page scrolling is locked while a card is expanded.
- Reduced-motion users receive disabled transitions where supported.
- Text selection does not accidentally open a card.

## 17. Common Maintenance Tasks

### Add a project

1. Add a row to the CSV using the existing header order.
2. Use `TRUE` in `Featured` if it belongs in Featured Projects.
3. Create its image folder and add a `cover` image plus any carousel images.
4. Set the row's `Image Folder Path` to that folder.
5. Serve the site through HTTP and reload.

### Change the banner

Edit `BANNER.imageUrls` in `js/config.js`.

### Change the logo

Edit `HEADER_LOGO.logoUrl` in `js/config.js`.

### Change card layout

- Main grid and controls: `css/showcase.css`.
- Card size, typography, and flip: `css/cards.css`.
- Featured row: `css/featured.css`.

### Change card data behavior

Edit the CSV parser and project construction in `js/cards.js`.

## 18. Troubleshooting

### Cards do not load

- Confirm the site is running through HTTP, not `file://`.
- Confirm `MakerBucks_Database.csv` is beside `index.html`.
- Check the browser console for a failed CSV request.

### A local photo does not load

- Confirm the CSV `Image Folder Path` points to the correct relative folder.
- Confirm the folder contains a supported image named `cover`.
- Check capitalization and file extensions.

### A project is missing from Featured Projects

- Confirm its CSV `Featured` value is exactly `TRUE`.
- Confirm the CSV row has a project name.

### Categories look incorrect

- Check comma-separated category spelling.
- Add a comma-containing category to `MULTI_WORD_CATEGORIES` in `js/config.js` if automatic parsing cannot distinguish it.

### Flip animation looks wrong

- Keep `ANIMATION_MS` in `js/cards.js` slightly longer than the flip transition in `css/cards.css`.
- Check that the expanded face rules retain `backface-visibility: hidden`.

## 19. Validation

After changes, run the VS Code diagnostics on:

- `index.html`
- `js/config.js`
- `js/cards.js`
- `js/banner.js`
- `js/logo.js`
- `js/featured.js`
- `js/showcase.js`
- `css/cards.css`
- `css/featured.css`
- `css/showcase.css`

Then load the page through a local HTTP server and test:

1. CSV loading.
2. Search and clear-search behavior.
3. Category and Featured-only filters.
4. Each sort option.
5. Featured arrows and mobile swiping.
6. Card opening, flip, close, and Escape.
7. Photo carousel buttons and dots.
8. Desktop, tablet, and mobile layouts.
