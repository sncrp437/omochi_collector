import React, { useState } from 'react';
import { fcmService } from '../../services/fcmService';
import { registerNotiToken } from '../../api/notification';
import { toast } from 'react-toastify';

const NotificationTestPanel: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeringToken, setRegisteringToken] = useState(false);
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testBody, setTestBody] = useState('This is a test notification from the admin panel');

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const newToken = await fcmService.requestPermission();
      setToken(newToken);
      if (newToken) {
        toast.success('Permission granted and token retrieved!');
      } else {
        toast.error('Permission denied or token not available');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Error requesting permission');
    } finally {
      setLoading(false);
    }
  };

  const handleGetStoredToken = () => {
    const storedToken = fcmService.getStoredToken();
    setToken(storedToken);
    if (storedToken) {
      toast.info('Token retrieved from storage');
    } else {
      toast.warning('No token found in storage');
    }
  };

  const handleClearToken = () => {
    fcmService.clearStoredToken();
    setToken(null);
    toast.info('Token cleared from storage');
  };

  const copyTokenToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success('Token copied to clipboard!');
    }
  };

  const handleRegisterToken = async () => {
    if (!token) {
      toast.error('No token available to register');
      return;
    }

    setRegisteringToken(true);
    try {
      await registerNotiToken(token);
      toast.success('Token registered with server successfully!');
    } catch (error) {
      console.error('Error registering token:', error);
      toast.error('Failed to register token with server');
    } finally {
      setRegisteringToken(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">FCM Notification Test Panel</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleRequestPermission}
            disabled={loading}
            className="px-4 py-2 bg-blue-500   rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Requesting...' : 'Request Permission & Get Token'}
          </button>
          
          <button
            onClick={handleGetStoredToken}
            className="px-4 py-2 bg-green-500   rounded hover:bg-green-600"
          >
            Get Stored Token
          </button>
          
          <button
            onClick={handleClearToken}
            className="px-4 py-2 bg-red-500   rounded hover:bg-red-600"
          >
            Clear Token
          </button>
        </div>

        {token && (
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">FCM Token:</h3>
            <div className="flex items-center gap-2 mb-4">
              <textarea
                value={token}
                readOnly
                rows={3}
                className="flex-1 p-2 border rounded text-sm font-mono"
              />
              <button
                onClick={copyTokenToClipboard}
                className="px-3 py-2 bg-gray-500   rounded hover:bg-gray-600"
              >
                Copy
              </button>
            </div>
            
            <button
              onClick={handleRegisterToken}
              disabled={registeringToken}
              className="px-4 py-2 bg-purple-500   rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {registeringToken ? 'Registering...' : 'Register Token with Server'}
            </button>
          </div>
        )}

        {/* Sound Test Section */}
        <div className="mt-6 p-4 bg-purple-50 rounded border">
          <h3 className="font-semibold mb-4 text-purple-800">Test Notification Sounds</h3>
          
          <p className="text-sm text-gray-600 mt-2">
            • <strong>Web Audio:</strong> Generated sound, works better with autoplay policies<br/>
            • <strong>File-based:</strong> External audio file, may be blocked if not user-initiated
          </p>
        </div>

        {/* Test Notification Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded border">
          <h3 className="font-semibold mb-4 text-blue-800">Send Test Notification</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter notification title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Body
              </label>
              <textarea
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter notification body"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Request Permission & Get Token" to get your FCM token</li>
            <li>Click "Register Token with Server" to register the token with your backend</li>
            <li>Test notification sounds using the purple section:</li>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li><strong>Web Audio Sound:</strong> Generated tri-tone sound (recommended)</li>
              <li><strong>File-based Sound:</strong> External audio file (may be blocked by autoplay)</li>
            </ul>
            <li><strong>Send Test Notification:</strong> This sends a REAL FCM push notification from server</li>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Backend uses Firebase Admin SDK to send FCM message</li>
              <li>Frontend receives via <code className="bg-gray-200 px-1">onMessage()</code> listener</li>
              <li>Sound plays automatically when FCM message arrives</li>
              <li>Creates browser notification with FCM data</li>
            </ul>
            <li>Make sure your backend has the endpoints: <code className="bg-gray-200 px-1">/api/notifications/tokens/register/</code> and <code className="bg-gray-200 px-1">/api/notifications/tokens/test_notification/</code></li>
            <li>Add your VAPID key to the FCM service configuration</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-800 mb-2">📝 Important Differences:</h4>
            <ul className="text-xs space-y-1">
              <li><strong>Local Browser Notification</strong> (<code className="bg-gray-200 px-1">new Notification()</code>): Created locally by JavaScript, no server involvement</li>
              <li><strong>FCM Push Notification</strong> (<code className="bg-gray-200 px-1">onMessage()</code>): Sent by Firebase server, received via service worker</li>
              <li><strong>Our Notification Checker</strong>: Creates local notifications for immediate feedback, FCM handles real push notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPanel;
