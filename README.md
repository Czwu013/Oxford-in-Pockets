# Oxford in Pockets

[中文说明](README.zh-CN.md) · [Magdalen through the seasons](docs/magdalen-gallery.html) · [Full city panorama](docs/oxford-panorama.jpg)

A miniature Oxford you can explore in a browser. Start above the city, choose a coloured neighbourhood, then follow its streets at walking height. Trees, people, daylight and weather keep their place as you move between the full map and an individual pocket.

![Fourteen illustrated neighbourhoods across Oxford](docs/oxford-panorama.jpg)

## Open the map

Download the repository, extract it and open `docs/index.html` in a browser with WebGL 2. On GitHub, the file view displays the HTML source. A GitHub Pages deployment serves the interactive map. The map, geometry, textures and synthesised audio are embedded in the file and work offline. The interface opens in English. Choose **中 / EN** to switch to Chinese. The browser remembers your choice when local storage is available.

- On a computer, drag to orbit, scroll to zoom and Shift-drag or right-drag to pan. On a touch screen, drag with one finger and pinch or pan with two.
- For a clear view, choose the camera in the top right. **Photo mode** fills the window and lets you keep framing the scene as it runs. Choose **Show controls** in the top left or press **Esc** to return.
- Select a coloured building, its map label or a place in the bottom bar. On a phone, use the neighbourhood picker above the seasons.
- Choose **Pocket only** to see the selected neighbourhood from the same camera. **Fit pocket** frames its complete terrain section. **Full map** restores the surroundings. **City** returns to your previous city view.
- Switch seasons by hand or turn on the automatic cycle under **Weather**. Wet pavement, accumulating snow, shafts of light and day/night have their own controls. Event audio starts muted.

## Walk across the High

On the north side, **The Queen’s College & Queen’s Lane** includes the low High Street screen, Queen Caroline’s cupola, the arcaded Front Quad, the separate bell turret beside the Chapel and Hall, the library, St Edmund Hall and its former church of St Peter-in-the-East. The pocket covers 32 mapped building outlines.

On the south side, **University College & Logic Lane** includes the two High Street gate towers, Main Quad, Radcliffe Quad, the covered bridge over the lane, the Durham Buildings, street-front shops and the Examination Schools. The pocket covers 52 mapped building outlines.

Select **Walk to Univ** from Queen’s, or **Walk to Queen’s** from Univ. The camera follows the same mapped pedestrian crossing and southern pavement in both directions. A parallel pair of walks connects Balliol and Trinity on Broad Street.

## Places

| | Neighbourhood | | Neighbourhood |
| --- | --- | --- | --- |
| 1 | Magdalen College, the bridge and Addison’s Walk | 8 | Carfax and Oxford Town Hall |
| 2 | Radcliffe Square and the Bodleian | 9 | New College and the medieval city wall |
| 3 | Covered Market and Golden Cross | 10 | Merton College and Merton Street |
| 4 | Christ Church and Tom Quad | 11 | Balliol and west Broad Street |
| 5 | Museum of Natural History and the museum quarter | 12 | Trinity and east Broad Street |
| 6 | Oxford Castle and the old prison | 13 | The Queen’s College and Queen’s Lane |
| 7 | Ashmolean Museum and St Giles’ | 14 | University College and Logic Lane |

Spring and summer bring swifts to the Museum of Natural History’s roof nests. Magdalen’s Great Tower hosts a May Morning scene with an original synthesised choir. Great Tom and the Covered Market have their own events.

## Build

Use Node.js 20 or newer with npm. The lockfile pins the dependencies. All mapped geometry and render meshes are included.

```sh
npm ci
npm run build
```

Open `dist/index.html`. To choose another filename, run `node build.mjs path/to/oxford.html`. A web server and map-service credentials are unnecessary for the built application.

To refresh the copy for GitHub Pages, run `npm run build:pages`. The repository already includes a working site in `docs/`. In repository **Settings → Pages**, choose **Deploy from a branch**, then your default branch and **/docs**. The map and gallery both work under a project-specific URL.

| Source | Purpose |
| --- | --- |
| `geo/`, `src/data/` | Offline OSM extract, geography compiler and prepared map |
| `src/high-street.js`, `src/broad-street.js` | Architecture, public realm and gardens of the two walkable pairs |
| `src/magdalen/` | Original Magdalen pocket, its materials, ecology, weather and music |
| `src/quarters.js`, `src/pocket-scope.js` | Neighbourhood ownership, city rendering and individual terrain sections |
| `src/data/views.js`, `src/navigation.js` | Camera settings, walk paths, orbit and touch input |
| `src/language.js`, `page.html`, `style.css` | Interface, translations and portrait controls |
| `models/`, `src/assets/` | Six Oxford Atlas landmarks, their editable Blender sources (including both Tom Tower studies) and their compressed render meshes |

To rebuild the mapped quarters from the bundled extract, install Python with Shapely 2.1 and run `python geo/prepare-quarters.py`. To check the resulting plans and walk the built file in Chromium:

```sh
python scripts/verify-quarters-plan.py --out verification/quarters-plan.json
node scripts/verify-fourteen.cjs dist/index.html verification/browser
```

The browser check needs Playwright and Chromium. Set `POCKET_PLAYWRIGHT` and `POCKET_BROWSER` to use existing installations. The source archive includes the geometry and browser reports from the release build. Mobile checks used touch emulation.

## Magdalen gallery

Open [the English image gallery](docs/magdalen-gallery.html) after downloading the repository, or view it on the published Pages site. It includes thirteen images, including model views and a measured site-plan comparison, a [3000 × 2000 four-season print](docs/magdalen-four-seasons.jpg), and [instructions for editing the gallery](tools/gallery/README.md). [Labelled city panorama](docs/oxford-labelled.jpg)

## Credits and release terms

Plan geometry follows OpenStreetMap. Heights without a surveyed value, façade proportions, sculpture, furnishings and some planting are artistic estimates. The application and original authored portions of the landmark meshes are offered under MIT. OpenStreetMap data retains its ODbL licence. Credits for embedded CC0 scans and terrain-derived heights accompany the models. The high-street photographs and college plans were references for modelling. The project name and map describe an independent illustration of Oxford. [Credits and licences](CREDITS.md) · [Architectural sources](SOURCES.md) · [Model provenance](models/PROVENANCE.md)

