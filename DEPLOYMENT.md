# Resume Updater — Full Deployment Guide (From Scratch)

This document covers everything required to deploy the Resume Updater app to a **brand-new** Firebase project under any Google account.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x | https://nodejs.org |
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

### 1.3 Configure Google Drive authorization
Drive sync is optional and requested only after the user clicks **Enable Drive sync**.

1. In Google Cloud Console, select your Firebase project.
2. Go to **APIs & Services → Library** and enable **Google Drive API**.
3. Go to **APIs & Services → OAuth consent screen** and configure branding, support email, audience, and test users while the app is in testing mode.
4. Declare only `https://www.googleapis.com/auth/drive.file` for Drive sync. This grants access to files created or explicitly opened by this app.
5. Go to **APIs & Services → Credentials**, create an **OAuth client ID → Web application**, and add every deployed and local origin under **Authorized JavaScript origins**, such as `http://localhost:5173` and `https://YOUR_PROJECT_ID.web.app`.
6. Copy the OAuth web client ID into `VITE_GOOGLE_OAUTH_CLIENT_ID`.

The app publishes an app-managed Google Docs copy. Firestore remains authoritative:
edits made directly in Google Docs are not imported and can be overwritten by the
next app save.

Google Identity Services popup flows require compatible security headers. This
repo sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` and
`Referrer-Policy: strict-origin-when-cross-origin` for local Vite and Firebase
Hosting.

### 1.4 Enable Firestore
1. **Build → Firestore Database → Create database**
2. Choose **Start in production mode** (the `firestore.rules` file in this repo manages access)
3. Pick a Cloud Firestore location (e.g. `us-central1`) — **this cannot be changed later**

> Firestore is also auto-created on first `firebase deploy`, but doing it manually lets you choose the region.

### 1.5 Enable Hosting
Hosting is automatically enabled on first deploy — no manual step needed.

### 1.6 Register a Web App
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
VITE_GOOGLE_OAUTH_CLIENT_ID=123456789-abc123.apps.googleusercontent.com

# Optional — only needed if you have Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

> **Never commit `.env.local`** — it is in `.gitignore`.

### 3.2 Functions env params

`functions/.env` (committed, non-sensitive) controls which AI provider and model are used everywhere:

```env
LLM_PROVIDER=openai
OPENAI_MODEL_NAME=gpt-5.5
GEMINI_MODEL_NAME=gemini-3.1-pro-preview

# Optional legacy override. If set, it is only used when it matches LLM_PROVIDER.
MODEL_NAME=

# Optional per-operation overrides. Leave blank to use the selected provider's default model.
MODEL_GENERATE_RECRUITER_EMAIL=
MODEL_DRAFT_FOLLOW_UP_EMAIL=
MODEL_CLASSIFY_REPLY_SENTIMENT=
```

To switch providers or change the model at any time, edit this file and redeploy functions:
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

### 4.4 Gmail reply tracking Pub/Sub setup

Gmail push notifications require a Pub/Sub topic and a one-time publisher grant to Gmail's service account.
The outreach feature also requires **Gmail API** to be enabled in Google Cloud Console.
Its `gmail.send` and `gmail.readonly` scopes are requested incrementally when the
user uses outreach; keep their OAuth consent-screen verification requirements
separate from the narrow Drive-only onboarding flow.

```bash
gcloud pubsub topics create gmail-replies --project YOUR_PROJECT_ID

gcloud pubsub topics add-iam-policy-binding gmail-replies \
  --project YOUR_PROJECT_ID \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

If you use a different topic name, set `GMAIL_PUBSUB_TOPIC` for the functions runtime and redeploy functions.

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

`src/lib/firebase.js` connects to the Functions emulator only when explicitly enabled:

```js
if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
```

Set `VITE_USE_FUNCTIONS_EMULATOR=true` in `.env.local` to use the local emulator. Leave it unset or set it to `false` to point localhost at deployed Firebase Functions.

### 5.4 Start the frontend dev server

```bash
npm run dev
```

App runs at `http://localhost:3000/`. With `VITE_USE_FUNCTIONS_EMULATOR=true`, it calls the local emulator; otherwise it calls deployed Firebase Functions.

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
- **Firestore indexes** (`firestore.indexes.json`)
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

# Only Firestore indexes
firebase deploy --only firestore:indexes --project YOUR_PROJECT_ID
```

---

## Part 7 — Post-Deployment Checklist

After deploying to a brand-new project, verify these manually:

- [ ] **Authentication → Google sign-in enabled** (Firebase Console → Authentication → Sign-in method)
- [ ] **Authorized domains** — add your custom domain if applicable (Authentication → Settings → Authorized domains)
- [ ] **Google Drive API enabled** (Google Cloud Console → APIs & Services → Library)
- [ ] **OAuth consent configured** with `drive.file`, test users, and publishing status
- [ ] **OAuth web client origins configured** for localhost and every hosted domain
- [ ] **`VITE_GOOGLE_OAUTH_CLIENT_ID` set** in the frontend environment
- [ ] **Firestore rules deployed** — check Firebase Console → Firestore → Rules tab
- [ ] **Functions running** — check Firebase Console → Functions → Dashboard, all 4 functions should show status "OK"
- [ ] **Open the hosted URL** (`https://YOUR_PROJECT_ID.web.app`) and sign in with Google
- [ ] **Test an AI call** — create a resume and run "Update for Job" to verify the Gemini key works end-to-end

---

## Part 8 — Switching Between AI Models

The provider is controlled by `LLM_PROVIDER`, and the matching provider-specific model is used across resume import, DOCX parsing, classic AI calls, repairs, and the streaming resume agent.

| Provider | `LLM_PROVIDER` | Preferred model variable | Example |
|----------|---------------|--------------------------|---------|
| OpenAI | `openai` | `OPENAI_MODEL_NAME` | `gpt-5.5` |
| Gemini | `gemini` or `google` | `GEMINI_MODEL_NAME` | `gemini-3.1-pro-preview` |

`MODEL_NAME`, `OPENAI_THINKING_MODEL`, and `THINKING_MODEL_NAME` remain as backward-compatible overrides. They are ignored when the model string does not match the selected provider.

Optional per-operation overrides can route lightweight work to a smaller model while keeping heavy resume generation on the default model. Leave any value blank to use the provider default above. Overrides are ignored when the model string does not match `LLM_PROVIDER` (for example, a `gpt-*` override is ignored when `LLM_PROVIDER=gemini`).

| Operation | Override env param |
|-----------|--------------------|
| Job resume update | `MODEL_UPDATE_RESUME_FOR_JOB` |
| Match analysis | `MODEL_ANALYZE_MATCH` |
| Suggestions | `MODEL_GENERATE_SUGGESTIONS` |
| Refactor highlights | `MODEL_GENERATE_REFACTORED_HIGHLIGHTS` |
| Role transform | `MODEL_TRANSFORM_RESUME_FOR_ROLE` |
| Resume file import | `MODEL_EXTRACT_RESUME_FROM_FILE` |
| DOCX field map parsing | `MODEL_PARSE_DOCX_TO_FIELD_MAP` |
| Inline field edit | `MODEL_EDIT_FIELD` |
| Recruiter email draft | `MODEL_GENERATE_RECRUITER_EMAIL` |
| Follow-up email draft | `MODEL_DRAFT_FOLLOW_UP_EMAIL` |
| Reply sentiment classification | `MODEL_CLASSIFY_REPLY_SENTIMENT` |
| Streaming JD-first resume agent | `MODEL_RUN_RESUME_AGENT_STREAMING` |

Example:
```env
MODEL_GENERATE_RECRUITER_EMAIL=gpt-5.4-nano
MODEL_DRAFT_FOLLOW_UP_EMAIL=gpt-5.4-nano
MODEL_CLASSIFY_REPLY_SENTIMENT=gpt-5.4-nano
```

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
| `scanDueFollowUps` logs `FAILED_PRECONDITION: The query requires an index` | Deploy indexes: `firebase deploy --only firestore:indexes --project ID` |
| Function returns 500 after deploy | Check secret values: `firebase functions:secrets:access GEMINI_API_KEY --project ID` |
| Auth fails on hosted site | Enable Google sign-in in Firebase Console → Authentication |
| Drive badge reports the API is disabled | Enable Google Drive API in Google Cloud Console → APIs & Services → Library |
| Drive or Gmail connect reports a missing OAuth client ID | Set `VITE_GOOGLE_OAUTH_CLIENT_ID` from the Google Cloud OAuth web client |
| Google authorization popup closes or is blocked | Start authorization from the in-app button and allow popups for the hosted origin |
| `connectFunctionsEmulator` in production | Ensure `import.meta.env.DEV` guard is in `src/lib/firebase.js` |
| Node.js deprecation warning | Ensure `firebase.json` uses `"runtime": "nodejs22"` and `functions/package.json` uses `"engines": {"node": "22"}` |

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
