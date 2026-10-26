#!/usr/bin/env node
import { relative } from "node:path";
import { scan } from "./scan.js";

const root = process.cwd();
const findings = scan(root);

for (const finding of findings) {
  const file = relative(root, finding.file) || finding.file;
  console.error(`${file}:${finding.line} ${finding.rule} ${finding.message}`);
}

if (findings.length > 0) {
  console.error(`\n${findings.length} gate failure${findings.length === 1 ? "" : "s"}.`);
  process.exit(1);
}
