/**
 * Verifies the SVG screening applied to uploaded logos. An SVG is a document
 * served from our own origin, so hostile constructs must be refused.
 *
 *   npx tsx scripts/verify-logo-upload.ts
 */
import { isSafeSvg } from "../src/lib/svg-safety";

let failures = 0;

function check(label: string, svg: string, shouldPass: boolean) {
  const passed = isSafeSvg(svg);
  const ok = passed === shouldPass;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(44)}${passed ? "accepted" : "rejected"}`);
}

const CLEAN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 1H9V9H1Z"/></svg>`;

console.log("Legitimate artwork:");
check("clean monochrome SVG", CLEAN, true);
check("SVG with title and defs", CLEAN.replace("<path", "<title>Daar</title><defs></defs><path"), true);
check("SVG with a mask (our own mark uses one)", CLEAN.replace("<path", "<mask id='m'></mask><path"), true);

console.log("\nHostile constructs — all must be refused:");
check("<script> tag", CLEAN.replace("<path", "<script>alert(1)</script><path"), false);
check("inline onload= handler", CLEAN.replace("<svg ", `<svg onload="alert(1)" `), false);
check("inline onclick= handler", CLEAN.replace("<path", `<path onclick="alert(1)" `), false);
check("javascript: URL", CLEAN.replace("<path", `<a href="javascript:alert(1)"/><path`), false);
check("<foreignObject> (can host HTML)", CLEAN.replace("<path", "<foreignObject></foreignObject><path"), false);
check("<iframe>", CLEAN.replace("<path", "<iframe src='x'></iframe><path"), false);
check("XML entity declaration", `<!DOCTYPE svg [<!ENTITY a "x">]>${CLEAN}`, false);

console.log("\nMalformed input:");
check("plain text", "just some text", false);
check("empty string", "", false);
check("HTML document", "<html><body>hi</body></html>", false);

console.log(`\n${failures === 0 ? "All SVG screening checks passed." : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
