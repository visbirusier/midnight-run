# Tokyo After Dark — implementation and validation

2026-10-21. This is a fictional Tokyo-inspired arcade course, not an actual street map or a claim of photographic realism.

## Applied visual review

- Replaced the near-straight sine road with an arc-length route, S bends, ramps, banking and a curved bay crossing. Vehicle positions, traffic, camera targets, lane markings and minimap use the same route frame.
- Replaced studio illumination with a night-city environment, warm local street lights, vehicle contact shadows and a moving shadow camera. Kept road and paint reflection intensities independent.
- Replaced circular wet patches with multi-scale irregular roughness and fine asphalt bump. Raised minimum roughness and reduced clearcoat after review of overly broad highlights.
- Added close low-rise commercial fronts, Japanese signs, vending machines, facade hardware, railway crossing, bilingual expressway signs, tiled underpass, tower landmark and suspension bridge. Near-street storefront bases were corrected after review.
- Moved the tower into the view after the underpass. Reduced bay water coverage, added a park base, and suppressed rain inside the tunnel.
- Fixed a reviewer-detected bridge deck intersection: concrete deck now follows both pitch and bank, with a lower top surface. The earlier image showed a gray wedge over the left lane.
- Adjusted mobile hero camera and vertical spacing so the primary button and car remain separate.

## Technical checks

- Syntax checks: game, scene and route modules pass.
- Route geometry: 3,200 m sprint; minimum radius about 76.06 m; minimum width 14.8 m; maximum elevation 18 m; maximum grade 9.78%; maximum one-meter sampling error under 0.005 m. Lateral offsets are perpendicular to travel and centerline samples are continuous.
- Chrome desktop 1440 × 900: repeated complete races reach the results screen; rivals, moving traffic, collision penalties and near misses remain active. No page errors in the captured full-route runs.
- Controls: throttle, nitrous consumption, drift score, chase/low/hood cameras, lane reset, pause/resume, main menu and high/performance quality switching exercised.
- Chrome at 390 × 844: primary controls visible, no horizontal overflow; on-screen accelerator increases speed; pause freezes progress; home returns to intro. Physical mobile hardware and gamepad are not tested.
- Local screenshots and executable browser scripts: `qa/tokyo-v2/` (ignored from source publication).

## Scope of verification

Build, browser interaction and visual review are separate from user aesthetic acceptance. The scene remains a lightweight procedural WebGL demo; reflections are environment-based with local lighting, not ray tracing. No production hardware benchmark is claimed from the displayed browser FPS.
