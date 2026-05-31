import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function ContactFormDebug() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Health check
      console.log('Test 1: Health check...');
      try {
        const healthResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/health`
        );
        const healthData = await healthResponse.json();
        results.tests.push({
          name: 'Backend Health Check',
          passed: healthResponse.ok && healthData.status === 'ok',
          status: healthResponse.status,
          data: healthData
        });
      } catch (error) {
        results.tests.push({
          name: 'Backend Health Check',
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Test 2: SMTP Settings Check
      console.log('Test 2: SMTP Settings...');
      try {
        const smtpResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/email/smtp-settings`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            }
          }
        );
        const smtpData = await smtpResponse.json();
        results.tests.push({
          name: 'SMTP Settings Check',
          passed: smtpResponse.ok && smtpData.settings?.host && smtpData.settings?.user && smtpData.settings?.password,
          status: smtpResponse.status,
          data: {
            host: smtpData.settings?.host || 'NOT SET',
            port: smtpData.settings?.port || 'NOT SET',
            user: smtpData.settings?.user || 'NOT SET',
            password: smtpData.settings?.password ? '✓ SET' : '❌ NOT SET'
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'SMTP Settings Check',
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Test 3: Company Info Check
      console.log('Test 3: Company Info...');
      try {
        const companyResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/email/company-info`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            }
          }
        );
        const companyData = await companyResponse.json();
        results.tests.push({
          name: 'Company Info Check',
          passed: companyResponse.ok,
          status: companyResponse.status,
          data: {
            email: companyData.companyInfo?.email || 'NOT SET',
            supportEmail: companyData.companyInfo?.supportEmail || 'NOT SET',
            tradingName: companyData.companyInfo?.tradingName || 'NOT SET'
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Company Info Check',
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Test 4: Contact Form Submission
      console.log('Test 4: Contact Form...');
      try {
        const contactResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/contact/send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Debug Test User',
              email: 'debug@test.com',
              subject: 'Debug Test Subject',
              message: 'This is a debug test message from the diagnostics page.'
            })
          }
        );
        const contactData = await contactResponse.json();
        results.tests.push({
          name: 'Contact Form Submission',
          passed: contactResponse.ok && contactData.success,
          status: contactResponse.status,
          data: contactData,
          note: contactData.note ? `⚠️ ${contactData.note}` : null
        });
      } catch (error) {
        results.tests.push({
          name: 'Contact Form Submission',
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

    } catch (error) {
      console.error('Diagnostics error:', error);
    }

    setTestResult(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔍 Contact Form Diagnostics</h1>
        <p className="text-muted-foreground mb-8">
          Run comprehensive tests to identify why emails aren't sending
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runDiagnostics}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </CardContent>
        </Card>

        {testResult && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Test Results</h2>
            <p className="text-sm text-muted-foreground">
              Completed at: {new Date(testResult.timestamp).toLocaleString()}
            </p>

            {testResult.tests.map((test: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {test.passed ? '✅' : '❌'}
                    {test.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {test.status && (
                    <p className="text-sm mb-2">
                      <strong>Status Code:</strong> {test.status}
                    </p>
                  )}

                  {test.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded mb-3">
                      <p className="text-sm text-red-900 font-medium">Error:</p>
                      <p className="text-sm text-red-800">{test.error}</p>
                    </div>
                  )}

                  {test.note && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-3">
                      <p className="text-sm text-yellow-900">{test.note}</p>
                    </div>
                  )}

                  {test.data && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Response Data:</p>
                      <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(test.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!test.passed && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-900">💡 How to Fix:</p>
                      {test.name === 'Backend Health Check' && (
                        <p className="text-sm text-blue-800 mt-1">
                          • Check if Supabase Edge Function is deployed<br/>
                          • Verify backend is running<br/>
                          • Check Supabase project status
                        </p>
                      )}
                      {test.name === 'SMTP Settings Check' && (
                        <p className="text-sm text-blue-800 mt-1">
                          • Go to Email Settings<br/>
                          • Fill in SMTP host, port, user, password<br/>
                          • Test connection<br/>
                          • Save settings
                        </p>
                      )}
                      {test.name === 'Company Info Check' && (
                        <p className="text-sm text-blue-800 mt-1">
                          • Go to Company Settings<br/>
                          • Fill in Support Email field<br/>
                          • Save company information
                        </p>
                      )}
                      {test.name === 'Contact Form Submission' && (
                        <p className="text-sm text-blue-800 mt-1">
                          • Check previous test results first<br/>
                          • SMTP Settings must be configured<br/>
                          • Check server logs for detailed error<br/>
                          • Try re-entering SMTP password
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Summary */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>📊 Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Tests Passed:</strong>{' '}
                    {testResult.tests.filter((t: any) => t.passed).length} / {testResult.tests.length}
                  </p>
                  
                  {testResult.tests.every((t: any) => t.passed) ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded">
                      <p className="text-green-900 font-medium">
                        ✅ All tests passed! Your contact form should be working.
                      </p>
                      <p className="text-sm text-green-800 mt-2">
                        If you still don't receive emails:
                      </p>
                      <ul className="text-sm text-green-800 mt-1 list-disc list-inside">
                        <li>Check your spam folder</li>
                        <li>Wait 2-5 minutes for delivery</li>
                        <li>Verify the support email address is correct</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-900 font-medium">
                        ❌ Some tests failed. Please fix the issues above.
                      </p>
                      <p className="text-sm text-red-800 mt-2">
                        Common fixes:
                      </p>
                      <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
                        <li>Re-enter SMTP password in Email Settings</li>
                        <li>Test SMTP connection</li>
                        <li>Set Support Email in Company Settings</li>
                        <li>Check Supabase Edge Function logs</li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
