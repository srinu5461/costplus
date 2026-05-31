import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdmin } from '../../context/AdminContext';
import { useCMS } from '../../context/CMSContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '../../utils/logger';

/**
 * Admin Login Page - v2.0
 * Fixed: AuthContext -> AdminContext
 * Status: Production Ready
 */
export function AdminLogin() {
  const navigate = useNavigate();
  const { login, signup } = useAdmin();

  // Try to access initializeData from CMSContext
  let initializeData: (() => Promise<void>) | undefined;
  try {
    const { initializeData: init } = useCMS();
    initializeData = init;
  } catch (e) {
    logger.warn('AdminLogin: CMSProvider not available, skipping data initialization');
    // Provide fallback function
    initializeData = async () => {
      logger.debug('Fallback: Data initialization not available without CMSProvider');
    };
  }

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success = false;

      if (isSignup) {
        // Signup flow
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        
        logger.debug('Attempting signup', { email, name });
        success = await signup(email, password, name);
        logger.info('Signup result', { success });
        
        // Initialize database with sample data on first signup
        if (success && initializeData) {
          try {
            logger.info('Initializing database...');
            await initializeData();
            logger.info('Database initialized successfully');
          } catch (initError) {
            logger.warn('Data initialization error (may already exist)', initError);
          }
        }
      } else {
        logger.debug('Attempting login', { email });
        success = await login(email, password);
        logger.info('Login result', { success });
      }

      if (success) {
        navigate('/admin');
      } else {
        setError(isSignup ? 'Signup failed. Email may already be in use.' : 'Invalid email or password');
      }
    } catch (err: any) {
      logger.error('Form submission error', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 w-full max-w-[100vw] overflow-x-hidden">
      <div className="max-w-6xl mx-auto py-8 space-y-8 w-full">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="bg-slate-900 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="size-8 text-white" />
            </div>
            <CardTitle className="text-2xl">
              {isSignup ? 'Create Admin Account' : 'Admin Login'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <Label className="text-sm mb-2 block">Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    className="h-12"
                    disabled={loading}
                  />
                </div>
              )}
              
              <div>
                <Label className="text-sm mb-2 block">Email</Label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="h-12"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="h-12"
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-900 p-3 rounded flex items-start gap-2">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-12" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    {isSignup ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isSignup ? 'Create Account' : 'Login to CMS'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError('');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900"
                  disabled={loading}
                >
                  {isSignup 
                    ? 'Already have an account? Login' 
                    : "Don't have an account? Sign up"}
                </button>
              </div>

              {isSignup && (
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
                  <p className="mb-1"><strong>First Time Setup:</strong></p>
                  <p>Create an admin account to initialize the CMS with default products and settings.</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}