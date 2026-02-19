/**
 * Import target configurations for the SmartImport system.
 *
 * Each config defines:
 *  - fields: the Firestore document fields, their types, whether required,
 *            and synonym arrays the fuzzy matcher uses to auto-detect columns.
 *  - label / icon: UI display in the import modal.
 *  - collection: Firestore sub-collection under farms/{farmId}/
 */

// ── Customers / Chefs ──────────────────────────────────────────────
export const customerImportConfig = {
  key: 'customers',
  label: 'Customers / Chefs',
  icon: '👨‍🍳',
  collection: 'customers',
  fields: [
    {
      key: 'name',
      label: 'Contact Name',
      type: 'string',
      required: true,
      synonyms: ['name', 'contact', 'contact name', 'full name', 'person', 'chef', 'chef name'],
    },
    {
      key: 'restaurantName',
      label: 'Restaurant',
      type: 'string',
      required: true,
      synonyms: ['restaurant', 'restaurant name', 'business', 'business name', 'company', 'establishment'],
    },
    {
      key: 'email',
      label: 'Email',
      type: 'string',
      required: false,
      synonyms: ['email', 'e-mail', 'email address', 'e-mail address', 'mail'],
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'string',
      required: false,
      synonyms: ['phone', 'telephone', 'cell', 'mobile', 'phone number', 'tel', 'cell phone'],
    },
    {
      key: 'address',
      label: 'Address',
      type: 'string',
      required: false,
      synonyms: ['address', 'delivery address', 'street', 'street address', 'location'],
    },
    {
      key: 'notes',
      label: 'Notes',
      type: 'string',
      required: false,
      synonyms: ['notes', 'note', 'comments', 'comment', 'memo', 'preferences', 'special instructions'],
    },
  ],
};

// ── Vendors / Suppliers ────────────────────────────────────────────
export const vendorImportConfig = {
  key: 'vendors',
  label: 'Vendors / Suppliers',
  icon: '👥',
  collection: 'vendors',
  fields: [
    {
      key: 'name',
      label: 'Contact Name',
      type: 'string',
      required: true,
      synonyms: ['name', 'contact', 'contact name', 'full name', 'rep', 'representative', 'person'],
    },
    {
      key: 'company',
      label: 'Company',
      type: 'string',
      required: true,
      synonyms: ['company', 'business', 'company name', 'business name', 'supplier', 'vendor', 'vendor name'],
    },
    {
      key: 'role',
      label: 'Role / Title',
      type: 'string',
      required: false,
      synonyms: ['role', 'title', 'job title', 'position', 'job', 'dept', 'department'],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      required: false,
      synonyms: ['status', 'active', 'state', 'account status'],
    },
    {
      key: 'email',
      label: 'Email',
      type: 'string',
      required: false,
      synonyms: ['email', 'e-mail', 'email address', 'e-mail address', 'mail'],
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'string',
      required: false,
      synonyms: ['phone', 'telephone', 'cell', 'mobile', 'phone number', 'tel'],
    },
  ],
};

// ── Inventory / Supplies ───────────────────────────────────────────
export const inventoryImportConfig = {
  key: 'inventory',
  label: 'Inventory / Supplies',
  icon: '📦',
  collection: 'inventory',
  fields: [
    {
      key: 'name',
      label: 'Item Name',
      type: 'string',
      required: true,
      synonyms: ['name', 'item', 'item name', 'product', 'product name', 'supply', 'material', 'description'],
    },
    {
      key: 'category',
      label: 'Category',
      type: 'string',
      required: false,
      synonyms: ['category', 'type', 'group', 'class', 'kind', 'section'],
    },
    {
      key: 'currentQty',
      label: 'Quantity',
      type: 'number',
      required: false,
      synonyms: ['qty', 'quantity', 'current qty', 'on hand', 'stock', 'count', 'amount', 'in stock', 'current quantity'],
    },
    {
      key: 'unit',
      label: 'Unit',
      type: 'string',
      required: false,
      synonyms: ['unit', 'uom', 'units', 'unit of measure', 'measure', 'measurement'],
    },
    {
      key: 'parLevel',
      label: 'Par Level',
      type: 'number',
      required: false,
      synonyms: ['par', 'par level', 'reorder point', 'minimum', 'min qty', 'min', 'reorder', 'low stock'],
    },
    {
      key: 'supplier',
      label: 'Supplier',
      type: 'string',
      required: false,
      synonyms: ['supplier', 'vendor', 'source', 'provider', 'supplied by', 'from'],
    },
    {
      key: 'costPerUnit',
      label: 'Cost / Unit',
      type: 'number',
      required: false,
      synonyms: ['cost', 'price', 'cost per unit', 'unit cost', 'unit price', 'rate', '$/unit', 'cost each'],
    },
  ],
};

// ── Products / Catalog ─────────────────────────────────────────────
export const productImportConfig = {
  key: 'products',
  label: 'Products / Catalog',
  icon: '🛍️',
  collection: 'products',
  fields: [
    {
      key: 'name',
      label: 'Product Name',
      type: 'string',
      required: true,
      synonyms: ['name', 'product', 'product name', 'item', 'item name', 'crop', 'variety'],
    },
    {
      key: 'category',
      label: 'Category',
      type: 'string',
      required: false,
      synonyms: ['category', 'type', 'group', 'class', 'kind', 'product type', 'crop type'],
    },
    {
      key: 'unit',
      label: 'Unit',
      type: 'string',
      required: false,
      synonyms: ['unit', 'uom', 'units', 'sold by', 'sell unit', 'unit of measure'],
    },
    {
      key: 'pricePerUnit',
      label: 'Price',
      type: 'number',
      required: false,
      synonyms: ['price', 'unit price', 'price per unit', 'cost', 'rate', 'sell price', 'retail', '$/unit', 'amount'],
    },
    {
      key: 'description',
      label: 'Description',
      type: 'string',
      required: false,
      synonyms: ['description', 'desc', 'details', 'info', 'notes', 'about'],
    },
  ],
};

// ── Master lookup ──────────────────────────────────────────────────
export const ALL_IMPORT_CONFIGS = {
  customers: customerImportConfig,
  vendors: vendorImportConfig,
  inventory: inventoryImportConfig,
  products: productImportConfig,
};
