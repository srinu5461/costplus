import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertCircle, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function EmailDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [smtpSettings, setSmtpSettings] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load SMTP settings
      const smtpResponse = await fetch(`${API_URL}/email/smtp-settings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      if (smtpResponse.ok) {
        const data = await smtpResponse.json();
        setSmtpSettings(data.settings);
      }

      // Load company info
      const companyResponse = await fetch(`${API_URL}/email/company-info`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      if (companyResponse.ok) {
        const data = await companyResponse.json();
        setCompanyInfo(data.companyInfo);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const testContactForm = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Message from Diagnostics',
        message: 'This is a test message to verify the contact form email functionality.'
      };

      console.log('Sending test contact form...');
      const response = await fetch(`${API_URL}/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();
      console.log('Response:', data);

      setTestResult({
        success: response.ok,
        status: response.status,
        message: data.message || data.error || 'Unknown response',
        note: data.note,
        details: data.details,
      });
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="size-5 text-green-600" />
    ) : (
      <XCircle className="size-5 text-red-600" />
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl mb-2">📧 Email Diagnostics</h1>
        <p className="text-muted-foreground">
          Troubleshoot your contact form email settings
        </p>
      </div>

      <div className="space-y-6">
        {/* SMTP Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              SMTP Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {getStatusIcon(!!smtpSettings?.host)}
              <div>
                <p className="font-medium">SMTP Host</p>
                <p className="text-sm text-muted-foreground">
                  {smtpSettings?.host || 'Not configured'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusIcon(!!smtpSettings?.port)}
              <div>
                <p className="font-medium">SMTP Port</p>
                <p className="text-sm text-muted-foreground">
                  {smtpSettings?.port || 'Not configured'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusIcon(!!smtpSettings?.user)}
              <div>
                <p className="font-medium">SMTP User</p>
                <p className="text-sm text-muted-foreground">
                  {smtpSettings?.user || 'Not configured'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusIcon(!!smtpSettings?.password)}
              <div>
                <p className="font-medium">SMTP Password</p>
                <p className="text-sm text-muted-foreground">
                  {smtpSettings?.password ? '••••••••' : 'Not configured'}
                </p>
              </div>
            </div>

            {(!smtpSettings?.host || !smtpSettings?.user || !smtpSettings?.password) && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex gap-2">
                  <AlertCircle className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Incomplete SMTP Configuration</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Please complete your SMTP settings in the Email Settings page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recipient Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Email Recipient Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {getStatusIcon(!!companyInfo?.supportEmail)}
              <div>
                <p className="font-medium">Support Email (Primary)</p>
                <p className="text-sm text-muted-foreground">
                  {companyInfo?.supportEmail || 'Not configured'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusIcon(!!companyInfo?.email)}
              <div>
                <p className="font-medium">Company Email (Fallback)</p>
                <p className="text-sm text-muted-foreground">
                  {companyInfo?.email || 'Not configured'}
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex gap-2">
                <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Recipient Priority</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Contact form emails will be sent to:
                  </p>
                  <ol className="text-sm text-blue-800 mt-2 list-decimal list-inside space-y-1">
                    <li>Support Email (if configured)</li>
                    <li>Company Email (if support email empty)</li>
                    <li>SMTP User Email (fallback)</li>
                  </ol>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Current recipient:</strong>{' '}
                    {companyInfo?.supportEmail || companyInfo?.email || smtpSettings?.user || 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Contact Form Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a test email to verify your contact form is working correctly.
            </p>

            <Button
              onClick={testContactForm}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending Test Email...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-md border ${
                testResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex gap-2">
                  {testResult.success ? (
                    <CheckCircle className="size-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="size-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      testResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {testResult.success ? 'Test Successful!' : 'Test Failed'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.note && (
                      <p className="text-sm mt-2 text-yellow-800 bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ {testResult.note}
                      </p>
                    )}
                    {testResult.details && (
                      <p className="text-sm mt-2 font-mono text-xs">
                        {testResult.details}
                      </p>
                    )}
                    {testResult.success && !testResult.note && (
                      <p className="text-sm mt-2 text-green-800">
                        ✓ Check your inbox at: {companyInfo?.supportEmail || companyInfo?.email || smtpSettings?.user}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Fixes */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="font-medium text-sm">❌ "Email notification pending SMTP configuration"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Solution:</strong> Go to Email Settings and configure all SMTP fields (host, port, user, password).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-md">
                <p className="font-medium text-sm">❌ Email not arriving in inbox</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Solutions:</strong>
                </p>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-1 ml-2">
                  <li>Check spam/junk folder</li>
                  <li>Verify SMTP password is correct</li>
                  <li>Try port 587 instead of 465</li>
                  <li>Check support email is configured in Company Settings</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-md">
                <p className="font-medium text-sm">❌ "Submission stored successfully" but no email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Meaning:</strong> Form saved but email failed to send. Your message is stored safely.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Solution:</strong> Test SMTP connection in Email Settings page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
