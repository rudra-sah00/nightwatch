# Setup and Local Development Guide

This guide covers everything needed to set up and run the Nightwatch frontend application on your local machine.

## Prerequisites

Before starting, ensure you have the following installed:
- Node.js (version 20 or higher)
- [pnpm](https://pnpm.io/) (used for package management)
- A running instance of the [nightwatch-backend](https://github.com/rudra-sah00/nightwatch-backend) and its Redis dependencies.

## Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/rudra-sah00/nightwatch.git
   cd nightwatch
   ```

2. Install all dependencies using pnpm:
   ```bash
   pnpm install
   ```

## Environment Configuration

Create a `.env.local` file at the root of the project by copying the example provided:

```bash
cp .env.example .env.local
```

### Essential Environment Variables

Your `.env.local` file should be configured strictly according to where your backend services are running. Here are the core variables required for local development:

```env
# The URL pointing to your locally running nightwatch-backend instance
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# The URL pointing to your local Cloudflare Worker proxy (if applicable)
NEXT_PUBLIC_CF_WORKER_URL=http://localhost:8787

# The WebSocket connection URL (typically exactly matches the backend URL)
NEXT_PUBLIC_WS_URL=http://localhost:4000

# Your WebRTC Platform Application ID (from console.agora.io)
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id

# Toggle detailed Agora SDK debug logging in the browser console
NEXT_PUBLIC_AGORA_DEBUG=false

# Cloudflare Turnstile site key (anti-bot verification on login/signup)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key

# Sentry DSN for error tracking (disabled in development via enabled: false)
NEXT_PUBLIC_SENTRY_DSN=
```

> **Note:** Do not check `.env.local` into version control. It is ignored by Git automatically.

## Running the Application

### Development Server

To launch the Next.js development server with hot-reloading:

```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build and Production Server

To verify the production build optimization locally:

1. Build the application:
   ```bash
   pnpm build
   ```

2. Start the optimized server:
   ```bash
   pnpm start
   ```

## Code Quality Quality and Linting

The repository tightly enforces formatting and type safety using Biome and TypeScript. 

Before committing your code, you should run:

- **Check types:** `pnpm type-check`
- **Lint & Format check:** `pnpm lint`
- **Auto-fix formatting:** `pnpm format`

The project utilizes `husky` to ensure basic checks pass before any commit.

## Testing

Nightwatch uses Vitest for component unit testing and Playwright for End-to-End flows.

- **Run unit tests:** `pnpm test`
- **Run the UI test dashboard:** `pnpm test:ui`
- **Run End-to-End tests:** `pnpm test:e2e` (Ensure Redis is running locally as the E2E script wipes test sessions).

---

Next reading: Consider looking at [ARCHITECTURE.md](./ARCHITECTURE.md) to understand how the components interact with Socket.IO and Agora.