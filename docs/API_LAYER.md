# API Layer and Communication

This document outlines the client-side API architecture in Watch Rudra, detailing how the frontend application connects, fetches, and secures its data across our Node.js Backend services and WebRTC architectures.

## Overview of Services

The Next.js App Router communicates across three separate data planes:

1. **Watch-Rudra Backend:** The primary Node.js/Express server (REST + Socket.IO). Handles PostgreSQL database interactions, Redis sessions, user management, room creation, and rate-limiting.
2. **Agora (RTM/RTC):** The decentralized edge network handling low-latency WebRTC streams, room chat, and playback synchronization broadcasts.
3. **Cloudflare Workers (Optional):** Used in production as an intermediate proxy for video stream segments (HLS) to obscure origins and mitigate direct scraping attacks.

## Connecting to the Node.js API

All standard API calls from the client to the Backend happen over standard HTTPS (or HTTP in local dev).

### Authentication
Every secure API request requires the user's session cookie. Next.js App Router Middleware automatically checks the session cookie on navigation. The client-side `fetch` wrappers automatically include `credentials: "include"` under the hood so the backend can extract the JWT and User ID securely.

### Error Handling
The application uses standardized HTTP response codes (200, 400, 429). The `AppError` payload from the backend is captured and displayed to the user via the `toast` notification system (e.g., SONNER).

### Rate Limiting Awareness
The frontend interacts with backend rate limiters designed to protect specific routes:
- **API (`apiLimiter`)**
- **Auth (`authLimiter`)**
- **Stream (`streamLimiter`)**

*Important Note:* Due to corporate NAT environments where multiple users share an IP, the backend has been explicitly engineered to rate-limit authenticated users by `userId` and unauthenticated users by a combination of `IP + User-Agent`. The frontend developer must ensure the `User-Agent` headers are preserved during any SSR fetches.

## Integrating with Next.js App Router

We heavily utilize the App Router paradigms:
- **Server Components:** Most database queries and page loads are executed directly on the server to reduce the JavaScript bundle size shipped to the client.
- **Client Components (`"use client"`):** Restricted closely to the interactive leaves of the UI tree, such as the Watch Party video player, forms, and toggles.
- **Server Actions:** Secure form submissions (e.g., password reset, username updates) run via Next.js Server Actions, bypassing the need for dedicated intermediate API routes inside the Next.js `app/api` folder.

This dual-plane approach minimizes the API surface area we naturally have to maintain in the Next.js repo, deferring heavy business logic to the official Node.js Backend service.