import { Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { SEOHead } from '../components/SEOHead';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    try {
      logger.debug('Submitting contact form', { name: formData.name, email: formData.email });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/contact/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`, // Add auth header for Supabase Edge Functions
          },
          body: JSON.stringify(formData),
        }
      );
      
      logger.debug('Contact form response received', { status: response.status });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to send message');
      }
      
      // Check if there's a note about email configuration
      if (data.note) {
        logger.warn('Email configuration note', { note: data.note });
      }
      
      setSubmitStatus('success');
      notify.success('Message Sent!', 'We\'ll get back to you shortly.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      logger.error('Contact form submission failed', error);
      setSubmitStatus('error');
      const errMsg = error instanceof Error ? error.message : 'Failed to send message';
      setErrorMessage(errMsg);
      notify.error('Failed to Send Message', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Contact Us | Cost Plus 100 Catering Equipment"
        description="Contact Cost Plus 100 for commercial catering equipment quotes. Phone 1300 503 043 or email admin@costplus100.com.au. Fast response. Australia-wide delivery."
        keywords="contact catering equipment supplier, commercial kitchen equipment quote, catering supplies Australia enquiry"
        canonical="https://costplus100.com.au/contact"
      />
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 md:py-16">
        <h1 className="text-3xl md:text-4xl mb-6 md:mb-8 text-center font-bold text-[#2D3748]">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input 
                    id="name" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input 
                    id="subject" 
                    required 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea 
                    id="message" 
                    rows={5} 
                    required 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                
                {submitStatus === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
                    Thank you for your message! We will get back to you soon.
                  </div>
                )}
                
                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                    <p className="font-semibold mb-2">Unable to send email</p>
                    <p className="text-sm">{errorMessage || 'Failed to send message. Please try again.'}</p>
                    {errorMessage?.includes('configuration') && (
                      <p className="text-xs mt-2 text-red-700">
                        📧 Admin: Please configure email settings in <strong>Admin → Email Settings</strong>
                      </p>
                    )}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#E31837] hover:bg-[#E31837]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Mail className="size-6 text-[#E31837] mt-1" />
                  <div>
                    <h3 className="mb-2 font-semibold text-[#2D3748]">Email</h3>
                    <a 
                      href="mailto:info@costplus100.com.au" 
                      className="text-[#E31837] hover:underline font-medium block"
                    >
                      info@costplus100.com.au
                    </a>
                    <p className="text-sm text-muted-foreground mt-2">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <MapPin className="size-6 text-[#E31837] mt-1" />
                  <div>
                    <h3 className="mb-2 font-semibold text-[#2D3748]">Pickup Locations</h3>
                    <p className="text-muted-foreground">
                      You can pickup your ordered stock at<br />
                      <strong>Nisbets</strong> in any location across Australia
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Contact us for your nearest location
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-[#2D3748] to-slate-700 text-white">
              <CardContent className="p-6">
                <h3 className="mb-2 font-semibold text-lg">Need Help Choosing Equipment?</h3>
                <p className="mb-4 text-slate-200">
                  Our catering equipment specialists are here to help you find the perfect 
                  equipment for your commercial kitchen needs.
                </p>
                <a 
                  href="mailto:info@costplus100.com.au"
                  className="inline-block"
                >
                  <Button 
                    variant="secondary" 
                    className="bg-[#E31837] hover:bg-[#c41530] text-white border-0"
                  >
                    Get Expert Advice
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}