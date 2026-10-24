import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import textmate from "vscode-textmate";
import oniguruma from "vscode-oniguruma";

const require = createRequire(import.meta.url);

// The Ruby grammar comes from the installed Ruby LSP extension, so the tests
// exercise the same base grammar (and its `#:` injection) VS Code will use.
const rubyLspDir = () => {
  const root = join(homedir(), ".vscode", "extensions");
  const latest = readdirSync(root)
    .filter((name) => name.startsWith("shopify.ruby-lsp-"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .at(-1);
  if (!latest) throw new Error("Shopify.ruby-lsp is not installed");
  return join(root, latest, "grammars");
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const grammarFiles = () => ({
  "source.ruby": join(rubyLspDir(), "ruby.cson.json"),
  "rbs-comment.injection": join(rubyLspDir(), "rbs.injection.json"),
  "rbs-inline.injection": new URL("../syntaxes/rbs-inline.injection.json", import.meta.url),
});

const loadRuby = async () => {
  const wasm = readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm")).buffer;
  await oniguruma.loadWASM(wasm);
  const files = grammarFiles();
  const registry = new textmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => (files[scopeName] ? readJson(files[scopeName]) : null),
    getInjections: (scopeName) =>
      scopeName === "source.ruby" ? ["rbs-comment.injection", "rbs-inline.injection"] : [],
  });
  return registry.loadGrammar("source.ruby");
};

let ruby;

const tokenize = (source) =>
  source.split("\n").reduce(
    ({ tokens, stack }, line) => {
      const result = ruby.tokenizeLine(line, stack);
      const lineTokens = result.tokens.map((t) => ({
        text: line.slice(t.startIndex, t.endIndex),
        scopes: t.scopes,
      }));
      return { tokens: [...tokens, ...lineTokens], stack: result.ruleStack };
    },
    { tokens: [], stack: textmate.INITIAL },
  ).tokens;

const scopesOf = (source, text) => {
  const token = tokenize(source).find((t) => t.text === text);
  assert.ok(token, `no token ${JSON.stringify(text)} in ${JSON.stringify(source)}`);
  return token.scopes;
};

const assertScope = (source, text, scope) =>
  assert.ok(
    scopesOf(source, text).includes(scope),
    `${JSON.stringify(text)} lacks ${scope}: ${scopesOf(source, text).join(" ")}`,
  );

const refuteScope = (source, text, scope) =>
  assert.ok(!scopesOf(source, text).includes(scope), `${JSON.stringify(text)} has ${scope}`);

const refuteScopeAnywhere = (source, scope) => {
  const token = tokenize(source).find((t) => t.scopes.includes(scope));
  assert.ok(!token, `${JSON.stringify(token?.text)} has ${scope} in ${JSON.stringify(source)}`);
};

before(async () => {
  ruby = await loadRuby();
});

describe("@rbs annotations", () => {
  it("scopes the @rbs keyword", () => {
    assertScope("# @rbs name: String", "@rbs", "storage.type.annotation.rbs");
  });

  it("scopes the annotation when the comment is indented", () => {
    assertScope("    # @rbs name: String", "@rbs", "storage.type.annotation.rbs");
  });

  it("leaves the annotation out of the plain comment scope", () => {
    refuteScope("  # @rbs name: String", "String", "comment.line.number-sign.ruby");
  });

  it("does not match a longer word starting with @rbs", () => {
    refuteScopeAnywhere("# @rbsx name: String", "meta.annotation.rbs-inline");
  });

  it("ignores @rbs inside a string", () => {
    refuteScopeAnywhere('x = "# @rbs name: String"', "meta.annotation.rbs-inline");
  });

  it("ignores @rbs inside a plain-text heredoc", () => {
    refuteScopeAnywhere("x = <<~TEXT\n  # @rbs name: String\nTEXT", "meta.annotation.rbs-inline");
  });
});

describe("@rbs directives", () => {
  it("scopes module-self", () => {
    assertScope("# @rbs module-self Riffer::Rig::Runtime", "module-self", "keyword.other.directive.rbs");
  });

  it("scopes generic", () => {
    assertScope("# @rbs generic T", "generic", "keyword.other.directive.rbs");
  });

  it("scopes a variance modifier", () => {
    assertScope("# @rbs generic out T < Object", "out", "storage.modifier.variance.rbs");
  });
});

describe("@rbs return", () => {
  it("scopes return as a keyword", () => {
    assertScope("# @rbs return: void", "return", "keyword.other.return.rbs");
  });

  it("scopes the return type", () => {
    assertScope("# @rbs return: void", "void", "support.type.builtin.rbs");
  });
});

describe("@rbs parameters", () => {
  it("scopes a plain parameter name", () => {
    assertScope("# @rbs name: String", "name", "variable.parameter.function.rbs");
  });

  it("scopes a splat parameter name", () => {
    assertScope("# @rbs *chunks: String", "*chunks", "variable.parameter.function.rbs");
  });

  it("scopes a double-splat parameter name", () => {
    assertScope("# @rbs **opts: untyped", "**opts", "variable.parameter.function.rbs");
  });

  it("scopes a block parameter name", () => {
    assertScope("# @rbs &block: () -> void", "&block", "variable.parameter.function.rbs");
  });

  it("scopes an anonymous block parameter", () => {
    assertScope("# @rbs &: () -> void", "&", "variable.parameter.function.rbs");
  });

  it("scopes an optional block parameter", () => {
    assertScope("# @rbs &?block: () -> void", "&?block", "variable.parameter.function.rbs");
  });

  it("scopes an instance variable", () => {
    assertScope("# @rbs @mutex: Thread::Mutex", "@mutex", "variable.other.readwrite.instance.rbs");
  });

  it("scopes a class-level instance variable", () => {
    assertScope("# @rbs self.@extensions: Hash[String, Integer]", "self.@extensions", "variable.other.readwrite.instance.rbs");
  });
});

describe("@rbs descriptions", () => {
  it("scopes text after -- as a description", () => {
    assertScope("# @rbs name: String -- the display name", "-- the display name", "comment.line.description.rbs");
  });
});

describe("@rbs types", () => {
  it("scopes a constant", () => {
    assertScope("# @rbs host: Riffer::Rig::Host", "Host", "variable.other.constant.rbs");
  });

  it("scopes an interface", () => {
    assertScope("# @rbs host: Hosts::_Host", "_Host", "variable.other.constant.rbs");
  });

  it("scopes a builtin type", () => {
    assertScope("# @rbs ok: bool", "bool", "support.type.builtin.rbs");
  });

  it("scopes generic brackets", () => {
    assertScope("# @rbs values: Array[String]", "[", "punctuation.section.type_parameters.rbs");
  });

  it("scopes a proc arrow", () => {
    assertScope("# @rbs fn: ^(Integer) -> String", "->", "punctuation.section.signature.return.rbs");
  });

  it("scopes a proc caret", () => {
    assertScope("# @rbs fn: ^(Integer) -> String", "^", "punctuation.section.signature.rbs");
  });

  it("scopes a symbol literal", () => {
    assertScope("# @rbs level: :low | :high", ":low", "constant.other.symbol.rbs");
  });

  it("scopes a string literal", () => {
    assertScope('# @rbs mode: "r" | "w"', '"r"', "string.quoted.rbs");
  });

  it("scopes an integer literal", () => {
    assertScope("# @rbs code: 0 | 1", "0", "constant.numeric.rbs");
  });

  it("scopes a record key", () => {
    assertScope("# @rbs opts: { url: String }", "url", "constant.other.symbol.hashkey.parameter.function.rbs");
  });
});

describe("@dynamic annotations", () => {
  it("scopes the @dynamic keyword", () => {
    assertScope("  # @dynamic url, chain", "@dynamic", "storage.type.annotation.rbs");
  });

  it("scopes each method name", () => {
    assertScope("  # @dynamic url, chain", "chain", "entity.name.function.rbs");
  });
});

describe("coexistence with Ruby LSP", () => {
  it("keeps Ruby LSP's #: highlighting", () => {
    assertScope("NAME = 1 #: Integer", "Integer", "variable.other.constant.rbs");
  });

  it("leaves ordinary comments alone", () => {
    refuteScopeAnywhere("# a plain String comment", "meta.annotation.rbs-inline");
  });
});
