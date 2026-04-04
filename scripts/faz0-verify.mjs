#!/usr/bin/env node
/**
 * Faz 0 yapı ve Next.js derleme testi (Solana/Anchor olmadan çalışır).
 */
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function must(name, path) {
  if (!existsSync(join(root, ...path.split("/")))) {
    console.error(`FAIL: eksik: ${name} (${path})`);
    process.exit(1);
  }
  console.log(`OK: ${name}`);
}

console.log("=== FitStake Faz0 (Node) yapı testi ===\n");

must("package.json kök", "package.json");
must("Anchor.toml", "Anchor.toml");
must("Cargo workspace", "Cargo.toml");
must("fitstake_vault lib.rs", "programs/fitstake_vault/src/lib.rs");
must("Next.js apps/web", "apps/web/package.json");
must("Next.js src", "apps/web/src/app/page.tsx");

console.log("\nNext.js production build (workspace)...");
execSync("npm run build -w web", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CI: "1" },
});

console.log("\nOK: Faz0 Node testleri geçti.\n");
