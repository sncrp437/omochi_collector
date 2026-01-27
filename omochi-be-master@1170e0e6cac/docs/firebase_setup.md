# Firebase Setup Guide for Push Notifications

This guide explains how to get Firebase credentials for implementing push notifications in your application.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "omochi-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Firebase Cloud Messaging (FCM)

1. In your Firebase project console, go to **Project Settings** (gear icon)
2. Navigate to the **Cloud Messaging** tab
3. Firebase Cloud Messaging API should be automatically enabled

## 3. Get Web App Configuration

1. In Firebase console, click the **Web** icon (</>) to add a web app
2. Enter your app nickname (e.g., "omochi-web")
3. Choose whether to set up Firebase Hosting (optional)
4. Click "Register app"
5. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## 5. Generate Service Account Key (Alternative Method)

1. Go to **Project Settings** → **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file (keep it secure!)
4. This method is more secure but requires additional setup

## 6. Environment Variables Setup

Add these to your `.env` file:

```bash
# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=path/to/your/firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id
```

## 7. Setup Steps

To complete the Firebase setup:

1. Download the service account JSON file from step 5
2. Place it in a secure location in your project (e.g., `firebase-credentials.json`)
3. Set the `FIREBASE_CREDENTIALS_PATH` environment variable to the path of this file
4. Set the `FIREBASE_PROJECT_ID` to your Firebase project ID (from the web config)

**Important:** Never commit the service account JSON file to version control. Add it to your `.gitignore` file.

## 8. Frontend Setup (for reference)

Your frontend will need to:

1. Initialize Firebase with the config
2. Request notification permission
3. Get the FCM token
4. Send the token to your backend API

Example frontend code:
```javascript
// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  // Your config from step 3
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Get FCM token
const vapidKey = 'your-vapid-key'; // Optional: for web push
getToken(messaging, { vapidKey }).then((currentToken) => {
  if (currentToken) {
    // Send token to your backend
    fetch('/api/notifications/tokens/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${your_jwt_token}`
      },
      body: JSON.stringify({
        token: currentToken,
        device_type: 'WEB'
      })
    });
  }
});
```

## 9. Testing

Once configured, you can test notifications using your API:

```bash
# Register FCM token
curl -X POST http://localhost:8000/api/notifications/tokens/register/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "FCM_TOKEN_FROM_FRONTEND", "device_type": "WEB"}'

# Send test notification
curl -X POST http://localhost:8000/api/notifications/tokens/test_notification/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Hello from Omochi!"}'
```

## 10. Security Notes

- **Never expose the Server Key** in frontend code
- Store server credentials in environment variables
- Use HTTPS in production
- Consider using service account keys for enhanced security
- Regularly rotate your credentials

## 11. Optional: VAPID Keys for Web Push

For additional web push functionality:

1. In Firebase console, go to **Project Settings** → **Cloud Messaging**
2. In **Web configuration**, generate a new certificate or use existing one
3. Copy the **Key pair** values for your frontend

## Available APIs

Your backend now provides these endpoints:

- `POST /api/notifications/tokens/register/` - Register FCM token
- `POST /api/notifications/tokens/{id}/deactivate/` - Deactivate token
- `POST /api/notifications/tokens/test_notification/` - Send test notification
- `GET /api/notifications/tokens/` - List user's FCM tokens

Notifications are automatically sent when:
- Order status changes (to customer)
- New order is placed (to venue managers)
