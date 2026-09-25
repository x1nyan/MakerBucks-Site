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
Set the form's `Image Folder Path` to a repository-relative folder such as
`images/Project 2026/ABV Meter`. Name the cover image `Cover` with a supported
extension. Hosts that expose directory listings can populate the full photo
carousel; on hosts without listings, the site probes for the cover image and
shows that photo alone.

Upload photos into the exact repository folder in the form. Rows missing
required content or a readable cover image are skipped automatically.

The **Resize uploaded images** GitHub Action processes new or changed JPEG, PNG,
and WebP files under `images/`. It caps the longest dimension at 2400 pixels and
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
- `data/projects/*.json`: editable Pages CMS project forms.
- `scripts/showcase_data.py`: migrate, build, and verify project data.
- `scripts/resize_images.py`: optimize supported uploaded photos.
- `.github/workflows/`: CSV rebuild and image optimization automation.
- `MASTER_DOCUMENTATION.md`: full architecture and maintenance guide.
