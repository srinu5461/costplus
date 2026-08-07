import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ShoppingBag,
  CreditCard,
  Truck,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Package,
  Loader2,
  User,
  UserPlus,
  Users,
  Ticket
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { AgeVerification } from '../components/AgeVerification';
import { calculateBOGODiscounts, type BOGOCalculationResult } from '../utils/bogoCalculator';
import { SquareLogoBlack } from '../components/SquareLogo';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

// eWay script loader - uses sandbox or production URL based on settings
const loadEwayScript = (sandboxMode: boolean = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="eCrypt.js"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    // Use sandbox URL if in sandbox mode, otherwise production
    script.src = sandboxMode
      ? 'https://secure-au.sandbox.ewaypayments.com/scripts/eCrypt.js'
      : 'https://secure.ewaypayments.com/scripts/eCrypt.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load eWay SDK'));
    document.head.appendChild(script);
  });
};

// PayPal script loader
const loadPayPalScript = (clientId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="paypal.com/sdk/js"]')) {
      console.log('🔷 PayPal SDK already loaded');
      resolve();
      return;
    }

    console.log('🔷 Loading PayPal SDK with client ID:', clientId.substring(0, 20) + '...');
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=AUD`;
    script.async = true;
    script.onload = () => {
      console.log('✅ PayPal SDK loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('🔴 Failed to load PayPal SDK:', error);
      reject(new Error('Failed to load PayPal SDK'));
    };
    document.body.appendChild(script);
  });
};

// Square script loader
const loadSquareScript = (sandboxMode: boolean = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="square"]')) {
      console.log('🟪 Square SDK already loaded');
      resolve();
      return;
    }

    console.log('🟪 Loading Square SDK (sandbox:', sandboxMode, ')');
    const script = document.createElement('script');
    script.src = sandboxMode
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Square SDK loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('🔴 Failed to load Square SDK:', error);
      reject(new Error('Failed to load Square SDK'));
    };
    document.head.appendChild(script);
  });
};

declare global {
  interface Window {
    ewaypayments: any;
    paypal: any;
    Square: any;
  }
}

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth?: string;
  ageVerifiedAt?: string;
}

export function Checkout() {
  const { cart, getCartTotal, clearCart, getItemPrice } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if this is an invoice payment
  const invoiceId = searchParams.get('invoice');
  const invoiceAmount = searchParams.get('amount');
  
  const [checkoutType, setCheckoutType] = useState<'login' | 'register' | 'guest'>('guest');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [step, setStep] = useState<'auth' | 'shipping' | 'age-verification' | 'payment'>('auth');
  const [shippingMethod, setShippingMethod] = useState('standard');
  
  // Age verification states
  const [ageVerified, setAgeVerified] = useState(false);
  const [verifiedDOB, setVerifiedDOB] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('eway');
  const [processing, setProcessing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [ewayPublicKey, setEwayPublicKey] = useState('');
  const [ewaySandboxMode, setEwaySandboxMode] = useState(false);

  // PayPal states
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRendered = useRef(false);

  // Square states
  const [squareApplicationId, setSquareApplicationId] = useState('');
  const [squareLocationId, setSquareLocationId] = useState('');
  const [squareRedirectUrl, setSquareRedirectUrl] = useState('');
  const [squareSandboxMode, setSquareSandboxMode] = useState(false);
  const [squareLoaded, setSquareLoaded] = useState(false);
  const squareCardRef = useRef<HTMLDivElement>(null);
  const squareCard = useRef<any>(null);
  const squareGooglePay = useRef<any>(null);
  const [googlePayLoaded, setGooglePayLoaded] = useState(false);

  // Payment settings from admin panel
  const [paymentSettings, setPaymentSettings] = useState({
    enableEway: true,
    enablePaypal: true,
    enableSquare: false,
    enableBankTransfer: true,
    ewaySandboxMode: false,
  });
  const [paymentSettingsLoaded, setPaymentSettingsLoaded] = useState(false);

  // Auto-switch payment method if current one is disabled
  useEffect(() => {
    if (paymentSettingsLoaded) {
      if (paymentMethod === 'eway' && !paymentSettings.enableEway) {
        // Switch to first available payment method
        if (paymentSettings.enablePaypal && paypalClientId) {
          setPaymentMethod('paypal');
        } else if (paymentSettings.enableSquare && squareApplicationId) {
          setPaymentMethod('square');
        } else if (paymentSettings.enableBankTransfer) {
          setPaymentMethod('bank-transfer');
        }
      } else if (paymentMethod === 'paypal' && (!paymentSettings.enablePaypal || !paypalClientId)) {
        if (paymentSettings.enableEway) {
          setPaymentMethod('eway');
        } else if (paymentSettings.enableSquare && squareApplicationId) {
          setPaymentMethod('square');
        } else if (paymentSettings.enableBankTransfer) {
          setPaymentMethod('bank-transfer');
        }
      } else if (paymentMethod === 'square' && (!paymentSettings.enableSquare || !squareApplicationId)) {
        if (paymentSettings.enableEway) {
          setPaymentMethod('eway');
        } else if (paymentSettings.enablePaypal && paypalClientId) {
          setPaymentMethod('paypal');
        } else if (paymentSettings.enableBankTransfer) {
          setPaymentMethod('bank-transfer');
        }
      } else if (paymentMethod === 'bank-transfer' && !paymentSettings.enableBankTransfer) {
        if (paymentSettings.enableEway) {
          setPaymentMethod('eway');
        } else if (paymentSettings.enablePaypal && paypalClientId) {
          setPaymentMethod('paypal');
        } else if (paymentSettings.enableSquare && squareApplicationId) {
          setPaymentMethod('square');
        }
      }
    }
  }, [paymentSettings, paymentSettingsLoaded, paymentMethod, paypalClientId, squareApplicationId, squareLocationId]);

  // Bank details for bank transfer
  const [bankDetails, setBankDetails] = useState<any>(null);

  // Invoice payment states
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  
  // Shipping calculation states
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingCalculated, setShippingCalculated] = useState(false);
  const [shippingZone, setShippingZone] = useState('');
  const [shippingMessage, setShippingMessage] = useState('');
  const [requiresShippingQuote, setRequiresShippingQuote] = useState(false);
  const [quoteCategories, setQuoteCategories] = useState<string[]>([]);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  
  // Pickup states
  const [usePickup, setUsePickup] = useState(false);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState('');
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [loadingPickupLocations, setLoadingPickupLocations] = useState(false);
  
  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // Terms and conditions acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Legal pages content from database
  const [termsContent, setTermsContent] = useState('');
  const [loadingLegalPages, setLoadingLegalPages] = useState(true);

  // BOGO calculations
  const [bogoResult, setBogoResult] = useState<BOGOCalculationResult | null>(null);

  const ewayButtonRef = useRef<HTMLDivElement>(null);

  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Register form
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  // Shipping form
  const [shippingForm, setShippingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia'
  });

  // Calculate BOGO discounts whenever cart changes
  useEffect(() => {
    if (cart.length > 0) {
      calculateBOGODiscounts(cart).then(result => {
        setBogoResult(result);
      });
    } else {
      setBogoResult(null);
    }
  }, [cart]);

  // Get customer discount information
  const getCustomerPricing = () => {
    try {
      const customerStr = localStorage.getItem('customer');
      if (customerStr) {
        const customerData = JSON.parse(customerStr);
        const canBuyAtCostPrice = customerData?.can_see_cost_price || false;
        const discountPercentage = customerData?.discount_percentage || 0;
        return { canBuyAtCostPrice, discountPercentage };
      }
    } catch (e) {
      // Ignore errors
    }
    return { canBuyAtCostPrice: false, discountPercentage: 0 };
  };

  const { canBuyAtCostPrice, discountPercentage } = getCustomerPricing();

  // Calculate subtotal
  // NOTE: getItemPrice already handles ALL pricing logic:
  // - Promotional prices (highest priority)
  // - Cost prices
  // - VIP discounts
  // - Multibuy prices
  // - Regular prices
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      const effectivePrice = getItemPrice(item);
      return total + effectivePrice * item.quantity;
    }, 0);
  };

  // ALWAYS use calculateSubtotal() because it correctly handles promotional prices
  // bogoResult.originalTotal doesn't know about promotional pricing
  const originalSubtotal = calculateSubtotal();

  const bogoDiscount = bogoResult?.totalDiscount ?? 0;
  const subtotal = originalSubtotal - bogoDiscount;
  const gst = subtotal * 0.1; // 10% GST

  // Use calculated shipping cost only if it has been calculated, otherwise 0
  // If pickup is selected, shipping is always 0
  const shipping = usePickup ? 0 : (shippingCalculated ? shippingCost : 0);
  const voucherDiscount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const total = Math.max(0, subtotal + gst + shipping - voucherDiscount);
  
  // Calculate shipping based on postcode and cart contents
  const calculateShippingCost = async () => {
    if (!shippingForm.postcode || shippingForm.postcode.length < 4) {
      return;
    }
    
    setCalculatingShipping(true);
    
    try {
      // Get categories with their max item price for quote threshold check
      const categories = [...new Set(cart.map(item => item.product.category))];
      const cartItems = cart.map(item => ({
        category: item.product.category,
        price: item.product.price || 0,
      }));

      logger.debug('Calculating shipping', { postcode: shippingForm.postcode, cartTotal: subtotal, categories });

      const response = await fetch(`${API_URL}/shipping/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          postcode: shippingForm.postcode,
          cartTotal: subtotal,
          categories,
          cartItems,
        }),
      });
      
      const result = await response.json();
      
      logger.info('Shipping calculation result', result);
      
      if (result.success) {
        setShippingCost(result.cost);
        setShippingZone(result.zoneName || '');
        setShippingMessage(result.message);
        setRequiresShippingQuote(result.requiresQuote || false);
        setQuoteCategories(result.matchedCategories || []);
        setShippingCalculated(true);
      } else {
        // Calculation failed, show error but allow checkout with default shipping
        logger.warn('Shipping calculation failed', result.message);
        setShippingMessage(result.message || 'Unable to calculate shipping for this postcode');
        setShippingCalculated(false);
      }
    } catch (error) {
      logger.error('Error calculating shipping', error);
      setShippingMessage('Unable to calculate shipping. Please contact us for a quote.');
      setShippingCalculated(false);
    } finally {
      setCalculatingShipping(false);
    }
  };
  
  // Auto-calculate shipping when postcode changes
  useEffect(() => {
    // Only calculate shipping if pickup is NOT selected
    if (step === 'shipping' && !usePickup && shippingForm.postcode && shippingForm.postcode.length >= 4) {
      const timer = setTimeout(() => {
        calculateShippingCost();
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(timer);
    }
  }, [shippingForm.postcode, step, usePickup]);

  // Apply voucher code
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      return;
    }

    // 🚫 Block vouchers for Cost+$100 customers
    try {
      const customerStr = localStorage.getItem('customer');
      if (customerStr) {
        const customer = JSON.parse(customerStr);
        if (customer?.cost_plus_hundred_access) {
          setVoucherError('Vouchers are not available for Cost+$100 pricing customers');
          return;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }

    setVoucherLoading(true);
    setVoucherError('');

    try {
      const orderTotal = subtotal + gst + shipping;
      const response = await fetch(`${API_URL}/vouchers/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          code: voucherCode.toUpperCase(),
          orderTotal,
          customerEmail: shippingForm.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAppliedVoucher(data.voucher);
        notify.success(`Voucher applied! You saved $${data.voucher.discountAmount.toFixed(2)}`);
      } else {
        setVoucherError(data.error || 'Invalid voucher code');
      }
    } catch (error) {
      console.error('Error applying voucher:', error);
      setVoucherError('Failed to apply voucher');
    } finally {
      setVoucherLoading(false);
    }
  };

  // Remove applied voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
  };

  // Record voucher usage after order creation
  const recordVoucherUsage = async (orderId: string) => {
    if (!appliedVoucher) return;

    try {
      await fetch(`${API_URL}/vouchers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          voucherId: appliedVoucher.id,
          voucherCode: appliedVoucher.code,
          orderId,
          customerId: customer?.id || null,
          customerEmail: shippingForm.email,
          discountAmount: voucherDiscount,
        }),
      });
    } catch (error) {
      console.error('Failed to record voucher usage:', error);
      // Don't fail the order if voucher recording fails
    }
  };

  // Fetch pickup locations when state is entered or when pickup is enabled
  useEffect(() => {
    if (step === 'shipping' && shippingForm.state && usePickup) {
      setLoadingPickupLocations(true);
      setPickupLocations([]); // Clear existing locations
      setSelectedPickupLocation(''); // Clear selection
      
      const stateParam = shippingForm.state.toUpperCase().trim();
      
      fetch(`${API_URL}/pickup-locations/active?state=${encodeURIComponent(stateParam)}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          logger.debug('Pickup locations response', data);
          if (data.success) {
            setPickupLocations(data.locations);
          }
        })
        .catch(error => {
          logger.error('Error fetching pickup locations', error);
        })
        .finally(() => {
          setLoadingPickupLocations(false);
        });
    }
  }, [shippingForm.state, step, usePickup]);

  // Check if customer is already logged in on mount
  useEffect(() => {
    // Fetch payment settings from admin panel
    fetch(`${API_URL}/settings/payment-settings`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.paymentSettings) {
          setPaymentSettings(data.paymentSettings);
          logger.info('Payment settings loaded', data.paymentSettings);
        }
        setPaymentSettingsLoaded(true);
      })
      .catch(error => {
        logger.error('Failed to fetch payment settings', error);
        setPaymentSettingsLoaded(true);
      });

    // Fetch bank details for bank transfer
    fetch(`${API_URL}/settings/bank-details`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.bankDetails) {
          setBankDetails(data.bankDetails);
          logger.info('Bank details loaded');
        }
      })
      .catch(error => {
        logger.error('Failed to fetch bank details', error);
      });

    // Fetch eWay Public API Key and sandbox mode
    fetch(`${API_URL}/payment/eway/public-key`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || 'Failed to fetch eWay public key');
          });
        }
        return res.json();
      })
      .then(data => {
        logger.info('eWay Public Key fetched successfully');
        if (!data.publicKey) {
          throw new Error('eWay Public Key is missing from server response');
        }
        setEwayPublicKey(data.publicKey);
        setEwaySandboxMode(data.sandboxMode || false);
        logger.info('eWay Sandbox Mode:', data.sandboxMode);
      })
      .catch(error => {
        logger.error('Failed to fetch eWay public key', error);
        notify.error('Payment System Configuration Error',
          'Please make sure EWAY_PUBLIC_API_KEY is set in your environment variables.');
      });

    // Fetch PayPal Client ID
    fetch(`${API_URL}/payment/paypal/client-id`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        console.log('PayPal Client ID response:', data);
        if (data.clientId) {
          setPaypalClientId(data.clientId);
          logger.info('PayPal Client ID fetched successfully:', data.clientId.substring(0, 20) + '...');
        } else {
          console.warn('⚠️ PayPal Client ID not configured - PAYPAL_CLIENT_ID env variable missing');
        }
      })
      .catch(error => {
        console.error('❌ Failed to fetch PayPal client ID:', error);
        logger.error('Failed to fetch PayPal client ID', error);
      });

    // Fetch Square Application ID
    fetch(`${API_URL}/payment/square/application-id`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        console.log('🟪 Square Application ID response:', data);
        if (data.applicationId) {
          // Auto-detect sandbox mode from Application ID prefix (sandbox IDs start with "sandbox-")
          const isSandbox = data.applicationId.startsWith('sandbox-');
          const sandboxMode = data.sandboxMode !== undefined ? data.sandboxMode : isSandbox;

          console.log('🟪 Application ID starts with "sandbox-":', isSandbox);
          console.log('🟪 Backend sandboxMode value:', data.sandboxMode);
          console.log('🟪 Final sandboxMode (auto-detected):', sandboxMode);

          setSquareApplicationId(data.applicationId);
          setSquareLocationId(data.locationId || '');
          setSquareRedirectUrl(data.redirectUrl || window.location.origin);
          setSquareSandboxMode(sandboxMode);
          logger.info('Square Application ID fetched successfully:', data.applicationId.substring(0, 20) + '...');
          if (data.locationId) {
            logger.info('Square Location ID:', data.locationId.substring(0, 20) + '...');
          }
          if (data.redirectUrl) {
            logger.info('Square Redirect URL:', data.redirectUrl);
          }
          logger.info('Square Sandbox Mode:', sandboxMode);
        } else {
          console.warn('⚠️ Square Application ID not configured - SQUARE_APPLICATION_ID env variable missing');
        }
      })
      .catch(error => {
        console.error('❌ Failed to fetch Square application ID:', error);
        logger.error('Failed to fetch Square application ID', error);
      });

    const savedCustomer = localStorage.getItem('customer');
    if (savedCustomer) {
      try {
        const customerData = JSON.parse(savedCustomer);
        setCustomer(customerData);
        
        // Pre-fill shipping form with customer data
        setShippingForm({
          ...shippingForm,
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
        });
        
        // Skip auth step and go directly to shipping
        setStep('shipping');
      } catch (error) {
        logger.error('Failed to load customer from localStorage', error);
      }
    }
  }, []);

  // Fetch legal pages content from database
  useEffect(() => {
    const fetchLegalPages = async () => {
      setLoadingLegalPages(true);
      try {
        // Fetch Terms and Conditions
        const termsResponse = await fetch(
          `${API_URL}/legal/terms-and-conditions`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        if (termsResponse.ok) {
          const termsData = await termsResponse.json();
          if (termsData.success && termsData.content) {
            setTermsContent(termsData.content);
          }
        }
        
        // Fetch Return & Refund Policy
        const refundResponse = await fetch(
          `${API_URL}/legal/return-and-refund-policy`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        if (refundResponse.ok) {
          const refundData = await refundResponse.json();
          if (refundData.success && refundData.content) {
            setRefundPolicyContent(refundData.content);
          }
        }
      } catch (error) {
        console.error('Failed to fetch legal pages:', error);
      } finally {
        setLoadingLegalPages(false);
      }
    };
    
    fetchLegalPages();
  }, []);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setAuthError('');
    
    try {
      const response = await fetch(`${API_URL}/payment/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(loginForm),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setAuthError(data.error || 'Login failed');
        setProcessing(false);
        return;
      }
      
      setCustomer(data.customer);
      
      // Store customer in localStorage for header sync
      localStorage.setItem('customer', JSON.stringify(data.customer));
      
      // Store session token
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
        logger.debug('Session token stored for login');
      }
      
      // Dispatch event to update header
      window.dispatchEvent(new Event('customerLogin'));
      
      setShippingForm({
        ...shippingForm,
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        email: data.customer.email,
        phone: data.customer.phone,
      });
      setStep('shipping');
    } catch (error) {
      logger.error('Login error', error);
      setAuthError('Login failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setAuthError('');
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Passwords do not match');
      setProcessing(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/payment/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(registerForm),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setAuthError(data.error || 'Registration failed');
        setProcessing(false);
        return;
      }
      
      // Auto-login after registration
      setCustomer(data.customer);
      
      // Store customer in localStorage for header sync
      localStorage.setItem('customer', JSON.stringify(data.customer));
      
      // Store session token
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
        logger.debug('Session token stored for registration');
      }
      
      // Dispatch event to update header
      window.dispatchEvent(new Event('customerLogin'));
      
      setShippingForm({
        ...shippingForm,
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        email: data.customer.email,
        phone: data.customer.phone,
      });
      setStep('shipping');
    } catch (error) {
      logger.error('Registration error', error);
      setAuthError('Registration failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Guest Checkout
  const handleGuestCheckout = () => {
    setStep('shipping');
  };

  // Handle Shipping Submit
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Scroll to top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Check if cart has age-restricted items
    const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);

    if (hasAgeRestrictedItems && !ageVerified) {
      // Go to age verification step
      setStep('age-verification');
    } else {
      // Skip age verification if no restricted items or already verified
      setStep('payment');
    }
  };
  
  // Handle Age Verification
  const handleAgeVerified = async (dateOfBirth: string) => {
    setVerifiedDOB(dateOfBirth);
    setAgeVerified(true);
    
    // If customer is logged in, update their DOB in the database
    if (customer?.id) {
      try {
        await fetch(`${API_URL}/customers/${customer.id}/age-verification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            dateOfBirth,
            verifiedAt: new Date().toISOString(),
          }),
        });
      } catch (error) {
        logger.error('Failed to save age verification', error);
        // Continue anyway - verification is done
      }
    }
    
    // Proceed to payment
    setStep('payment');
  };

  // Handle Bank Transfer Order
  const handleBankTransferOrder = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);

      const orderData = {
        customerId: customer?.id || null,
        customer: customer || {
          email: shippingForm.email,
          firstName: shippingForm.firstName,
          lastName: shippingForm.lastName,
          phone: shippingForm.phone,
        },
        shipping: shippingForm,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productCode: item.product.code,
          quantity: item.quantity,
          price: item.product.price,
          image: item.product.image,
        })),
        bogoDiscount,
        subtotal,
        gst,
        shippingCost: shipping, // Shipping cost amount
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: voucherDiscount,
        total,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'pending',
        shippingMethod: usePickup ? 'pickup' : requiresShippingQuote ? 'quote' : shippingMethod,
        usePickup,
        pickupLocation: usePickup ? (() => {
          const loc = pickupLocations.find(l => l.id === selectedPickupLocation);
          return loc ? `${loc.name} - ${loc.address}` : selectedPickupLocation;
        })() : null,
        ageVerificationRequired: hasAgeRestrictedItems,
        ageVerifiedAt: hasAgeRestrictedItems ? new Date().toISOString() : null,
        ageVerifiedDOB: hasAgeRestrictedItems ? verifiedDOB : null,
      };

      logger.debug('Creating bank transfer order', orderData);
      console.log('🏦 Bank Transfer URL:', `${API_URL}/payment/bank-transfer`);

      const response = await fetch(`${API_URL}/payment/bank-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(orderData),
      });

      const responseText = await response.text();
      console.log('🏦 Bank transfer response:', response.status, responseText);

      if (!response.ok) {
        let errorMsg = 'Failed to create order';
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          errorMsg = responseText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = JSON.parse(responseText);
      logger.info('Bank transfer order created', data);

      if (!data.orderId && !data.order?.id) {
        throw new Error('Order created but no ID returned');
      }

      const finalOrderId = data.orderId || data.order?.id;

      // Record voucher usage
      await recordVoucherUsage(finalOrderId);

      // Clear cart and navigate to confirmation
      clearCart();
      navigate(`/order/${finalOrderId}?method=bank-transfer`);
    } catch (error) {
      logger.error('Bank transfer order failed', error);
      notify.error(error instanceof Error ? error.message : 'Failed to create order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Load eWay button - MUST RE-RENDER WHEN PAYMENT METHOD CHANGES
  useEffect(() => {
    if (step === 'payment' && paymentMethod === 'eway' && ewayButtonRef.current && ewayPublicKey) {
      // Add global message listener to debug ALL messages
      const globalMessageHandler = (event: MessageEvent) => {
        logger.debug('Message received', { origin: event.origin, data: event.data });
      };

      window.addEventListener('message', globalMessageHandler);
      window.addEventListener('message', handleEwayMessage);

      // Load eWay script with sandbox mode setting
      loadEwayScript(ewaySandboxMode).then(() => {
        if (ewayButtonRef.current) {
          ewayButtonRef.current.innerHTML = '';

          const script = document.createElement('script');
          // Use sandbox or production URL based on settings
          script.src = ewaySandboxMode
            ? 'https://secure-au.sandbox.ewaypayments.com/scripts/eCrypt.js'
            : 'https://secure.ewaypayments.com/scripts/eCrypt.js';
          script.className = 'eway-paynow-button';
          script.setAttribute('data-publicapikey', ewayPublicKey);
          script.setAttribute('data-amount', Math.round(total * 100).toString());
          script.setAttribute('data-currency', 'AUD');

          ewayButtonRef.current.appendChild(script);

          logger.info('eWay button loaded', {
            amount: Math.round(total * 100),
            publicKey: ewayPublicKey.substring(0, 10) + '...', // Don't log full key
            sandboxMode: ewaySandboxMode
          });
        }
      }).catch((error) => {
        logger.error('Failed to load eWay', error);
      });

      return () => {
        window.removeEventListener('message', globalMessageHandler);
        window.removeEventListener('message', handleEwayMessage);
      };
    }
  }, [step, paymentMethod, total, ewayPublicKey, ewaySandboxMode]);

  // Load PayPal buttons when payment method is PayPal
  useEffect(() => {
    let isMounted = true;

    console.log('🔍 PayPal useEffect check:', {
      step,
      paymentMethod,
      hasClientId: !!paypalClientId,
      hasRef: !!paypalButtonRef.current,
      alreadyRendered: paypalButtonsRendered.current,
    });

    // Clean up buttons when not on PayPal
    if (paymentMethod !== 'paypal') {
      if (paypalButtonRef.current) {
        paypalButtonRef.current.innerHTML = '';
      }
      paypalButtonsRendered.current = false;
      setPaypalLoaded(false);
      return;
    }

    // Skip if already rendered AND values haven't changed
    // (Re-render if total, shipping, or cart changed to update button callbacks with new values)
    if (paypalButtonsRendered.current && step === 'payment' && paymentMethod === 'paypal') {
      console.log('⏭️ PayPal buttons already rendered with current values, skipping');
      return;
    }

    if (step === 'payment' && paymentMethod === 'paypal' && paypalClientId) {
      console.log('💰 Loading PayPal SDK with client ID:', paypalClientId.substring(0, 20) + '...');

      // Clear previous buttons if re-rendering
      if (paypalButtonRef.current) {
        paypalButtonRef.current.innerHTML = '';
      }
      paypalButtonsRendered.current = false;
      setPaypalLoaded(false); // Reset loading state

      loadPayPalScript(paypalClientId).then(() => {
        if (!isMounted || paypalButtonsRendered.current) return;
        console.log('✅ PayPal SDK loaded successfully');

        // Wait for ref to be available with retry limit
        let retryCount = 0;
        const maxRetries = 20;

        const renderButtons = () => {
          if (paypalButtonsRendered.current || !isMounted) return; // Prevent duplicate renders

          if (paypalButtonRef.current && window.paypal) {
            console.log('🔵 Rendering PayPal buttons...');
            paypalButtonsRendered.current = true; // Mark as rendered to prevent duplicates
            paypalButtonRef.current.innerHTML = ''; // Clear any existing content

            window.paypal.Buttons({
            createOrder: async () => {
              try {
                console.log('🔷 Creating PayPal order with amount:', total.toFixed(2));
                console.log('🔷 API URL:', `${API_URL}/payment/paypal/create-order`);
                const response = await fetch(`${API_URL}/payment/paypal/create-order`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                  },
                  body: JSON.stringify({
                    amount: total,
                    currency: 'AUD',
                  }),
                });

                console.log('🔷 PayPal order response status:', response.status);

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('🔴 PayPal order creation failed:', errorText);
                  throw new Error(`Failed to create order: ${errorText}`);
                }

                const order = await response.json();
                console.log('🔷 PayPal order created:', order);
                console.log('🔷 Returning orderId:', order.orderId);
                return order.orderId;
              } catch (error) {
                console.error('🔴 PayPal create order error:', error);
                logger.error('PayPal create order failed', error);
                notify.error('Failed to create PayPal order');
                throw error;
              }
            },
            onApprove: async (data: any) => {
              try {
                console.log('🔷 PayPal payment approved:', data);
                setProcessing(true);
                logger.info('PayPal payment approved', data);

                // Check if cart has age-restricted items
                const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);

                console.log('🔷 PayPal Order Values:', {
                  subtotal,
                  gst,
                  shipping,
                  total,
                  usePickup,
                  requiresShippingQuote,
                  shippingMethod,
                  bogoResult,
                  cartItems: cart.map(item => ({
                    name: item.product.name,
                    image: item.product.image,
                    code: item.product.code,
                    quantity: item.quantity,
                  }))
                });

                const orderData = {
                  customer: customer || {
                    firstName: shippingForm.firstName,
                    lastName: shippingForm.lastName,
                    email: shippingForm.email,
                    phone: shippingForm.phone,
                  },
                  shippingAddress: !usePickup ? shippingForm : null,
                  items: cart.map(item => ({
                    productId: item.product.id,
                    name: item.product.name,
                    code: item.product.code,
                    quantity: item.quantity,
                    price: getItemPrice(item),
                    product: {
                      name: item.product.name,
                      image: item.product.image,
                      price: getItemPrice(item),
                      code: item.product.code,
                    },
                    image: item.product.image,
                    productName: item.product.name,
                  })),
                  subtotal,
                  gst,
                  shipping,
                  voucherCode: appliedVoucher?.code || null,
                  voucherDiscount: voucherDiscount,
                  total,
                  shippingMethod: usePickup ? 'pickup' : requiresShippingQuote ? 'quote' : shippingMethod,
                  usePickup,
                  pickupLocation: usePickup ? (() => {
                    const loc = pickupLocations.find(l => l.id === selectedPickupLocation);
                    return loc ? `${loc.name} - ${loc.address}` : selectedPickupLocation;
                  })() : null,
                  ageVerificationRequired: hasAgeRestrictedItems,
                  ageVerifiedAt: hasAgeRestrictedItems ? new Date().toISOString() : null,
                  ageVerifiedDOB: hasAgeRestrictedItems ? verifiedDOB : null,
                  paypalOrderId: data.orderID,
                };

                console.log('🔷 Capturing PayPal order:', data.orderID);
                console.log('🔷 Order data:', orderData);

                const response = await fetch(`${API_URL}/payment/paypal/capture-order`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                  },
                  body: JSON.stringify({
                    orderID: data.orderID,
                    orderData,
                  }),
                });

                console.log('🔷 Capture response status:', response.status);

                const result = await response.json();
                console.log('🔷 Capture result:', result);

                if (result.success) {
                  logger.info('PayPal payment captured', result);
                  notify.success('Payment successful!');
                  await recordVoucherUsage(result.orderId);
                  clearCart();
                  navigate(`/order/${result.orderId}?method=paypal`);
                } else {
                  throw new Error(result.error || 'Payment capture failed');
                }
              } catch (error) {
                logger.error('PayPal capture failed', error);
                notify.error('Payment failed. Please try again.');
                setProcessing(false);
              }
            },
            onError: (err: any) => {
              console.error('🔴 PayPal button error:', err);
              logger.error('PayPal error', err);
              notify.error('PayPal payment failed: ' + (err?.message || 'Unknown error'));
              setProcessing(false);
            },
            style: {
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'paypal',
            },
            }).render(paypalButtonRef.current).then(() => {
              if (!isMounted) return;
              console.log('✅ PayPal buttons rendered successfully');
              setPaypalLoaded(true);
            }).catch((renderError: any) => {
              if (!isMounted) return;
              console.error('❌ PayPal button render error:', renderError);
              setPaypalLoaded(false);
            });

            logger.info('PayPal buttons rendering...');
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              console.warn(`⏳ Ref not ready yet, retry ${retryCount}/${maxRetries}...`);
              // Retry after a short delay
              setTimeout(renderButtons, 100);
            } else {
              console.error('❌ PayPal ref never became available after', maxRetries, 'retries');
              setPaypalLoaded(false);
            }
          }
        };

        // Set loaded to true immediately so the div renders
        setPaypalLoaded(true);
        // Then try to render buttons
        renderButtons();
      }).catch((error) => {
        if (!isMounted) return;
        console.error('❌ Failed to load PayPal SDK:', error);
        logger.error('Failed to load PayPal SDK', error);
        setPaypalLoaded(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [step, paymentMethod, paypalClientId, subtotal, gst, shipping, total, cart, customer, shippingForm, usePickup, selectedPickupLocation, verifiedDOB, requiresShippingQuote, shippingMethod, bogoResult]);

  // Load Square payment form when payment method is Square
  // Square SDK Initialization (Australian Configuration)
  useEffect(() => {
    let isMounted = true;

    // Cleanup when switching away from Square
    if (paymentMethod !== 'square') {
      if (squareCard.current) {
        try {
          squareCard.current.destroy();
        } catch (e) {
          // Already destroyed
        }
        squareCard.current = null;
      }
      setSquareLoaded(false);
      setGooglePayLoaded(false);
      return;
    }

    // Only initialize when on payment step with Square selected
    if (step !== 'payment' || !squareApplicationId) {
      return;
    }

    console.log('🇦🇺 Initializing Square Web SDK for Australia...');
    console.log('🇦🇺 Application ID:', squareApplicationId?.substring(0, 15) + '...');
    console.log('🇦🇺 Location ID:', squareLocationId?.substring(0, 15) + '...');
    console.log('🇦🇺 Sandbox Mode:', squareSandboxMode);

    // Load Square SDK script
    loadSquareScript(squareSandboxMode)
      .then(async () => {
        console.log('🇦🇺 SDK loaded, checking mount status...');
        console.log('🇦🇺 isMounted:', isMounted);
        console.log('🇦🇺 squareCardRef.current:', !!squareCardRef.current);
        console.log('🇦🇺 window.Square:', !!window.Square);

        if (!isMounted || !squareCardRef.current || !window.Square) {
          console.log('⚠️ Initialization cancelled - component unmounted or SDK not ready');
          return;
        }

        try {
          console.log('🇦🇺 Calling Square.payments()...');
          // Initialize Square Payments for Australian merchant
          const payments = await window.Square.payments(squareApplicationId, squareLocationId);
          console.log('✅ Square payments object created');

          console.log('🇦🇺 Creating card form...');
          // Create card payment form with Australian styling
          const card = await payments.card({
            style: {
              input: {
                fontSize: '16px',
              },
              '.input-container': {
                borderColor: '#E5E7EB',
                borderRadius: '8px',
              },
              '.input-container.is-focus': {
                borderColor: '#8B5CF6',
              },
              '.input-container.is-error': {
                borderColor: '#EF4444',
              },
            },
          });
          console.log('✅ Card form created');

          console.log('🇦🇺 Attaching card form to DOM...');
          // Attach card form to DOM
          await card.attach(squareCardRef.current);
          console.log('✅ Card form attached');

          squareCard.current = card;
          setSquareLoaded(true);

          console.log('✅ Square card form loaded successfully');

          // Enable Google Pay for live sites only
          const isInIframe = window.self !== window.top;
          setGooglePayLoaded(!isInIframe);

        } catch (error: any) {
          console.error('❌ Square initialization error:', error);
          console.error('❌ Error name:', error?.name);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          notify.error(`Failed to load payment form: ${error?.message || 'Unknown error'}`);
        }
      })
      .catch((error) => {
        console.error('❌ Square SDK load error:', error);
        console.error('❌ SDK Error details:', error?.message);
        notify.error(`Failed to load Square SDK: ${error?.message || 'Unknown error'}`);
      });

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (squareCard.current) {
        try {
          squareCard.current.destroy();
        } catch (e) {
          // Already destroyed
        }
        squareCard.current = null;
      }
    };
  }, [step, paymentMethod, squareApplicationId, squareLocationId, squareSandboxMode]);

  // Handle Square Payment (Australian Configuration)
  const handleSquarePayment = async () => {
    if (!squareCard.current) {
      notify.error('Payment form not ready');
      return;
    }

    try {
      setProcessing(true);

      // Validate Australian postcode
      const postcode = (shippingForm.postcode || '').trim();
      if (!/^\d{4}$/.test(postcode)) {
        notify.error('Please enter a valid 4-digit Australian postcode');
        setProcessing(false);
        return;
      }

      // Step 1: Tokenize card
      const tokenResult = await squareCard.current.tokenize();

      if (tokenResult.status !== 'OK') {
        const errorMsg = tokenResult.errors?.map((e: any) => e.message).join('. ') || 'Please check your card details';
        notify.error(errorMsg);
        setProcessing(false);
        return;
      }

      console.log('✅ Card tokenized successfully');

      // Step 2: Skip buyer verification - not needed for all cards
      // Square will handle 3D Secure automatically during payment processing if required
      console.log('ℹ️ Proceeding with card token only (verification handled by Square backend)');

      // Step 3: Send payment to backend
      const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);

      console.log('📤 Sending payment to backend:', {
        amount: total,
        currency: 'AUD',
        hasToken: !!tokenResult.token,
      });

      const response = await fetch(`${API_URL}/payment/square/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          amount: total,
          idempotencyKey: `square-${Date.now()}`,
          orderData: {
            customerId: customer?.id || null,
            cart: cart.map(item => ({
              productId: item.product.id,
              name: item.product.name,
              code: item.product.code,
              image: item.product.image,
              quantity: item.quantity,
              price: getItemPrice(item),
              ageRestricted: item.product.ageRestricted || false,
            })),
            customerDetails: {
              ...shippingForm,
              dateOfBirth: hasAgeRestrictedItems && verifiedDOB ? verifiedDOB : undefined,
              ageVerifiedAt: hasAgeRestrictedItems && verifiedDOB ? new Date().toISOString() : undefined,
            },
            subtotal,
            gst,
            shipping,
            voucherCode: appliedVoucher?.code || null,
            voucherDiscount: voucherDiscount,
            total,
            pickupLocation: usePickup ? (() => {
              const loc = pickupLocations.find(l => l.id === selectedPickupLocation);
              return loc ? `${loc.name} - ${loc.address}` : selectedPickupLocation;
            })() : null,
            shippingMethod: usePickup ? 'pickup' : requiresShippingQuote ? 'quote' : shippingMethod,
            usePickup,
          },
        }),
      });

      const result = await response.json();

      console.log('📥 Backend response:', {
        status: response.status,
        success: result.success,
        error: result.error,
        orderId: result.orderId,
      });

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || 'Payment failed';
        console.error('❌ Backend rejected payment:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Payment successful:', result.orderId);
      await recordVoucherUsage(result.orderId);
      clearCart();
      navigate(`/order-confirmation?orderId=${result.orderId}`);

    } catch (error: any) {
      console.error('❌ Payment error:', error);

      // Show more helpful error message
      let errorMessage = 'Payment failed';
      if (error.message?.includes('authorized')) {
        errorMessage = 'Payment authorization failed. Please check your card details and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      notify.error(errorMessage);
      setProcessing(false);
    }
  };

  // Handle Google Pay payment
  const handleGooglePayPayment = async () => {
    if (!window.Square) {
      notify.error('Square SDK not loaded');
      return;
    }

    try {
      setProcessing(true);
      console.log('🟪 Processing Google Pay payment...');

      // Recreate payments and Google Pay with current total
      const payments = window.Square.payments(squareApplicationId, squareLocationId || undefined);

      // Create payment request with current cart total
      const paymentRequest = payments.paymentRequest({
        countryCode: 'AU',
        currencyCode: 'AUD',
        total: {
          amount: total.toFixed(2),
          label: 'Total',
        },
      });

      const googlePay = await payments.googlePay(paymentRequest);

      // Google Pay tokenization handles all verification:
      // - User authenticates with Google Pay (biometric/PIN/password)
      // - Google provides a tokenized payment method (no CVV needed)
      // - verificationDetails ensures SCA compliance
      const tokenResult = await googlePay.tokenize({
        billingContact: {
          givenName: shippingForm.firstName || '',
          familyName: shippingForm.lastName || '',
          email: shippingForm.email || '',
          phone: shippingForm.phone || '',
          addressLines: [shippingForm.address || ''],
          city: shippingForm.city || '',
          state: shippingForm.state || '',
          postalCode: shippingForm.postcode || '',
          countryCode: 'AU',
        },
        verificationDetails: {
          amount: total.toFixed(2),
          currencyCode: 'AUD',
          intent: 'CHARGE',
          customerInitiated: true,
          sellerKeyedIn: false,
        },
      });

      if (tokenResult.status !== 'OK') {
        console.error('❌ Google Pay tokenization failed:', tokenResult.errors);
        const errorMessage = tokenResult.errors?.[0]?.message || 'Google Pay payment failed';
        notify.error(errorMessage);
        setProcessing(false);
        return;
      }

      const token = tokenResult.token;
      console.log('✅ Google Pay token received');

      // Note: Google Pay has built-in verification through tokenization with verificationDetails
      // The verificationDetails provided during tokenize() handles SCA compliance
      // No need for additional verifyBuyer() call
      console.log('✅ Google Pay verification complete (handled during tokenization)');

      const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);

      const orderData = {
        customerId: customer?.id || null,
        cart: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          code: item.product.code,
          image: item.product.image,
          quantity: item.quantity,
          price: getItemPrice(item),
          ageRestricted: item.product.ageRestricted || false,
        })),
        customerDetails: {
          ...shippingForm,
          dateOfBirth: hasAgeRestrictedItems && verifiedDOB ? verifiedDOB : undefined,
          ageVerifiedAt: hasAgeRestrictedItems && verifiedDOB ? new Date().toISOString() : undefined,
        },
        subtotal,
        gst,
        shipping,
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: voucherDiscount,
        total,
        pickupLocation: usePickup ? (() => {
          const loc = pickupLocations.find(l => l.id === selectedPickupLocation);
          return loc ? `${loc.name} - ${loc.address}` : selectedPickupLocation;
        })() : null,
        shippingMethod: usePickup ? 'pickup' : requiresShippingQuote ? 'quote' : shippingMethod,
        usePickup,
      };

      console.log('🟪 Creating Google Pay payment...');
      const response = await fetch(`${API_URL}/payment/square/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          sourceId: token,
          amount: total,
          // No verification token needed - Google Pay tokenization already includes verification
          verificationToken: undefined,
          idempotencyKey: `googlepay-${Date.now()}-${Math.random()}`,
          orderData,
        }),
      });

      const paymentResult = await response.json();

      if (!response.ok || !paymentResult.success) {
        console.error('❌ Google Pay payment failed:', paymentResult);
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log('✅ GOOGLE PAY PAYMENT SUCCESSFUL!');
      logger.info('Google Pay payment completed', { orderId: paymentResult.orderId });

      await recordVoucherUsage(paymentResult.orderId);
      clearCart();
      navigate(`/order-confirmation?orderId=${paymentResult.orderId}`);
    } catch (error: any) {
      console.error('❌ Google Pay error:', error);
      logger.error('Google Pay payment failed', error);

      // Check if it's the iframe permissions error
      if (error.name === 'PaymentMethodUnsupportedError' || error.message?.includes('Permissions-Policy')) {
        notify.error('Google Pay is not available in preview mode. It will work on your live site.');
        // Hide Google Pay button since it won't work in iframe
        setGooglePayLoaded(false);
      } else {
        notify.error(error.message || 'Google Pay payment failed');
      }
      setProcessing(false);
    }
  };

  const handleEwayMessage = async (event: MessageEvent) => {
    // Accept messages from both sandbox and production eWay
    const isEwayOrigin = event.origin === 'https://secure.ewaypayments.com' || 
                         event.origin === 'https://secure-au.sandbox.ewaypayments.com' ||
                         event.origin.includes('ewaypayments.com');
    
    if (!isEwayOrigin) {
      return;
    }
    
    const data = event.data;
    logger.info('eWay payment message received', { origin: event.origin });
    logger.debug('eWay message data', data);
    
    // Parse eWay response format: "ID:12345,AC:accesscode..."
    if (typeof data === 'string' && data.includes('ID:') && data.includes('AC:')) {
      setProcessing(true);
      
      try {
        // Extract transaction ID from the format "ID:12345,AC:..."
        const transactionId = data.split(',')[0].replace('ID:', '');
        logger.info('Extracted transaction ID', { transactionId });
        
        // Check if order has age-restricted items
        const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);
        
        const orderData = {
          customerId: customer?.id || null,
          amount: total,
          currency: 'AUD',
          status: 'COMPLETED',
          customerDetails: shippingForm,
          cart: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            code: item.product.code,
            image: item.product.image,
            quantity: item.quantity,
            price: getItemPrice(item),
            ageRestricted: item.product.ageRestricted || false,
          })),
          originalSubtotal,
          appliedSpecials: bogoResult?.appliedSpecials || [],
          bogoDiscount,
          subtotal,
          gst,
          shipping,
          voucherCode: appliedVoucher?.code || null,
          voucherDiscount: voucherDiscount,
          total,
          paymentMethod: 'eWay',
          shippingMethod: usePickup ? 'pickup' : requiresShippingQuote ? 'quote' : shippingMethod,
          usePickup,
          pickupLocation: usePickup ? (() => {
            const loc = pickupLocations.find(l => l.id === selectedPickupLocation);
            return loc ? `${loc.name} - ${loc.address}` : selectedPickupLocation;
          })() : null,
          completedAt: new Date().toISOString(),
          ewayTransactionId: transactionId,
          ageVerificationRequired: hasAgeRestrictedItems,
          ageVerifiedAt: hasAgeRestrictedItems ? new Date().toISOString() : null,
          ageVerifiedDOB: hasAgeRestrictedItems ? verifiedDOB : null,
        };
        
        logger.debug('Sending order data to server');
        
        const response = await fetch(`${API_URL}/payment/eway/store-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(orderData),
        });
        
        logger.debug('Server response received', { status: response.status });
        const result = await response.json();
        logger.debug('Server response data', result);

        if (!response.ok) {
          throw new Error(result.error || 'Failed to store order');
        }

        if (result.success && result.orderId) {
          await recordVoucherUsage(result.orderId);
          clearCart();
          navigate(`/order/${result.orderId}`);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Failed to store eWay order:', error);
        alert('Payment successful but failed to store order. Please contact support with this error: ' + error.message);
        setProcessing(false);
      }
    } else if (data.payment === 'success') {
      // Handle alternative JSON format (if eWay uses it)
      setProcessing(true);
      
      try {
        // Check if order has age-restricted items
        const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);
        
        const orderData = {
          customerId: customer?.id || null,
          amount: total,
          currency: 'AUD',
          status: 'COMPLETED',
          customerDetails: shippingForm,
          cart: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            code: item.product.code,
            image: item.product.image,
            quantity: item.quantity,
            price: getItemPrice(item),
            ageRestricted: item.product.ageRestricted || false,
          })),
          originalSubtotal,
          appliedSpecials: bogoResult?.appliedSpecials || [],
          bogoDiscount,
          subtotal,
          gst,
          shipping,
          voucherCode: appliedVoucher?.code || null,
          voucherDiscount: voucherDiscount,
          total,
          paymentMethod: 'eWay',
          shippingMethod: usePickup ? 'pickup' : requiresShippingQuote ? 'quote' : shippingMethod,
          usePickup,
          pickupLocation: usePickup ? (() => {
            const loc = pickupLocations.find(l => l.id === selectedPickupLocation);
            return loc ? `${loc.name} - ${loc.address}` : selectedPickupLocation;
          })() : null,
          completedAt: new Date().toISOString(),
          ewayTransactionId: data.transactionID || '',
          ageVerificationRequired: hasAgeRestrictedItems,
          ageVerifiedAt: hasAgeRestrictedItems ? new Date().toISOString() : null,
          ageVerifiedDOB: hasAgeRestrictedItems ? verifiedDOB : null,
        };

        const response = await fetch(`${API_URL}/payment/eway/store-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(orderData),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to store order');
        }
        
        if (result.success && result.orderId) {
          await recordVoucherUsage(result.orderId);
          clearCart();
          navigate(`/order/${result.orderId}`);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Failed to store eWay order:', error);
        alert('Payment successful but failed to store order. Please contact support with this error: ' + error.message);
        setProcessing(false);
      }
    } else if (data.payment === 'error' || data.payment === 'cancelled') {
      alert('Payment was cancelled or failed. Please try again.');
      setProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-slate-100 size-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="size-12 text-slate-400" />
          </div>
          <h1 className="text-3xl mb-4 font-bold">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Add items to your cart before proceeding to checkout
          </p>
          <Link to="/products">
            <Button size="lg" className="bg-[#E31837] hover:bg-[#E31837]/90">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-10 w-full max-w-[100vw] overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8 w-full">
          <Link to="/cart" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors mb-3 group">
            <ArrowLeft className="size-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Cart
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Checkout</h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">
              <Lock className="size-3 text-green-600" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center max-w-sm mx-auto md:max-w-md">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center size-9 rounded-full text-sm font-bold border-2 transition-all ${
                step === 'auth' ? 'bg-[#E31837] border-[#E31837] text-white shadow-md shadow-red-200' :
                (step === 'shipping' || step === 'payment') ? 'bg-[#E31837] border-[#E31837] text-white' :
                'bg-white border-slate-300 text-slate-400'
              }`}>
                {(step === 'shipping' || step === 'payment') ? <CheckCircle2 className="size-5" /> : '1'}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${step === 'auth' ? 'text-[#E31837]' : (step === 'shipping' || step === 'payment') ? 'text-slate-700' : 'text-slate-400'}`}>Account</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${step === 'shipping' || step === 'payment' ? 'bg-[#E31837]' : 'bg-slate-200'}`} />
            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center size-9 rounded-full text-sm font-bold border-2 transition-all ${
                step === 'shipping' || step === 'age-verification' ? 'bg-[#E31837] border-[#E31837] text-white shadow-md shadow-red-200' :
                step === 'payment' ? 'bg-[#E31837] border-[#E31837] text-white' :
                'bg-white border-slate-300 text-slate-400'
              }`}>
                {step === 'payment' ? <CheckCircle2 className="size-5" /> : '2'}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${(step === 'shipping' || step === 'age-verification') ? 'text-[#E31837]' : step === 'payment' ? 'text-slate-700' : 'text-slate-400'}`}>Delivery</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${step === 'payment' ? 'bg-[#E31837]' : 'bg-slate-200'}`} />
            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center size-9 rounded-full text-sm font-bold border-2 transition-all ${
                step === 'payment' ? 'bg-[#E31837] border-[#E31837] text-white shadow-md shadow-red-200' :
                'bg-white border-slate-300 text-slate-400'
              }`}>
                3
              </div>
              <span className={`text-xs mt-1.5 font-medium ${step === 'payment' ? 'text-[#E31837]' : 'text-slate-400'}`}>Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 overflow-x-hidden items-start">
          {/* Main Form */}
          <div className="lg:col-span-2 w-full space-y-4">
            {/* Auth Step */}
            {step === 'auth' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">How would you like to continue?</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Sign in for faster checkout or continue as a guest</p>
                </div>
                <div className="p-6">
                  <Tabs value={checkoutType} onValueChange={(value: any) => setCheckoutType(value)}>
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl h-auto">
                      <TabsTrigger value="guest" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Users className="size-4 mr-2" />
                        Guest
                      </TabsTrigger>
                      <TabsTrigger value="login" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <User className="size-4 mr-2" />
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="register" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <UserPlus className="size-4 mr-2" />
                        Register
                      </TabsTrigger>
                    </TabsList>

                    {/* Guest Checkout */}
                    <TabsContent value="guest" className="space-y-4 mt-5">
                      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                        <CheckCircle2 className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                          No account needed. You can still track your order via the confirmation email we send you.
                        </p>
                      </div>
                      <Button onClick={handleGuestCheckout} size="lg" className="w-full bg-[#E31837] hover:bg-[#E31837]/90 h-12 text-base font-semibold rounded-xl">
                        Continue as Guest
                      </Button>
                    </TabsContent>

                    {/* Login */}
                    <TabsContent value="login" className="mt-5">
                      <form onSubmit={handleLogin} className="space-y-4">
                        {authError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-sm">
                            {authError}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">Email address</Label>
                          <Input
                            id="login-email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="h-11 rounded-xl border-slate-200 focus:border-[#E31837] focus:ring-[#E31837]/20"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="h-11 rounded-xl border-slate-200 focus:border-[#E31837] focus:ring-[#E31837]/20"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                          />
                        </div>
                        <Button type="submit" disabled={processing} size="lg" className="w-full bg-[#E31837] hover:bg-[#E31837]/90 h-12 text-base font-semibold rounded-xl">
                          {processing ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
                          Sign In & Continue
                        </Button>
                      </form>
                    </TabsContent>

                    {/* Register */}
                    <TabsContent value="register" className="mt-5">
                      <form onSubmit={handleRegister} className="space-y-4">
                        {authError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-sm">
                            {authError}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-firstName" className="text-sm font-medium text-slate-700">First Name</Label>
                            <Input
                              id="reg-firstName"
                              required
                              placeholder="John"
                              className="h-11 rounded-xl border-slate-200"
                              value={registerForm.firstName}
                              onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-lastName" className="text-sm font-medium text-slate-700">Last Name</Label>
                            <Input
                              id="reg-lastName"
                              required
                              placeholder="Smith"
                              className="h-11 rounded-xl border-slate-200"
                              value={registerForm.lastName}
                              onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">Email address</Label>
                          <Input
                            id="reg-email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="h-11 rounded-xl border-slate-200"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                          <Input
                            id="reg-phone"
                            type="tel"
                            required
                            placeholder="04XX XXX XXX"
                            className="h-11 rounded-xl border-slate-200"
                            value={registerForm.phone}
                            onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-password" className="text-sm font-medium text-slate-700">Password</Label>
                          <Input
                            id="reg-password"
                            type="password"
                            required
                            placeholder="Min. 8 characters"
                            className="h-11 rounded-xl border-slate-200"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-confirm" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                          <Input
                            id="reg-confirm"
                            type="password"
                            required
                            placeholder="Re-enter password"
                            className="h-11 rounded-xl border-slate-200"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                          />
                        </div>
                        <Button type="submit" disabled={processing} size="lg" className="w-full bg-[#E31837] hover:bg-[#E31837]/90 h-12 text-base font-semibold rounded-xl">
                          {processing ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
                          Register & Continue
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {/* Shipping Step */}
            {step === 'shipping' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <div className="size-8 rounded-full bg-[#E31837]/10 flex items-center justify-center">
                      <MapPin className="size-4 text-[#E31837]" />
                    </div>
                    Delivery Information
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5 ml-10">Where should we send your order?</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleShippingSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">First Name <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="firstName"
                          required
                          placeholder="John"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.firstName}
                          onChange={(e) => setShippingForm({...shippingForm, firstName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last Name <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="lastName"
                          required
                          placeholder="Smith"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.lastName}
                          onChange={(e) => setShippingForm({...shippingForm, lastName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder="you@example.com"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.email}
                          onChange={(e) => setShippingForm({...shippingForm, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          placeholder="04XX XXX XXX"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.phone}
                          onChange={(e) => setShippingForm({...shippingForm, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-sm font-medium text-slate-700">Street Address <span className="text-[#E31837]">*</span></Label>
                      <Input
                        id="address"
                        required
                        placeholder="123 Main Street"
                        className="h-11 rounded-xl border-slate-200"
                        value={shippingForm.address}
                        onChange={(e) => setShippingForm({...shippingForm, address: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-sm font-medium text-slate-700">City / Suburb <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="city"
                          required
                          placeholder="Perth"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm({...shippingForm, city: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="state" className="text-sm font-medium text-slate-700">State <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="state"
                          required
                          placeholder="WA"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.state}
                          onChange={(e) => setShippingForm({...shippingForm, state: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="postcode" className="text-sm font-medium text-slate-700">Postcode <span className="text-[#E31837]">*</span></Label>
                        <Input
                          id="postcode"
                          required
                          placeholder="6000"
                          className="h-11 rounded-xl border-slate-200"
                          value={shippingForm.postcode}
                          onChange={(e) => setShippingForm({...shippingForm, postcode: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Shipping Calculation Status */}
                    {!usePickup && calculatingShipping && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3">
                        <Loader2 className="size-5 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-900">Calculating shipping cost for your location...</span>
                      </div>
                    )}

                    {/* Heavy Item Warning - Requires Quote */}
                    {!usePickup && requiresShippingQuote && (
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Package className="size-6 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-amber-900 text-lg mb-2">
                              ⚠️ Shipping Quote Required
                            </h3>
                            <p className="text-sm text-amber-800 mb-3">
                              This order contains heavy items that require a custom shipping quote:
                            </p>
                            <ul className="list-disc list-inside text-sm text-amber-800 mb-3 space-y-1">
                              {quoteCategories.map((cat, i) => (
                                <li key={i}><strong>{cat}</strong></li>
                              ))}
                            </ul>
                            <div className="bg-white/50 p-3 rounded border border-amber-300">
                              <p className="text-sm text-amber-900 font-medium">
                                📧 We will send you a shipping quote within 24 hours via email.
                              </p>
                              <p className="text-sm text-amber-800 mt-1">
                                Please proceed with payment of your order. You'll be invoiced separately for shipping once we calculate the freight costs.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shipping Calculation Result */}
                    {!usePickup && shippingCalculated && !requiresShippingQuote && shippingZone && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Truck className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900 mb-1">
                              Shipping to {shippingZone}
                            </p>
                            <p className="text-sm text-green-800">
                              {shippingMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Pickup Option */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <input
                          type="checkbox"
                          id="usePickup"
                          checked={usePickup}
                          onChange={(e) => {
                            setUsePickup(e.target.checked);
                            if (e.target.checked) {
                              // Reset shipping cost to free when pickup is selected
                              setShippingCost(0);
                              setShippingCalculated(true);
                              setShippingMethod('pickup');
                            } else {
                              // Reset to original shipping method
                              setShippingMethod('standard');
                              setSelectedPickupLocation('');
                              // Reset shipping calculation state
                              setShippingCalculated(false);
                              setShippingCost(0);
                              setShippingZone('');
                              setShippingMessage('');
                              setRequiresShippingQuote(false);
                              setQuoteCategories([]);
                              // Recalculate shipping
                              if (shippingForm.postcode && shippingForm.postcode.length >= 4) {
                                calculateShippingCost();
                              }
                            }
                          }}
                          className="mt-1 size-4 rounded"
                        />
                        <div className="flex-1">
                          <Label htmlFor="usePickup" className="text-base font-semibold cursor-pointer">
                            🎉 Free Pickup Available
                          </Label>
                          <p className="text-sm text-blue-800 mt-1">
                            Save on shipping! Pick up your order from one of our locations.
                          </p>
                          <p className="text-xs text-blue-700 mt-2 font-medium">
                            ⚠️ Please read our <Link to="/terms-and-conditions" target="_blank" className="underline hover:text-blue-900">pickup terms and conditions</Link> before selecting this option.
                          </p>
                        </div>
                      </div>

                      {/* Pickup Location Selection */}
                      {usePickup && (
                        <div className="space-y-3 pl-7">
                          <Label className="text-base font-semibold">Select Pickup Location *</Label>
                          
                          {loadingPickupLocations ? (
                            <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                              <Loader2 className="size-5 animate-spin text-[#E31837]" />
                              <span className="text-sm text-muted-foreground">Loading pickup locations for {shippingForm.state}...</span>
                            </div>
                          ) : pickupLocations.length === 0 ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-sm text-amber-800">
                                {shippingForm.state 
                                  ? `No pickup locations available in ${shippingForm.state}. Please use standard shipping or contact us.`
                                  : 'Please enter your state to see available pickup locations.'
                                }
                              </p>
                            </div>
                          ) : (
                            <RadioGroup 
                              value={selectedPickupLocation} 
                              onValueChange={setSelectedPickupLocation}
                              required={usePickup}
                            >
                              {pickupLocations.map((location) => (
                                <div 
                                  key={location.id}
                                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                                    selectedPickupLocation === location.id 
                                      ? 'border-[#E31837] bg-red-50' 
                                      : 'border-gray-200 hover:border-[#E31837]'
                                  }`}
                                >
                                  <RadioGroupItem value={location.id} id={`location-${location.id}`} className="mt-1" />
                                  <Label htmlFor={`location-${location.id}`} className="flex-1 cursor-pointer">
                                    <p className="font-semibold text-base mb-1">{location.name}</p>
                                    <p className="text-sm text-muted-foreground mb-1">{location.address}</p>
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-medium">Hours:</span> {location.hours}
                                    </p>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}

                          {/* Pickup Instructions Notice */}
                          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <span className="text-amber-600 text-lg shrink-0">ℹ️</span>
                            <p className="text-sm text-amber-800">
                              <strong>Pickup Instructions:</strong> Detailed pickup instructions will be provided via email after your order is placed.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Terms and Conditions Acceptance - Always Required */}
                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h3 className="font-semibold text-base mb-1">Before proceeding, please review and confirm:</h3>
                      
                      {/* Terms and Conditions */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Terms and Conditions *</Label>
                        <div className="bg-white border border-gray-300 rounded-lg p-4 h-48 overflow-y-auto text-xs space-y-3">
                          {loadingLegalPages ? (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-slate-500">Loading terms and conditions...</p>
                            </div>
                          ) : termsContent ? (
                            <div dangerouslySetInnerHTML={{ __html: termsContent }} />
                          ) : (
                            // Fallback content if not in database
                            <>
                          <div>
                            <h4 className="font-semibold text-sm mb-1">1. Introduction</h4>
                            <p>Welcome to Costplus100. These terms and conditions outline the rules and regulations for the use of our website and services.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-1">2. Acceptance of Terms</h4>
                            <p>By accessing this website and placing an order, you accept these terms and conditions in full. If you disagree with any part of these terms, you must not use our website.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-1">3. Products and Services</h4>
                            <p>All products and services are subject to availability. We reserve the right to discontinue any product at any time without notice.</p>
                            <ul className="list-disc ml-5 space-y-1 mt-1">
                              <li>Product descriptions are accurate to the best of our knowledge</li>
                              <li>Images are for illustrative purposes only</li>
                              <li>Prices are subject to change without notice</li>
                              <li>All prices are in Australian Dollars (AUD) and include GST</li>
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-1">4. Orders and Payments</h4>
                            <p className="mb-1">By placing an order, you warrant that:</p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>You are legally capable of entering into binding contracts</li>
                              <li>You are at least 18 years old</li>
                              <li>The information you provide is accurate and complete</li>
                            </ul>
                            <p className="mt-2">We accept payment via credit card, debit card, and bank transfer through our secure eWay payment gateway.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-1">5. Shipping and Delivery</h4>
                            <p>Delivery times are estimates only and may vary depending on location and product availability. We ship Australia-wide with standard delivery taking 3-5 business days for most items.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-1">6. Limitation of Liability</h4>
                            <p>To the maximum extent permitted by law, Costplus100 shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-1">7. Contact Information</h4>
                            <p className="mb-1">For questions about these terms, please contact us at:</p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>Email: admin@costplus100.com.au</li>
                              <li>Phone: (08) 6165 8444</li>
                              <li>Address: Perth, Western Australia</li>
                            </ul>
                          </div>
                          </>
                          )}
                        </div>
                        
                        <div className="flex items-start gap-3 pt-2">
                          <input
                            type="checkbox"
                            id="termsAccept"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-1 size-4 rounded"
                            required
                          />
                          <Label htmlFor="termsAccept" className="text-sm cursor-pointer">
                            I have read and accept the <Link to="/terms-and-conditions" target="_blank" className="text-[#E31837] underline hover:text-[#E31837]/80">Terms and Conditions</Link> *
                          </Label>
                        </div>
                      </div>

                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" onClick={() => setStep('auth')} variant="outline" className="flex-1 h-12 rounded-xl border-slate-200">
                        <ArrowLeft className="size-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1 h-12 bg-[#E31837] hover:bg-[#E31837]/90 font-semibold rounded-xl"
                        disabled={
                          !termsAccepted ||
                          (usePickup && !selectedPickupLocation)
                        }
                      >
                        Continue to Payment
                        <ArrowLeft className="size-4 ml-2 rotate-180" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Age Verification Step */}
            {step === 'age-verification' && (
              <AgeVerification
                ageRestrictedItems={cart
                  .filter(item => item.product.ageRestricted)
                  .map(item => ({
                    id: item.product.id,
                    name: item.product.name,
                    image: item.product.images?.[0] || item.product.image,
                  }))}
                onVerified={handleAgeVerified}
                onBack={() => setStep('shipping')}
                existingDOB={customer?.dateOfBirth || verifiedDOB}
              />
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <div className="size-8 rounded-full bg-[#E31837]/10 flex items-center justify-center">
                      <Lock className="size-4 text-[#E31837]" />
                    </div>
                    Payment Method
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5 ml-10">Your payment is secured with SSL encryption</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Payment Method Selector */}
                  <div>
                    <Label className="mb-3 block text-sm font-semibold text-slate-700">Select Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      {/* eWay Option */}
                      {paymentSettings.enableEway && (
                        <div className={`flex items-start space-x-3 p-4 rounded-xl transition-colors cursor-pointer ${
                          paymentMethod === 'eway'
                            ? 'border-2 border-[#E31837] bg-red-50'
                            : 'border-2 border-slate-200 hover:border-[#E31837]/50'
                        }`}>
                          <RadioGroupItem value="eway" id="eway-payment" className="mt-1" />
                          <Label htmlFor="eway-payment" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-base mb-1">eWay Payment Gateway</p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Secure credit card payment via eWay
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Lock className="size-3" />
                                  <span>PCI DSS Compliant · Secure Encryption</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {/* eWay Verified Seal */}
                                <img
                                  alt="eWAY Payment Gateway"
                                  src="https://www.eway.com.au/developer/payment-code/verified-seal.php?img=12&size=7&theme=0"
                                  className="h-12"
                                />
                              </div>
                            </div>
                          </Label>
                        </div>
                      )}

                      {/* PayPal Option */}
                      {paymentSettings.enablePaypal && paypalClientId && (
                        <div className={`flex items-start space-x-3 p-4 rounded-xl transition-colors cursor-pointer ${
                          paymentMethod === 'paypal'
                            ? 'border-2 border-[#E31837] bg-red-50'
                            : 'border-2 border-slate-200 hover:border-[#E31837]/50'
                        }`}>
                          <RadioGroupItem value="paypal" id="paypal-payment" className="mt-1" />
                          <Label htmlFor="paypal-payment" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-base mb-1">PayPal</p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Pay with your PayPal account or credit card
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Lock className="size-3" />
                                  <span>Buyer Protection · Instant Payment</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <img
                                  src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg"
                                  alt="PayPal"
                                  className="h-8"
                                />
                              </div>
                            </div>
                          </Label>
                        </div>
                      )}

                      {/* Square Option */}
                      {paymentSettings.enableSquare && squareApplicationId && (
                        <div className={`flex items-start space-x-3 p-4 rounded-xl transition-colors cursor-pointer ${
                          paymentMethod === 'square'
                            ? 'border-2 border-[#E31837] bg-red-50'
                            : 'border-2 border-slate-200 hover:border-[#E31837]/50'
                        }`}>
                          <RadioGroupItem value="square" id="square-payment" className="mt-1" />
                          <Label htmlFor="square-payment" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-base mb-1">
                                  Square Payment
                                  {!squareLocationId && (
                                    <span className="ml-2 text-xs text-yellow-600 font-normal">(⚠️ Location ID not set)</span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Secure credit card payment via Square
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Lock className="size-3" />
                                  <span>PCI Compliant · Secure Processing</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <SquareLogoBlack className="h-8 w-auto" />
                              </div>
                            </div>
                          </Label>
                        </div>
                      )}

                      {/* Bank Transfer Option */}
                      {paymentSettings.enableBankTransfer && (
                        <div className={`flex items-start space-x-3 p-4 rounded-xl transition-colors cursor-pointer ${
                          paymentMethod === 'bank-transfer'
                            ? 'border-2 border-[#E31837] bg-red-50'
                            : 'border-2 border-slate-200 hover:border-[#E31837]/50'
                        }`}>
                          <RadioGroupItem value="bank-transfer" id="bank-transfer" className="mt-1" />
                          <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-base mb-1">Bank Transfer / Direct Deposit</p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Pay directly to our bank account
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                    Pay within 3 days
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Manual verification
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* eWay Payment Section */}
                  {paymentMethod === 'eway' && (
                    <div>
                      <div className="bg-green-50 p-4 rounded-xl mb-4 border border-green-200 flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-800 font-medium">
                          Click the button below to pay securely with eWay.
                        </p>
                      </div>
                      {!ewayPublicKey ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="size-6 animate-spin text-[#E31837] mr-2" />
                          <span className="text-muted-foreground">Loading payment gateway...</span>
                        </div>
                      ) : (
                        <div ref={ewayButtonRef} className="min-h-[60px]"></div>
                      )}
                    </div>
                  )}

                  {/* PayPal Payment Section */}
                  {paymentMethod === 'paypal' && (
                    <div>
                      <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200 flex items-center gap-3">
                        <CreditCard className="size-5 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-800 font-medium">
                          Complete your payment with PayPal
                        </p>
                      </div>
                      {!paypalClientId ? (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            PayPal is not configured. Please contact support.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {!paypalLoaded && (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="size-6 animate-spin text-[#E31837] mr-2" />
                              <span className="text-muted-foreground">Loading PayPal...</span>
                            </div>
                          )}
                          <div ref={paypalButtonRef} className="min-h-[120px]" style={{ display: paypalLoaded ? 'block' : 'none' }}></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Square Payment Section */}
                  {paymentMethod === 'square' && (
                    <div>
                      <div className="bg-purple-50 p-4 rounded-xl mb-4 border border-purple-200">
                        <p className="text-sm text-purple-800 font-medium mb-1.5">
                          Choose your payment method below
                        </p>
                        <p className="text-xs text-purple-700">
                          {squareLocationId ? (
                            <>Australian 4-digit postcode format enabled. {shippingForm?.address && shippingForm?.city && `Billing: ${shippingForm.address}, ${shippingForm.city}, ${shippingForm.state} ${shippingForm.postcode}`}</>
                          ) : (
                            <>⚠️ Using US format (5-digit ZIP). For Australian 4-digit postcodes, add SQUARE_LOCATION_ID to environment.</>
                          )}
                        </p>
                      </div>
                      {!squareApplicationId ? (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                          <p className="text-sm text-red-800 font-semibold mb-2">
                            Square Application ID is not configured.
                          </p>
                          <p className="text-xs text-red-700">
                            Please add SQUARE_APPLICATION_ID to environment variables.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {/* Warning if Location ID is missing */}
                          {!squareLocationId && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                              <p className="text-sm text-yellow-800 font-semibold mb-1">
                                ⚠️ Warning: Australian postcode support not enabled
                              </p>
                              <p className="text-xs text-yellow-700 mb-2">
                                Square Location ID is missing. The card form will expect US 5-digit ZIP codes instead of Australian 4-digit postcodes.
                              </p>
                              <p className="text-xs text-yellow-700">
                                To fix: Add <code className="bg-yellow-100 px-1 py-0.5 rounded">SQUARE_LOCATION_ID</code> to environment variables with an Australian location.
                              </p>
                            </div>
                          )}
                          {squareLoaded && squareSandboxMode && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                              <p className="text-xs text-amber-800">
                                🧪 <strong>TEST MODE:</strong> Use test card <code className="bg-amber-100 px-1 rounded">4111 1111 1111 1111</code> (any future expiry, any CVV)
                              </p>
                            </div>
                          )}

                          <div className="relative">
                            {!squareLoaded && (
                              <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center py-8">
                                <Loader2 className="size-6 animate-spin text-purple-600 mr-2" />
                                <span className="text-muted-foreground">Loading Square payment form...</span>
                              </div>
                            )}

                            <Tabs defaultValue="card" className="w-full">
                              <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl h-auto">
                                <TabsTrigger value="card" className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                  <CreditCard className="size-4" />
                                  <span>Credit/Debit Card</span>
                                </TabsTrigger>
                                <TabsTrigger
                                  value="googlepay"
                                  className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                  disabled={!googlePayLoaded}
                                >
                                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                  </svg>
                                  <span>Google Pay</span>
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="card" forceMount className="data-[state=inactive]:hidden space-y-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                  <p className="text-xs text-slate-600">
                                    Enter your card number, expiry date (MM/YY), and CVV in the fields below.
                                  </p>
                                </div>
                                {/* Square card form container - SDK attaches directly here */}
                                <div ref={squareCardRef} id="square-card-container" className="min-h-[120px] mb-2"></div>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                  <p className="text-xs text-blue-700">
                                    <strong>Note:</strong> If the form shows a ZIP field, enter your Australian postcode: <strong>{shippingForm.postcode}</strong>
                                  </p>
                                </div>
                                <Button
                                  onClick={handleSquarePayment}
                                  disabled={processing || !squareLoaded}
                                  className="w-full h-12 bg-[#E31837] hover:bg-[#E31837]/90 text-white font-semibold rounded-xl"
                                >
                                  {processing ? (
                                    <>
                                      <Loader2 className="size-4 mr-2 animate-spin" />
                                      Processing Payment...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="size-4 mr-2" />
                                      Pay ${total.toFixed(2)} with Card
                                    </>
                                  )}
                                </Button>
                              </TabsContent>

                              <TabsContent value="googlepay" forceMount className="data-[state=inactive]:hidden space-y-4">
                                {!googlePayLoaded ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                                    <p className="text-sm text-slate-600">
                                      ℹ️ Google Pay will be available on your live site (not available in preview mode)
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                                      <p className="text-xs text-slate-700">
                                        🚀 Click the button below to pay securely with Google Pay
                                      </p>
                                    </div>
                                    <Button
                                      onClick={handleGooglePayPayment}
                                      disabled={processing}
                                      className="w-full bg-black hover:bg-gray-800 text-white"
                                    >
                                      {processing ? (
                                        <>
                                          <Loader2 className="size-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="size-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                          </svg>
                                          Pay ${total.toFixed(2)} with Google Pay
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Payment Section */}
                  {paymentMethod === 'bank-transfer' && (
                    <div>
                      <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200">
                        <p className="text-sm text-blue-800 font-semibold mb-1.5">Bank Transfer Instructions</p>
                        <p className="text-xs text-blue-700">
                          Your order will be created with a unique Order ID. Please transfer the exact amount to the bank details below and use your Order ID as the payment reference.
                        </p>
                      </div>

                      {bankDetails ? (
                        <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
                          <div className="bg-blue-50 px-5 py-3 border-b border-blue-200">
                            <p className="text-sm font-semibold text-blue-900">Bank Account Details</p>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Bank Name</p>
                                <p className="font-semibold">{bankDetails.bankName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Account Name</p>
                                <p className="font-semibold">{bankDetails.accountName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">BSB</p>
                                <p className="font-semibold font-mono">{bankDetails.bsb}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Account Number</p>
                                <p className="font-semibold font-mono">{bankDetails.accountNumber}</p>
                              </div>
                            </div>
                            <Separator />
                            <div className="bg-amber-50 p-3 rounded border border-amber-200">
                              <p className="text-xs font-semibold text-amber-900 mb-1">⚠️ Important Payment Reference</p>
                              <p className="text-xs text-amber-800">
                                {bankDetails.reference || 'Please use your Order ID as the payment reference when making the transfer.'}
                              </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded text-xs text-muted-foreground">
                              <p className="font-medium mb-1">What happens next?</p>
                              <ol className="list-decimal list-inside space-y-1">
                                <li>Click "Place Order" below to create your order</li>
                                <li>You'll receive an Order ID and confirmation email</li>
                                <li>Transfer the exact amount within 3 business days</li>
                                <li>We'll process your order once payment is verified</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="size-6 animate-spin text-[#E31837] mr-2" />
                          <span className="text-muted-foreground">Loading bank details...</span>
                        </div>
                      )}

                      {bankDetails && (
                        <Button
                          onClick={handleBankTransferOrder}
                          disabled={processing}
                          size="lg"
                          className="w-full mt-4 h-12 bg-[#E31837] hover:bg-[#E31837]/90 font-semibold rounded-xl"
                        >
                          {processing ? (
                            <>
                              <Loader2 className="size-5 animate-spin mr-2" />
                              Creating Order...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-5 mr-2" />
                              Place Order - Bank Transfer
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => setStep('shipping')}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-slate-200 text-slate-600"
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Back to Shipping
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-4">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Order Summary</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {cart.map((item) => {
                    // getItemPrice already handles ALL pricing (promo, cost, VIP, multibuy, regular)
                    const effectivePrice = getItemPrice(item);
                    const hasPromo = !!(item.product as any).promotionalPrice;
                    const hasCostPrice = !hasPromo && canBuyAtCostPrice && item.product.costPrice;
                    const hasVipDiscount = !hasPromo && !hasCostPrice && discountPercentage > 0;

                    return (
                      <div key={item.product.id} className="flex gap-3">
                        <div className="relative size-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                          <Badge className="absolute -top-1 -right-1 size-6 flex items-center justify-center p-0 bg-[#2D3748]">
                            {item.quantity}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{item.product.name}</p>
                          {(hasPromo || hasCostPrice || hasVipDiscount) && effectivePrice < item.product.price ? (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground line-through">
                                ${item.product.price.toFixed(2)}
                              </p>
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-semibold text-green-700">
                                  ${effectivePrice.toFixed(2)}
                                </p>
                                {hasPromo && (
                                  <Badge className="bg-[#E31837] hover:bg-[#E31837] text-[9px] px-1 py-0">
                                    PROMO
                                  </Badge>
                                )}
                                {hasCostPrice && (
                                  <Badge className="bg-amber-600 hover:bg-amber-600 text-[9px] px-1 py-0">
                                    COST
                                  </Badge>
                                )}
                                {hasVipDiscount && (
                                  <Badge className="bg-green-600 hover:bg-green-600 text-[9px] px-1 py-0">
                                    VIP
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              ${effectivePrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${originalSubtotal.toFixed(2)}</span>
                  </div>

                  {/* Show customer pricing note */}
                  {canBuyAtCostPrice && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px]">COST PRICE</Badge>
                        <span className="text-xs text-amber-800">
                          You're buying at cost price
                        </span>
                      </div>
                    </div>
                  )}
                  {!canBuyAtCostPrice && discountPercentage > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">VIP -{discountPercentage}%</Badge>
                        <span className="text-xs text-green-800">
                          Your VIP discount applied
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show applied BOGO specials */}
                  {bogoResult && bogoResult.appliedSpecials.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-700">Applied Specials:</p>
                        {bogoResult.appliedSpecials.map((special, index) => (
                          <div key={index} className="flex justify-between text-sm bg-green-50 p-2 rounded">
                            <span className="text-green-800 text-xs flex-1">{special.description}</span>
                            <span className="text-green-700 font-medium ml-2">-${special.discountAmount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-green-700">Total Savings</span>
                        <span className="text-green-700">-${bogoDiscount.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal After Specials</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (10%)</span>
                    <span className="font-medium">${gst.toFixed(2)}</span>
                  </div>
                  {/* Show shipping when either calculated OR pickup is selected */}
                  {(shippingCalculated || usePickup) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {usePickup ? 'Pickup' : 'Shipping'}
                      </span>
                      <span className="font-medium">
                        {usePickup ? (
                          <span className="text-green-600 font-semibold">FREE</span>
                        ) : requiresShippingQuote ? (
                          <span className="text-amber-600">Quote Required</span>
                        ) : shipping === 0 ? (
                          <span className="text-green-600 font-semibold">FREE</span>
                        ) : (
                          `$${shipping.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  )}
                  {!usePickup && requiresShippingQuote && (
                    <div className="bg-amber-50 p-2 rounded text-xs text-amber-800">
                      Shipping quote to be provided within 24hrs
                    </div>
                  )}
                  {usePickup && selectedPickupLocation && (
                    <div className="bg-green-50 p-2 rounded text-xs text-green-800">
                      <strong>Pickup from:</strong> {pickupLocations.find(loc => loc.id === selectedPickupLocation)?.name}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Voucher Code Section - Not available for Cost+$100 customers */}
                {step === 'payment' && !customer?.cost_plus_hundred_access && (
                  <div className="space-y-3">
                    {!appliedVoucher ? (
                      <div className="space-y-2">
                        <Label htmlFor="voucherCode" className="text-xs font-medium text-slate-600">Have a voucher code?</Label>
                        <div className="flex gap-2">
                          <Input
                            id="voucherCode"
                            placeholder="Enter code"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleApplyVoucher()}
                            disabled={voucherLoading}
                            className="h-10 rounded-xl border-slate-200 text-sm font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleApplyVoucher}
                            disabled={voucherLoading || !voucherCode.trim()}
                            className="whitespace-nowrap h-10 rounded-xl border-slate-200 text-sm font-medium"
                          >
                            {voucherLoading ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
                          </Button>
                        </div>
                        {voucherError && (
                          <p className="text-xs text-red-600">{voucherError}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Voucher Discount</span>
                          <span className="font-medium text-green-600">
                            -${appliedVoucher.discountAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Ticket className="size-4 text-green-700" />
                            <span className="text-sm font-mono font-semibold text-green-800">
                              {appliedVoucher.code}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveVoucher}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                    <Separator />
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-[#E31837]">${total.toFixed(2)}</span>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="size-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-slate-600">Secure Checkout</span>
                  </div>
                  <div className="flex items-center justify-center">
                    {paymentMethod === 'square' ? (
                      <SquareLogoBlack className="h-6 w-auto" />
                    ) : paymentMethod === 'paypal' ? (
                      <img
                        src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg"
                        alt="PayPal"
                        className="h-6 w-auto"
                      />
                    ) : paymentMethod === 'eway' ? (
                      <img
                        alt="eWAY Payment Gateway"
                        src="https://www.eway.com.au/developer/payment-code/verified-seal.php?img=12&size=7&theme=0"
                        className="h-8 w-auto"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Powered by secure payment gateway</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}