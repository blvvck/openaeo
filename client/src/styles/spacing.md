# Spacing Guidelines (8pt Grid)

All spacing in this app follows an 8pt grid system.

## Spacing Scale

| Token | Tailwind | Value | Use Case |
|-------|----------|-------|----------|
| 1 | `p-1`, `m-1`, `gap-1` | 4px | Tight spacing, icon gaps |
| 2 | `p-2`, `m-2`, `gap-2` | 8px | Compact elements, button padding |
| 3 | `p-3`, `m-3`, `gap-3` | 12px | Small component padding |
| 4 | `p-4`, `m-4`, `gap-4` | 16px | Default card padding, form spacing |
| 6 | `p-6`, `m-6`, `gap-6` | 24px | Section spacing, grid gaps |
| 8 | `p-8`, `m-8`, `gap-8` | 32px | Large gaps, page padding |
| 12 | `p-12`, `m-12` | 48px | Section dividers |
| 16 | `p-16`, `m-16` | 64px | Page sections |

## Usage Rules

### Cards
- Card padding: `p-4` (16px)
- Card content spacing: `space-y-4`

### Page Layout
- Page wrapper: `space-y-6` (24px between sections)
- Grid gaps: `gap-6` (24px)

### Forms
- Field spacing: `space-y-4`
- Label-to-input gap: `mb-2`
- Button row gap: `gap-2`

### Buttons
- Default: `px-4 py-2`
- Small: `px-3 py-1.5`
- Icon button: `p-2`

### Lists
- List item spacing: `space-y-2` or `space-y-4`
- Table cell padding: `p-4`

## Don'ts

- Don't use arbitrary values like `p-[13px]`
- Don't mix spacing systems
- Stick to the scale above

## Dark Mode

Spacing is the same in dark mode - only colors change.
