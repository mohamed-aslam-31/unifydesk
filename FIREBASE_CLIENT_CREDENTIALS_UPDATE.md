# Firebase Client ID and Client Secret Update

## Where to Find and Update These Credentials

### Firebase Console Location
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **unifyde**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** provider (the pencil/edit icon)

### In the Google Provider Settings
You'll see:
- **Web SDK configuration** section
- **Client ID** (automatically provided by Firebase)
- **Client secret** (automatically provided by Firebase)

### If You Need to Update Them

**Option 1: Generate New Credentials**
1. In the Google provider settings, look for "Web SDK configuration"
2. Click **"Web SDK configuration"** or **"Configure"**
3. This will show you the current Client ID
4. If you need new ones, click **"Download config"** for fresh credentials

**Option 2: Use Existing Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **unifyde**
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client IDs
5. Click the one used for web application
6. Update **Authorized redirect URIs** to include:
   ```
   https://unifyde.firebaseapp.com/__/auth/handler
   https://6158eeaa-17ea-4440-8d3c-f07d002be90c-00-3swof82cdnvnw.spock.replit.dev
   ```

## Current Application Configuration
The app uses Firebase's automatic credential management, so you typically don't need to manually set Client ID/Secret unless:
- You're using a custom OAuth setup
- You need to troubleshoot authentication issues
- You're configuring additional redirect URIs

## After Making Changes
1. Save all changes in both Firebase Console and Google Cloud Console
2. Wait 2-3 minutes for propagation
3. Test Google sign-in again

## Alternative: Reset Google Authentication
If you want to start fresh:
1. Disable Google authentication in Firebase
2. Re-enable it (this generates new credentials)
3. Add your authorized domains again
4. Test authentication

---
**Note**: Firebase typically handles Client ID/Secret automatically. Manual updates are only needed for advanced configurations or troubleshooting.