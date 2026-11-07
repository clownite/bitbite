import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assetBase() {
  const raw = process.env.BASE_PATH || "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export async function bundleJs() {
  const outDir = path.join(root, "dist/public");
  const assets = path.join(outDir, "assets");
  const cssPath = path.join(assets, "index.css");
  const css = readFileSync(cssPath);
  const version = String(Date.now());
  const base = assetBase();

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });
  cpSync(path.join(root, "public"), outDir, { recursive: true });
  writeFileSync(cssPath, css);

  await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["src/main.tsx"],
    bundle: true,
    format: "esm",
    outfile: "dist/public/assets/index.js",
    jsx: "automatic",
    minify: true,
    legalComments: "none",
    target: ["es2022"],
    define: {
      __BUILD_VERSION__: JSON.stringify(version),
      "import.meta.env.PROD": "true",
      "import.meta.env.DEV": "false",
      "import.meta.env.MODE": JSON.stringify("production"),
      "import.meta.env.BASE_URL": JSON.stringify(base),
      "import.meta.env.BASE_PATH": JSON.stringify(base),
      "import.meta.env.VITE_API_BASE": "undefined",
      "import.meta.env.VITE_DEV_TELEGRAM_ID": "undefined",
    },
    alias: {
      "@": path.join(root, "src"),
      "@assets": path.resolve(root, "../..", "attached_assets"),
    },
    plugins: [
      {
        name: "drop-source-css",
        setup(build) {
          build.onResolve({ filter: /\/index\.css$/ }, (args) => {
            if (args.importer.endsWith(`${path.sep}main.tsx`) || args.importer.endsWith("/main.tsx")) {
              return { path: args.path, namespace: "empty-css" };
            }
          });
          build.onLoad({ filter: /.*/, namespace: "empty-css" }, () => ({
            contents: "",
            loader: "js",
          }));
        },
      },
    ],
  });

  const htmlPath = path.join(root, "index.html");
  let html = readFileSync(htmlPath, "utf8");
  html = html.replace("</head>", `    <link rel="stylesheet" crossorigin href="${base}assets/index.css" />\n  </head>`);
  html = html.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    `<script type="module" crossorigin src="${base}assets/index.js"></script>`,
  );
  writeFileSync(path.join(outDir, "index.html"), html);
  writeFileSync(path.join(outDir, "version.json"), JSON.stringify({ version }));
  console.log(`js bundled, version ${version}`);
}
