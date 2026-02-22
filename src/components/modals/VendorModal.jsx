import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

export default function VendorModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '', company: '', role: '', status: '', email: '', phone: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>Add a vendor, partner, or client contact.</DialogDescription>
        </DialogHeader>
        <form id="vendor-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Contact Name</Label>
            <Input id="vendor-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-company">Company</Label>
            <Input id="vendor-company" type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-role">Role / Purpose</Label>
            <Input id="vendor-role" type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g., Supplier, Partner, Client" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-status">Status</Label>
            <Input id="vendor-status" type="text" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} placeholder="e.g., Active, Awaiting response" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-email">Email</Label>
            <Input id="vendor-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-phone">Phone</Label>
            <Input id="vendor-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="vendor-form">Add Contact</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
