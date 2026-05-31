import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ENV, logger } from '../utils/env';

export function DebugPanel() {
  // ✅ Hide in production
  if (!ENV.features.enableDebugPanel) {
    return null;
  }

  const [healthStatus, setHealthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dbStatus, setDbStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

  const testHealth = async () => {
    setHealthStatus('loading');
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await fetch(`${API_URL}/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        setHealthStatus('success');
        setSuccessMessage('✓ Server is healthy and responding');
      } else {
        setHealthStatus('error');
        setErrorMessage(`Health check failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setHealthStatus('error');
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testSignup = async () => {
    setSignupStatus('loading');
    setErrorMessage('');
    setSuccessMessage('');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'test123456';
    const testName = 'Test Admin';

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: testName
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSignupStatus('success');
        setSuccessMessage(`✓ Signup successful! Created user: ${testEmail}`);
      } else {
        setSignupStatus('error');
        const errorMsg = data.error || 'Unknown error';
        const detailsMsg = data.details ? `\nDetails: ${data.details}` : '';
        const fullError = `${errorMsg}${detailsMsg}\n\nHTTP Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`;
        setErrorMessage(`Signup failed: ${fullError}`);
      }
    } catch (error) {
      setSignupStatus('error');
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Network error during signup: ${errorMsg}\n\nFull error: ${JSON.stringify(error, null, 2)}`);
      console.error('Signup test exception:', error);
    }
  };

  const testDatabase = async () => {
    setDbStatus('loading');
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await fetch(`${API_URL}/db/test`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        setDbStatus('success');
        setSuccessMessage('✓ Database connection is healthy');
      } else {
        setDbStatus('error');
        setErrorMessage(`Database test failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setDbStatus('error');
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔧 Database Connection Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-slate-50 p-4 rounded text-sm space-y-2">
          <p><strong>Project ID:</strong> {projectId}</p>
          <p><strong>API URL:</strong> {API_URL}</p>
          <p><strong>Anon Key:</strong> {publicAnonKey.substring(0, 20)}...</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-medium mb-1">1. Health Check</h3>
              <p className="text-sm text-muted-foreground">Test if server is responding</p>
            </div>
            <div className="flex items-center gap-2">
              {healthStatus === 'loading' && <Loader2 className="size-5 animate-spin" />}
              {healthStatus === 'success' && <CheckCircle className="size-5 text-green-600" />}
              {healthStatus === 'error' && <XCircle className="size-5 text-red-600" />}
              <Button onClick={testHealth} disabled={healthStatus === 'loading'}>
                Test Health
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-medium mb-1">2. Signup Test</h3>
              <p className="text-sm text-muted-foreground">Test user creation endpoint</p>
            </div>
            <div className="flex items-center gap-2">
              {signupStatus === 'loading' && <Loader2 className="size-5 animate-spin" />}
              {signupStatus === 'success' && <CheckCircle className="size-5 text-green-600" />}
              {signupStatus === 'error' && <XCircle className="size-5 text-red-600" />}
              <Button onClick={testSignup} disabled={signupStatus === 'loading'}>
                Test Signup
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-medium mb-1">3. Database Test</h3>
              <p className="text-sm text-muted-foreground">Test database connection</p>
            </div>
            <div className="flex items-center gap-2">
              {dbStatus === 'loading' && <Loader2 className="size-5 animate-spin" />}
              {dbStatus === 'success' && <CheckCircle className="size-5 text-green-600" />}
              {dbStatus === 'error' && <XCircle className="size-5 text-red-600" />}
              <Button onClick={testDatabase} disabled={dbStatus === 'loading'}>
                Test Database
              </Button>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 text-green-900 p-4 rounded border border-green-200">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 text-red-900 p-4 rounded border border-red-200">
            <p className="font-medium mb-2">Error Details:</p>
            <p className="text-sm whitespace-pre-wrap">{errorMessage}</p>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded text-sm text-blue-900">
          <p className="font-medium mb-2">How to use:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Test Health" to verify server connection</li>
            <li>Click "Test Signup" to verify authentication works</li>
            <li>Click "Test Database" to verify database connection</li>
            <li>Check browser console (F12) for detailed logs</li>
            <li>If tests pass, try creating your admin account again</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}