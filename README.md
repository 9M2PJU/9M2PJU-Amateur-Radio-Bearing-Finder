# 9M2PJU Amateur Radio Bearing Finder

9M2PJU Amateur Radio Bearing Finder is a browser-based field tool for radio operators who need a fast bearing, distance, map preview, and basic path figures between a station and a target location.

The public site is configured for GitHub Pages at `bearing.hamradio.my`.

## Features

- Station and target coordinate entry with browser GPS support.
- Location search powered by OpenStreetMap Nominatim.
- Interactive Leaflet map with street, satellite, and terrain layers.
- Compass bearing display with distance in kilometers.
- Maidenhead grid calculation for both endpoints.
- Basic radio path figures: path loss, free-space loss, estimated signal strength, and QSO probability.
- Progressive Web App support for desktop and mobile browsers, including install prompts and offline shell caching.
- Responsive layout tuned for phone, tablet, laptop, and wide desktop viewports.

## Technology

- Vite powers the local source structure and production build.
- Plain HTML, CSS, and JavaScript keep the app lightweight.
- Leaflet renders maps in the browser.
- OpenStreetMap, OpenTopoMap, Esri imagery, and Nominatim provide map and search data.
- GitHub Actions builds and publishes the Vite output to GitHub Pages.

## Project Structure

- `index.html` is the Vite HTML entry.
- `src/main.js` contains app behavior, map logic, PWA registration, and calculations.
- `src/styles.css` contains the responsive UI system.
- `public/` contains static assets copied into the published site, including icons, manifest, service worker, and `CNAME`.
- `.github/workflows/deploy.yml` builds the app and deploys `dist/` to GitHub Pages on pushes to `main`.

## PWA Notes

The service worker caches the app shell and updates same-origin assets as they are requested. The cache name should be bumped whenever the published asset strategy changes so installed browsers refresh cleanly.

External map tiles and search services still require network access. When offline, the app shell can open, but live map tiles, geocoding, and fresh external assets depend on the browser cache and network availability.

## Privacy

GPS coordinates are read by the browser only after the user grants location permission. Search text is sent to the configured Nominatim endpoint for geocoding. The app does not include a backend service or store user location data in this repository.

## License

MIT

## Support

If you find this project useful, please consider supporting it:

[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/9M2PJU)
