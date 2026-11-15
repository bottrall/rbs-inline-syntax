import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Renovate bumps this through the custom manager in renovate.json.
const rubyLspVersion = "0.10.8";

const grammarNames = ["ruby.cson.json", "rbs.injection.json"];

function grammarUrl(name) {
  return `https://raw.githubusercontent.com/Shopify/ruby-lsp/vscode-ruby-lsp-v${rubyLspVersion}/vscode/grammars/${name}`;
}

async function download(name) {
  const response = await fetch(grammarUrl(name));
  if (!response.ok) {
    throw new Error(`${grammarUrl(name)}: ${response.status} ${response.statusText}`);
  }
  return { name, body: await response.text() };
}

/**
 * Downloads the pinned Ruby LSP release's grammars once, so every run, local
 * or CI, tokenizes against the same base grammar and `#:` injection.
 */
export default async function setup(project) {
  const dir = join(
    import.meta.dirname,
    "..",
    "node_modules",
    ".cache",
    `ruby-lsp-${rubyLspVersion}`,
  );
  if (!grammarNames.every((name) => existsSync(join(dir, name)))) {
    const grammars = await Promise.all(grammarNames.map((name) => download(name)));
    await mkdir(dir, { recursive: true });
    await Promise.all(grammars.map(({ name, body }) => writeFile(join(dir, name), body)));
  }
  project.provide("rubyLspGrammars", dir);
}
