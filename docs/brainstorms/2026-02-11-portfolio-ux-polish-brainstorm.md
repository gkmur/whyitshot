# Portfolio UX Polish — Brainstorm

**Date:** 2026-02-11
**Status:** Ready for planning

## What We're Building

A focused set of UX and visual improvements to make "Why It's Hot" immediately inviting to portfolio visitors. The goal: someone lands on the app and thinks "I want to try this" within 10 seconds — before reading any description.

## Why This Approach

The app's core functionality is strong (drag reorder, inline editing, BG removal, image suggestions, export). But the *invitation* to use it is weak — visitors land on a blank form with no indication of what the tool produces or why it's interesting. Three specific problems:

1. **Empty state is dead** — blank form gives no preview of the output
2. **Input flow feels like work** — traditional form layout doesn't invite play
3. **Preview feels static** — card grid works but lacks energy and delight

## Key Decisions

### 1. "Load Sample Data" Button
- Prominent button in the empty state that loads 3 curated sample products instantly
- Staggered card-in animation so the grid comes alive visually
- Sample data should look real and appealing (recognizable consumer products)
- One click to see the full app in action — zero friction demo

### 2. Ghost Preview in Empty State
- Show a faded/skeleton version of what the card grid output looks like
- Communicates the destination before the user starts — they see what they're building toward
- Disappears once real SKUs are added

### 3. Quick-Add Bar Redesign
- Reduce visual weight of the input form
- Make it feel more like a quick-add bar or search input rather than a traditional form
- Less "fill out this form" energy, more "just type and go"

### 4. Card Hover/Interaction Polish
- Subtle scale + shadow depth changes on hover
- Smoother drag physics feedback
- Cards should feel tactile and alive, not flat

### 5. Page Load Animation
- Staggered fade-in of page sections on initial load
- Gives the page a sense of intentional choreography rather than everything appearing at once

## Open Questions

- What 3 sample products to use for the demo button? Should be visually distinctive and recognizable
- How prominent should the "Load sample data" button be vs. the main input form?
- Should the ghost preview be static or have a subtle ambient animation?

## Scope Boundaries

**In scope:**
- Empty state improvements (demo button + ghost preview)
- Input form visual redesign (lighter weight, more inviting)
- Card interaction polish (hover, drag feedback)
- Page load choreography

**Out of scope (for now):**
- Dark mode
- Full visual identity overhaul
- New features or functionality
- Export flow changes
