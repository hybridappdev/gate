import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scan } from "../src/scan.js";

function project(files: Record<string, string>, name = "sample"): string {
  const root = mkdtempSync(join(tmpdir(), "gate-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name, dependencies: {}, devDependencies: {} }, null, 2),
  );
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, contents);
  }
  return root;
}

describe("scan", () => {
  it("rejects a hex color outside the token file", () => {
    const root = project({ "src/screen.css": "color: #4f46e5;" });
    const findings = scan(root);
    expect(findings.map((finding) => finding.rule)).toContain("hex");
  });

  it("allows hex only in primitives tokens.css", () => {
    const files = { "src/tokens/tokens.css": "--color-fg: #1a1916;" };
    expect(scan(project(files, "desk")).some((finding) => finding.rule === "hex")).toBe(true);
    expect(scan(project(files, "@hybridappdev/primitives"))).toEqual([]);
  });

  it("rejects hex in a primitives file that is not the token source", () => {
    const root = project(
      { "src/components/button.css": "color: #fff;" },
      "@hybridappdev/primitives",
    );
    expect(scan(root).some((finding) => finding.rule === "hex")).toBe(true);
  });

  it("rejects a second component library", () => {
    const root = mkdtempSync(join(tmpdir(), "gate-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { "@mui/material": "^7.0.0" } }),
    );
    mkdirSync(join(root, "src"));
    const findings = scan(root);
    expect(findings).toEqual([
      expect.objectContaining({
        rule: "library",
        message: "@mui/material is a second component library.",
      }),
    ]);
  });

  it("rejects an unknown layout node", () => {
    const root = project({
      "src/draft.ts": `import type { LayoutNode } from "@hybridappdev/primitives";
export const draft: LayoutNode = { type: "div", label: "No" };`,
    });
    expect(scan(root)).toEqual([
      expect.objectContaining({
        rule: "layout",
        message: 'Unknown node type "div".',
      }),
    ]);
  });

  it("accepts the layout contract", () => {
    const root = project({
      "src/draft.ts": `import type { LayoutNode } from "@hybridappdev/primitives";
export const draft: LayoutNode = { type: "empty", title: "No draft", reason: "Nothing to show." };`,
    });
    expect(scan(root)).toEqual([]);
  });

  it("ignores node_modules and tests", () => {
    const root = project({
      "node_modules/ui/index.css": "color: #fff;",
      "src/draft.test.ts": `import type { LayoutNode } from "@hybridappdev/primitives";
export const bad: LayoutNode = { type: "div" };`,
    });
    expect(scan(root)).toEqual([]);
  });
});
