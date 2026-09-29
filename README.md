# MakerBucks Showcase

Static project gallery for WPI MakerBucks. The page includes a centered logo,
a persistent light/dark theme switch, a featured-project carousel, search and
filters, and project cards. The main grid has three columns on desktop, two on
tablet, and one vertically scrolling column on phones.

For complete architecture, data, styling, and maintenance details, see
[`MASTER_DOCUMENTATION.md`](MASTER_DOCUMENTATION.md).

## Editing projects in Pages CMS
Connect this repository in [Pages CMS](https://app.pagescms.org/). Its `Projects`
collection edits one JSON form per project under `data/projects/`, with separate
multiline fields, a Featured toggle, and a category multi-select.
New project forms are saved automatically as a slugged project title plus
`.json`; entries can also be deleted from the collection.

The JSON forms are the source of truth. Saving a form triggers the **Build
projects CSV** GitHub Action, which regenerates `MakerBucks_Database.csv` for
the website. Do not edit the CSV directly; the next build will replace it. Wait
for the Action to finish before checking the live site, and run `git pull` before
starting local edits.

Both repository workflows need GitHub Actions to have contents write
permission, and branch rules must allow the Actions bot to push generated files.

The migration and verification commands are:

```powershell
py scripts/showcase_data.py migrate
py scripts/showcase_data.py check
```

`migrate` creates forms from the current CSV and refuses to overwrite an
existing non-empty forms directory. `check` compares every project value with
the CSV. To regenerate the CSV locally, run `py scripts/showcase_data.py build`.

## Project photos
Use the form's `Project photos` field to upload the project's images directly
through the CMS; the selected image paths are written into the form automatically.
Create a per-project folder under `images/` when uploading to keep filenames such
as `Cover.jpg` distinct; Pages CMS does not generate project-specific image
folders from the project title. Name one uploaded photo
`Cover` (with a supported extension) so it appears first in the carousel. The
CMS commits the photos to the repository and writes their paths into the form;
**Build projects CSV** then lists them in the CSV's `Photos` column and fails
if no photo is named `Cover`.

To remove a photo folder, use **Delete project photo folder** on the Project
photos media page and enter its folder name under `images/Project 2026/`. The
action refuses to delete folders whose photos are still referenced by a project
form.

The **Resize uploaded images** GitHub Action processes new or changed JPEG, PNG,
and WebP files under `images/`. It caps the longest dimension at 800 pixels and
removes EXIF metadata. SVG and animated GIF files are left unchanged.

## Run locally
From the repository root, serve the site over HTTP:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/`. Do not use a `file://` URL; the site fetches the
CSV and local photos over HTTP.

## Site settings
- Banner title and rotating images: `BANNER` in `js/config.js`.
- Header logo and alternative text: `HEADER_LOGO` in `js/config.js`.
- Light/dark theme: use the header switch; the preference is saved in browser storage.
- Main card layout and colors: `css/showcase.css` and `css/cards.css`.
- Featured carousel layout: `css/featured.css` and `js/featured.js`.
- CMS fields and category options: `.pages.yml` and `scripts/showcase_data.py`.

## Key files
- `index.html`: page markup and script loading order.
- `MakerBucks_Database.csv`: generated site data; do not edit directly.
- `DonorStatement.csv`: generated footer donor statement; do not edit directly.
- `data/projects/*.json`: editable Pages CMS project forms.
- `data/footer.json`: editable Pages CMS footer donor statement form.
- `scripts/showcase_data.py`: migrate, build, and verify project data.
- `scripts/resize_images.py`: optimize supported uploaded photos.
- `.github/workflows/`: CSV rebuild and image optimization automation.
- `MASTER_DOCUMENTATION.md`: full architecture and maintenance guide.
