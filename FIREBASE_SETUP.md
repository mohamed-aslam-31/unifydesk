# Firebase Domain Authorization Required

## Issue
Google authentication is failing because the current Replit domain is not authorized in your Firebase project.

## Solution
Add the current domain to Firebase Console authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `unifydesk-233f4`
3. Go to **Authentication** > **Settings** > **Authorized domains**
4. Click **Add domain** and add these domains:

```
Your current dev domain (check browser URL)
*.replit.dev
localhost
```

5. Save changes

## After Adding Domains
- Google authentication will work immediately
- Users can sign in with Google on both login and signup pages
- The system will automatically create accounts for new users

## Current Configuration
- Firebase Project ID: unifydesk-233f4
- Auth Domain: unifydesk-233f4.firebaseapp.com
- All environment variables are properly configured