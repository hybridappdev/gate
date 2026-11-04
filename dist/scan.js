import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, sep } from "node:path";
const skipDirectories = new Set([
    "node_modules",
    "dist",
    ".git",
    "coverage",
    "storybook-static",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".svg"]);
const layoutNodeTypes = new Set([
    "stack",
    "button",
    "filter",
    "chart",
    "table",
    "stream",
    "empty",
]);
const bannedPrefixes = ["@mui/", "@chakra-ui/", "@mantine/", "@radix-ui/"];
const bannedLibraries = new Set([
    "antd",
    "react-bootstrap",
    "semantic-ui-react",
]);
const hexColor = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const typeLiteral = /type:\s*["']([A-Za-z0-9_-]+)["']/g;
const jsonType = /"type"\s*:\s*"([A-Za-z0-9_-]+)"/g;
export function scan(root) {
    const findings = [];
    const packageName = readPackageName(root);
    findings.push(...libraryFindings(root));
    for (const file of walk(root)) {
        if (isTestFile(file))
            continue;
        const text = readFileSync(file, "utf8");
        if (isSource(file)) {
            findings.push(...hexFindings(file, text, packageName));
            findings.push(...layoutFindings(file, text));
        }
        if (file.endsWith(".json") && isLayoutJson(file)) {
            findings.push(...jsonLayoutFindings(file, text));
        }
    }
    return findings;
}
function readPackageName(root) {
    const path = join(root, "package.json");
    if (!existsSync(path))
        return null;
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return typeof parsed.name === "string" ? parsed.name : null;
}
function libraryFindings(root) {
    const path = join(root, "package.json");
    if (!existsSync(path))
        return [];
    const text = readFileSync(path, "utf8");
    const parsed = JSON.parse(text);
    const names = [
        ...Object.keys(parsed.dependencies ?? {}),
        ...Object.keys(parsed.devDependencies ?? {}),
    ];
    const findings = [];
    for (const name of names) {
        if (!isBannedLibrary(name))
            continue;
        findings.push({
            file: path,
            line: lineOf(text, name),
            rule: "library",
            message: `${name} is a second component library.`,
        });
    }
    return findings;
}
function isBannedLibrary(name) {
    if (bannedLibraries.has(name))
        return true;
    return bannedPrefixes.some((prefix) => name.startsWith(prefix));
}
function hexFindings(file, text, packageName) {
    if (packageName === "@hybridappdev/primitives" && file.endsWith(`${sep}tokens.css`)) {
        return [];
    }
    const findings = [];
    const lines = text.split("\n");
    lines.forEach((line, index) => {
        hexColor.lastIndex = 0;
        if (hexColor.test(line)) {
            findings.push({
                file,
                line: index + 1,
                rule: "hex",
                message: "Hex colors are not allowed.",
            });
        }
    });
    return findings;
}
function layoutFindings(file, text) {
    if (!text.includes("LayoutNode") && !text.includes("parseLayout"))
        return [];
    return unknownTypes(file, text, typeLiteral);
}
function jsonLayoutFindings(file, text) {
    if (!text.includes('"type"'))
        return [];
    return unknownTypes(file, text, jsonType);
}
function unknownTypes(file, text, pattern) {
    const findings = [];
    const lines = text.split("\n");
    lines.forEach((line, index) => {
        pattern.lastIndex = 0;
        for (const match of line.matchAll(pattern)) {
            const nodeType = match[1];
            if (!nodeType || layoutNodeTypes.has(nodeType))
                continue;
            findings.push({
                file,
                line: index + 1,
                rule: "layout",
                message: `Unknown node type "${nodeType}".`,
            });
        }
    });
    return findings;
}
function walk(dir) {
    return readdirSync(dir).flatMap((entry) => {
        if (skipDirectories.has(entry))
            return [];
        const path = join(dir, entry);
        if (statSync(path).isDirectory())
            return walk(path);
        return [path];
    });
}
function isSource(file) {
    const extension = file.slice(file.lastIndexOf("."));
    return sourceExtensions.has(extension);
}
function isTestFile(file) {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file);
}
function isLayoutJson(file) {
    const name = basename(file);
    if (name === "package.json" || name === "package-lock.json")
        return false;
    if (name.startsWith("tsconfig"))
        return false;
    return true;
}
function lineOf(text, needle) {
    const index = text.split("\n").findIndex((line) => line.includes(`"${needle}"`));
    return index === -1 ? 1 : index + 1;
}
