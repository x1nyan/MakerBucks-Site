# Contributor Guide

This guide is for people making their first change to the MakerBucks Showcase,
including contributors who are new to HTML, CSS, JavaScript, Python, YAML,
JSON, CSV, or Git. You do not need to learn every language before editing
project descriptions. Start with the task you need to do and use the file map
below.

## 1. What This Project Is

The site is a collection of static files: a browser opens `index.html`, loads
CSS for presentation, runs JavaScript for interaction, and reads generated CSV
data for projects. There is no server-side application and no `npm install` or
compile step.

The content workflow looks like this:

```text
Pages CMS forms (JSON) + uploaded image files
                  |
                  v
       GitHub Actions / Python
                  |
                  v
 Project CSV + footer CSV + JS fallback
                  |
                  v
       HTML page + browser JavaScript
```

The source forms and image files are the things to edit. The CSV files and
`js/project-data.js` are generated outputs. Editing generated output directly
is temporary: a later build replaces it.

## 2. First-Time Setup

### Software

- Git, for getting the repository and synchronizing changes.
- Visual Studio Code, or another text editor.
- Python 3.10 or newer. On Windows, the `py` command is usually available
  after installing Python and selecting the option to install the Python
  launcher.
- A modern browser such as Chrome, Edge, or Firefox.

The normal data scripts use only Python's standard library. Image optimization
uses Pillow in GitHub Actions. You only need Pillow installed locally if you
want to run `scripts/resize_images.py` yourself.

### Open the Site

Open a PowerShell terminal at the repository root, the folder containing
`index.html`, and run:

```powershell
py -m http.server 8000
```

Visit <http://localhost:8000/> in your browser. The terminal is the running
web server; leave it open while testing. Press `Ctrl+C` to stop it. If port
8000 is already occupied, use another port, such as `py -m http.server 8001`,
and open that port in the browser.

The HTTP server matters because browsers restrict some file access on
`file://` pages. The app fetches CSV files and loads photos using web URLs.

## 3. Beginner Vocabulary

These terms refer to actual parts of this repository:

| Term | Meaning here |
| --- | --- |
| HTML | The page structure: headings, buttons, input fields, and sections in `index.html`. |
| CSS | The visual rules: colors, spacing, card layout, responsive sizes, and animations in `css/`. |
| JavaScript | Browser code that loads data, builds project cards, and responds to clicks and typing in `js/`. |
| Python | Small maintenance programs in `scripts/` that convert and validate data or optimize photos. |
| YAML | Indented configuration used by Pages CMS (`.pages.yml`) and GitHub Actions (`.github/workflows/*.yml`). |
| JSON | Structured content files for projects and the footer (`data/projects/*.json`, `data/footer.json`). |
| CSV | A table-like text format used as the browser's project-data feed. It is generated from JSON forms. |
| DOM | The browser's in-memory representation of HTML. JavaScript finds elements by `id` and updates them. |
| Selector | A CSS pattern such as `.project-grid` or `#themeToggle` that chooses which HTML elements to style. |
| Workflow / Action | An automated GitHub job that runs after matching repository changes or a manual request. |
| Source of truth | The editable original. Here, project JSON forms are authoritative; CSVs are generated from them. |

File extensions are hints, not magic: `.html`, `.css`, `.js`, `.py`, `.yml`,
`.json`, and `.csv` each have different syntax. Use an editor with syntax
highlighting, preserve indentation, and make only the change you intend.

## 4. Where to Make Common Changes

| Goal | Start here | Also check |
| --- | --- | --- |
| Change a project description, maker, category, or Featured status | Pages CMS `Projects`, or one form in `data/projects/` | Wait for **Build projects CSV**; review `MakerBucks_Database.csv` after it finishes. |
| Change the donor statement | Pages CMS `Footer` form (`data/footer.json`) | Wait for the same data-build workflow. |
| Change the banner title or rotating banner images | `js/config.js`, object `BANNER` | Confirm the image paths exist under `images/`. |
| Change the header logo | `js/config.js`, object `HEADER_LOGO` | Check the alternative text and image path. |
| Change theme colors or card faces | `css/cards.css` | Check both `data-theme="light"` and `data-theme="dark"`. |
| Change search, filters, sort, or grid layout | `js/showcase.js` and `css/showcase.css` | Keep the IDs in `index.html` aligned with JavaScript lookups. |
| Change the featured row | `js/featured.js` and `css/featured.css` | The Featured boolean comes from project data. |
| Change card content or photo carousels | `js/cards.js` and `css/cards.css` | Check escaping, keyboard operation, and both card faces. |
| Add a project field | `.pages.yml`, project JSON schema, `scripts/showcase_data.py`, and `js/cards.js` | This changes a data contract; update all layers and docs together. |
| Change accepted photo formats or size policy | `.pages.yml`, `scripts/resize_images.py` | Update this guide and `README.md`; check workflow behavior. |
| Change automated builds | `.github/workflows/` | Preserve permissions, branch behavior, and path filters. |

The full module inventory is in [MASTER_DOCUMENTATION.md](MASTER_DOCUMENTATION.md).

## 5. Edit Project Content in Pages CMS

1. Open the repository in Pages CMS and choose **Projects**.
2. Select a project to edit, or create a new entry. A new JSON filename is
   generated from the project title; you do not type the `.json` path.
3. Enter a clear title and maker attribution. The title is used in the card
   and helps name the form file.
4. Choose one or more categories. Categories are free-form labels, not a
   fixed dropdown. Use existing spelling and capitalization when possible so
   filters remain consistent. Avoid commas inside one category name because
   commas separate multiple categories in the generated CSV.
5. Set **Featured** if the project should appear in the featured row.
6. Fill in Overview, Scope, Materials, Fabrication Steps, and Outcome. Use
   numbered lines for steps and `•` bullets for materials when appropriate;
   those patterns also contribute to the default detail score.
7. Upload photos through **Project photos**. Keep a separate folder for each
   project to avoid filename collisions. The CMS stores the selected image
   paths in the project form; it does not derive the image folder from the
   project title.
8. Name one image `Cover` with its normal extension, such as `Cover.jpg`.
   The generated carousel puts it first. A project without a Cover image
   fails the data build.
9. Save and check the **Build projects CSV** workflow under the repository's
   Actions tab. Wait for success before checking the site.

To delete an entry, use the delete operation in the Projects collection. Its
JSON file disappears; the data workflow then regenerates the CSV without it.
Deleting the entry does not delete its photo files automatically.

### Project Form Fields

| Field | What it is used for |
| --- | --- |
| `title` | Required project name; card heading and file-name source. |
| `maker` | Required maker name(s), displayed with the project. |
| `categories` | Required list of one or more filter categories. |
| `featured` | Boolean toggle; `true` includes the project in the featured row. |
| `overview` | Required short project introduction. |
| `scope` | Required description of what the project work covered. |
| `materials` | Required material list; line breaks are preserved in the CSV. |
| `fabricationSteps` | Required making/build process; numbered steps are recommended. |
| `outcome` | Required result or outcome description. |
| `photos` | Required uploaded-image paths; include a file named `Cover`. |
| `notes` | Optional internal or supplemental note; not currently shown in the UI. |
| `order` | Hidden legacy/source ordering field; normally leave it alone. |

## 6. Project Photos: Formats, Size, and Deletion

Pages CMS is configured to accept JPG/JPEG, PNG, WebP, GIF, APNG, SVG, and
AVIF. The upload limit is enforced by the **Resize uploaded images** workflow
after an image is committed, not before transfer. Each changed image must be
20 MiB or smaller. A larger file fails with an error like:

```text
File is too big: images/... is 24.0 MiB; the limit is 20 MiB.
```

The file may already exist in the branch when that workflow fails. Resize it
or delete it, commit the correction, and check that the next workflow
succeeds. The workflow optimizes non-animated JPEG, PNG, and WebP images:
the longest side is reduced to at most 1600 pixels, EXIF metadata is removed,
and the result replaces the original only when dimensions change or the
optimized file is smaller. GIF, APNG, SVG, and AVIF are kept unchanged.

To delete an entire photo folder, use **Delete project photo folder** from
the Pages CMS Project photos media page. Enter only the folder name directly
under `images/Project 2026/`, not the full path. The confirmation warns that
all files in that folder will be permanently removed. The workflow refuses
to delete it while a project JSON form references any image in that folder.
Remove those photo references (or delete the project) first, let the data
workflow finish, and then run the folder-deletion action.

## 7. HTML, CSS, and JavaScript Basics in This Site

### HTML: page structure

HTML uses elements with opening and closing tags. For example:

```html
<button id="clearFiltersBtn" type="button">Clear filters</button>
```

`button` is the element type, `id` gives that specific element a stable name,
and the text between the tags is visible to the user. JavaScript uses
`document.getElementById('clearFiltersBtn')` to find it. CSS can use `#` plus
the ID to style it. If you rename an ID in `index.html`, search the whole
repository and update every JavaScript/CSS reference. Prefer real elements
such as `<button>` for actions and `<a>` for navigation; they provide useful
keyboard and screen-reader behavior automatically.

The page structure and script tags are in `index.html`. Keep data and visual
behavior out of the HTML where an existing JavaScript or CSS module owns it.

### CSS: appearance and responsive layout

CSS rules consist of a selector and declarations:

```css
.project-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
```

`.project-grid` selects elements whose `class` includes `project-grid`.
Declarations between braces set their appearance. A `#someId` selector uses
an HTML `id`; a `.someClass` selector uses a class. This repository splits
styles by ownership: `cards.css` for shared cards and themes, `showcase.css`
for page controls and the grid, and `featured.css` for the featured carousel.

Media queries adapt the page to viewport size. The current grid uses three
columns above 1000px, two columns from 701px to 1000px, and one column at
700px and below. Test all three ranges when changing widths, font sizes, or
card content. Theme colors depend on `data-theme="light"` or
`data-theme="dark"` on the root `<html>` element.

### JavaScript: browser behavior

JavaScript selects HTML elements, reads their state, and responds to events:

```javascript
const clearButton = document.getElementById('clearFiltersBtn');
clearButton.addEventListener('click', clearAllFilters);
```

This finds the button and calls `clearAllFilters` when it is clicked. Most
modules wrap their implementation in a function so local variables do not
leak into other files. The shared API lives at `window.MB` (usually referred
to as `MB`): `config.js` creates configuration, and `cards.js` adds shared
project-loading and card-building functions. Script order in `index.html` is
important; see the master reference before moving script tags.

For project content, edit CMS forms rather than writing JavaScript. For a
layout change, begin with CSS. Change JavaScript only when behavior or data
processing needs to change.

## 8. Python, YAML, JSON, and CSV Basics

### Python (`.py`)

Python uses indentation to define blocks. Do not remove indentation when
editing a function. In this repository, `scripts/showcase_data.py` handles
project conversion and verification; `scripts/resize_images.py` optimizes
images; and `scripts/delete_photo_folder.py` runs the guarded folder removal.
Run a script from the repository root with `py scripts/name.py command`.
Errors are printed to the terminal and the script exits unsuccessfully, which
also makes a GitHub Action show as failed.

### YAML (`.yml` / `.yaml`)

YAML is configuration, not a programming language. Indentation shows which
settings belong to which item. Use spaces, not tabs, and keep indentation
consistent. For example, `extensions` below is a setting inside the named
media source:

```yaml
media:
  - name: photos
    input: images
    extensions: [jpg, jpeg, png, webp]
```

The CMS uses `.pages.yml`; GitHub Actions use `.github/workflows/*.yml`.
A wrong indentation level can change meaning or make the configuration
invalid. Ask VS Code for diagnostics after editing YAML.

### JSON (`.json`)

JSON stores values as key/value pairs. Strings use double quotes, lists use
square brackets, and objects use curly braces. Unlike JavaScript objects,
JSON does not allow comments or trailing commas:

```json
{
  "title": "Example project",
  "featured": false,
  "categories": ["Robotics"],
  "photos": ["images/Project 2026/Example/Cover.jpg"]
}
```

Use Pages CMS for regular content edits so required fields and valid values
are handled by the form.

### CSV (`.csv`)

CSV is a table represented as text: the first row contains column names and
each later row contains a project. Commas separate cells unless a cell is
quoted. Quotes and line breaks in project descriptions are escaped by the CSV
writer. A project's `Photos` cell contains one image path per line inside the
CSV cell. Never hand-edit the generated project or donor CSV files; edit the
JSON form and rebuild instead.

## 9. Data Commands and Their Effects

Run commands from the repository root:

```powershell
py scripts/showcase_data.py check
py scripts/showcase_data.py build
py scripts/showcase_data.py migrate
```

| Command | Reads | Writes | When to use |
| --- | --- | --- | --- |
| `check` | project JSON, footer JSON, generated CSVs | nothing | Confirm forms match the current generated data. |
| `build` | project JSON and footer JSON | `MakerBucks_Database.csv`, `DonorStatement.csv`, `js/project-data.js` | Regenerate website data after form changes or when the Action is unavailable. |
| `migrate` | legacy project CSV | creates `data/projects/*.json` | One-time conversion only; refuses to overwrite a non-empty forms folder. |

`build` sorts project forms using their hidden `order` value (then title),
validates required fields, requires each project's Cover photo, writes CSV
with proper quoting, and updates the embedded data snapshot. `check` compares
generated rows to the current CSV and verifies the donor CSV against
`data/footer.json`. Run `build` followed by `check` after changing the data
pipeline itself.

## 10. GitHub Actions and Git Safety

The workflows under `.github/workflows/` are automated scripts hosted by
GitHub:

- `build-projects-csv.yml` runs when project forms, the footer form, or the
  data script changes. It builds the CSVs and fallback JS, then commits them
  if generated output changed.
- `resize-images.yml` runs when anything under `images/` changes. It finds
  added or modified image paths, validates their size, optimizes supported
  raster files, and commits optimization changes if there are any.
- `delete-photo-folder.yml` runs when requested from the Pages CMS media
  action. It checks references and path safety before deleting one folder,
  then commits the deletion.

These workflows serialize content-maintenance jobs for a branch and push
generated commits back to that same branch. Repository Actions settings must
allow contents writes; branch protection must allow the Actions bot to push.
If an Action fails, open its log in GitHub's **Actions** tab, find the first
red failing step, read the error, correct the source form/file, and retry by
making a new commit or using the workflow's manual run option where available.

Useful Git commands:

```powershell
git status --short --branch
git pull
git diff
```

`git status` shows the branch and local changes. `git pull` downloads and
integrates newer commits. `git diff` shows edits not yet committed. Always
review status before pulling or committing, and do not discard files you did
not edit yourself.

## 11. Validation Checklist

Before considering a change ready:

1. Run `git diff --check` to catch whitespace errors.
2. For project data, run `py scripts/showcase_data.py check`.
3. For data-generation code, run `py scripts/showcase_data.py build`, then
   `py scripts/showcase_data.py check`, and review generated-file changes.
4. For image-processing changes, test a small valid image and the relevant
   boundary/error case without using real project photos as test fixtures.
5. Start the HTTP server and check the browser console for failed requests.
6. Test search, filters, sorting, card opening/closing, photo navigation,
   theme persistence, and desktop/tablet/phone layouts when those areas
   could be affected.
7. Check keyboard operation and reduced-motion behavior for interaction or
   animation changes.
8. Inspect `git status` and `git diff`; make sure generated output is expected
   and unrelated local changes remain untouched.

There is currently no dedicated automated JavaScript test suite. The Python
`check` command is the project's data consistency check, not a browser test.

## 12. Common Problems

### The page is blank or says project data could not load

- Confirm `py -m http.server 8000` is still running and you opened
  `http://localhost:8000/`.
- Confirm `MakerBucks_Database.csv` exists next to `index.html`.
- Open browser developer tools, select **Console** and **Network**, and look
  for the first failed JavaScript or CSV request.
- Run `py scripts/showcase_data.py build` if forms are newer than generated
  data, then reload the page.

### The build fails after changing project content

- Read the error for the project filename and field name.
- Confirm title, maker, categories, overview, scope, materials, fabrication
  steps, outcome, and photo paths are present.
- Confirm at least one referenced photo's filename is `Cover` (case does not
  matter) and its extension is supported by the image field.
- Avoid commas inside a single category name.

### Photos do not appear

- Confirm the image path in the form exactly matches a repository path and
  that the file exists under `images/`.
- Confirm the image is listed in the generated CSV's `Photos` column.
- Check letter casing and spaces in the path; deployed hosts may distinguish
  uppercase and lowercase names.
- For files over 20 MiB, inspect the image Action and replace or delete the
  oversized upload.

### The image-processing workflow fails

- Look for the exact `File is too big` message and reduce any file over
  20 MiB.
- Confirm the uploaded file uses one of the allowed extensions.
- JPEG, PNG, and WebP are decoded by Pillow. If the file is corrupt or its
  extension does not match its real contents, replace it with a valid image.
- SVG, AVIF, GIF, and APNG are stored unchanged by the optimizer.

### A photo folder cannot be deleted

- The folder-delete action accepts only one direct child folder of
  `images/Project 2026/`; enter its folder name alone.
- The action blocks deletion if any project JSON still includes a path under
  that folder. Remove those photo references first.
- It refuses missing folders and unsafe path names.

### The page changed locally but not online

- Check whether your edits were committed and pushed to the branch used by the
  deployed site.
- Check GitHub Actions for the CSV or image workflow. Wait for generated-data
  commits to complete before making additional edits on that branch.
- Refresh the page without cache if the deployment is current but the browser
  still shows old assets.

## 13. More Detail

For the full file map, script contracts, data model, responsive behavior,
accessibility notes, and task-specific maintenance instructions, see
[MASTER_DOCUMENTATION.md](MASTER_DOCUMENTATION.md).