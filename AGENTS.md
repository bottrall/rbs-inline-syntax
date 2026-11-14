# rbs-inline-syntax

A VS Code extension that highlights rbs-inline `# @rbs` and `# @dynamic` annotations in Ruby comments, as an injection grammar on top of Ruby LSP's Ruby grammar.

## Commands

Everything runs through its `bin/` script, never a tool directly (`rake`, `rubocop`, `steep`, `vitest`, `oxlint`, `tsc`, `vite`, `playwright`).

| Script                     | What it does                                                                    |
| -------------------------- | ------------------------------------------------------------------------------- |
| `bin/setup`                | Install dependencies on a fresh checkout                                        |
| `bin/test [paths]`         | Run the tests; pass files to run only those                                     |
| `bin/lint [--fix] [paths]` | Check lint and formatting; `--fix` fixes what it can                            |
| `bin/typecheck`            | Type-check the code                                                             |
| `bin/check`                | `bin/lint --fix`, `bin/typecheck`, `bin/test`: run before calling a change done |
| `bin/ci`                   | Run exactly what CI runs, without fixes: run before pushing                     |

## Layout

- `syntaxes/rbs-inline.injection.json` is the extension: a TextMate grammar that `package.json`'s `contributes.grammars` injects into `source.ruby`. It only adds scopes, so it works alongside Ruby LSP. There is no JavaScript to ship.
- Type tokens use the same scopes as Ruby LSP's `#:` signature highlighting (`*.rbs`), so both annotation styles look alike. Reuse those scopes rather than inventing new ones.
- `test/grammar.test.js` tokenizes Ruby with `vscode-textmate` against Ruby LSP's own grammars: locally from the installed `Shopify.ruby-lsp` extension in `~/.vscode/extensions`, or from the directory `RUBY_LSP_GRAMMARS` names (CI downloads Ruby LSP from Open VSX). Every grammar change gets a test there.
- Coverage covers JavaScript outside `test/`; there is none, so the thresholds have nothing to check until some is added.
- `.vscodeignore` decides what goes into the `.vsix`: add every new development-only file to it.

## Releases

release-please opens a release PR from the Conventional Commit PR titles on `main`; merging it tags the release, and `.github/workflows/publish.yml` packages the `.vsix` with `vsce` and publishes it to the Marketplace. There is no `bin/build`: packaging happens only in that workflow. `CHANGELOG.md` is release-please's, so never edit it by hand (`oxfmt` ignores it).

## Code style

- Prefer functional style: enumerable / array methods (`map`, `filter`, `reduce`) over manual loops.
- Favor immutability — return new values rather than mutating arguments.
- Write pure functions where possible; isolate side effects (I/O, DB, network) behind clear boundaries.
- Use a class only when an instance has identity, lifecycle, or mutable state. Otherwise use a module of pure functions. A class whose methods are all static (`self.foo`) is a module wearing pants.
- Default to composition — pass collaborators ("has-a") rather than inheriting from a parent ("is-a"). For shared _shape_, use an interface, structural type, or duck typing. Reserve inheritance for genuine "is-a" with shared _implementation_, or framework-mandated parents (`ApplicationRecord`, `Sidekiq::Worker`, custom `Error` subclasses).
- Don't use thrown exceptions for control flow — return an explicit result type, or follow the pattern this repo already uses. Reserve `throw` / `raise` for truly exceptional circumstances: programmer errors, unrecoverable state, framework-level boundaries.

### Dependency injection

Don't construct or reach for collaborators inside a function or class — accept them as constructor or function parameters, typed as the **smallest interface** that captures what the function actually uses (`Emailer` with a `send` method, not `SendgridEmailService` with its 40-method API). Wire concrete implementations at the **application edge** — `main`, the entry point, a composition root.

**Smell:** a function or class taking 8+ dependencies is doing too much — split it.

**Exempt:** framework globals that ship first-class test seams — Rails `ActiveRecord` (`User.find`, `user.save`), `ActionMailer` (`UserMailer.welcome(user).deliver_later`), `ActiveJob`. The test database, `ActionMailer::TestHelper`, and `perform_enqueued_jobs` already provide the seam DI exists to create, so calling them in place costs none of the testability or swappability the rule protects. The rule still binds collaborators that lack such a seam: third-party clients (`Stripe::Client`, an HTTP or S3 SDK) and this repo's own service objects — inject those.

## Testing

- Every module of behaviour gets a test file, even if it's only a smoke test. A unit with no behaviour — pure constants, data definitions, types — needs no test file.
- Only test what can change. Static code — generated files, constants, trivial accessors — gets at most a smoke test. Generated code is pinned at its generator: test the generator, not each generated output.
- A test file tests only the concerns of the unit it's mapped to. If testing X requires driving Y's entry point, either the behaviour belongs in X's own file with collaborators injected, or Y's file is covering for a missing X test. A behaviour belongs to the unit whose contract it is, even when observing it means calling through an object that unit returns. A composer's tests assert the composer's outcomes only — never a collaborator's branches, which are pinned in the collaborator's own file.
- Order tests the way the code is ordered: they follow the source's structure, and within a routine they follow execution order (validation behaviour first).
- Test all branches in reason: every early return, conditional, and error path gets a test — unless the branch is dead or a programmer-error tripwire.
- One assertion per test: each `it` makes exactly one `assert_*` or `expect`. A test that wants two is two tests.
- Never mock code you own. Don't patch a module, method or import to change what it does (`vi.mock`, `vi.spyOn`, `Minitest::Mock`, `stub`); pass the unit a fake through the parameters it already takes its collaborators by.

## Comments and documentation

**The default is no comment.** Names, types, and structure carry the meaning; when they don't, fix them rather than explain them. Delete the comment and read the code cold: if the intent is still recoverable, it stays deleted. Keep only a _why_ the code can't show — a non-local constraint, an external quirk, a deliberate tradeoff, a safety invariant — and put it at the line it explains, not in a header.

Never: a restatement of the code (appending "so that…" doesn't rescue it), types the type system already states, or history ("was X, now Y").

Documentation lives in the guides, not in comments. What a signature can't express — what a method raises, ordering guarantees, what an implementer must honour — is documented there.
