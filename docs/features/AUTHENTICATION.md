# Authentication Architecture

## Overview
Our authentication strategy is a heavily secured, token-based system managed centrally by the Node backend and orchestrated strictly by the Next.js `middleware.ts` acting as the absolute gateway.

## Core Mechanisms
1. **Middleware Gates (`middleware.ts`)**
   - The primary file determining access control. It evaluates route patterns against valid request cookies.
   - Rejects unauthenticated traffic attempting to penetrate the `(protected)` or `(party)` Route Groups, routing them gracefully towards `/login`.
2. **Turnstile / Bot Protection**
   - Essential registration flows map directly to Cloudflare Turnstile token validation ensuring the backend endpoints remain immune to automated credential stuffing.
3. **Session Rehydration**
   - The token rotation strategy utilizes a 401 interceptor outlined powerfully inside ` STATE_MANAGEMENT.md` ensuring the user never experiences abrupt lockouts while viewing content.

## Directory Structure
`src/features/auth/`
- `components/`: Login/Register form blocks built dynamically with Radix UI + CVA.
- `hooks/`: `useAuth.ts` which exports the active current user context, replacing legacy global prop drlling.
