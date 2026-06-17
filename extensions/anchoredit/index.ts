/**
 * AnchorEdit Extension for pi
 *
 * Registers anchoredit_apply, a single high-level tool for hash-verified
 * targeted file editing. Internally calls the anchoredit CLI binary
 * (which wraps AnchorScope's read/write via a Rust library dependency).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { resolve, isAbsolute as pathIsAbsolute } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

// Resolve the anchoredit binary path
function getAnchorEditBin(): string {
  return process.env.ANCHOREDIT_BIN ?? "anchoredit";
}

/**
 * Normalize a file path for the native anchoredit binary.
 *
 * On Windows, paths like "/tmp/file.rs" (Git Bash / Cygwin / MSYS2 mount style)
 * are not understood by native Windows binaries. Node.js treats "/tmp/..."
 * as "C:\\tmp\\..." which is a different location from the bash-mount temp dir.
 *
 * Strategy:
 * 1. If it looks like a Windows absolute path (C:\\...), pass through.
 * 2. If it starts with "/", try `cygpath -w` to translate the mount prefix
 *    (e.g. /tmp → C:\Users\...\AppData\Local\Temp).
 * 3. Otherwise treat it as a relative path and resolve against cwd.
 * 4. In all cases verify with existsSync; fall back to the original path
 *    so anchoredit can surface its own error message.
 */
function resolveFilePath(filePath: string, cwd: string): string {
  // Windows absolute path (e.g. C:\foo\bar.rs) — pass through
  if (pathIsAbsolute(filePath) && /^[a-zA-Z]:\\/.test(filePath)) {
    return filePath;
  }

  let resolved: string;

  // Looks like a Unix-style absolute path (/tmp/..., /home/..., etc.)
  if (filePath.startsWith("/")) {
    try {
      // Use cygpath -w to translate mount-aware paths to Windows native format.
      // Available in Git Bash, MSYS2, Cygwin environments on Windows.
      resolved = execSync("cygpath -w '" + filePath.replace(/'/g, "'\"'\"'") + "'", {
        shell: true,
      })
        .toString()
        .trim();
    } catch {
      // cygpath not available — fall through to relative resolution
      resolved = resolve(cwd, filePath);
    }
  } else {
    // Relative path — resolve against cwd
    resolved = resolve(cwd, filePath);
  }

  // Verify the file exists at the resolved location
  if (existsSync(resolved)) {
    return resolved;
  }

  // Fall back to the original path so anchoredit can report its own error
  return filePath;
}

export default function (pi: ExtensionAPI) {
  const bin = getAnchorEditBin();

  // ---------------------------------------------------------------------------
  // Tool: anchoredit_apply
  // ---------------------------------------------------------------------------
  pi.registerTool({
    name: "anchoredit_apply",
    label: "AnchorEdit Apply",
    description:
      "Apply a hash-verified, targeted edit to a file using an exact anchor string. This is the primary tool for all file edits. Internally verifies the file state before writing and guarantees zero modification outside the matched scope.",
    promptSnippet:
      "Apply a precise, hash-verified edit to a specific part of a file",
    promptGuidelines: [
      "Use anchoredit_apply for ALL file edits instead of the built-in edit or write tools.",
      "anchor must be an exact byte sequence that appears exactly once in the file.",
      "content is the complete replacement for the matched anchor text.",
      "If NO_MATCH is returned, the anchor does not exist in the file — read the file and revise the anchor.",
      "If MULTIPLE_MATCHES is returned, the anchor is not unique — use a longer anchor with more context.",
    ],
    parameters: Type.Object({
      file: Type.String({
        description: "Path to the file to edit",
      }),
      anchor: Type.String({
        description:
          "Exact text to match in the file. Must appear exactly once.",
      }),
      content: Type.String({
        description: "Complete replacement for the matched anchor text.",
      }),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const filePath = resolveFilePath(params.file, ctx.cwd);

      return withFileMutationQueue(filePath, async () => {
        const result = await pi.exec(
          bin,
          [
            "apply",
            "--file",
            filePath,
            "--anchor",
            params.anchor,
            "--replacement",
            params.content,
          ],
          { signal },
        );

        if (result.code !== 0) {
          const output = result.stderr || result.stdout || "";
          if (output.includes("NO_MATCH")) {
            throw new Error(
              `anchoredit_apply: NO_MATCH — the anchor was not found in the file. Check the file contents and revise the anchor.`,
            );
          }
          if (output.includes("MULTIPLE_MATCHES")) {
            throw new Error(
              `anchoredit_apply: MULTIPLE_MATCHES — the anchor matched more than once. Use a longer, more specific anchor.`,
            );
          }
          throw new Error(
            `anchoredit_apply failed (exit ${result.code}): ${output.trim()}`,
          );
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully applied edit to ${params.file}\n${result.stdout.trim()}`,
            },
          ],
          details: {
            file: filePath,
          },
        };
      });
    },
  });
}
