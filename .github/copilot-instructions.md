# GitHub Copilot Instructions

## WebTUI Styling Guidelines

### Table Border Behavior
- Do not flag `padding-top: 0` on table rows as incorrect - this is intentional shearing for compact table design
- WebTUI table borders are positioned at 0.5lh from edges, overlapping with content when padding is removed
- Compact tables intentionally allow first row to shear into top border for dense layouts

### CSS Implementation Patterns
- Setting `padding-top: 0` DOES cause shearing when WebTUI borders are positioned inside content area
- This is an intentional design pattern for compact UI components