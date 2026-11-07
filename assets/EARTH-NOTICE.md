# Dancing Earth land data

Dancing Earth uses the **Natural Earth 1:110m land** physical-vector dataset.

- Project: https://www.naturalearthdata.com/downloads/110m-physical-vectors/
- Source repository: https://github.com/nvkelso/natural-earth-vector
- Pinned commit: `ca96624a56bd078437bca8184e78163e5039ad19`
- Source file: `geojson/ne_110m_land.geojson`
- SHA-256: `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`

Natural Earth identifies the dataset as public domain. `npm run prepare:earth`
downloads that pinned file, verifies its checksum, samples filled land rows and
writes `src/earth-data.js`. The application performs no map-data network request.

The rendered columns are an artistic audio visualization, not geographic,
political, elevation, population or scientific measurements.
