# Core Features Overview

This document breaks down the primary feature sets within the Watch Rudra frontend application, how they are structured, and their intended behavior.

## Authentication System

The application utilizes a comprehensive authentication flow designed for both security and flexibility.

### 1. Dual-Factor Capable Login
Users can authenticate using either traditional email/password credentials or through a One-Time Password (OTP) sent to their email.
- The `AuthForm` component handles both flows dynamically based on the user's input and presence of a password in the database.
- Forms are protected by rate limiting and Turnstile (CAPTCHA) to prevent bot abuse.

### 2. Session Management
Sessions are managed via secure HTTP-only cookies issued by the backend.
- The `useAuth` hook and `AuthProvider` maintain the global user state across the React application.
- Next.js Middleware acts as a gatekeeper, redirecting unauthenticated users away from protected routes like `/profile` or active `/watch-party` rooms.

## User Profiles

The Profile system allows users to customize their identity across the platform, specifically tailored for how they appear in Watch Parties.

### Customization Options
- **Display Name and Avatar:** Users can upload custom avatars (handled via Cloudinary on the backend) and set a unique username.
- **Server Preferences:** Users can select their preferred video streaming server quality (e.g., Balanced, High Quality) based on their network capabilities.
- **Security Management:** Authenticated users can override or set their account passwords and manage active sessions from the security panel.

## Watch Parties (Flagship Feature)

The Watch Party system is the core collaborative feature, allowing synchronized media playback with real-time interaction.

### 1. The Lobby and Access Control
Watch Parties are private by default.
- **Host:** Creates the room and shares a 6-character alphanumeric code or link.
- **Guests:** When a guest clicks a link, they enter the `WatchPartyLobby`. They must request to join, which alerts the Host via Socket.IO.
- **Approvals:** The Host can approve or reject pending members in real-time. Only approved members receive the media stream tokens and Agora RTM keys required to fully connect.

### 2. Video Player Synchronization
The video player ensures all participants are watching the exact same frame.
- **Predictive Sync:** The `usePredictiveSync` hook listens to media events (Play, Pause, Seek, Rate Change).
- **Host Dominance:** The Host holds the absolute authority over the video state. If a Guest's video drifts out of sync, their client automatically scrubs to match the Host's exact timestamp using RTM broadcasts.

### 3. Interactive Modules
Once joined, members have access to a sidebar containing various communication tools:
- **Real-Time Chat:** A synchronized messaging pane.
- **Sketchboard:** A collaborative drawing surface synced over RTM.
- **Soundboard:** Audio effects that can be triggered by users to play globally for everyone in the room.

### 4. Permission Matrix
Hosts have granular control over what Guests are allowed to do.
- **Global Permissions:** The Host can globally disable drawing, chat, or soundboards for the entire room.
- **Member Overrides:** The Host can override global settings for specific disruptive or trusted individuals.
- **Kick System:** Hosts can forcefully remove users. A 2-minute disconnect protection system exists to temporarily preserve a user's spot if they suffer a network drop, before automatically kicking them.

## Secure Offline Downloads (Desktop Only)

For users on our native Electron client, the platform supports securely pulling full HD movies and multi-season episodic content directly to the device for offline viewing without requiring aggressive persistent network connectivity.

### 1. Robust Download Pipelines
The system adapts intelligently to `s1`, `s2`, and `s3` master source providers. It calculates master playlist configurations and iteratively streams AES / raw HLS segments natively within Node.js pipelines mapping directly down to local directories.

### 2. DRM and File Vaulting
Watch Rudra strictly protects raw media content boundaries from casual file browsing.
- **Dynamic Key Generation:** During startup, `crypto.randomBytes(32)` establishes a high-entropy symmetric XOR buffer sequence.
- **Secure Persistence:** The 32-byte master key is vaulted using OS-native encryption APIs (`safeStorage` mapping securely to macOS Keychains or Windows Credential Guards).
- **Encrypted Streaming:** Each byte pulled off the active network request undergoes an XOR transform against the key stream natively before ever touching the physical hard drive.
- **In-memory Playback:** The offline React application loads these files seamlessly through heavily strictly typed hooks (`ShowDetails`), decrypting the `.ts`/`.mp4` stream segments smoothly in RAM only when actively playing in the video window.