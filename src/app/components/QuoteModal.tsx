import { useState } from 'react';
import { X, Phone, Plus, Trash2, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const ENQUIRY_TYPES = [
  'Product Quote',
  'Bulk / Wholesale Order',
  'Product Availability',
  'Lead Time Enquiry',
  'Technical Specification',
  'After-Sales / Warranty',
  'General Enquiry',
];

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  prefillCode?: string;
  prefillProductName?: string;
}

export function QuoteModal({ open, onClose, prefillCode, prefillProductName }: QuoteModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    enquiryType: ENQUIRY_TYPES[0],
    message: '',
  });
  const [productCodes, setProductCodes] = useState<string[]>(prefillCode ? [prefillCode] : ['']);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const addCodeRow = () => setProductCodes(prev => [...prev, '']);

  const updateCode = (index: number, value: string) => {
    setProductCodes(prev => prev.map((c, i) => (i === index ? value : c)));
  };

  const removeCode = (index: number) => {
    setProductCodes(prev => prev.length === 1 ? [''] : prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const filledCodes = productCodes.filter(c => c.trim());
    const codesBlock = filledCodes.length
      ? `\n\nProduct Codes:\n${filledCodes.map(c => `  • ${c.trim()}`).join('\n')}`
      : '';

    const productNameBlock = prefillProductName
      ? `\n\nProduct: ${prefillProductName}`
      : '';

    const body = {
      name: form.name,
      email: form.email,
      subject: `[Quote Request] ${form.enquiryType}`,
      message: `Phone: ${form.phone || 'Not provided'}${productNameBlock}${codesBlock}\n\nEnquiry Type: ${form.enquiryType}\n\n${form.message}`,
    };

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/contact/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send quote request');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSubmitted(false);
      setError('');
      setForm({ name: '', email: '', phone: '', enquiryType: ENQUIRY_TYPES[0], message: '' });
      setProductCodes(prefillCode ? [prefillCode] : ['']);
      onClose();
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-[#E31837] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">Get a Quote</h2>
            <p className="text-red-200 text-xs mt-0.5">We'll reply within 1 business day</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="size-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Quote Request Sent!</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                We've received your enquiry and will get back to you within 1 business day with your{' '}
                <span className="font-semibold text-[#E31837]">Costplus $100</span> price.
              </p>
              <div className="mt-2 p-4 bg-slate-50 rounded-xl border text-sm text-slate-600">
                <p className="font-medium mb-1">Want an immediate answer?</p>
                <a href="tel:1800151654" className="flex items-center justify-center gap-2 text-[#E31837] font-black text-lg">
                  <Phone className="size-5" />
                  1-800-151-654
                </a>
              </div>
              <Button onClick={handleClose} className="mt-2 bg-[#E31837] hover:bg-[#C41230]">
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="q-name" className="text-sm font-semibold">Name *</Label>
                  <Input
                    id="q-name"
                    required
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-email" className="text-sm font-semibold">Email *</Label>
                  <Input
                    id="q-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>

              {/* Phone + Enquiry Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="q-phone" className="text-sm font-semibold">Phone</Label>
                  <Input
                    id="q-phone"
                    type="tel"
                    placeholder="04xx xxx xxx"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-type" className="text-sm font-semibold">Enquiry Type *</Label>
                  <select
                    id="q-type"
                    required
                    value={form.enquiryType}
                    onChange={e => setForm(f => ({ ...f, enquiryType: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {ENQUIRY_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Codes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Product Codes</Label>
                  <span className="text-xs text-slate-400">Enter codes from the product page</span>
                </div>
                <div className="space-y-2">
                  {productCodes.map((code, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-semibold">
                          #
                        </span>
                        <Input
                          placeholder={`e.g. CP-1234${i > 0 ? `, CP-567${i}` : ''}`}
                          value={code}
                          onChange={e => updateCode(i, e.target.value)}
                          className="pl-7 font-mono text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCode(i)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded"
                        aria-label="Remove code"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCodeRow}
                  className="flex items-center gap-1.5 text-xs text-[#E31837] hover:text-[#C41230] font-semibold transition-colors mt-1"
                >
                  <Plus className="size-3.5" />
                  Add another code
                </button>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="q-message" className="text-sm font-semibold">Message</Label>
                <Textarea
                  id="q-message"
                  placeholder="Any specific requirements, quantities, delivery timeframe, or questions..."
                  rows={3}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#E31837] hover:bg-[#C41230] font-bold h-11"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Send Quote Request
                    </>
                  )}
                </Button>
                <a
                  href="tel:1800151654"
                  className="flex items-center justify-center gap-2 px-4 h-11 rounded-md border-2 border-[#2D3748] text-[#2D3748] font-bold text-sm hover:bg-slate-50 transition-colors shrink-0"
                >
                  <Phone className="size-4" />
                  Call Now
                </a>
              </div>

              <p className="text-center text-xs text-slate-400">
                Or call directly on{' '}
                <a href="tel:1800151654" className="text-[#E31837] font-semibold">
                  1-800-151-654
                </a>{' '}
                for an instant Costplus $100 price
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
