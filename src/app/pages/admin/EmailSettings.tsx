import { useState, useEffect } from 'react';
import { Mail, Save, Send, Settings, AlertCircle, CheckCircle, Server } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
    senderEmail: 'info@costplus100.com.au',
    senderName: 'Costplus100',
    adminEmail: 'info@costplus100.com.au',
    enableNotifications: true
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(false);

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

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
      
      if (!response.ok) {
        console.error('Failed to load config:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        
        // Don't show error toast - just use defaults
        // This is normal for first-time setup
        console.log('Using default email configuration');
        return;
      }
      
      const data = await response.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setPasswordConfigured(data.passwordConfigured);
      }
    } catch (error: any) {
      console.error('Failed to load email config:', error);
      // Don't show error - defaults are fine for first-time setup
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
          <Mail className="w-8 h-8 text-[#E31837]" />
          <h1 className="text-3xl font-bold text-gray-900">Email Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure your email account for sending automated emails
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
                To send emails from your account ({config.senderEmail}), you need to add your email password as an environment variable.
              </p>
              <div className="bg-white border border-yellow-200 rounded p-3 mb-3">
                <p className="text-sm font-mono text-gray-700 mb-2">
                  SMTP_PASSWORD=your_email_password
                </p>
              </div>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Go to Supabase Dashboard → Edge Functions → Secrets</li>
                <li>Add a new secret named: <strong>SMTP_PASSWORD</strong></li>
                <li>Enter your email password for {config.senderEmail}</li>
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
                  Your SMTP credentials are set up and ready to use
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

      {/* SMTP Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">SMTP Settings</h2>
          
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
                placeholder="smtp.office365.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your SMTP server hostname
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security
                </label>
                <select
                  value={config.smtpSecure ? 'ssl' : 'tls'}
                  onChange={(e) => setConfig({ ...config, smtpSecure: e.target.value === 'ssl' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                >
                  <option value="tls">TLS (587)</option>
                  <option value="ssl">SSL (465)</option>
                </select>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your email address (must match SMTP_PASSWORD)
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
                placeholder="Costplus100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                The name that appears in the "From" field of emails
              </p>
            </div>

            {/* Admin Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Form Recipient Email *
              </label>
              <input
                type="email"
                value={config.adminEmail}
                onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                placeholder="info@costplus100.com.au"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                <strong>Contact form messages will be sent to this email address.</strong> This can be different from your SMTP sender email.
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E31837]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E31837]"></div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 bg-[#E31837] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#c91530] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            Send a test email to verify your SMTP configuration is working correctly.
          </p>

          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
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
    </div>
  );
}