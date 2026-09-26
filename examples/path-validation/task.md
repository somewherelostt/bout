# Prevent traversal outside the configured workspace

Repository: local/path-safety

The path resolver currently accepts values containing `..` and can return a path outside the configured workspace.

## Acceptance criteria

- Resolve normal relative paths under the configured workspace.
- Reject traversal that escapes the workspace.
- Reject absolute paths supplied as relative input.
- Preserve the existing function signature.
- Add focused tests for valid and invalid paths.

## Verification

Run `npm test`.
