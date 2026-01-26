# Development & Release Workflow

This repository follows a strict **Main -> Production** workflow to ensure stability and automated versioning.

## 🌳 Branching Strategy

| Branch | Purpose | Automation | Deploy? |
| :--- | :--- | :--- | :--- |
| **`main`** | Development & Release Candidates. Work happens here. | **Release Please**: Drafts releases, updates Changelog. | ❌ No |
| **`production`** | Live/Stable Code. | **Deploy Action**: Deploys code to server/Vercel. | ✅ **YES** |

---

## 🚀 How to Release & Deploy

### Step 1: Development (`main`)
1.  **Work**: Push your features and fixes to the `main` branch (or merge PRs into `main`).
2.  **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/) so the bot knows how to version:
    *   `fix: login bug` -> Patch Release (v1.0.0 -> v1.0.1)
    *   `feat: new video player` -> Minor Release (v1.0.0 -> v1.1.0)
    *   `feat!: breaking change` -> Major Release (v1.0.0 -> v2.0.0)

### Step 2: Create Release (`main`)
Once you push valid commits, the **Release Bot** (`release-please`) will wake up.
1.  It automatically opens a **Pull Request** titled `chore(main): release v1.x.x`.
2.  **Review** the Changelog in that PR.
3.  **Merge** the PR when you are ready to "Cut a Release".
    *   *Result*: `main` is tagged with `v1.x.x` and `CHANGELOG.md` is updated.

### Step 3: Production Deployment (`production`)
Now that `main` is stable and versioned, promote it to Production.
1.  **Open a Pull Request**:
    *   **Base**: `production`
    *   **Compare**: `main`
2.  **Review**: You will see all the changes about to go live.
3.  **Merge**: Click "Merge Pull Request".
4.  **Bot Action**: The `deploy.yml` workflow triggers automatically.
    *   **Backend**: Deploys to Home Server (Docker).
    *   **Frontend**: Deploys to Vercel.

---

## 🛠 CI/CD Workflows

### 1. `release.yml` (Runs on `main`)
*   **Trigger**: Push to `main`.
*   **Action**: Analyzes commits, updates `CHANGELOG.md`, creates GitHub Release & Tags.
*   **Output**: A new Git Tag (e.g., `v1.2.0`).

### 2. `deploy.yml` (Runs on `production`)
*   **Trigger**: Push to `production`.
*   **Action**:
    *   Builds Docker Image / Next.js App.
    *   Deploys to Server / Vercel.
    *   Updates GitHub "Deployment" status.

---

## ⚡ Quick Summary
1.  **Code** on `main`.
2.  **Merge** "Release PR" (created by bot) -> Creates Version.
3.  **Merge** `main` -> `production` -> **Deploys**.
