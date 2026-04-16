# pi-anchoredit

**pi-anchoredit** is the reference implementation of the AnchorEdit specification for Pi.

It enables LLM agents to perform safe, deterministic, and hierarchical code edits using AnchorScope.

## Overview

pi-anchoredit implements the Buffer-First and Tree-Navigation editing paradigms defined in AnchorEdit.

- Specification: https://github.com/kmlaborat/anchoredit
- Protocol: https://github.com/kmlaborat/AnchorScope

## Features

- Root Scope Establishment
- Buffer-First Editing
- Tree-Navigation Editing
- Deterministic Verification via AnchorScope
- Automatic Recovery from Errors

## Architecture

```
LLM → AnchorEdit → pi-anchoredit → AnchorScope → Source Code
```

## Status

Experimental reference implementation.

## License

MIT License
