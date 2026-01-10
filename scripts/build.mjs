import { build, context } from "esbuild";
import { rmSync, mkdirSync, copyFileSync, existsSync, watch } from "node:fs";
import { join } from "node:path";

const isWatch = process.argv.includes("--watch");
const isProd = process.argv.includes("--prod");

const distDir = "dist";
const srcDir = "src";
const publicDir = "public";

const entryPoints = {
  background: join(srcDir, "background", "index.ts"),
  content: join(srcDir, "content", "index.ts"),
  popup: join(srcDir, "popup", "index.ts"),
};

function clean() {
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
}

function copyPublic() {
  // Copies manifest + static HTML/CSS/icons into dist
  if (!existsSync(publicDir)) return;

  const filesToCopy = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "options.html",
  ];

  let copiedCount = 0;
  for (const file of filesToCopy) {
    const src = join(publicDir, file);
    const dist = join(distDir, file);

    if (existsSync(src)) {
      copyFileSync(src, dist);
      copiedCount++;
    }
  }
  
  if (isWatch && copiedCount > 0) {
    console.log(`✓ Copied ${copiedCount} file(s) to dist/`);
  }
}

async function bundle() {
  await build({
    entryPoints,
    outdir: distDir,
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: isProd ? false : "inline",
    minify: isProd,
    logLevel: "info",
    platform: "browser",
    entryNames: "[name]",
    alias: {
      "@": join(process.cwd(), "src"),
    },
  });
}

async function main() {
  if (!isWatch) clean();

  copyPublic();

  if (isWatch) {
    // Watch mode: incremental rebuild
    const ctx = await context({
      entryPoints,
      outdir: distDir,
      bundle: true,
      format: "esm",
      target: "es2022",
      sourcemap: "inline",
      minify: false,
      logLevel: "info",
      platform: "browser",
      entryNames: "[name]",
      alias: { "@": join(process.cwd(), "src") },
    });

    await ctx.watch();
    console.log("✓ Watching for TypeScript changes in src/");
    console.log("✓ Build complete. Reload extension in Chrome to see changes.");

    // Watch public directory for HTML/CSS changes
    if (existsSync(publicDir)) {
      watch(publicDir, { recursive: false }, (eventType, filename) => {
        if (filename && (filename.endsWith(".html") || filename.endsWith(".css") || filename === "manifest.json")) {
          console.log(`\n📝 Detected change in ${filename}, copying...`);
          copyPublic();
          console.log("✓ Reload extension in Chrome to see changes.");
        }
      });
      console.log("✓ Watching public/ directory for HTML/CSS changes");
    }
    
    // Also watch for changes in src/ to show rebuild messages
    ctx.rebuild().then(() => {
      console.log("\n✓ Initial build complete");
    });
  } else {
    await bundle();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
