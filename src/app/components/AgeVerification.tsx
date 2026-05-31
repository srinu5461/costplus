import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { AlertCircle, ShieldAlert, Calendar } from 'lucide-react';

interface AgeVerificationProps {
  ageRestrictedItems: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
  onVerified: (dateOfBirth: string) => void;
  onBack: () => void;
  existingDOB?: string;
}

export function AgeVerification({ ageRestrictedItems, onVerified, onBack, existingDOB }: AgeVerificationProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleVerify = () => {
    setError('');

    // Validate inputs
    if (!existingDOB) {
      if (!day || !month || !year) {
        setError('Please enter your complete date of birth');
        return;
      }

      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (dayNum < 1 || dayNum > 31) {
        setError('Please enter a valid day (1-31)');
        return;
      }

      if (monthNum < 1 || monthNum > 12) {
        setError('Please enter a valid month (1-12)');
        return;
      }

      const currentYear = new Date().getFullYear();
      if (yearNum < 1900 || yearNum > currentYear) {
        setError(`Please enter a valid year (1900-${currentYear})`);
        return;
      }

      // Create date string
      const dateOfBirth = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      // Validate it's a real date
      const testDate = new Date(dateOfBirth);
      if (isNaN(testDate.getTime())) {
        setError('Please enter a valid date');
        return;
      }

      // Check age
      const age = calculateAge(dateOfBirth);
      if (age < 18) {
        setError('You must be 18 years or older to purchase age-restricted items');
        return;
      }

      if (age > 120) {
        setError('Please enter a valid date of birth');
        return;
      }
    }

    // Check confirmation
    if (!confirmed) {
      setError('You must confirm that you are 18+ to proceed');
      return;
    }

    // Success - pass DOB to parent
    const dob = existingDOB || `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onVerified(dob);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Warning Banner */}
      <Card className="border-orange-500 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <ShieldAlert className="size-8 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-orange-900 text-lg mb-2">Age Verification Required</h3>
              <p className="text-orange-800 text-sm">
                Your cart contains age-restricted items that can only be sold to customers 18 years and older. 
                This is required under Australian law.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Age Restricted Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-orange-600" />
            Age-Restricted Items in Your Cart
          </CardTitle>
          <CardDescription>
            The following items require age verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ageRestrictedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                {item.image && (
                  <div className="relative size-12 rounded overflow-hidden bg-white flex-shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-orange-600 font-semibold">🔞 18+ Only</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Verify Your Age
          </CardTitle>
          <CardDescription>
            {existingDOB 
              ? 'We have your date of birth on file. Please confirm you are 18+ to proceed.' 
              : 'Please enter your date of birth to verify you are 18 years or older'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!existingDOB && (
            <div>
              <Label className="mb-3 block">Date of Birth</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="DD"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    min="1"
                    max="31"
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">Day</p>
                </div>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="MM"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    min="1"
                    max="12"
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">Month</p>
                </div>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="YYYY"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center">Year</p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="age-confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="age-confirm" className="text-sm leading-relaxed cursor-pointer">
                <span className="font-semibold">I confirm that I am 18 years of age or older</span> and 
                legally permitted to purchase age-restricted items. I understand that providing false 
                information may result in criminal prosecution under Australian law.
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Back to Shipping
            </Button>
            <Button
              onClick={handleVerify}
              disabled={!confirmed}
              className="flex-1 bg-[#E31837] hover:bg-[#E31837]/90"
            >
              Verify & Continue
            </Button>
          </div>

          {/* Legal Notice */}
          <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded">
            <strong>Privacy Notice:</strong> Your date of birth is stored securely and used only for age 
            verification purposes. We comply with Australian Privacy Principles (APPs) under the Privacy Act 1988.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
