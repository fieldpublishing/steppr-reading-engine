# Steppr Tech Interface Design Exploration

## Three Directions Considered

### Theme Name: Instrument Panel
**Very Brief Intro:** A precision-reading workspace that borrows its calm focus and tactile cues from premium studio hardware. It creates confidence through measured type, disciplined contrast, and controls that feel intentionally engineered.

**Probability:** 0.07

### Theme Name: Editorial Daylight
**Very Brief Intro:** A warm paper-like reader with a restrained academic quality, shaped around spacious cards and calm typography. It reduces perceived friction for longer reading sessions.

**Probability:** 0.03

### Theme Name: Kinetic Signal
**Very Brief Intro:** A deep, low-light reading environment where cyan anchors and amber focus points make the pace of reading visible. It treats the ORP as a subtle visual instrument rather than an effect.

**Probability:** 0.09

## Chosen Direction: Instrument Panel

**Design Movement:** Contemporary industrial interface design with editorial typography, inspired by precision laboratory instruments and premium audio control surfaces.

**Core Principles:** The reading word is the unmistakable focal point; surrounding controls remain quiet until needed. Every interaction should provide immediate, tactile feedback. Color is used only to encode reading position, playback status, and mode. Dense control information is divided into clearly labelled compartments so the experience remains legible at speed.

**Color Philosophy:** The dark theme uses deep slate as a visual recess that reduces eye fatigue, with cyan for operational states and amber for the optical-recognition anchor. The light theme swaps the recess for warm-white paper, retains teal for system activity, and turns the focus letter a clear editorial orange. Both modes keep neutral surfaces nearly colorless so the reading signal owns the attention.

**Layout Paradigm:** A single, horizontal reading console sits inside an edge-to-edge shell. The reading engine occupies the upper visual field, while the lower control deck is organised as three adjacent instrument bays: pacing, transport, and options. On small screens the bays stack in functional priority order without losing their internal hierarchy.

**Signature Elements:** The ORP target rings and anchor dot beneath the word; a circular WPM dial with an active tick indicator; hairline compartment dividers and small uppercase equipment labels.

**Interaction Philosophy:** Controls should respond as physical instruments: press states are concise, the dial can be dragged or adjusted with the keyboard, and play state subtly energises the progress signal. Interaction never competes with reading motion.

**Animation:** Use 120–220ms cubic-bezier transitions for button presses, theme shifts, mode changes, and dial updates. When playing, the anchor dot breathes almost imperceptibly and progress advances linearly. Respect reduced-motion preferences by disabling non-essential pulses and transitions.

**Typography System:** Use Space Grotesk for navigation, labels, and controls, paired with DM Sans for paragraph context. The focus word uses a large, lightweight Space Grotesk treatment; labels use compact 11–12px uppercase tracking; metrics use tabular figures for stability.

**Brand Essence:** Steppr Tech is a precision reading console for people who want to move through demanding text with deliberate speed. **Focused, technical, reassuring.**

**Brand Voice:** Headlines are direct and kinetic; CTAs and microcopy are concise, operational, and never promotional. Example lines: “Find the word. Keep the thought.” and “Set your pace, then disappear into the page.”

**Wordmark & Logo:** Use the supplied STEPPR. TECH lockup as the canonical brand mark. Pair its folded-corner book icon with a compact, high-contrast wordmark in the header; do not recreate it with substitute typography.

**Signature Brand Color:** **Signal Teal** — #16B8C5.

## Style Decisions

- Preserve the supplied screenshots as the ground-truth layout for the primary desktop reader surface.
- Keep cards slightly rounded (16px) and use depth only to separate functional layers, never as decoration.
- Ensure light and dark themes share component placement and interaction behavior, while shifting only their material system and emphasis colors.
