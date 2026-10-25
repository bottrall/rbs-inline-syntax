# rbs-inline Syntax

Highlights [rbs-inline](https://github.com/soutaro/rbs-inline) doc-style annotations inside Ruby comments:

```ruby
# @rbs name: String -- shown in the banner
# @rbs *args: Integer
# @rbs &block: (Runtime) -> void
# @rbs @mutex: Thread::Mutex
# @rbs return: Hash[Symbol, untyped]
# @rbs module-self Riffer::Rig::Runtime
# @dynamic url, chain, sdk
```

The type tokens use the same scopes as the Ruby LSP extension's `#:` signature highlighting, so both styles look alike. It's an injection grammar that only adds scopes, so it works alongside Ruby LSP.

## Install

Grab the `.vsix` from the latest release:

```sh
gh release download --repo bottrall/rbs-inline-syntax --pattern '*.vsix' --clobber
code --install-extension rbs-inline-syntax-*.vsix
```

Or build it from a checkout:

```sh
npx @vscode/vsce package
code --install-extension rbs-inline-syntax-0.1.0.vsix
```

Then run **Developer: Reload Window**.

## Test

```sh
npm install
npm test
```
