# Wayland Parcel & Assessed Value Explorer

Static Leaflet dashboard prepared for GitHub Pages.

## What is included

- `index.html` — dashboard page
- `styles.css` — dark sidebar / map styling
- `app.js` — filters, map themes, statistics, parcel search, chart, CSV export
- `data/wayland_parcels.js` — optimized parcel dataset embedded as a JavaScript object
- `data/metadata.json` — quick dataset summary

## Main dashboard functions

- **Assessed-value map themes**
  - Total assessed value
  - Land assessed value
  - Building assessed value
  - Total assessed value per acre
- **Land-use map**
  - Broad economic-development categories derived from Massachusetts DOR `USE_CODE`
  - Detailed original `USE_CODE` filter and code descriptions where mapped
- **Zoning map**
  - Filter and color parcels by zoning district
- **Economic-development filters**
  - Commercial + industrial quick view
  - Vacant-land quick view
  - Public / exempt quick view
  - Owner mailing location
  - Minimum parcel size
  - Assessed-value range
- Address / owner / parcel-ID search
- Dynamic summary cards and assessed value by land-use chart
- Parcel detail panel
- Download the currently filtered parcels as CSV
- Esri dark-gray and aerial-imagery basemaps

## GitHub Pages deployment

1. Create a new GitHub repository.
2. Upload **all files and folders inside this directory** to the repository root.
3. In GitHub: **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.
6. Open the GitHub Pages URL once deployment finishes.

No server-side code is required.

## Data notes

The supplied file contains about 5,152 parcel polygons. Populated assessor records are FY2024. `LOT_SIZE` uses acres in the populated records in this dataset.

`USE_CODE` is the Massachusetts Department of Revenue property type classification code. Some Wayland records use four-character/local variants such as `1013` or `900V`; the dashboard keeps that original code but uses the first three numeric digits for the generalized DOR property type description/category.

Assessed value is an assessor value, not a market-price estimate. Last-sale values can include nominal and non-arm's-length transactions.

## Data sources / reference documentation

- MassGIS Property Tax Parcels: https://www.mass.gov/info-details/massgis-data-property-tax-parcels
- Massachusetts DOR Property Coding and Sales Reporting: https://www.mass.gov/info-details/property-coding-and-sales-reporting
