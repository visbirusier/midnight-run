# Tokyo v3 / native macOS validation — 2026-10-21

## Desktop replacement

Electron 44.9.3 repeatedly failed during local startup with GPU subprocess exit code 5, network-service restarts and `GPU process isn't usable`. The intended scene was never validated in Electron. Its underlying platform/runtime cause was not established. All owned Electron test processes were stopped; Electron and its packager were removed from package.json, the lockfile and the installed dependency tree. No system-wide security setting was changed.

The replacement is a Swift/AppKit application containing the same static game bundle as the web version. Rendering uses Apple's system WKWebView. A loopback-only Network.framework server serves bundled files with a confined root; the app has no Node integration, shell bridge, remote assets or runtime installation step.

`release/Midnight Run.app` and `release/Midnight-Run-macOS-arm64.zip` were generated successfully. The application is approximately 7.3 MiB; the ZIP approximately 3.5 MiB. Local ad-hoc signature verification passed. This is a locally usable Apple Silicon build, not a notarized public distribution or a verified Intel/macOS 13 compatibility claim.

## Executed checks

| Check | Observed result |
| --- | --- |
| Syntax / build | `npm run check`, esbuild and Swift compilation passed |
| Route geometry | 2,615 m race, 10.766 m minimum centerline radius, 11.2 m minimum road width, continuous sampling, no inner pavement folding |
| Tower ground clearance | Final footprint scale 1.35; lower perimeter sampled against first 500 m of road, including leg radius: minimum 3.786 m outside roadway, enough for 2.4 m sidewalk |
| Collision tests | Six scenarios at 20/30/60/120 render FPS, fixed 120 Hz simulation; zero residual penetration in each |
| Chrome full sprint | Finished at station 2,660 m; 47.27 s race; 30 collision feedback events, maximum measured overlap 0; six sampled locations read 60 FPS; no page errors |
| Final native full sprint | Finished at station 2,660 m; 45.82 s race; 45 collision feedback events, maximum measured overlap 0; no page errors |
| Native FPS | 50 one-second samples: median 60, mean 58.4, range 36–60; 41 samples at 60. Includes screenshot capture and startup/focus overhead; not a controlled benchmark |
| Native resources | Resource timing origins contained only `http://127.0.0.1:4188`; model, Draco and font files were bundled |
| Native physical UI path | App launched normally; W accelerated, Escape opened pause, resume worked, D steering and C camera input responded. Control–Command–F switched the native window; focus change may pause the game |
| Car selection | Ferrari, GT3 style and Revuelto style selected and rendered in Chrome |
| Mobile web | 390 × 844, no horizontal overflow; all three car buttons visible; on-screen accelerator produced positive speed in race mode; no page errors |
| Mobile capture anomaly | First screenshot immediately after viewport resize contained a repeated compositor strip. Reload at fixed 390 × 844 and recapture produced correct layout; one header and footer bounds y=804–844 confirmed |

The full native sprint was taken after vehicle and streetscape refinements. The final change only narrowed the decorative tower footprint, followed by route/collision tests, build/package and a targeted same-position browser visual check. No physics change followed the full-sprint checks.

## Visual review and limits

A dedicated visual review subagent inspected street and vehicle screenshots. Revisions reduced wheel-arch thickness, embedded/shortened the Revuelto-style exhaust, connected the GT3-style wing, added pavement across building setbacks and trees within OSM park polygons, and moved tower legs clear of the entire sidewalk. The final review is in `visual-review-v3-final.md`.

The Ferrari mesh remains the most detailed vehicle. The new GT3/Revuelto styles are original procedural interpretations, not exact manufacturer meshes, and still look less realistic. OSM supplies real road/footprint coordinates; widths, corner rounding, missing heights, facades, pedestrians and flat elevation are approximations. No claim of photogrammetry-level Tokyo reproduction or AAA-quality realism is made.

Desktop and web share identical scene assets and simulation, but their browser engines, device pixel ratio and GPU scheduling differ. Mac capture used Retina WKWebView; Chrome capture used its test viewport. Visual similarity was inspected; pixel equality and a controlled performance comparison were not asserted. Physical gamepads and other Macs were not tested. User aesthetic acceptance is pending.

## Local evidence

Ignored `qa/tokyo-v3/` contains native intro/driving/course/finish screenshots, `native-result.json`, Chrome full-sprint captures, all three final vehicle captures, `mobile-intro-final.png`, mobile driving checks and `tower-clearance-final.png`. Native smoke testing is enabled only by the explicit `--qa-output <directory>` argument; normal application launch has no automatic driving or screenshot behavior.

No GitHub repository was created or pushed. The existing owner-private Sites project is the web publication destination; its audience is preserved.
