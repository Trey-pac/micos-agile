import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const CATEGORIES = ['Microgreens', 'Leafy Greens', 'Herbs', 'Mushrooms', 'Other'];
const UNITS = ['oz', 'lbs', 'bunch', 'each', 'tray', 'flat'];

export default function ProductModal({ product, onClose, onSave, onDelete }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'Microgreens',
    unit: product?.unit || 'oz',
    pricePerUnit: product?.pricePerUnit ?? '',
    description: product?.description || '',
    available: product?.available ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || form.pricePerUnit === '') return;
    setSaving(true);
    try {
      await onSave({ ...form, pricePerUnit: parseFloat(form.pricePerUnit) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'New Product'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update product details and pricing.' : 'Add a new product to your catalog.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="Product name *"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(val) => set('category', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(val) => set('unit', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="product-price">Price per unit ($) *</Label>
            <Input
              id="product-price"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={form.pricePerUnit}
              onChange={(e) => set('pricePerUnit', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="product-desc">Description</Label>
            <Textarea
              id="product-desc"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Availability toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => set('available', !form.available)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.available ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow transition-transform ${form.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-foreground">
              {form.available ? 'Available to chefs' : 'Hidden from chefs'}
            </span>
          </label>
        </div>

        <DialogFooter className="flex-row gap-2">
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(product.id)} className="mr-auto">
              Delete
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || form.pricePerUnit === ''}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
