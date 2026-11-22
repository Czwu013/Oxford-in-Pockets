# Magdalen College through the seasons

The [standalone gallery](../../docs/magdalen-gallery.html) embeds the thirteen full-resolution images from the fourteen-neighbourhood edition. The print uses the same bridge-side camera and local solar time in all four seasons. Open the HTML directly to browse it offline.

## Edit and rebuild

Use Python 3.9 or newer with Pillow. From the repository root:

```sh
python -m pip install Pillow
python tools/gallery/build.py
```

`build.py` reads the embedded master images into an ignored `tools/gallery/frames/` directory on the first run. Edit captions and the print layout in that script. Edit the page, navigation and lightbox in `gallery.html.in`. Replace an image with the same filename to change a view. The command writes `docs/magdalen-gallery.html` and `docs/magdalen-four-seasons.jpg`.

To redraw the plan from the bundled map geometry, run `python tools/gallery/site_plan.py` before building. The plan uses the eight registered comparison points in `plan.json`. The site plan and print use Georgia and Segoe UI when installed and fall back to DejaVu or Liberation fonts. Set `POCKET_FONT_DIR` to a local font directory if necessary. Font files are supplied by your system.

`capture.json` records the cameras, seasons, simulation clock, weather and browser checks from the published shoot. `focus.json` records the two close-up compositions used in the gallery. The original 8.1.0 capture hash refers to the local fourteen-neighbourhood build. The GitHub copy adds source credits to its information panel.
