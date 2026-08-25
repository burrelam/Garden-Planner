import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Amanda's original files are a historical artifact, not source files for the
// hosted app. These hashes make an accidental formatter or bulk edit visible in
// the normal test suite instead of silently changing her preserved work.
const originalFileHashes = {
  "README.md":
    "419e07ed7e3b8a101965b39b4c26cc0080f711e0184ad642209dc88efa7f1132",
  "care-data.json":
    "2ded79a10adf3a084690ca0cb6c0a2c0826ac329971066d2109a0914e556b6df",
  "index.html":
    "f189d172221ca881376a6f44583234c358545e43b6be64c2cb8c51676319d3d7",
} as const;

describe("Amanda's original planner archive", () => {
  for (const [fileName, expectedHash] of Object.entries(originalFileHashes)) {
    it(`keeps ${fileName} byte-for-byte unchanged`, () => {
      const file = readFileSync(
        resolve(process.cwd(), "original-planner", fileName),
      );
      const actualHash = createHash("sha256").update(file).digest("hex");

      expect(actualHash).toBe(expectedHash);
    });
  }
});
