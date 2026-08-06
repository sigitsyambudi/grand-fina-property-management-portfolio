# Portfolio Edition Design System

The UI uses Tailwind CSS with semantic CSS variables defined in `app/globals.css`.

## Principles

- Operational clarity before decoration.
- Semantic HTML, associated labels, keyboard access, and visible focus.
- Responsive layouts from mobile through large desktop.
- Loading, empty, error, and permission-denied states for every data surface.
- Financial writes are shown as final only after server confirmation.
- Locale-aware IDR, date, percentage, and status presentation.

## Foundations

Deep green is the primary brand family, warm gold is the accent, and neutral off-white surfaces separate sections. Text and interactive states must maintain sufficient contrast. Motion should be subtle and respect reduced-motion preferences.

## Components

Reusable primitives remain business-neutral in `components/ui`. Domain components own room, lease, billing, payment, expense, maintenance, and report semantics. Client Components are limited to interactive controls and panels.

## Content

Use “Grand Fina Property Management — Portfolio Edition” for the application and “Emerald Haven Residence” for the fictional property. Mark demonstration data clearly and never include real tenant information, private metrics, local paths, or credentials in visual examples.
