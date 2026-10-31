# Firebase Project Migration to paylon-766c0

Switch the application backend and authentication to the new Firebase project (`paylon-766c0`, project number: `833184728081`), wire client configuration dynamically, and deploy existing security rules and administrative privileges.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters have been confirmed:
> - **Target Firebase Project ID**: `paylon-766c0` (Project Name: `paylon`, Project Number: `833184728081`).
> - **Provisioning Method**: Automated provisioning via the AI Studio Firebase setup tool and `ProvisionFirebase` RPC.
> - **Security Rules**: Deploy existing comprehensive Firestore ABAC security rules to `paylon-766c0`, maintaining admin permissions for `joram4036@gmail.com` and `love@gmail.com`.

---

## 1. Overview & Core Concept

- **What It Does**: Repoints all database collections (users, transactions, promo codes, bots, copy trades, P2P merchants) and Firebase Authentication mechanisms to the user's new Firebase project `paylon-766c0`.
- **Target Audience / Persona**: App users and administrators accessing the live crypto wallet and P2P exchange dashboard.
- **Key Value**: Clean isolation in the user's dedicated Firebase environment with active Firestore and Auth instances.

---

## 2. Technical Architecture & Migration Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Frontend (React SPA)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
               reads configuration at boot
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               src/firebase.ts (Firebase Client)             │
│        Imports dynamically from firebase-applet-config.json │
└──────────────────────────────┬──────────────────────────────┘
                               │
                connects via SDK v12.15
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          New Firebase Project: paylon-766c0                 │
│  - Project Number: 833184728081                             │
│  - Firestore Database: (default)                            │
│  - Authentication: Email/Password, Google Auth              │
│  - Security Rules: firestore.rules deployed                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Execution Plan

### Step 1: Provision Firebase Project via AI Studio RPC
- Trigger the interactive Firebase setup workflow for project `paylon-766c0`.
- Verify terms acceptance and invoke `ProvisionFirebase` with `platform: "web"` and `project_id: "paylon-766c0"`.
- Verify that `firebase-applet-config.json` receives the updated credentials (`projectId`, `apiKey`, `authDomain`, `appId`, `messagingSenderId`).

### Step 2: Sync Client Initialization (`src/firebase.ts`)
- Replace the static, hardcoded credentials in `src/firebase.ts` with direct imports from `firebase-applet-config.json`.
- Ensure fallback handling and proper Firestore instance instantiation with optional database ID support.
- Add connection diagnostics on application initialization.

### Step 3: Deploy Firestore Security Rules
- Deploy `firestore.rules` to the `paylon-766c0` instance via the `DeployRules` RPC (`rpc_action` with `service_name: "fax"`, `method_name: "DeployRules"`).
- Ensure all collection gates (admins, users, transactions, promo_codes, bot_templates, copy_trader_leads) are enforced.

### Step 4: Verification & Build
- Verify TypeScript types and execute `compile_applet`.
- Confirm application boots without auth/firestore initialization errors.
