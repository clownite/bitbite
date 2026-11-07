import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function compileCss() {
  const cssPath = path.join(root, "src/index.css");
  const css = readFileSync(cssPath, "utf8");
  const compiled = await compile(css, {
    base: path.dirname(cssPath),
    from: cssPath,
    onDependency() {},
  });
  const sources = [
    { base: path.join(root, "src"), pattern: "**/*.{tsx,ts,jsx,js,html}", negated: false },
    { base: path.join(root, "src/vendor"), pattern: "**/*", negated: true },
    { base: root, pattern: "index.html", negated: false },
  ];
  const scanner = new Scanner({ sources });
  const candidates = scanner.scan();
  const out = compiled.build(candidates);
  const assets = path.join(root, "dist/public/assets");
  mkdirSync(assets, { recursive: true });
  writeFileSync(path.join(assets, "index.css"), out);
  console.log(`css ${candidates.length} candidates, ${out.length} bytes`);
}
