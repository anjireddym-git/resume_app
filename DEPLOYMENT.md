# Resume Updater — Full Deployment Guide (From Scratch)

This document covers everything required to deploy the Resume Updater app to a **brand-new** Firebase project under any Google account.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x | https://nodejs.org |
| npm | 9+ | bundled with Node.js |
| Firebase CLI | 15.x | `npm install -g firebase-tools` |
| Git | any | https://git-scm.com |

---

## Part 1 — Firebase Project Setup (Console)

### 1.1 Create the project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → disable or enable Google Analytics as preferred → **Create project**
3. Note the **Project ID** (e.g. `my-resume-app`) — you'll use it everywhere below.

### 1.2 Enable Authentication
1. In the Firebase console: **Build → Authentication → Get started**
2. Go to **Sign-in method** tab → enable **Google** → add your support email → **Save**

### 1.3 Enable Firestore
1. **Build → Firestore Database → Create database**
2. Choose **Start in production mode** (the `firestore.rules` file in this repo manages access)
3. Pick a Cloud Firestore location (e.g. `us-central1`) — **this cannot be changed later**

> Firestore is also auto-created on first `firebase deploy`, but doing it manually lets you choose the region.

### 1.4 Enable Hosting
Hosting is automatically enabled on first deploy — no manual step needed.

### 1.5 Register a Web App
1. Project Overview → click the **</>** (Web) icon → register app
2. Give it a name (e.g. `Resume Updater`) → **Register app**
3. Copy the config snippet — you will need these values in Part 3.

Or use the CLI (see Part 2.3 below).

---

## Part 2 — Local Environment Setup

### 2.1 Clone and install dependencies

```bash
git clone <your-repo-url>
cd resume_updater

# Frontend dependencies
npm install

# Functions dependencies
cd functions && npm install && cd ..
```

### 2.2 Log in to Firebase CLI

```bash
firebase login
```

If you have multiple Google accounts use:
```bash
firebase login --reauth
```

Verify you are on the right account:
```bash
firebase projects:list
```

### 2.3 Link the project

```bash
# Point the local workspace to your new Firebase project
firebase use --add
# Select your project from the list and give it the alias "default"
```

This updates `.firebaserc`. You can also edit it directly:
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

### 2.4 Get the Web App SDK config (if you skipped 1.5)

```bash
# List registered apps
firebase apps:list --project YOUR_PROJECT_ID

# If none exist, create one:
firebase apps:create web "Resume Updater" --project YOUR_PROJECT_ID

# Then fetch the config:
firebase apps:sdkconfig WEB <APP_ID> --project YOUR_PROJECT_ID
```

---

## Part 3 — Environment Variables

### 3.1 Frontend (Vite)

Create `.env.local` in the project root (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Fill in the values from the Web App SDK config you fetched above:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional — only needed if you have Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

> **Never commit `.env.local`** — it is in `.gitignore`.

### 3.2 Functions env params

`functions/.env` (committed, non-sensitive) controls which AI model is used:

```env
LLM_PROVIDER=gemini          # or: openai
MODEL_NAME=gemini-2.5-pro    # e.g. gemini-2.5-flash, gpt-4o, etc.
```

To change the model at any time, edit this file and redeploy functions:
```bash
firebase deploy --only functions --project YOUR_PROJECT_ID
```

---

## Part 4 — Secrets (Google Secret Manager)

All API keys are stored as Firebase Secrets, **never in code or env files**.

### 4.1 Set secrets via CLI

```bash
# Gemini API key (get from https://aistudio.google.com/app/apikey)
echo "YOUR_GEMINI_KEY" | firebase functions:secrets:set GEMINI_API_KEY --project YOUR_PROJECT_ID

# OpenAI API key (set to "not-configured" if not using OpenAI)
echo "YOUR_OPENAI_KEY" | firebase functions:secrets:set OPENAI_API_KEY --project YOUR_PROJECT_ID

# Stripe (set to "not-configured" if not using payments)
echo "YOUR_STRIPE_SECRET" | firebase functions:secrets:set STRIPE_SECRET_KEY --project YOUR_PROJECT_ID
echo "YOUR_STRIPE_WEBHOOK_SECRET" | firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project YOUR_PROJECT_ID
```

### 4.2 Verify secrets are set

```bash
firebase functions:secrets:access GEMINI_API_KEY --project YOUR_PROJECT_ID
```

### 4.3 Update a secret later

```bash
echo "NEW_KEY_VALUE" | firebase functions:secrets:set GEMINI_API_KEY --project YOUR_PROJECT_ID
# Then redeploy functions for the new version to take effect:
firebase deploy --only functions --project YOUR_PROJECT_ID
```

---

## Part 5 — Local Development

### 5.1 Local secrets file

Create `functions/.secret.local` (gitignored) for the emulator to use:

```env
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=not-configured
STRIPE_SECRET_KEY=not-configured
STRIPE_WEBHOOK_SECRET=not-configured
```

### 5.2 Start the Functions emulator

```bash
firebase emulators:start --only functions
```

Functions are available at `http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/`
Emulator UI at `http://127.0.0.1:4000/`

The emulator reads:
- `functions/.env` → AI model config
- `functions/.secret.local` → secret values

### 5.3 Connect frontend to emulator

`src/lib/firebase.js` already has this enabled via `import.meta.env.DEV`:

```js
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
```

### 5.4 Start the frontend dev server

```bash
npm run dev
```

App runs at `http://localhost:3000/` and calls the local emulator.

> **Note:** Auth and Firestore still hit production in this setup. Only Functions are emulated. To also emulate Auth/Firestore, run: `firebase emulators:start --only functions,firestore,auth`

---

## Part 6 — Production Deployment

### 6.1 Build the frontend

```bash
npm run build
```

This reads `.env.local` and bakes the Firebase config into `dist/`.

### 6.2 Deploy everything

```bash
firebase deploy --project YOUR_PROJECT_ID
```

This deploys in one command:
- **Firestore rules** (`firestore.rules`)
- **Cloud Functions** (all 4 functions in `functions/index.js`)
- **Hosting** (`dist/` folder → `https://YOUR_PROJECT_ID.web.app`)

### 6.3 Deploy individual targets

```bash
# Only functions
firebase deploy --only functions --project YOUR_PROJECT_ID

# Only hosting (after a frontend-only change)
firebase deploy --only hosting --project YOUR_PROJECT_ID

# Only Firestore rules
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

---

## Part 7 — Post-Deployment Checklist

After deploying to a brand-new project, verify these manually:

- [ ] **Authentication → Google sign-in enabled** (Firebase Console → Authentication → Sign-in method)
- [ ] **Authorized domains** — add your custom domain if applicable (Authentication → Settings → Authorized domains)
- [ ] **Firestore rules deployed** — check Firebase Console → Firestore → Rules tab
- [ ] **Functions running** — check Firebase Console → Functions → Dashboard, all 4 functions should show status "OK"
- [ ] **Open the hosted URL** (`https://YOUR_PROJECT_ID.web.app`) and sign in with Google
- [ ] **Test an AI call** — create a resume and run "Update for Job" to verify the Gemini key works end-to-end

---

## Part 8 — Switching Between AI Models

The model is controlled entirely by `functions/.env` (no code changes needed):

| Provider | `LLM_PROVIDER` | `MODEL_NAME` |
|----------|---------------|--------------|
| Gemini 2.5 Pro | `gemini` | `gemini-2.5-pro` |
| Gemini 2.5 Flash | `gemini` | `gemini-2.5-flash` |
| GPT-4o | `openai` | `gpt-4o` |
| GPT-4o Mini | `openai` | `gpt-4o-mini` |

After editing `functions/.env`:
```bash
firebase deploy --only functions --project YOUR_PROJECT_ID
```

For production without redeploying, use Firebase Functions parameters in the console:
**Project Console → Functions → [function name] → Edit → Environment variables**

---

## Part 9 — Troubleshooting

| Problem | Fix |
|---------|-----|
| `Error: Functions did not deploy (error code UNAUTHENTICATED)` | Re-run `firebase login` — token expired |
| `Missing or insufficient permissions` in Firestore | Check `firestore.rules` is deployed: `firebase deploy --only firestore:rules` |
| Function returns 500 after deploy | Check secret values: `firebase functions:secrets:access GEMINI_API_KEY --project ID` |
| Auth fails on hosted site | Enable Google sign-in in Firebase Console → Authentication |
| `connectFunctionsEmulator` in production | Ensure `import.meta.env.DEV` guard is in `src/lib/firebase.js` |
| Node.js deprecation warning | Upgrade to Node 22: change `"runtime": "nodejs20"` to `"runtime": "nodejs22"` in `firebase.json` |

---

## Quick Reference — Key URLs

| Resource | URL |
|----------|-----|
| Firebase Console | https://console.firebase.google.com/project/YOUR_PROJECT_ID |
| Live App | https://YOUR_PROJECT_ID.web.app |
| Functions logs | https://console.firebase.google.com/project/YOUR_PROJECT_ID/functions/logs |
| Firestore | https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore |
| Authentication | https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication |
| Secret Manager | https://console.cloud.google.com/security/secret-manager?project=YOUR_PROJECT_ID |
| Google AI Studio (Gemini keys) | https://aistudio.google.com/app/apikey |
