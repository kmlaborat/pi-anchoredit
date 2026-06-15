---
name: anchoredit
description: Targeted, hash-verified code editing using AnchorScope and AnchorEdit. Use when editing a specific part of a file — fixing bugs, refactoring functions, updating configuration values, or replacing any text block. Do NOT use full-file rewrites. Always use this skill for precise targeted edits.
compatibility: "Requires anchoredit and anchorscope installed. Install: cargo install --path . in each repo."
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

# Returns:
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

# Repeat until done:true
# {
#   "done": true,
#   "size_bytes": 342,
#   "anchor": "<the target text>"
# }
```

**Selection strategy:** Read each segment's `preview`. Select the segment
where the target is most likely to appear. If the target spans a boundary,
select the center segment (B).

**If anchor is too large** (`size_bytes` is still large after `done:true`):

```bash
anchoredit search --file <path> --range <last_range> --termination-bytes 256
```

**To go back one step:** re-run with the previous range value.
Range history is your undo stack — keep track of it.

---

### Phase 3: Read — Confirm Match and Get scope_hash

```bash
anchorscope read --file <path> --anchor-file <anchor_file>
# or inline (for short anchors):
anchorscope read --file <path> --anchor "<anchor_text>"

# Returns:
# scope_hash=3a7f1c2d4e5b6f8a
# content=<matched bytes>
```

Verify that `content` matches what you intend to replace.
Save `scope_hash` — you will need it for write.

**If NO_MATCH:** The anchor does not exist in the file. Re-run search with
a wider `--termination-bytes` or adjust the anchor text.

**If MULTIPLE_MATCHES:** The anchor is not unique. Use a wider anchor
that includes more surrounding context.

---

### Phase 4: Write — Apply Replacement

```bash
anchorscope write \
  --file <path> \
  --anchor-file <anchor_file> \
  --expected-hash <scope_hash> \
  --replacement-file <replacement_file>

# or inline:
anchorscope write \
  --file <path> \
  --anchor "<anchor_text>" \
  --expected-hash <scope_hash> \
  --replacement "<new_text>"

# Success: OK: written N bytes
```

**If HASH_MISMATCH:** The file changed between read and write.
Re-run `anchorscope read` to get a fresh `scope_hash`, then retry write.

---

## Error Handling

| Error              | Cause                                    | Action                                              |
| :----------------- | :--------------------------------------- | :-------------------------------------------------- |
| `NO_MATCH`         | Anchor not found in file                 | Widen anchor or re-run search                       |
| `MULTIPLE_MATCHES` | Anchor not unique                        | Add more surrounding context to anchor              |
| `HASH_MISMATCH`    | File changed between read and write      | Re-run read to refresh scope_hash                   |
| `IO_ERROR`         | File permissions or path issue           | Check file path and permissions                     |
| done:true too wide | size_bytes still large after termination | Retry search with smaller --termination-bytes value |

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
- **Don't** use a very short anchor (e.g., one word). It will likely cause `MULTIPLE_MATCHES`.
- **Don't** skip `anchorscope read`. You need `scope_hash` before writing.
- **Don't** ignore `size_bytes` in the search response. If it's still large, keep bisecting.
- **Don't** invent the `scope_hash`. Always get it from `anchorscope read`.

---

## Enforcement Gate

**Before running `anchorscope write`, verify:**

- [ ] `anchoredit search` returned `done:true`
- [ ] `anchor` from search result exists in the file (confirmed by `anchorscope read`)
- [ ] `scope_hash` obtained from `anchorscope read` (not invented)
- [ ] `content` from read matches the intended target
- [ ] `replacement` is ready and correct
- [ ] `--expected-hash` matches the `scope_hash` from read

If ANY item is not checked → Stop. Do not write. Fix the unchecked item first.

---

## Example: Fix a Bug in a Function

```bash
# 1. Comprehend
cat src/calculator.rs

# 2. Search (target is around 40% into the file)
anchoredit search --file src/calculator.rs
# → Select B (30%-70%)
anchoredit search --file src/calculator.rs --range 0.3:0.7
# → Select A (30%-52%)
anchoredit search --file src/calculator.rs --range 0.3:0.52
# → done:true, anchor = "fn calculate_area..."

# 3. Save anchor to file
printf '%s' '<anchor text>' > /tmp/anchor.txt

# 4. Read
anchorscope read --file src/calculator.rs --anchor-file /tmp/anchor.txt
# → scope_hash=3a7f1c2d4e5b6f8a
# → content=fn calculate_area...

# 5. Prepare replacement
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
  --expected-hash 3a7f1c2d4e5b6f8a \
  --replacement-file /tmp/replacement.txt
# → OK: written 312 bytes
```

---

## References

- AnchorEdit SPEC: https://github.com/kmlaborat/AnchorEdit/blob/main/docs/SPEC.md
- AnchorScope SPEC: https://github.com/kmlaborat/AnchorScope/blob/main/docs/SPEC.md
- Sliding Bisection: https://github.com/kmlaborat/AnchorEdit/blob/main/docs/SLIDING_BISECTION.md
