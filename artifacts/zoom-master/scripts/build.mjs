// Production build used by publishing.
// Vite's Rollup pass aborts (SIGABRT) when the builder's Node heap is small.
// CSS and JS each run in their own process so the peak stays in one step.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const step = process.argv[2];

function runStep(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL("./build.mjs", import.meta.url)), name], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`build step "${name}" failed (${signal || code})`));
    });
  });
}

if (!step) {
  await runStep("css");
  await runStep("js");
  process.exit(0);
}

if (step === "css") {
  const { compileCss } = await import("./compile-css.mjs");
  await compileCss();
  process.exit(0);
}

if (step === "js") {
  const { bundleJs } = await import("./bundle.mjs");
  await bundleJs();
  process.exit(0);
}

console.error(`Unknown build step: ${step}`);
process.exit(1);
