import { useState, useEffect } from 'react';
import { User, Search, Eye, Edit, Trash2, Loader2, UserPlus, Mail, Phone, DollarSign, Shield } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function CustomersManager() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    canSeeCostPrice: false,
    discountPercentage: 0,
    costPlusHundredAccess: false
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search term
    if (searchTerm) {
      const filtered = customers.filter(customer =>
        customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching customers from API...');
      console.log('Project ID:', projectId);
      console.log('API Base URL:', API_URL);
      console.log('Full endpoint:', `${API_URL}/customers`);

      // First, test if the edge function is reachable at all
      const testUrl = `${API_URL}/email/test`;
      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(5000)
        });
        console.log('✅ Edge function is reachable (test endpoint responded)');
      } catch (testError) {
        console.error('❌ Edge function is NOT reachable:', testError);
        throw new Error('Cannot reach Supabase Edge Function. Please deploy the "server" function in your Supabase Dashboard.');
      }

      const response = await fetch(`${API_URL}/customers?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error body:', errorText);

        // Check if this is a 404 (route not found) - means edge function not deployed
        if (response.status === 404) {
          throw new Error('Customers endpoint not found (404). The edge function exists but may need redeployment to include the latest routes.');
        }

        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response received');
      console.log('✅ Number of customers:', data.customers?.length || 0);

      if (data.customers && data.customers.length > 0) {
        console.log('Sample customer:', data.customers[0]);
      }

      setCustomers(data.customers || []);
      setFilteredCustomers(data.customers || []);
      setError(null);
    } catch (error) {
      console.error('❌ Failed to fetch customers:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));

      let errorMsg = 'Unknown error';

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMsg = 'Network error: Cannot reach Supabase Edge Function. The edge function must be deployed through Supabase Dashboard.';
      } else if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        errorMsg = 'Request timeout: Edge function took too long to respond or is not deployed.';
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      setError(errorMsg);
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData({
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      password: '',
      canSeeCostPrice: customer.can_see_cost_price || false,
      discountPercentage: customer.discount_percentage || 0,
      costPlusHundredAccess: customer.cost_plus_hundred_access || false
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      // First update basic customer info
      const response = await fetch(`${API_URL}/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update customer');

      const updateResult = await response.json();

      // Then update access levels
      const accessResponse = await fetch(`${API_URL}/customers/${selectedCustomer.id}/update-access-levels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          canSeeCostPrice: formData.canSeeCostPrice,
          discountPercentage: formData.discountPercentage,
          costPlusHundredAccess: formData.costPlusHundredAccess,
        }),
      });

      if (!accessResponse.ok) {
        console.warn('Failed to update access levels, but customer info was updated');
      }

      const accessResult = await accessResponse.json();

      // Close dialog first
      setEditDialogOpen(false);
      
      // Refresh the customer list to show updated data
      await fetchCustomers();
      
      // Show success message
      alert('✅ Customer updated successfully! An email notification has been sent to the customer.');
    } catch (error) {
      console.error('Failed to update customer:', error);
      alert('❌ Failed to update customer');
    }
  };

  const handleAddCustomer = async () => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add customer');
      }

      const result = await response.json();
      console.log('Customer created successfully:', result);

      // Refresh customers list
      await fetchCustomers();
      
      // Close dialog and reset form
      setAddDialogOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        canSeeCostPrice: false,
        discountPercentage: 0,
        costPlusHundredAccess: false
      });
      
      // Show success message
      alert(`✅ ${result.message || 'Customer created successfully!'}`);
    } catch (error: any) {
      console.error('Failed to add customer:', error);
      alert(`❌ ${error.message || 'Failed to add customer'}`);
    }
  };

  const handleDeleteCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;

    try {
      const response = await fetch(`${API_URL}/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete response error:', errorData);
        throw new Error(errorData.error || 'Failed to delete customer');
      }

      const result = await response.json();
      console.log('Delete successful:', result);

      await fetchCustomers();
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customers Management</h1>
          <p className="text-muted-foreground">
            View and manage all registered customers
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-[#E31837] hover:bg-[#E31837]/90">
          <UserPlus className="size-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <User className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => {
                const createdDate = new Date(c.created_at);
                const now = new Date();
                return createdDate.getMonth() === now.getMonth() &&
                       createdDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <User className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={fetchCustomers} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="size-8 animate-spin mx-auto text-[#E31837] mb-2" />
              <p className="text-muted-foreground">Loading customers...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-100 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="size-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Failed to Load Customers</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">{error}</p>

              <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded-lg max-w-2xl mx-auto mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-blue-500 text-white rounded-full p-2 flex-shrink-0">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <div className="text-left">
                    <p className="text-blue-900 font-semibold text-lg mb-2">
                      Deploy Required
                    </p>
                    <p className="text-blue-800 text-sm mb-3">
                      The Supabase Edge Function needs to be deployed for the Customers API to work.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">📋 Deployment Steps:</p>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                    <li>Open <a href={`https://supabase.com/dashboard/project/${projectId}/functions`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Supabase Dashboard → Edge Functions</a></li>
                    <li>Find the <strong>"server"</strong> function in the list</li>
                    <li>Click the <strong>"Deploy"</strong> button</li>
                    <li>Wait 30-60 seconds for deployment to complete</li>
                    <li>Return here and click "Test Connection" below</li>
                  </ol>
                </div>

                <div className="text-xs text-blue-700 bg-blue-100 rounded p-3">
                  <strong>💡 Tip:</strong> You only need to deploy once. After deployment, all backend changes (customers, orders, emails, etc.) will work.
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={fetchCustomers}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Test Connection
                </Button>
                <Button
                  onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}/functions`, '_blank')}
                  variant="outline"
                >
                  Open Supabase Dashboard
                </Button>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User className="size-12 mx-auto text-slate-300 mb-3" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={`${customer.source || 'unknown'}_${customer.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-[#2D3748] size-8 rounded-full flex items-center justify-center">
                            <User className="size-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="size-4 text-muted-foreground" />
                          {customer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.can_see_cost_price ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            <DollarSign className="size-3" />
                            Cost Price
                          </span>
                        ) : customer.cost_plus_hundred_access ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                            <DollarSign className="size-3" />
                            Cost + $100
                          </span>
                        ) : customer.discount_percentage > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            <DollarSign className="size-3" />
                            {customer.discount_percentage}% OFF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                            Normal
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(customer.created_at).toLocaleDateString('en-AU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer ID</Label>
                  <p className="font-mono">#{selectedCustomer.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Joined Date</Label>
                  <p className="font-medium">
                    {new Date(selectedCustomer.created_at).toLocaleDateString('en-AU')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">First Name</Label>
                  <p className="font-medium">{selectedCustomer.first_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Name</Label>
                  <p className="font-medium">{selectedCustomer.last_name}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedCustomer.phone}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Access Level</Label>
                  <div className="mt-2">
                    {selectedCustomer.can_see_cost_price ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        <DollarSign className="size-4" />
                        Cost Price (Wholesale)
                      </span>
                    ) : selectedCustomer.cost_plus_hundred_access ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                        <DollarSign className="size-4" />
                        Cost + $100 (Category Specific)
                      </span>
                    ) : selectedCustomer.discount_percentage > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                        <DollarSign className="size-4" />
                        Discount {selectedCustomer.discount_percentage}% OFF
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-full">
                        Normal (Retail)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Create a new customer account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Can See Cost Price</Label>
              <Switch
                checked={formData.canSeeCostPrice}
                onCheckedChange={(e) => setFormData({...formData, canSeeCostPrice: e})}
              />
            </div>
            <div>
              <Label>Discount Percentage</Label>
              <Input
                type="number"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({...formData, discountPercentage: parseFloat(e.target.value)})}
                placeholder="Enter discount percentage"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} className="bg-[#E31837] hover:bg-[#E31837]/90">
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>New Password (leave blank to keep current)</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter new password"
              />
            </div>
            
            {/* Access Levels Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="size-4 text-[#E31837]" />
                Customer Pricing Level
              </h3>
              
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
                  <strong>Important:</strong> Choose ONE pricing level per customer. Cost Price and Discount Percentage are mutually exclusive.
                </div>
                
                <div className="flex items-start justify-between gap-4 p-3 bg-white rounded-lg border-2 border-slate-200">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-semibold text-[#E31837]">
                      🏭 Cost Price Level (Wholesale/Trade)
                    </Label>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Customer can <strong>BUY at cost price</strong>. All other discounts, multibuys, and promotions are <strong>disabled</strong> for this customer.
                    </p>
                    <p className="text-xs text-slate-500 italic">
                      Best for: Wholesale accounts, trade partners, resellers
                    </p>
                  </div>
                  <Switch
                    checked={formData.canSeeCostPrice}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        canSeeCostPrice: checked,
                        // If enabling cost price, disable discount percentage and cost+100
                        discountPercentage: checked ? 0 : formData.discountPercentage,
                        costPlusHundredAccess: checked ? false : formData.costPlusHundredAccess
                      });
                    }}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-3 bg-white rounded-lg border-2 border-slate-200">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-semibold text-purple-600 flex items-center gap-2">
                      <DollarSign className="size-4" />
                      Cost + $100 Pricing (Category Specific)
                    </Label>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Customer pays <strong>Cost + $100</strong> for products in: <strong>Refrigeration, Ice Machines, Commercial Kitchen Machines</strong>. Other categories use regular pricing.
                    </p>
                    <p className="text-xs text-slate-500 italic">
                      Best for: Special accounts, specific category pricing agreements
                    </p>
                  </div>
                  <Switch
                    checked={formData.costPlusHundredAccess}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        costPlusHundredAccess: checked,
                        // If enabling cost+100, disable cost price and discount
                        canSeeCostPrice: checked ? false : formData.canSeeCostPrice,
                        discountPercentage: checked ? 0 : formData.discountPercentage
                      });
                    }}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-3 bg-white rounded-lg border-2 border-slate-200">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-semibold text-blue-600 flex items-center gap-2">
                      <DollarSign className="size-4" />
                      Discount Percentage Level (VIP/Loyalty)
                    </Label>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Customer gets <strong>percentage discount</strong> applied at checkout. This discount is <strong>added to</strong> existing multibuys and promotions.
                    </p>
                    <p className="text-xs text-slate-500 italic">
                      Best for: VIP customers, loyalty programs, regular buyers
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.discountPercentage}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          discountPercentage: value,
                          // If setting discount, disable cost price and cost+100
                          canSeeCostPrice: value > 0 ? false : formData.canSeeCostPrice,
                          costPlusHundredAccess: value > 0 ? false : formData.costPlusHundredAccess
                        });
                      }}
                      placeholder="0"
                      className="w-20 text-center"
                      disabled={formData.canSeeCostPrice || formData.costPlusHundredAccess}
                    />
                    <span className="text-sm font-medium">%</span>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                  <Label className="text-sm font-semibold text-slate-700">
                    🛒 Current Level:
                  </Label>
                  <p className="text-sm mt-1 font-medium">
                    {formData.canSeeCostPrice ? (
                      <span className="text-[#E31837]">Cost Price (Wholesale)</span>
                    ) : formData.discountPercentage > 0 ? (
                      <span className="text-blue-600">Discount {formData.discountPercentage}% (VIP)</span>
                    ) : (
                      <span className="text-slate-600">Normal (Retail)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer} className="bg-[#E31837] hover:bg-[#E31837]/90">
              Update Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCustomer?.first_name} {selectedCustomer?.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}