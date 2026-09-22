# Wayland Parcel & Assessed Value Explorer — v4

Static GitHub Pages dashboard for Wayland, Massachusetts assessor parcels.

## What's included
- Assessed-value themes: total, land, building, and value per acre
- Land-use theme using a conventional planning palette
  - single-family = yellow
  - higher-density residential = orange → brown
  - commercial = red
  - institutional/public = blue
  - industrial/utility = purple
  - open space/agricultural/recreation = green
- Zoning theme
- Quick views: All, Single Family, All Multi-Family, Commercial + Industrial, Vacant Land, Public / Exempt
- Light, Dark, and Aerial Esri basemaps (Light is default)
- Search, parcel details, assessed-value summary, land-use value cards, and filtered CSV export

## Publish on GitHub Pages
Upload the contents of this folder to the repository root, then enable GitHub Pages from the main branch / root.


## v4 change
- Land use is now the default map theme and Reset returns to Land use.
- Asset URLs include a version query string to reduce stale browser/GitHub Pages caching after updates.

## v5 changes

- Land-use legend now shows every active land-use category; no categories are collapsed behind a “+ more” label.
