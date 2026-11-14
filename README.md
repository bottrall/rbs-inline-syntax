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

Install **rbs-inline Syntax** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=bottrall.rbs-inline-syntax), either from the Extensions view or with:

```sh
code --install-extension bottrall.rbs-inline-syntax
```

Each [GitHub release](https://github.com/bottrall/rbs-inline-syntax/releases) also has the `.vsix` attached, for installing by hand:

```sh
gh release download --repo bottrall/rbs-inline-syntax --pattern '*.vsix' --clobber
code --install-extension rbs-inline-syntax-*.vsix
```

## Test

```sh
npm install
npm test
```
