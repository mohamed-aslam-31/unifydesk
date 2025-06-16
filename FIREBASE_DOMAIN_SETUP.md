# Firebase Domain Authorization - Immediate Fix Required

## Your Current Domain
```
6158eeaa-17ea-4440-8d3c-f07d002be90c-00-3swof82cdnvnw.spock.replit.dev
```

## Firebase Console Setup (Required)

### 1. Enable Google Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **unifyde**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Toggle **Enable** switch to ON
6. Enter your email as "Project support email"
7. Click **Save**

### 2. Add Authorized Domains
1. In Authentication, go to **Settings** tab
2. Scroll to **Authorized domains** section
3. Click **Add domain** button
4. Add these domains one by one (with https:// prefix):

```
https://6158eeaa-17ea-4440-8d3c-f07d002be90c-00-3swof82cdnvnw.spock.replit.dev
https://replit.dev
https://*.replit.dev
https://unifyde.firebaseapp.com
http://localhost
```

### 3. OAuth Redirect URIs
Firebase automatically handles OAuth redirect URIs, but ensure:
- The domain matches exactly (case-sensitive)
- No trailing slashes
- Use HTTPS (which Replit provides automatically)

## Verification Steps
After adding domains:
1. Wait 2-3 minutes for Firebase to propagate changes
2. Test Google sign-in button
3. Should redirect to Google OAuth without errors
4. After Google account selection, returns to your app

## Common Issues
- **Exact match required**: Domain must match character-for-character
- **Propagation delay**: Changes may take 2-5 minutes to take effect
- **Case sensitivity**: Use exact domain from browser URL
- **HTTPS required**: Replit automatically provides this

## Success Indicator
When working correctly:
- Google sign-in opens Google account picker
- After selecting account, returns to app
- User is authenticated and logged in
- No "redirect_uri_mismatch" errors

---
**Note**: This is a Firebase Console configuration issue, not a code problem. The application code is correct and ready.