# MakerBucks Showcase

A static project gallery for the WPI MakerBucks program. It runs in a web
browser and does not use a JavaScript framework or a package-build step. The
site has a rotating banner, light/dark theme, featured-project carousel,
search and filters, responsive project cards, and expanded project details.

## Start Here

- New to this repository or web development? Read [CONTRIBUTING.md](CONTRIBUTING.md).
- Need the complete architecture and maintenance reference? Read
  [MASTER_DOCUMENTATION.md](MASTER_DOCUMENTATION.md).
- Want to edit project descriptions without writing code? Use the
  [Pages CMS](https://app.pagescms.org/) workflow below.

## Run Locally

Install Python 3.10 or newer. From the repository root, the folder containing
`index.html`, start a local static web server:

```powershell
py -m http.server 8000
```

Open <http://localhost:8000/>. Keep the terminal running while using the site.
Press `Ctrl+C` in that terminal to stop the server. Do not open `index.html` as
a `file://` URL: the browser needs HTTP to load the CSV and photos consistently.

## Edit Projects

Each project is a JSON form in `data/projects/`. In Pages CMS, open the
`Projects` collection to create, edit, or delete an entry. New filenames come
from the project title. Save the form and wait for the **Build projects CSV**
GitHub Action to finish; it regenerates the website data. Do not edit
`MakerBucks_Database.csv` or `js/project-data.js` by hand because the next
build replaces them.

Project photos are uploaded through the form's **Project photos** field. Put
them in a project-specific folder under `images/` and name one image `Cover`
(for example, `Cover.jpg`). The image paths are stored in the form. Folder
names are not generated from project titles automatically. To remove an
unreferenced folder under `images/Project 2026/`, use **Delete project photo
folder** on the CMS media page; the workflow refuses to delete photos still
used by a project.

Supported upload extensions are JPG/JPEG, PNG, WebP, GIF, APNG, SVG, and AVIF.
Files larger than 20 MiB fail the image-processing Action with a `File is too
big` message. That check happens after CMS upload, so replace or delete the
oversized file after the Action fails. JPEG, PNG, and WebP are resized to a
maximum 1600 pixels on the longest side and have EXIF metadata removed; other
supported formats are kept unchanged.

## Project Data Commands

Run these in PowerShell from the repository root:

```powershell
py scripts/showcase_data.py check
py scripts/showcase_data.py build
```

`check` verifies that project forms match the generated project CSV and that
the footer form matches its generated CSV. `build` regenerates both CSV files
and the embedded fallback at `js/project-data.js`. Run `check` after editing
forms or changing the data-generation script.

`migrate` is a one-time conversion from the legacy project CSV into JSON forms:

```powershell
py scripts/showcase_data.py migrate
```

It refuses to run if `data/projects/` already contains files. Do not run it on
an established forms directory.

## Before Editing Code

1. Run `git status` and `git pull` so you start from the latest branch.
2. Edit the source file, not its generated output. The contributor guide maps
	common tasks to their owning files.
3. Run the checks for the files you changed. For data-pipeline changes, use
	`py scripts/showcase_data.py build` and then `py scripts/showcase_data.py check`.
4. Test the site through the local HTTP server at desktop and phone widths.
5. Review `git diff` before committing. GitHub Actions also regenerate data
	and optimize newly uploaded photos.

The GitHub workflows need repository **contents: write** permission so the
Actions bot can commit generated files. Branch protection must permit those
bot commits.
