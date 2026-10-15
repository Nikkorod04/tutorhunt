# Google authentication setup

Phase 2 adds the native Google Sign-In dependency and EAS profiles. Google
Sign-In is not available in Expo Go; it requires an EAS development build.

## Firebase and Google Cloud setup

1. In Firebase Console, open **Authentication → Sign-in method** and enable
   **Google**.
2. In **Project settings → Your apps**, add an Android app with package name
   `com.tutorhunt.app`.
3. Add the Android SHA-1 and SHA-256 fingerprints for the EAS development and
   production credentials in Firebase/Google Cloud.
4. Download the Android `google-services.json` file and place it temporarily
   in the project root.
5. If iOS support is needed, add an iOS app with bundle identifier
   `com.tutorhunt.app`, download `GoogleService-Info.plist`, and place it in
   the project root.
6. Create or identify the **Web application** OAuth client ID and put it in
   `.env` as:

   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com`

The two native service files are ignored by Git. For EAS builds, create file
environment variables named `GOOGLE_SERVICES_JSON` and
`GOOGLE_SERVICE_INFO_PLIST` and upload the corresponding files to the
development, preview, and production environments. The app config consumes
those EAS-provided file paths. Never add a Firebase Admin service-account JSON
file to the app.

The EAS dashboard or CLI can create file variables. They should be secret file
variables, not `EXPO_PUBLIC_*` variables.

## Local development build

After the service files are present:

```powershell
npx expo config --type public
npx eas-cli@latest build --platform android --profile development
```

Install the resulting development APK on the device. Expo Go will not contain
the native Google Sign-In module.

## Phase 3 to 5 implementation notes

The app now uses Google as its only mobile/web sign-in entry point. Firebase
receives the Google ID token and creates the Firebase session. New users choose
Tutor or Parent, then are taken to a lightweight profile setup screen with an
option to finish later.

The Google display name, email and profile photo are persisted in
`users/{uid}`. Tutor Buddy does not publish user profile photos. Student avatar
photos are private and are stored at
`users/{uid}/students/{studentId}/...`, so deploy the Storage rules before
testing student avatar uploads:

```powershell
npx firebase-tools deploy --only storage --project tutorhunt-ded38
```

Native Google Sign-In still requires an EAS development build; it is not
available in Expo Go.
