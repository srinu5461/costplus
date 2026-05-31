import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { X, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export function CMSBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('cms_banner_dismissed');
    if (!dismissed) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('cms_banner_dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-blue-500 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-blue-500 size-10 rounded-full flex items-center justify-center">
              <Settings className="size-5 text-white" />
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="size-4" />
            </Button>
          </div>
          <h3 className="text-lg mb-2">CMS Admin Panel Available!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can now edit all content, products, header, footer, and pages. Access the admin panel to customize everything. All changes are saved to your Supabase database.
          </p>
          <div className="flex gap-2">
            <Link to="/admin/login" className="flex-1">
              <Button className="w-full" onClick={handleDismiss}>
                Go to Admin Panel
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDismiss}>
              Dismiss
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Create an admin account to get started with your CMS
          </p>
        </CardContent>
      </Card>
    </div>
  );
}