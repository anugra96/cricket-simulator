# Cricket Simulator MVP

An interactive single-page application for visualising cricket shot trajectories. The simulator combines simplified physics, fielding interception logic, and intuitive controls to help you explore how variations in bat speed, launch angle, and ground conditions influence outcomes.

## Quick Start

```bash
npm install
npm run dev
```

Visit the local development server (default: http://localhost:5173) to experiment with shot parameters. To produce a production build run:

```bash
npm run build
```

> **Node requirement:** Vite 7 requires Node.js `^20.19.0` or `>=22.12.0`.

## Project Structure

```
src/
├─ components/      # Field visualisation, sliders, control panel, outcome UI
├─ hooks/           # State management and derived simulation hooks
├─ sim/             # Physics, interception, and run estimation modules
├─ styles/          # Global tokens and component-level styling
├─ types.ts         # Domain models, units, and default factories
└─ App.tsx          # Layout orchestration and wiring between pieces
```

## Core Concepts

- **Branded units:** `src/types.ts` defines dimensional types (e.g. `Meters`, `Seconds`) along with helpers for converting raw numbers. This reduces accidental mix‑ups between axes or units.
- **Physics engine:** `sim/physics.ts` splits the ball path into flight and roll phases, applying drag, bounce energy retention, and friction-based exponential decay. Each simulation sample records time, position, speed, and event tags for downstream consumers.
- **Fielding model:** `sim/interception.ts` approximates chase times with reaction delays, acceleration envelopes, and configurable pickup buffers to find the earliest viable intercept.
- **Run estimation:** `sim/runsEstimator.ts` maps intercept/boundary timing to outcomes using calibrated running windows and exposes constants for future tuning.
- **Hooks:** `useShotState`, `useSimulation`, and `useResponsiveScale` manage state, memoise expensive calculations, and keep the SVG field responsive to layout changes.
- **Accessibility:** Controls include visible focus states, descriptive labels, and ARIA hints. Outcome summaries announce changes via `aria-live` for assistive tech.

## Customising the Simulation

- **Shot parameters:** Adjust bat speed (10–45 m/s), azimuth (−90° to 90°), elevation (0–35°), and spin (0–4000 rpm).
- **Field settings:** Scale the boundary radius, toggle friction presets (`slow`, `average`, `fast`), and change the pickup buffer that feeds intercept calculations.
- **Visual cues:** The SVG canvas highlights flight and roll paths, bounce location, interception circles, and boundary markers. Batsmen and fielders render with simple silhouettes and jersey numbers.

## Future Enhancements

The codebase is structured to accommodate upcoming features:

- Draggable fielders with saved presets.
- Runner speed adjustments and wicket scenarios.
- Monte Carlo sampling for probabilistic dashboards.
- Animations to replay the ball’s journey frame-by-frame.
- Integrations with venue presets (boundary dimensions, friction profiles).

Contributions and explorations are welcome—use the modular hooks and physics helpers to extend the simulator in whichever direction suits your MVP goals.
