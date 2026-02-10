# Lynk-X Web Application

This is the web frontend for **Lynk-X**, a platform designed for seamless event interactions. It is built with **Next.js 15**, **React**, and **TypeScript**, focusing on a premium, responsive, and performant user experience.

## Features

- **Responsive Design**: Fully adaptable UI that works seamlessly on Mobile, Tablet, and Desktop.
- **Event Discovery**: Grid-based event listing with search and filtering capabilities (Calendar, Categories, Tags).
- **Navigation Drawer**: Smooth side-drawer for navigation and filters.
- **Event Details**: Comprehensive event pages with expandable descriptions and ticket selection.
- **Checkout Flow**: Streamlined checkout process with order summary and payment forms.
- **Page Transitions**: Smooth animations between pages using `framer-motion`.
- **Skeleton Loading**: Perceived performance optimizations with skeleton loaders for data fetching states.
- **Shared Design System**: Uses a shared token system (colors, typography) synced with the mobile app via the `core` repository.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS Modules with CSS Variables (Design Tokens)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

## Project Structure

```bash
web/
├── public/              # Static assets (images, icons)
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── checkout/    # Checkout flow pages
│   │   ├── event-details/ # Event details pages
│   │   ├── globals.css  # Global styles and CSS variables
│   │   ├── layout.tsx   # Root layout with metadata
│   │   └── page.tsx     # Home page
│   ├── components/      # Reusable UI components
│   │   ├── AppDrawer.tsx
│   │   ├── EventCard.tsx
│   │   ├── Navbar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Skeleton.tsx
│   │   └── ...
│   └── theme/           # Shared design tokens (generated from core)
├── package.json         # Project dependencies and scripts
└── README.md            # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Navigate to the `web` directory:

    ```bash
    cd web
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

This command compiles the application and checks for type errors.

## Design System

The application uses a set of CSS variables defined in `src/app/globals.css`. These variables are derived from the shared `tokens.ts` generated from the `core` repository, ensuring consistency across Web and Mobile platforms.

Key variables include:

- `--color-brand-primary`: Main brand green.
- `--color-utility-primaryBackground`: Dark background color.
- `--color-utility-primaryText`: Main text color.
- `--spacing-md`, `--spacing-lg`: Standardized spacing units.

## Key Components

### `EventCard`

Displays event summary. Supports an `isActive` state for highlighting.

### `AppDrawer`

A slide-out drawer containing navigation and filter options (Calendar, Categories, Tags).

### `Skeleton`

A versatile loading placeholder component with shimmer effects. content.
