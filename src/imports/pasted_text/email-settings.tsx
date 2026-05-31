import { useState, useEffect } from 'react';
import { Mail, Save, Send, Settings, AlertCircle, CheckCircle, Key, Lock, Server } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface EmailConfig {
  provider: 'smtp' | 'resend';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  senderEmail: string;
  senderName: string;
  adminEmail: string;
  enableNotifications: boolean;
}

export function EmailSettings() {
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'smtp',
    smtpHost: 'smtpout.secureserver.net',
    smtpPort: 465,
    smtpSecure: true,
    senderEmail: 'admin@costplus100.com.au',
    senderName: 'CostPlus100',
    adminEmail: 'admin@costplus100.com.au',
    enableNotifications: true
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(false);

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-577b3f26`;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/email/config`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      const data = await response.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setPasswordConfigured(data.passwordConfigured);
      }
    } catch (error: any) {
      console.error('Failed to load email config:', error);
      toast.error('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/email/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Email configuration saved successfully');
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const verifyConnection = async () => {
    setVerifying(true);
    try {
      const response = await fetch(`${API_BASE}/email/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('✅ SMTP connection verified successfully!');
      } else {
        console.error('❌ SMTP Connection Error:', data.error);
        toast.error(`❌ SMTP connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to verify SMTP:', error);
      toast.error(`❌ Network error: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`${API_BASE}/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ to: testEmail })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestEmail('');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Settings className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading email settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-8 h-8 text-teal-600" />
          <h1 className="text-3xl font-bold text-gray-900">Email Settings (GoDaddy SMTP)</h1>
        </div>
        <p className="text-gray-600">
          Configure your GoDaddy email account for sending automated emails
        </p>
      </div>

      {/* Password Setup Instructions */}
      {!passwordConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Email Password Not Configured</h3>
              <p className="text-sm text-yellow-800 mb-3">
                To send emails from your GoDaddy account (admin@costplus100.com.au), you need to add your email password as an environment variable.
              </p>
              <div className="bg-white border border-yellow-200 rounded p-3 mb-3">
                <p className="text-sm font-mono text-gray-700 mb-2">
                  SMTP_PASSWORD=your_godaddy_email_password
                </p>
              </div>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Go to Supabase Dashboard → Edge Functions → Secrets</li>
                <li>Add a new secret named: <strong>SMTP_PASSWORD</strong></li>
                <li>Enter your GoDaddy email password (for admin@costplus100.com.au)</li>
                <li>Save and redeploy your Edge Functions</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {passwordConfigured && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Email Password Configured</h3>
                <p className="text-sm text-green-800">
                  Your GoDaddy SMTP credentials are set up and ready to use
                </p>
              </div>
            </div>
            <button
              onClick={verifyConnection}
              disabled={verifying}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Settings className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  Verify Connection
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* GoDaddy SMTP Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GoDaddy SMTP Settings</h2>
          
          <div className="space-y-4">
            {/* SMTP Server */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Server
              </label>
              <input
                type="text"
                value={config.smtpHost}
                onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                placeholder="smtpout.secureserver.net"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                GoDaddy's SMTP server (auto-configured)
              </p>
            </div>

            {/* SMTP Port */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={config.smtpPort}
                  onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security
                </label>
                <input
                  type="text"
                  value={config.smtpSecure ? 'SSL' : 'TLS'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            {/* Sender Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender Email Address *
              </label>
              <input
                type="email"
                value={config.senderEmail}
                onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                placeholder="info@costplus100.com.au"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your GoDaddy email address (must match SMTP_PASSWORD)
              </p>
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender Name *
              </label>
              <input
                type="text"
                value={config.senderName}
                onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                placeholder="CostPlus100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                The name that appears in the "From" field of emails
              </p>
            </div>

            {/* Admin Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Notification Email *
              </label>
              <input
                type="email"
                value={config.adminEmail}
                onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                placeholder="info@costplus100.com.au"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Receive notifications for new orders and customer registrations
              </p>
            </div>

            {/* Enable Notifications Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Admin Notifications</h3>
                <p className="text-sm text-gray-600">
                  Receive email notifications for new orders and customers
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableNotifications}
                  onChange={(e) => setConfig({ ...config, enableNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Settings className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Email Configuration</h2>
          
          <p className="text-gray-600 mb-4">
            Send a test email to verify your GoDaddy SMTP configuration is working correctly.
          </p>

          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={sendTestEmail}
              disabled={testing || !testEmail || !passwordConfigured}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <>
                  <Send className="w-5 h-5 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Test Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email Types Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Automated Email Types</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Order Confirmation</h3>
                <p className="text-sm text-green-800">
                  Sent to customers immediately after placing an order
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Welcome Email</h3>
                <p className="text-sm text-blue-800">
                  Sent when a new customer registers an account
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900">Wholesale Access Granted</h3>
                <p className="text-sm text-purple-800">
                  Sent when admin grants cost price access to a customer
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Admin Notifications</h3>
                <p className="text-sm text-orange-800">
                  Alerts sent to {config.adminEmail} for new orders and customer registrations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GoDaddy Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">GoDaddy Email Password</h3>
            <p className="text-sm text-blue-800 mb-3">
              To find or reset your GoDaddy email password:
            </p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Login to your GoDaddy account</li>
              <li>Go to Email & Office → Webmail</li>
              <li>Find your email account (admin@costplus100.com.au)</li>
              <li>Click "Manage" → "Settings" → Reset password if needed</li>
              <li>Add the password to Supabase as <strong>SMTP_PASSWORD</strong></li>
            </ol>
          </div>
        </div>
      </div>

      {/* Localhost Troubleshooting */}
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900 mb-2 text-lg">🔧 Localhost Troubleshooting</h3>
            <p className="text-sm text-red-800 mb-3 font-semibold">
              If you're seeing \"Email connection failed\" on localhost:
            </p>
            
            <div className="space-y-3">
              {/* Issue 1 */}
              <div className="bg-white border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                  Environment Variable Not Loaded
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  Your local Supabase Edge Functions need to load the <code className="bg-gray-100 px-1 py-0.5 rounded">SMTP_PASSWORD</code> environment variable.
                </p>
                <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                  ✅ Solution: Create a file <strong>supabase/.env</strong> with:<br/>
                  SMTP_PASSWORD=your_godaddy_password
                </p>
              </div>

              {/* Issue 2 */}
              <div className="bg-white border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                  Restart Supabase CLI
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  After adding the <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code> file, you must restart:
                </p>
                <div className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded space-y-1">
                  <div>$ supabase stop</div>
                  <div>$ supabase start</div>
                </div>
              </div>

              {/* Issue 3 */}
              <div className="bg-white border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                  Verify Password is Correct
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  Make sure you're using the actual GoDaddy email password (not your GoDaddy account password).
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside mb-3">
                  <li>Go to GoDaddy → Email & Office → Webmail</li>
                  <li>Find your email (admin@costplus100.com.au)</li>
                  <li>Reset password if needed</li>
                  <li>Use that password in your .env file</li>
                </ul>
                <div className="bg-red-50 border border-red-300 rounded p-2 mt-2">
                  <p className="text-xs text-red-900 font-semibold">⚠️ Common Error: "535 authentication rejected"</p>
                  <p className="text-xs text-red-800 mt-1">
                    This means your password is WRONG. Double-check you're using the <strong>email account password</strong>, not:
                  </p>
                  <ul className="text-xs text-red-800 mt-1 ml-4 list-disc">
                    <li>❌ GoDaddy account login password</li>
                    <li>❌ Website cPanel password</li>
                    <li>❌ Old/expired password</li>
                  </ul>
                </div>
              </div>

              {/* Issue 4 */}
              <div className="bg-white border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                  Test the Connection
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  After restarting Supabase, click the <strong className="text-green-600">\"Verify Connection\"</strong> button above to test.
                </p>
                <p className="text-xs text-gray-600">
                  You should see ✅ \"SMTP connection verified successfully!\" if everything is working.
                </p>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="mt-4 bg-gray-900 text-white p-3 rounded">
              <p className="font-semibold mb-2 text-sm">📝 Quick Reference File: <code>supabase/.env</code></p>
              <pre className="text-xs text-green-400 font-mono">
{`SMTP_PASSWORD=your_actual_godaddy_email_password
# NOT your GoDaddy account password  
# This is the password for admin@costplus100.com.au`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}