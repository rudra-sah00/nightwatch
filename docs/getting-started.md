# Getting Started with Watch-Rudra Frontend

This guide will help you set up the Watch-Rudra frontend development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.0.0 or higher
- **pnpm**: Version 9.0.0 or higher (recommended) or npm/yarn
- **Git**: Latest version
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourorg/watch-rudra.git
cd watch-rudra
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages including:
- Next.js 16+
- React 19+
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- Socket.IO client
- HLS.js
- LiveKit client
- And more...

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Backend API URL (Required)
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# WebSocket URL (Required)
NEXT_PUBLIC_WS_URL=http://localhost:4000

# LiveKit URL for Watch Parties (Required)
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880

# Cloudflare Turnstile Site Key (Optional in dev)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=test-key
```

### 4. Start the Backend

The frontend requires the backend API to be running. In a separate terminal:

```bash
cd ../watch-rudra-backend
pnpm install
pnpm dev
```

Backend should be running on `http://localhost:4000`

### 5. Start the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run Biome linter |
| `pnpm format` | Format code with Biome |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Open Vitest UI |
| `pnpm test:coverage` | Generate coverage report |

## Project Structure Overview

```
watch-rudra/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── (public)/      # Public routes
│   │   ├── (protected)/   # Auth-required routes
│   │   └── (party)/       # Watch party routes
│   ├── components/         # Reusable components
│   ├── features/          # Feature modules
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and helpers
│   ├── providers/         # Context providers
│   └── types/             # TypeScript types
├── tests/                 # Test files
├── public/                # Static assets
├── docs/                  # Documentation
├── .env                   # Environment variables
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
├── biome.json             # Biome linter config
└── vitest.config.ts       # Vitest test config
```

## First Steps

### 1. Access the Application

Navigate to `http://localhost:3000` in your browser.

### 2. Create an Account

1. Click "Sign Up"
2. Enter your details
3. You'll receive an OTP (check console in dev mode - OTP is `123456`)
4. Verify your account

### 3. Explore Features

- **Search**: Try searching for movies or TV shows
- **Watch**: Click on any content to start watching
- **Watch Party**: Create or join a watch party
- **Profile**: Update your profile and avatar

## Common Development Tasks

### Adding a New Component

```bash
# Create component file
touch src/components/ui/my-component.tsx
```

```tsx
// src/components/ui/my-component.tsx
'use client';

import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div className={cn('p-4 rounded-lg', className)}>
      {children}
    </div>
  );
}
```

### Adding a New Route

```bash
# Create page in app directory
mkdir -p src/app/new-route
touch src/app/new-route/page.tsx
```

```tsx
// src/app/new-route/page.tsx
export default function NewRoutePage() {
  return (
    <div>
      <h1>New Route</h1>
    </div>
  );
}
```

### Adding API Integration

```tsx
// src/features/example/api.ts
import { apiFetch } from '@/lib/fetch';

export async function fetchExample() {
  return apiFetch<ExampleResponse>('/api/example', {
    method: 'GET',
  });
}
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 pnpm dev
```

### Module Not Found Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors

```bash
# Run type checking
pnpm type-check

# Restart VS Code TypeScript server
# In VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Environment Variables Not Loading

1. Restart the development server
2. Ensure variables start with `NEXT_PUBLIC_` for client-side access
3. Check `.env` file exists and has correct values

## Development Tips

### Hot Reload

Next.js supports Fast Refresh - your changes will appear instantly without losing component state.

### TypeScript Strict Mode

The project uses strict TypeScript. Always add proper types:

```tsx
// ❌ Bad
function MyComponent({ data }) {
  return <div>{data}</div>;
}

// ✅ Good
interface MyComponentProps {
  data: string;
}

function MyComponent({ data }: MyComponentProps) {
  return <div>{data}</div>;
}
```

### CSS Variables

The project uses CSS variables for theming. Check `globals.css` for available variables:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* ... */
}
```

### Path Aliases

Use `@/` for absolute imports:

```tsx
// ❌ Bad
import { Button } from '../../../components/ui/button';

// ✅ Good
import { Button } from '@/components/ui';
```

## Next Steps

- Read the [Architecture Documentation](./architecture/)
- Explore [Feature Documentation](./features/)
- Check out the [Testing Guide](./testing.md)
- Review the [Deployment Guide](./deployment.md)

## Getting Help

- Check existing documentation in `/docs`
- Review the code examples in the codebase
- Ask questions in team chat/issues
- Backend API documentation: `../watch-rudra-backend/docs`

---

**Happy Coding! 🚀**
