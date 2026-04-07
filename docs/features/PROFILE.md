# User Profile and Settings

This document describes the structure and operations of the `/src/features/profile` architecture within Watch Rudra.

The Profile module handles the presentation and mutation of the authenticated user's account data via the backend REST API.

## Profile Architecture

The Profile interface is divided into several discrete tabs or pages, each mapping to a specific backend domain.
- **Account Details:** Core mutable fields (username, avatar, email). Validated heavily by Zod schemas before being passed to Server Actions or TRPC/Fetch clients.
- **Security:** Password change and 2FA (Two-Factor Authentication) enablement. Relies on the `/users/security` endpoint logic.
- **Billing/Subscriptions:** Connects with the payment gateway (e.g., Stripe) webhooks. This sub-module polls for active plan statuses.

## UI Components
Buttons are strictly constrained to the `buttonVariants({ variant: 'neo-outline' })` standard for a cohesive Neo-brutalist interaction model.

### Form Validation
React Hook Form is integrated with `@hookform/resolvers/zod`.
1. Users attempt changes.
2. The UI synchronously prevents submission if local validation fails (e.g., password too short).
3. If valid, an optimistic update occurs modifying the UI context via `useMutation`, which subsequently awaits the true backend validation hook.

## Avatar Upload 
Images are handled locally before upload.
- File Size limitation checks run natively in the browser before invoking S3 presigned-url logic via our server (`/upload/presign`).
- Upload leverages multi-part fetch requests to stream directly to the block storage to bypass Next.js API route 4MB limitations.
- Image proxy API resizes/crops are applied using Next.js `next/image` or backend pipelines dynamically for performance.