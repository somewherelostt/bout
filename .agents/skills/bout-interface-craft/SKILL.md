---
name: bout-interface-craft
description: Design and review Bout's evidence-first web interface. Use for any Bout UI, UX, copy, layout, accessibility, or interaction change.
---

# Bout Interface Craft

Build Bout as a calm, credible review instrument. The interface should make task context, anonymous evidence, current state, and the next action obvious before it tries to look impressive.

## Product character

- Precise, trustworthy, and quietly distinctive.
- Artifact-first: show real hashes, files, status, amounts, and timestamps without inventing activity.
- Technical without becoming terminal cosplay. Use monospace only for identifiers, paths, hashes, and compact metadata.
- Colorful in small, meaningful doses. Indigo means action/selection, green means verified/success, amber means attention, red means failure.

## Hierarchy and layout

- Keep primary reading regions between 640px and 760px; use wider layouts only for comparisons, tables, and forms.
- Use whitespace to group related content before adding borders or containers.
- Keep page titles between 40px and 56px on desktop and 36px to 44px on mobile.
- Put the page purpose and current state near the top. Put supporting metrics after the explanation, not before it.
- Use cards only when they create a meaningful grouping or interaction boundary.
- Preserve content and actions at 320px. Stack comparison layouts instead of clipping or hiding them.

## Type and visibility

- Space Grotesk is the interface voice; IBM Plex Mono is reserved for machine-readable details.
- Body copy is at least 14px with 1.55–1.65 line height. Form inputs are 16px on mobile.
- Labels are at least 13px. Eyebrows and metadata are at least 11px and must remain high contrast.
- Use no more than four visible type sizes in a single region.
- Balance headings and pretty-wrap descriptions. Use tabular numbers for money, counts, and timestamps.
- Muted text must still be readable; do not use opacity alone to create hierarchy.

## Surfaces and color

- Use warm off-white for the canvas, white for primary surfaces, and a subtle cool tint for secondary regions.
- Prefer one low-contrast border plus a layered shadow over bevels, hard chrome, or decorative grid textures.
- Use radii concentrically: a nested control radius should be smaller than its parent card radius by the surrounding inset.
- Use the accent only for primary actions, active navigation, and selected outcomes.
- Every status must have text or an icon in addition to color.

## Interaction

- Target at least 44px for primary buttons, navigation, inputs, and touch actions; never go below 24px.
- Use native buttons, links, inputs, labels, and fieldsets before adding ARIA.
- Every interactive element needs a visible `:focus-visible` state.
- Transition only the exact properties that change. Use 140–180ms for direct feedback.
- Pressed buttons may scale to 0.98. Avoid decorative entrance motion and continuously moving backgrounds.
- Respect `prefers-reduced-motion`; the complete workflow must work without animation or hover.

## Writing

- Lead with the user outcome: “Create real bout,” “Save structured verdict,” “Export JSON evidence.”
- Explain local-versus-live state plainly. Never imply funds moved, verification ran, or a bounty published unless an artifact proves it.
- Empty states name what is missing and the action that creates it.
- Errors say what happened and how to recover. Avoid jokes in operational or security copy.

## Page-specific rules

- **New bout:** explain the workflow before the form; keep funding language explicit; show the two patch inputs as peers.
- **Battle:** make task context and both anonymous patches equally scannable; keep the verdict action after evidence.
- **Judge:** distinguish live Gibwork records from local Bout records visually and in text.
- **Evidence:** state the denominator and provenance beside every derived metric.
- **Vault and Security:** expose useful trust boundaries without leaking machine paths, usernames, secrets, or unnecessary infrastructure detail.
- **History and Awards:** use real saved state only; never render mock rows, fake progress, or invented achievements.

## Review loop

1. Inspect the implementation and the rendered page.
2. Verify hierarchy at 1440px, 768px, and 320–390px widths.
3. Check keyboard order, focus visibility, labels, empty states, errors, and reduced motion.
4. Check the browser console and accessibility tree.
5. Run the project typecheck, build, and tests.
6. Remove any decoration that competes with the task, evidence, state, or primary action.

Do not reproduce another product's brand, assets, or page composition. Apply the underlying craft principles to Bout's own workflow and identity.
