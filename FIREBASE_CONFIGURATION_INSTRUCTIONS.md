# Firebase Google Authentication Setup Required

## Current Issue
Google sign-in shows "auth/operation-not-allowed" error because Google authentication is not enabled in your Firebase project console.

## Fix Required in Firebase Console

### Step 1: Enable Google Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **unifyde**
3. Navigate to **Authentication** → **Sign-in method**
4. Find "Google" in the providers list
5. Click the **pencil/edit icon** next to Google
6. Toggle **Enable** to ON
7. Add your email as the project support email
8. Click **Save**

### Step 2: Add Authorized Domains
1. In the same Authentication section, go to **Settings** tab
2. Scroll to **Authorized domains**
3. Click **Add domain** and add these domains:
   ```
   replit.dev
   *.replit.dev
   localhost
   unifyde.firebaseapp.com
   ```
4. Save changes

### Step 3: Add Your Exact Domain
Your current Replit app domain that MUST be added:
```
6158eeaa-17ea-4440-8d3c-f07d002be90c-00-3swof82cdnvnw.spock.replit.dev
```

Add this exact domain to Firebase Console:
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Paste: `6158eeaa-17ea-4440-8d3c-f07d002be90c-00-3swof82cdnvnw.spock.replit.dev`
4. Also add: `*.replit.dev` (as backup for future domains)
5. Click **Save**

## Expected Results After Setup
- Google sign-in button will work properly
- Users can authenticate with Google accounts
- New users will be automatically registered
- Existing users can link Google accounts

## Technical Details
- Firebase Project: unifyde
- Auth Domain: unifyde.firebaseapp.com
- All API keys are properly configured
- The application is ready to use Google authentication once enabled

---
**Note**: This is a one-time setup. After enabling Google authentication in Firebase console, the feature will work immediately without any code changes.