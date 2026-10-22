# Midnight Run — Tokyo After Dark

A playable night-racing demo for macOS and the web. The 2.615 km closed course follows OpenStreetMap road coordinates around Tokyo Tower, Akabanebashi, Shiba Park, Hibiya-dori and Atago. Three rivals, traffic, rechargeable nitrous, drift scoring, collision response, best times and Free Drive are included.

## macOS application

Open `release/Midnight Run.app`, or unzip `release/Midnight-Run-macOS-arm64.zip` and move the app to Applications. The current binary is built for Apple Silicon. All game code, vehicle assets, decoder and fonts are included; no server installation or internet connection is needed to play.

The application uses **Swift + AppKit + the system WKWebView**. It does not use Electron, Node.js or a bundled Chromium runtime. A private loopback HTTP listener at `127.0.0.1:4188` serves only the app's bundled assets and stops when the app quits. Run one copy at a time. The build targets macOS 13+, but the current runtime validation was on this Apple Silicon Mac running macOS 27.0.1.

To build from source on a Mac with Xcode Command Line Tools and Node.js installed:

```sh
npm ci
npm run package:mac
npm run desktop
```

`package:mac` produces an application bundle and ZIP, signed locally with an ad-hoc signature. A public Mac release would need the publisher's Developer ID signing and notarization. The build script uses the current machine architecture; Intel packaging requires an Intel build or an explicit cross-build adaptation.

## Web version

```sh
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:4177. The deployable site is `dist/` and needs static hosting with WebGL support. There are no runtime CDNs or remote fonts. Desktop and web use the exact same `dist/` code and assets. Best times and selected cars are stored locally in each platform and do not sync.

The two versions share geometry, lighting, materials, physics and controls. WebKit and Chrome can differ in antialiasing, font rasterization, shadows and performance. Matching graphics settings and viewport size gives a comparable scene, not a promise of pixel-identical rendering.

## Controls

| Action | Keyboard |
| --- | --- |
| Accelerate / brake | W / S or up / down |
| Steer | A / D or left / right |
| Nitrous | Shift |
| Drift | Space while steering |
| Change camera | C |
| Reset car | R |
| Pause / resume | Escape |
| Sound | M |
| Fullscreen | F; Mac window also supports Control–Command–F |
| Help | H |

The game pauses when focus is lost, including some native fullscreen transitions; resume from the pause dialog. Touch controls are available on small/touch screens. Standard gamepad controls are implemented but have not been tested with physical hardware.

## Scene and cars

- Ferrari 458 Italia: attributed detailed mesh distributed by the Three.js example.
- GT3 style: original procedural interpretation with rounded cabin, four-point lamps and a fixed wing.
- Revuelto style: original procedural interpretation with a wedge silhouette, Y-shaped lamps and high exhausts.
- 129 animated sidewalk pedestrians, umbrellas, vending machines, tactile paving, bus stops and storefronts.
- Actual OSM road/park/building footprint data. Missing building heights are estimated; facades, interiors, storefronts and people are procedural. Junctions are rounded and roads widened for arcade play; elevations are flat. This is not a street-by-street photogrammetry replica.

Vehicle collisions run at a fixed 120 Hz with oriented rectangles, iterative positional separation and velocity response. The collision body includes the vehicle's visual body and mirrors. Visual feedback cooldowns never disable collision resolution.

## Checks

```sh
npm run check
npm test
npm run build
```

Tests cover continuous route sampling, correct lateral offsets, non-folding pavement at tight turns, speed-dependent rear impacts, side/curb squeeze, a five-car chain, drifted bodies, a real Tokyo junction and repeated contacts. Collision scenarios run across render rates of 20, 30, 60 and 120 FPS. Browser and native runtime evidence is summarized in `reviews/tokyo-v3-validation.md`; local screenshots and test scripts are retained in ignored `qa/`.

## Source and GitHub hosting

The repository includes source, a reproducible lockfile, build scripts, OSM source/derived data and asset attribution. Generated application bundles, `node_modules/`, QA captures and local caches are ignored. `.openai/hosting.json` identifies the existing private Sites deployment. No credentials are stored in source. The source repository is https://github.com/visbirusier/midnight-run (private). Clone it with an authorized GitHub account, then use the build commands above. Application bundles are generated locally and are not checked into Git.

## Credits

Full attribution is in `dist/assets/CREDITS.txt` and the in-game Credits link. The Ferrari model by vicent091036 is CC BY 4.0; Three.js is MIT; Draco is Apache 2.0; Barlow fonts are SIL OFL. OSM source and derived map data are ODbL 1.0, © OpenStreetMap contributors. The original GT3/Revuelto interpretations are not manufacturer-supplied or exact licensed models.

This independent demo is not affiliated with Electronic Arts, Need for Speed, Ferrari, Porsche or Lamborghini.
