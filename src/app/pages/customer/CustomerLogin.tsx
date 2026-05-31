import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { User, UserPlus, Loader2, Mail, Lock, Phone, ArrowLeft } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function CustomerLogin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/payment/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(loginData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Store customer data in localStorage
      localStorage.setItem('customer', JSON.stringify(data.customer));
      
      // Dispatch custom event to update header
      window.dispatchEvent(new Event('customerLogin'));
      
      navigate('/customer/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/payment/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          phone: registerData.phone
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }
      
      // Store customer data in localStorage
      localStorage.setItem('customer', JSON.stringify(data.customer));
      
      // Dispatch custom event to update header
      window.dispatchEvent(new Event('customerLogin'));
      
      setSuccess('Account created successfully! Redirecting...');
      
      // Navigate immediately
      navigate('/customer/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 w-full max-w-[100vw] overflow-x-hidden">
      <div className="container mx-auto px-4 w-full">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-[#2D3748]">
            <ArrowLeft className="size-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="bg-[#2D3748] size-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="size-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Customer Portal</h1>
            <p className="text-muted-foreground">Sign in to manage your orders and account</p>
          </div>

          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">
                    <User className="size-4 mr-2" />
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="register">
                    <UserPlus className="size-4 mr-2" />
                    Register
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-50 text-red-900 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-900 p-3 rounded-lg mb-4 text-sm">
                  {success}
                </div>
              )}

              <Tabs value={activeTab}>
                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          required
                          className="pl-10"
                          value={loginData.email}
                          onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          required
                          className="pl-10"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <Link to="/customer/forgot-password" className="text-sm text-[#E31837] hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full bg-[#E31837] hover:bg-[#E31837]/90"
                      size="lg"
                    >
                      {loading ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          required
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          required
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="reg-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          required
                          className="pl-10"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          required
                          className="pl-10"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type="password"
                          required
                          className="pl-10"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum 6 characters
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type="password"
                          required
                          className="pl-10"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full bg-[#E31837] hover:bg-[#E31837]/90"
                      size="lg"
                    >
                      {loading ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}