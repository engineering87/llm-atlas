# Tests

These tests run the real engine from `../index.html` under a stubbed DOM, with no browser and no dependencies beyond Node. They run in CI on every push and pull request.

- **`audit.js`** loads the page, simulates every interactive control (precision, sliders, toggles, tour, overlays, focus, prompt), and asserts that handlers exist, that toggles flip their state coherently, that readouts update, and that the engine runs hundreds of frames without throwing.
- **`invariants.js`** checks a core fidelity property: quantization actually collapses the weight distribution. FP32 weights stay effectively continuous, INT8 is finer than INT4, and INT4 reduces the number of distinct weight values by more than an order of magnitude.

Run locally:

```bash
node test/audit.js
node test/invariants.js
```

Both exit non-zero on failure.
