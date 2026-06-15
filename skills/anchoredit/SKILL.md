---
name: anchoredit
description: "Targeted, hash-verified code editing using AnchorScope and AnchorEdit. Use when editing a specific part of a file — fixing bugs, refactoring functions, updating configuration values, or replacing any text block. Do NOT use full-file rewrites. Always use this skill for precise targeted edits."
---

# anchoredit

Use this skill whenever you need to edit a specific part of a file deterministically.
Do NOT use full-file rewrites or line-number-based edits. Always use this skill for targeted code changes.

## When to Use

- Fixing a bug in a specific function
- Refactoring a section of code
- Updating a configuration value
- Replacing a block of text in any file
- Any targeted edit where you know approximately where the target is

## Core Concept

```
anchor = scope

The anchor IS the target. Protection breadth equals anchor length.
Choose a wider anchor to protect a wider region.
```

## CRITICAL RULES

> **NEVER construct anchors manually.**
> Anchors MUST come from `anchoredit search` output only.
> Do NOT write anchor strings from memory, from file reads, or from grep output.
> A manually constructed anchor may match multiple locations and cause wrong edits.

> **When `done:true` is returned, use that anchor immediately.**
> Do NOT keep narrowing after `done:true`. Proceed to Phase 3 (Read) right away.
> The `anchor` field in the `done:true` response is ready to use as-is.

> **`termination_bytes` controls search depth, NOT anchor length.**
> It is the threshold at which the search stops bisecting.
> A larger `termination_bytes` produces a wider anchor; a smaller value produces a narrower one.
> Do NOT reduce `termination_bytes` to "trim" an anchor — use range narrowing instead.

## Editing Loop

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Comprehend  │ →  │    Search    │ →  │     Read     │ →  │    Write     │
│     File     │    │ (Bisection)  │    │  (get hash)  │    │  (replace)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           ↑                                       │
                           └─────── retry if needed ───────────────┘
```

## Workflow

### Phase 1: Comprehend

Read the file to develop positional awareness.

```bash
cat <file>
# or for large files:
head -n 50 <file>
tail -n 50 <file>
```

Note approximately where the target is (e.g., "around 60% into the file").

---

### Phase 2: Search — Narrow Scope via Sliding Bisection

Use `anchoredit search` to narrow down to the target region.

```bash
# Initial call (full file)
anchoredit search --file <path>

# Returns segments to choose from:
# {
#   "range": [0.0, 1.0],
#   "size_bytes": 8292,
#   "segments": [
#     {"id": "A", "range": [0.0, 0.4], "size_bytes": 3317, "preview": "..."},
#     {"id": "B", "range": [0.3, 0.7], "size_bytes": 3317, "preview": "..."},
#     {"id": "C", "range": [0.6, 1.0], "size_bytes": 3317, "preview": "..."}
#   ]
# }

# Select the segment containing the target, then narrow:
anchoredit search --file <path> --range 0.3:0.7

# When done:true is returned, STOP and proceed to Phase 3 immediately:
# {
#   "done": true,
#   "size_bytes": 342,
#   "anchor": "<use this anchor as-is in Phase 3>"
# }
```

**Selection strategy:** Read each segment's `preview`. Select the segment
where the target is most likely to appear. If the target spans a boundary,
select the center segment (B).

**When `done:true` appears:** Extract the `anchor` field and save it to a file.
Do NOT keep narrowing. Do NOT modify the anchor. Proceed to Phase 3.

```bash
# Save the anchor from done:true response to a file:
printf '%s' '<anchor field from done:true>' > /tmp/anchor.txt
```

**If anchor is too wide** (contains too much surrounding code):
Narrow the range further before the search terminates:

```bash
# Use a smaller range, not a smaller --termination-bytes:
anchoredit search --file <path> --range 0.30:0.45
```

**To go back one step:** re-run with the previous range value.
Range history is your undo stack — keep track of it.

---

### Phase 3: Read — Confirm Match and Get scope_hash

Pass the anchor from Phase 2 directly to `anchorscope read`.
Do NOT modify the anchor. Do NOT reconstruct it from memory.

```bash
anchorscope read --file <path> --anchor-file /tmp/anchor.txt

# Returns:
# scope_hash=3a7f1c2d4e5b6f8a
# content=<matched bytes>
```

Read the `content` carefully. This is exactly what will be replaced.
Construct your replacement based on this `content`.
Save `scope_hash` — you will need it for write.

**If NO_MATCH:** The anchor from search does not match the file.
This should not happen if the anchor came from `anchoredit search`.
Re-run search to get a fresh anchor.

**If MULTIPLE_MATCHES:** The anchor matches more than one location.
Re-run search with a wider `--termination-bytes` to get a longer anchor.

---

### Phase 4: Write — Apply Replacement

```bash
anchorscope write \
  --file <path> \
  --anchor-file /tmp/anchor.txt \
  --expected-hash <scope_hash> \
  --replacement-file /tmp/replacement.txt

# or inline for short replacements:
anchorscope write \
  --file <path> \
  --anchor-file /tmp/anchor.txt \
  --expected-hash <scope_hash> \
  --replacement "<new_text>"

# Success: OK: written N bytes
```

**If HASH_MISMATCH:** The file changed between read and write.
Re-run `anchorscope read` to get a fresh `scope_hash`, then retry write.

---

## Error Handling

| Error              | Cause                                         | Action                                                   |
| :----------------- | :-------------------------------------------- | :------------------------------------------------------- |
| `NO_MATCH`         | Anchor not found in file                      | Re-run search to get a fresh anchor                      |
| `MULTIPLE_MATCHES` | Anchor not unique                             | Re-run search with larger `--termination-bytes`          |
| `HASH_MISMATCH`    | File changed between read and write           | Re-run read to refresh scope_hash                        |
| `IO_ERROR`         | File permissions or path issue                | Check file path and permissions                          |
| anchor too wide    | `done:true` anchor contains too much context  | Narrow range before termination, not termination-bytes   |

---

## Tools

| Tool          | Command                 | Purpose                            |
| :------------ | :---------------------- | :--------------------------------- |
| `anchoredit`  | `anchoredit search`     | Narrow scope via Sliding Bisection |
| `anchorscope` | `anchorscope read`      | Confirm match, get scope_hash      |
| `anchorscope` | `anchorscope write`     | Hash-verified replacement          |

---

## Anti-Patterns

- **Don't** rewrite the full file. Always use targeted anchor-based edits.
- **Don't** use line numbers as anchors. Lines shift; byte content doesn't.
- **Don't** construct anchors manually from memory, grep, or file reads.
- **Don't** keep narrowing after `done:true`. Use the anchor immediately.
- **Don't** reduce `--termination-bytes` to trim an anchor. Use range narrowing instead.
- **Don't** skip `anchorscope read`. You need `scope_hash` before writing.
- **Don't** invent the `scope_hash`. Always get it from `anchorscope read`.
- **Don't** modify the anchor between search and read. Use it as-is.

---

## Enforcement Gate

**Before running `anchorscope write`, verify:**

- [ ] `anchoredit search` returned `done:true`
- [ ] `anchor` was taken directly from the `done:true` response (not constructed manually)
- [ ] `anchor` was passed to `anchorscope read` without modification
- [ ] `scope_hash` obtained from `anchorscope read` (not invented)
- [ ] `content` from read was used as the basis for `replacement`
- [ ] `replacement` is ready and correct
- [ ] `--expected-hash` matches the `scope_hash` from read

If ANY item is not checked → Stop. Do not write. Fix the unchecked item first.

---

## Example: Fix a Bug in a Function

```bash
# 1. Comprehend
cat src/calculator.rs

# 2. Search — repeat until done:true
anchoredit search --file src/calculator.rs
# → segments returned, select B
anchoredit search --file src/calculator.rs --range 0.3:0.7
# → segments returned, select A
anchoredit search --file src/calculator.rs --range 0.3:0.52
# → done:true
# {
#   "done": true,
#   "size_bytes": 58,
#   "anchor": "fn calculate_area(width: f64, height: f64) -> f64 {\n    width * height\n}"
# }

# 3. Save anchor directly from done:true (do NOT modify)
printf '%s' 'fn calculate_area(width: f64, height: f64) -> f64 {\n    width * height\n}' > /tmp/anchor.txt

# 4. Read — pass anchor as-is
anchorscope read --file src/calculator.rs --anchor-file /tmp/anchor.txt
# → scope_hash=7eebf351baac3a1a
# → content=fn calculate_area(width: f64, height: f64) -> f64 {
# →     width * height
# → }

# 5. Prepare replacement based on content from read
cat > /tmp/replacement.txt << 'EOF'
fn calculate_area(width: f64, height: f64) -> f64 {
    if width < 0.0 || height < 0.0 {
        return 0.0;
    }
    width * height
}
EOF

# 6. Write
anchorscope write \
  --file src/calculator.rs \
  --anchor-file /tmp/anchor.txt \
  --expected-hash 7eebf351baac3a1a \
  --replacement-file /tmp/replacement.txt
# → OK: written 509 bytes
```

---

## References

- AnchorEdit SPEC: https://github.com/kmlaborat/AnchorEdit/blob/main/docs/SPEC.md
- AnchorScope SPEC: https://github.com/kmlaborat/AnchorScope/blob/main/docs/SPEC.md
- Sliding Bisection: https://github.com/kmlaborat/AnchorEdit/blob/main/docs/SLIDING_BISECTION.md
