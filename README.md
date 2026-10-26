The system fails the build when a screen invents a color, a library, or a layout node.

`gate` scans the current repo. It fails when source outside `src/tokens/tokens.css` contains a hex color, when `package.json` depends on a second component library, or when a layout file emits a node other than stack, button, filter, chart, table, stream, or empty. The token exception applies only inside `@hybridappdev/primitives`.

```bash
pnpm install
pnpm gate
```

[syedarshad.in](https://syedarshad.in)

[primitives](https://github.com/hybridappdev/primitives)

MIT
