/**
 * Demo Data Generator for Mico's Micro Farm Workspace
 *
 * Creates a complete, internally-consistent dataset for investor demos.
 * All data is generated at call time so dates are relative to "now".
 *
 * This file is lazy-loaded only when demo mode is activated.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function d(offset) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
}

function iso(offset, hour = 8) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  dt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return dt.toISOString();
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function money(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function uid() { return 'demo-' + Math.random().toString(36).slice(2, 10); }

// Seeded random for consistent results across calls
let _seed = 42;
function seededRand() {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function sPick(arr) { return arr[Math.floor(seededRand() * arr.length)]; }
function sRand(min, max) { return Math.floor(seededRand() * (max - min + 1)) + min; }

// ─── PART 2: Demo Customers (30 restaurants) ───────────────────────────────

function generateCustomers() {
  const restaurants = [
    // Fine dining (5)
    { name: 'Ember & Oak', chef: 'Marcus Chen', type: 'fine-dining', zone: 'North', city: 'Boise', state: 'ID' },
    { name: 'The Copper Table', chef: 'Isabella Rossi', type: 'fine-dining', zone: 'South', city: 'Boise', state: 'ID' },
    { name: 'Maison Vert', chef: 'Laurent Dupont', type: 'fine-dining', zone: 'East', city: 'Boise', state: 'ID' },
    { name: 'Stone Creek Table', chef: 'Nathan Wilder', type: 'fine-dining', zone: 'North', city: 'Eagle', state: 'ID' },
    { name: 'Aurelia', chef: 'Sofia Marchetti', type: 'fine-dining', zone: 'West', city: 'Meridian', state: 'ID' },
    // Farm-to-table (4)
    { name: 'Root & Branch', chef: 'Hannah Greenfield', type: 'farm-to-table', zone: 'East', city: 'Boise', state: 'ID' },
    { name: 'The Planted Fork', chef: 'Jake Morrison', type: 'farm-to-table', zone: 'North', city: 'Garden City', state: 'ID' },
    { name: 'Meadow Restaurant', chef: 'Clara Swanson', type: 'farm-to-table', zone: 'South', city: 'Nampa', state: 'ID' },
    { name: 'Harvest Table Bistro', chef: 'Elijah Park', type: 'farm-to-table', zone: 'West', city: 'Meridian', state: 'ID' },
    // Italian (3)
    { name: 'Trattoria Verde', chef: 'Marco Bellini', type: 'italian', zone: 'South', city: 'Boise', state: 'ID' },
    { name: 'Osteria del Campo', chef: 'Gianna Ferraro', type: 'italian', zone: 'East', city: 'Boise', state: 'ID' },
    { name: 'Basilico', chef: 'Antonio Russo', type: 'italian', zone: 'North', city: 'Eagle', state: 'ID' },
    // Asian (3)
    { name: 'Jade Blossom', chef: 'Wei Zhang', type: 'asian', zone: 'West', city: 'Meridian', state: 'ID' },
    { name: 'Suki Ramen House', chef: 'Yuki Tanaka', type: 'asian', zone: 'South', city: 'Boise', state: 'ID' },
    { name: 'Lotus Garden', chef: 'Priya Patel', type: 'asian', zone: 'East', city: 'Boise', state: 'ID' },
    // Mexican (2)
    { name: 'Casa Tierra', chef: 'Diego Reyes', type: 'mexican', zone: 'South', city: 'Nampa', state: 'ID' },
    { name: 'Agave & Lime', chef: 'Maria Santos', type: 'mexican', zone: 'West', city: 'Caldwell', state: 'ID' },
    // Hotels (2)
    { name: 'Grand Summit Hotel', chef: 'Robert Sterling', type: 'hotel', zone: 'North', city: 'Boise', state: 'ID' },
    { name: 'The Valley Resort', chef: 'Christine Holmes', type: 'hotel', zone: 'East', city: 'Sun Valley', state: 'ID' },
    // Fast casual (1)
    { name: 'Green Bowl Co', chef: 'Tyler Adams', type: 'fast-casual', zone: 'South', city: 'Boise', state: 'ID' },
    // Retail (5)
    { name: 'Morning Light Cafe', chef: 'Emma Walsh', type: 'cafe', zone: 'North', city: 'Boise', state: 'ID' },
    { name: 'The Grind House', chef: 'Aiden Brooks', type: 'cafe', zone: 'South', city: 'Boise', state: 'ID' },
    { name: 'Fresh Stack', chef: 'Olivia Hart', type: 'fast-casual', zone: 'East', city: 'Boise', state: 'ID' },
    { name: 'Harvest Kitchen', chef: 'Noah Mitchell', type: 'fast-casual', zone: 'West', city: 'Meridian', state: 'ID' },
    { name: 'Boise Co-op Market', chef: 'Linda Grover', type: 'market', zone: 'North', city: 'Boise', state: 'ID' },
    // Subscribers (5)
    { name: 'Riverside Juice Bar', chef: 'Megan Fox', type: 'juice-bar', zone: 'South', city: 'Boise', state: 'ID' },
    { name: 'Peak Fitness Kitchen', chef: 'Brandon Cole', type: 'fitness', zone: 'East', city: 'Boise', state: 'ID' },
    { name: 'Clean Eats Meal Prep', chef: 'Sarah Kim', type: 'meal-prep', zone: 'West', city: 'Meridian', state: 'ID' },
    { name: 'The Smoothie Lab', chef: 'Derek Johnson', type: 'juice-bar', zone: 'North', city: 'Eagle', state: 'ID' },
    { name: 'Green Machine Delivery', chef: 'Zoe Williams', type: 'delivery', zone: 'South', city: 'Boise', state: 'ID' },
  ];

  // First 20 are chef, next 5 retail, last 5 subscriber
  const segments = [
    ...Array(20).fill('chef'),
    ...Array(5).fill('retail'),
    ...Array(5).fill('subscription'),
  ];

  const tiers = ['standard', 'standard', 'preferred', 'preferred', 'VIP'];
  const payments = ['credit_card', 'invoice'];

  // Pre-define spending tiers for consistency with order generation
  const spendTiers = [
    95000, 72000, 58000, 45000, 38000, // top 5
    28000, 24000, 20000, 18000, 16000, // 6-10
    14000, 12000, 10000, 9000, 8000,   // 11-15
    7000, 6000, 5000, 4000, 3500,      // 16-20
    2500, 2000, 1800, 1500, 1200,      // 21-25 (retail)
    3000, 2800, 2200, 1800, 500,       // 26-30 (subscribers)
  ];

  const orderCounts = [
    300, 245, 198, 165, 140, // top 5
    120, 105, 90, 80, 72,   // 6-10
    65, 55, 48, 42, 38,     // 11-15
    32, 28, 24, 20, 16,     // 16-20
    14, 12, 10, 8, 7,       // 21-25
    22, 18, 15, 12, 5,      // 26-30
  ];

  // Spread first order dates across 2022-2026
  const firstDates = [
    '2022-03-15', '2022-06-01', '2022-09-20', '2023-01-10', '2023-03-05',
    '2023-05-15', '2023-07-01', '2023-08-20', '2023-10-15', '2023-12-01',
    '2024-01-15', '2024-03-01', '2024-04-15', '2024-06-01', '2024-07-15',
    '2024-08-01', '2024-09-15', '2024-10-01', '2024-11-15', '2025-01-01',
    '2024-05-01', '2024-08-15', '2024-11-01', '2025-02-01', '2025-06-15',
    '2024-04-01', '2024-07-01', '2024-10-01', '2025-03-01', '2026-01-15',
  ];

  return restaurants.map((r, i) => ({
    id: `demo-cust-${i + 1}`,
    firstName: r.chef.split(' ')[0],
    lastName: r.chef.split(' ').slice(1).join(' '),
    email: `${r.chef.toLowerCase().replace(/\s+/g, '.')}@${r.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    phone: `(208) ${sRand(200, 999)}-${String(sRand(1000, 9999))}`,
    restaurant: r.name,
    segment: segments[i],
    customerName: r.chef,
    address: `${sRand(100, 9999)} ${sPick(['Main', 'Elm', 'Oak', 'Capitol', 'State', 'Broadway', 'River', 'Mountain View', 'Park', 'Fairview'])} ${sPick(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}, ${r.city}, ${r.state}`,
    deliveryZone: r.zone,
    paymentType: sPick(payments),
    pricingTier: tiers[Math.min(i, tiers.length - 1) % tiers.length],
    totalSpent: spendTiers[i],
    ordersCount: orderCounts[i],
    firstOrderDate: firstDates[i],
    tags: [r.type, segments[i]],
    lastSyncedAt: new Date().toISOString(),
    notes: '',
  }));
}

// ─── PART 3: Demo Products (25 products) ───────────────────────────────────

function generateProducts() {
  const products = [
    // Microgreens (12)
    { name: 'Sunflower Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.00, sku: 'SUN-2' }, { label: '4 oz', price: 9.00, sku: 'SUN-4' }, { label: '8 oz', price: 16.00, sku: 'SUN-8' }], avail: true, inv: 120 },
    { name: 'Pea Shoots', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.00, sku: 'PEA-2' }, { label: '4 oz', price: 9.00, sku: 'PEA-4' }, { label: '8 oz', price: 16.00, sku: 'PEA-8' }], avail: true, inv: 95 },
    { name: 'Radish — Daikon', cat: 'microgreens', variants: [
      { label: '2 oz', price: 4.50, sku: 'RDD-2' }, { label: '4 oz', price: 8.00, sku: 'RDD-4' }, { label: '8 oz', price: 14.00, sku: 'RDD-8' }], avail: true, inv: 80 },
    { name: 'Radish — Rambo Red', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.00, sku: 'RDR-2' }, { label: '4 oz', price: 9.00, sku: 'RDR-4' }], avail: true, inv: 65 },
    { name: 'Broccoli Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.50, sku: 'BRC-2' }, { label: '4 oz', price: 10.00, sku: 'BRC-4' }, { label: '8 oz', price: 18.00, sku: 'BRC-8' }], avail: true, inv: 110 },
    { name: 'Kale — Red Russian', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.50, sku: 'KRR-2' }, { label: '4 oz', price: 10.00, sku: 'KRR-4' }], avail: true, inv: 55 },
    { name: 'Arugula Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.00, sku: 'ARG-2' }, { label: '4 oz', price: 9.00, sku: 'ARG-4' }], avail: true, inv: 60 },
    { name: 'Cilantro Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 6.00, sku: 'CIL-2' }, { label: '4 oz', price: 11.00, sku: 'CIL-4' }], avail: true, inv: 40 },
    { name: 'Basil Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 6.00, sku: 'BAS-2' }, { label: '4 oz', price: 11.00, sku: 'BAS-4' }], avail: true, inv: 45 },
    { name: 'Nasturtium Microgreens', cat: 'microgreens', variants: [
      { label: '1 oz', price: 8.00, sku: 'NAS-1' }, { label: '2 oz', price: 14.00, sku: 'NAS-2' }], avail: true, inv: 20 },
    { name: 'Red Cabbage Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.00, sku: 'RCB-2' }, { label: '4 oz', price: 9.00, sku: 'RCB-4' }], avail: true, inv: 50 },
    { name: 'Mustard Mix Microgreens', cat: 'microgreens', variants: [
      { label: '2 oz', price: 5.00, sku: 'MUS-2' }, { label: '4 oz', price: 9.00, sku: 'MUS-4' }], avail: true, inv: 35 },
    // Herbs (6)
    { name: 'Sweet Basil', cat: 'herbs', variants: [
      { label: '1 oz', price: 3.50, sku: 'HBS-1' }, { label: '4 oz', price: 12.00, sku: 'HBS-4' }], avail: true, inv: 70 },
    { name: 'Thai Basil', cat: 'herbs', variants: [
      { label: '1 oz', price: 4.00, sku: 'HTB-1' }, { label: '4 oz', price: 14.00, sku: 'HTB-4' }], avail: true, inv: 30 },
    { name: 'Cilantro', cat: 'herbs', variants: [
      { label: '2 oz', price: 3.00, sku: 'HCL-2' }, { label: '8 oz', price: 10.00, sku: 'HCL-8' }], avail: true, inv: 85 },
    { name: 'Mint', cat: 'herbs', variants: [
      { label: '1 oz', price: 3.50, sku: 'HMN-1' }, { label: '4 oz', price: 12.00, sku: 'HMN-4' }], avail: true, inv: 40 },
    { name: 'Parsley', cat: 'herbs', variants: [
      { label: '2 oz', price: 2.50, sku: 'HPR-2' }, { label: '8 oz', price: 8.00, sku: 'HPR-8' }], avail: true, inv: 60 },
    { name: 'Dill', cat: 'herbs', variants: [
      { label: '1 oz', price: 3.50, sku: 'HDL-1' }, { label: '4 oz', price: 12.00, sku: 'HDL-4' }], avail: true, inv: 25 },
    // Baby Greens (5)
    { name: 'Baby Kale', cat: 'baby-greens', variants: [
      { label: '4 oz', price: 5.00, sku: 'BKL-4' }, { label: '8 oz', price: 9.00, sku: 'BKL-8' }, { label: '1 lb', price: 16.00, sku: 'BKL-16' }], avail: true, inv: 90 },
    { name: 'Baby Arugula', cat: 'baby-greens', variants: [
      { label: '4 oz', price: 4.50, sku: 'BAR-4' }, { label: '8 oz', price: 8.00, sku: 'BAR-8' }], avail: true, inv: 70 },
    { name: 'Mesclun Mix', cat: 'baby-greens', variants: [
      { label: '4 oz', price: 5.00, sku: 'MES-4' }, { label: '8 oz', price: 9.00, sku: 'MES-8' }, { label: '1 lb', price: 16.00, sku: 'MES-16' }], avail: true, inv: 55 },
    { name: 'Baby Spinach', cat: 'baby-greens', variants: [
      { label: '4 oz', price: 4.00, sku: 'BSP-4' }, { label: '8 oz', price: 7.00, sku: 'BSP-8' }], avail: true, inv: 75 },
    { name: 'Micro Salad Blend', cat: 'baby-greens', variants: [
      { label: '2 oz', price: 6.00, sku: 'MSB-2' }, { label: '4 oz', price: 11.00, sku: 'MSB-4' }], avail: true, inv: 40 },
    // Specialty (2)
    { name: 'Edible Flowers Mix', cat: 'specialty', variants: [
      { label: '1 oz', price: 10.00, sku: 'EFM-1' }, { label: '2 oz', price: 18.00, sku: 'EFM-2' }], avail: false, inv: 0 },
    { name: 'Wheatgrass', cat: 'specialty', variants: [
      { label: '4 oz tray', price: 4.00, sku: 'WGR-4' }, { label: '8 oz tray', price: 7.00, sku: 'WGR-8' }], avail: false, inv: 0 },
  ];

  return products.map((p, i) => ({
    id: `demo-prod-${i + 1}`,
    name: p.name,
    category: p.cat,
    variants: p.variants,
    available: p.avail,
    inventory: p.inv,
    sortOrder: i,
    description: `Fresh, locally grown ${p.name.toLowerCase()} from Mico's Micro Farm.`,
    unit: p.cat === 'microgreens' ? 'oz' : p.cat === 'herbs' ? 'oz' : 'oz',
    pricePerUnit: p.variants[0].price,
  }));
}

// ─── PART 4: Demo Shopify Orders (generates ~2800 for $380K revenue) ───────

function generateShopifyOrders(customers, products) {
  _seed = 42; // Reset seed for consistency
  const orders = [];
  const availProducts = products.filter(p => p.available);

  // Revenue targets by month (Oct 2024 - Feb 2026 = 17 months)
  // Total target: ~$373,000 over 17 months (Oct 2024 → Feb 2026)
  const monthlyTargets = [
    { y: 2024, m: 10, rev: 5200 },
    { y: 2024, m: 11, rev: 6800 },
    { y: 2024, m: 12, rev: 7500 },
    { y: 2025, m: 1,  rev: 9200 },
    { y: 2025, m: 2,  rev: 10500 },
    { y: 2025, m: 3,  rev: 12000 },
    { y: 2025, m: 4,  rev: 14500 },
    { y: 2025, m: 5,  rev: 17000 },
    { y: 2025, m: 6,  rev: 19500 },
    { y: 2025, m: 7,  rev: 22000 },
    { y: 2025, m: 8,  rev: 24500 },
    { y: 2025, m: 9,  rev: 27000 },
    { y: 2025, m: 10, rev: 30000 },
    { y: 2025, m: 11, rev: 33000 },
    { y: 2025, m: 12, rev: 35000 },
    { y: 2026, m: 1,  rev: 38000 },
    { y: 2026, m: 2,  rev: 42000 }, // current month — not yet complete, up to ~today
  ];

  // Weight customers by spending tier for order frequency
  const chefCustomers = customers.filter(c => c.segment === 'chef');
  const retailCustomers = customers.filter(c => c.segment === 'retail');
  const subCustomers = customers.filter(c => c.segment === 'subscription');

  // Product weights (how often each product appears in orders)
  // Sunflower 22%, Pea Shoots 18%, Broccoli 15%, rest distributed
  const productWeights = availProducts.map((p, i) => {
    if (p.name.includes('Sunflower')) return 22;
    if (p.name.includes('Pea Shoots')) return 18;
    if (p.name.includes('Broccoli')) return 15;
    if (p.name.includes('Radish') && p.name.includes('Daikon')) return 8;
    if (p.name.includes('Baby Kale')) return 7;
    if (p.name.includes('Kale') && p.name.includes('Red Russian')) return 5;
    if (p.name.includes('Basil') && !p.name.includes('Thai')) return 4;
    return 2;
  });
  const totalWeight = productWeights.reduce((s, w) => s + w, 0);

  function pickWeightedProduct() {
    let r = seededRand() * totalWeight;
    for (let i = 0; i < availProducts.length; i++) {
      r -= productWeights[i];
      if (r <= 0) return availProducts[i];
    }
    return availProducts[0];
  }

  // Special instructions pool
  const instructions = [
    'Extra stems please', 'Sub radish if no sunflower', 'Delivering to back door',
    'Need by 7am', 'Please double bag', 'Leave at front desk', 'Call on arrival',
    'Cut thick stems', 'No substitutions please', 'Add extra packaging',
    'Charge to house account', 'VIP order — presentation quality only',
    'Include sample of new varieties if available', 'Keep refrigerated',
  ];

  // Delivery days: Tuesdays and Fridays primarily
  function getDeliveryDays(year, month) {
    const days = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      const dow = date.getDay();
      if (dow === 2 || dow === 5) { // Tue, Fri
        days.push(new Date(date));
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  const today = new Date();
  today.setHours(23, 59, 59);

  let orderNum = 1000;

  for (const mt of monthlyTargets) {
    const deliveryDays = getDeliveryDays(mt.y, mt.m);
    if (deliveryDays.length === 0) continue;

    let monthRevenue = 0;
    const targetRev = mt.rev;

    // Generate orders until we hit the target
    while (monthRevenue < targetRev) {
      const delivDay = sPick(deliveryDays);
      if (delivDay > today) break; // Don't generate future orders

      // Create order date (1-3 days before delivery)
      const orderDate = new Date(delivDay);
      orderDate.setDate(orderDate.getDate() - sRand(1, 3));
      orderDate.setHours(sRand(6, 18), sRand(0, 59), 0, 0);

      // Pick customer — weighted by segment and spending tier
      let customer;
      const segRoll = seededRand();
      if (segRoll < 0.85) {
        // Chef — weight towards bigger spenders
        const idx = Math.floor(Math.pow(seededRand(), 1.5) * chefCustomers.length);
        customer = chefCustomers[Math.min(idx, chefCustomers.length - 1)];
      } else if (segRoll < 0.95) {
        customer = sPick(retailCustomers);
      } else {
        customer = sPick(subCustomers);
      }

      // Generate line items (1-8 items)
      const itemCount = sRand(1, 8);
      const usedProducts = new Set();
      const items = [];
      let orderTotal = 0;

      for (let j = 0; j < itemCount; j++) {
        let product;
        let attempts = 0;
        do {
          product = pickWeightedProduct();
          attempts++;
        } while (usedProducts.has(product.id) && attempts < 10);
        usedProducts.add(product.id);

        const variant = sPick(product.variants);
        const qty = sRand(1, 6);
        const lineTotal = Math.round(variant.price * qty * 100) / 100;
        orderTotal += lineTotal;

        items.push({
          name: product.name,
          title: `${product.name} — ${variant.label}`,
          productId: product.id,
          variantLabel: variant.label,
          sku: variant.sku,
          price: variant.price,
          quantity: qty,
          lineTotal,
        });
      }

      orderTotal = Math.round(orderTotal * 100) / 100;

      // Determine status
      const daysFromNow = Math.round((today - orderDate) / 86400000);
      let status = 'delivered';
      let fulfillmentStatus = 'fulfilled';

      if (daysFromNow <= 30) {
        // Recent orders — varied statuses
        const roll = seededRand();
        if (daysFromNow <= 2) {
          if (roll < 0.4) { status = 'new'; fulfillmentStatus = null; }
          else if (roll < 0.65) { status = 'confirmed'; fulfillmentStatus = null; }
          else if (roll < 0.8) { status = 'harvesting'; fulfillmentStatus = 'partial'; }
          else { status = 'packed'; fulfillmentStatus = 'partial'; }
        } else if (daysFromNow <= 7) {
          if (roll < 0.15) { status = 'confirmed'; fulfillmentStatus = null; }
          else if (roll < 0.25) { status = 'packed'; fulfillmentStatus = 'partial'; }
          else { status = 'delivered'; fulfillmentStatus = 'fulfilled'; }
        } else {
          status = 'delivered';
          fulfillmentStatus = 'fulfilled';
        }
      } else if (seededRand() < 0.02) {
        status = 'cancelled';
        fulfillmentStatus = null;
      }

      const hasNote = seededRand() < 0.2;
      orderNum++;

      orders.push({
        id: `demo-ord-${orderNum}`,
        orderNumber: orderNum,
        customerName: customer.customerName || `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        restaurant: customer.restaurant,
        customerId: customer.id,
        segment: customer.segment,
        items,
        lineItems: items, // alias for BI components
        total: orderTotal,
        status,
        fulfillmentStatus,
        financialStatus: status === 'cancelled' ? 'refunded' : 'paid',
        statusMigrated: true,
        createdAt: orderDate.toISOString(),
        requestedDeliveryDate: delivDay.toISOString().split('T')[0],
        deliveryDate: delivDay.toISOString().split('T')[0],
        note: hasNote ? sPick(instructions) : '',
        confirmedAt: ['confirmed', 'harvesting', 'packed', 'delivered'].includes(status)
          ? new Date(orderDate.getTime() + 3600000).toISOString() : null,
        packedAt: ['packed', 'delivered'].includes(status)
          ? new Date(delivDay.getTime() - 7200000).toISOString() : null,
        deliveredAt: status === 'delivered'
          ? new Date(delivDay.getTime() + sRand(6, 14) * 3600000).toISOString() : null,
      });

      monthRevenue += orderTotal;
    }
  }

  // Sort newest first
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return orders;
}

// ─── PART 8: Demo Cost Data ────────────────────────────────────────────────

function generateCosts() {
  const costTemplates = [
    { category: 'seeds', amount: 1200, label: 'Monthly seed order' },
    { category: 'growing-medium', amount: 800, label: 'Coco coir / soil mix' },
    { category: 'packaging', amount: 400, label: 'Clamshells, bags, labels' },
    { category: 'labor', amount: 4500, label: 'Staff wages' },
    { category: 'utilities', amount: 1800, label: 'Electric, water, HVAC' },
    { category: 'delivery', amount: 600, label: 'Fuel and vehicle costs' },
    { category: 'rent', amount: 3500, label: 'Facility lease' },
    { category: 'equipment', amount: 500, label: 'Equipment maintenance' },
    { category: 'supplies', amount: 300, label: 'Cleaning, misc supplies' },
  ];

  const costs = [];
  // Generate 12 months of cost data (Mar 2025 – Feb 2026)
  for (let monthOffset = -11; monthOffset <= 0; monthOffset++) {
    const dt = new Date();
    dt.setMonth(dt.getMonth() + monthOffset);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');

    for (const t of costTemplates) {
      // Slight variation each month
      const variation = 1 + (seededRand() - 0.5) * 0.15;
      costs.push({
        id: uid(),
        category: t.category,
        amount: Math.round(t.amount * variation * 100) / 100,
        date: `${y}-${m}-${String(sRand(1, 5)).padStart(2, '0')}`,
        description: t.label,
        recurring: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return costs;
}

// ─── PART 9: Demo Production Data —————————————————————————————————————

function generateBatches() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Active batches in various stages
  const batches = [
    // 3 planned (sow 2-3 days out)
    { crop: 'sunflower', cat: 'microgreens', trays: 8, stage: 'germination', sowOffset: 0, note: 'Sowing today' },
    { crop: 'broccoli', cat: 'microgreens', trays: 6, stage: 'germination', sowOffset: -1, note: 'Sowed yesterday' },
    { crop: 'pea', cat: 'microgreens', trays: 4, stage: 'germination', sowOffset: -2, note: 'Day 2 germination' },
    // 3 in blackout
    { crop: 'radish', cat: 'microgreens', trays: 6, stage: 'blackout', sowOffset: -4, note: 'Ready for lights soon' },
    { crop: 'kale', cat: 'microgreens', trays: 5, stage: 'blackout', sowOffset: -3, note: 'Blackout day 3' },
    { crop: 'red-cabbage', cat: 'microgreens', trays: 4, stage: 'blackout', sowOffset: -4, note: 'Blackout day 4' },
    // 4 under lights
    { crop: 'sunflower', cat: 'microgreens', trays: 6, stage: 'light', sowOffset: -6, note: 'Looking great' },
    { crop: 'broccoli', cat: 'microgreens', trays: 8, stage: 'light', sowOffset: -7, note: 'Day 7 — filling in nicely' },
    { crop: 'pea', cat: 'microgreens', trays: 5, stage: 'light', sowOffset: -7, note: 'Almost ready' },
    { crop: 'arugula-micro', cat: 'microgreens', trays: 3, stage: 'light', sowOffset: -5, note: 'Day 5 under lights' },
    // 3 ready to harvest
    { crop: 'sunflower', cat: 'microgreens', trays: 7, stage: 'ready', sowOffset: -9, note: 'Harvest today!' },
    { crop: 'radish', cat: 'microgreens', trays: 5, stage: 'ready', sowOffset: -8, note: 'Harvest today!' },
    { crop: 'broccoli', cat: 'microgreens', trays: 6, stage: 'ready', sowOffset: -10, note: 'Harvest today!' },
    // 2 harvested this week
    { crop: 'pea', cat: 'microgreens', trays: 4, stage: 'harvested', sowOffset: -12, note: 'Yielded 64 oz' },
    { crop: 'kale', cat: 'microgreens', trays: 5, stage: 'harvested', sowOffset: -13, note: 'Yielded 40 oz' },
  ];

  return batches.map((b, i) => {
    const sowDate = d(b.sowOffset);
    const estStart = d(b.sowOffset + (b.crop === 'radish' ? 8 : b.crop === 'arugula-micro' ? 8 : 10));
    const estEnd = d(b.sowOffset + (b.crop === 'radish' ? 10 : b.crop === 'arugula-micro' ? 10 : 13));

    return {
      id: `demo-batch-${i + 1}`,
      cropCategory: b.cat,
      varietyId: b.crop,
      varietyName: b.crop.charAt(0).toUpperCase() + b.crop.slice(1).replace(/-/g, ' '),
      trayCount: b.trays,
      unit: 'tray',
      stage: b.stage,
      sowDate,
      estimatedHarvestStart: estStart,
      estimatedHarvestEnd: estEnd,
      harvestedAt: b.stage === 'harvested' ? d(b.sowOffset + 10) : null,
      harvestYield: b.stage === 'harvested' ? b.trays * 8 : null,
      expectedYield: b.trays * 8,
      notes: b.note,
      source: 'sowing-schedule',
      stageHistory: [
        { stage: 'germination', enteredAt: d(b.sowOffset), by: 'Trey' },
        ...(b.stage !== 'germination' ? [{ stage: 'blackout', enteredAt: d(b.sowOffset + 2), by: 'Trey' }] : []),
        ...(b.stage === 'light' || b.stage === 'ready' || b.stage === 'harvested' ? [{ stage: 'light', enteredAt: d(b.sowOffset + 4), by: 'Trey' }] : []),
        ...(b.stage === 'ready' || b.stage === 'harvested' ? [{ stage: 'ready', enteredAt: d(b.sowOffset + 8), by: 'Trey' }] : []),
        ...(b.stage === 'harvested' ? [{ stage: 'harvested', enteredAt: d(b.sowOffset + 10), by: 'Trey' }] : []),
      ],
      createdAt: iso(b.sowOffset),
    };
  });
}

// ─── Demo Internal Orders (for Order Board / Harvest Queue / Packing) ──────

function generateInternalOrders(customers, products) {
  _seed = 99; // Different seed from shopify orders
  const availProducts = products.filter(p => p.available);
  const chefCustomers = customers.filter(c => c.segment === 'chef');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = d(1);

  const instructions = [
    'Extra stems please', 'Sub radish if no sunflower', 'Delivering to back door',
    'Need by 7am', 'Please double bag', 'Leave at front desk', 'Call on arrival',
  ];

  // Status distribution:
  // new: 6, confirmed: 4, harvesting: 3, packed: 3, delivered: 8 (recent)
  const statusSlots = [
    ...Array(6).fill('new'),
    ...Array(4).fill('confirmed'),
    ...Array(3).fill('harvesting'),
    ...Array(3).fill('packed'),
    ...Array(8).fill('delivered'),
  ];

  const orders = [];
  let orderNum = 5000;

  for (let i = 0; i < statusSlots.length; i++) {
    const status = statusSlots[i];
    const cust = chefCustomers[i % chefCustomers.length];

    // Generate line items
    const itemCount = sRand(2, 6);
    const usedProducts = new Set();
    const items = [];
    let total = 0;

    for (let j = 0; j < itemCount; j++) {
      let product;
      let attempts = 0;
      do {
        product = sPick(availProducts);
        attempts++;
      } while (usedProducts.has(product.id) && attempts < 10);
      usedProducts.add(product.id);

      const variant = sPick(product.variants);
      const qty = sRand(1, 4);
      const lineTotal = Math.round(variant.price * qty * 100) / 100;
      total += lineTotal;

      items.push({
        productId: product.id,
        name: product.name,
        variant: variant.label,
        quantity: qty,
        price: variant.price,
        lineTotal,
      });
    }

    total = Math.round(total * 100) / 100;
    orderNum++;

    const delivDate = status === 'delivered' ? d(-sRand(1, 5)) : (status === 'new' ? tomorrowStr : todayStr);
    const createdDaysAgo = status === 'delivered' ? sRand(2, 7) : status === 'new' ? sRand(0, 1) : sRand(1, 2);

    orders.push({
      id: `demo-intord-${orderNum}`,
      orderNumber: orderNum,
      customerId: cust.id,
      customerName: cust.customerName,
      restaurant: cust.restaurant,
      items,
      total,
      status,
      requestedDeliveryDate: delivDate,
      note: seededRand() < 0.3 ? sPick(instructions) : '',
      specialInstructions: seededRand() < 0.25 ? sPick(instructions) : '',
      createdAt: { seconds: Math.floor(Date.now()/1000) - createdDaysAgo * 86400 },
      confirmedAt: ['confirmed', 'harvesting', 'packed', 'delivered'].includes(status)
        ? { seconds: Math.floor(Date.now()/1000) - (createdDaysAgo - 0.5) * 86400 } : null,
      harvestingAt: ['harvesting', 'packed', 'delivered'].includes(status)
        ? { seconds: Math.floor(Date.now()/1000) - (createdDaysAgo - 1) * 86400 } : null,
      packedAt: ['packed', 'delivered'].includes(status)
        ? { seconds: Math.floor(Date.now()/1000) - 43200 } : null,
      deliveredAt: status === 'delivered'
        ? { seconds: Math.floor(Date.now()/1000) - (createdDaysAgo - 2) * 86400 } : null,
    });
  }

  return orders;
}

// ─── Demo Tasks & Sprints ──────────────────────────────────────────────────

function generateTasks() {
  const today = d(0);
  return [
    // In-progress tasks
    { id: 'demo-task-1', title: 'Soak 6 trays Sunflower seeds', status: 'in-progress', owner: 'trey', priority: 'high', size: 'S', dueDate: today, tags: ['production'], epicId: 'production', featureId: 'daily-ops' },
    { id: 'demo-task-2', title: 'Flip 4 trays Broccoli to lights', status: 'in-progress', owner: 'trey', priority: 'high', size: 'S', dueDate: today, tags: ['production'], epicId: 'production', featureId: 'daily-ops' },
    { id: 'demo-task-3', title: 'Harvest 3 trays Pea Shoots + 2 trays Radish', status: 'in-progress', owner: 'trey', priority: 'high', size: 'M', dueDate: today, tags: ['harvest'], epicId: 'production', featureId: 'daily-ops' },
    { id: 'demo-task-4', title: 'Pack 5 customer orders for delivery', status: 'not-started', owner: 'trey', priority: 'high', size: 'M', dueDate: today, tags: ['packing'], epicId: 'fulfillment', featureId: 'daily-ops' },
    { id: 'demo-task-5', title: 'Check germination on yesterday\'s planting', status: 'done', owner: 'trey', priority: 'medium', size: 'S', dueDate: today, tags: ['production'], epicId: 'production', featureId: 'daily-ops' },
    // Planning tasks
    { id: 'demo-task-6', title: 'Review weekly sowing schedule', status: 'not-started', owner: 'trey', priority: 'medium', size: 'S', dueDate: d(1), tags: ['planning'], epicId: 'planning', featureId: 'weekly' },
    { id: 'demo-task-7', title: 'Update crop profile yields with actual data', status: 'not-started', owner: 'trey', priority: 'medium', size: 'M', dueDate: d(3), tags: ['data'], epicId: 'planning', featureId: 'weekly' },
    { id: 'demo-task-8', title: 'Place seed order — running low on Sunflower', status: 'not-started', owner: 'trey', priority: 'high', size: 'S', dueDate: d(2), tags: ['purchasing'], epicId: 'operations', featureId: 'weekly' },
    { id: 'demo-task-9', title: 'Follow up with at-risk customers', status: 'not-started', owner: 'trey', priority: 'medium', size: 'M', dueDate: d(2), tags: ['sales'], epicId: 'sales', featureId: 'weekly' },
    { id: 'demo-task-10', title: 'Prepare investor demo walkthrough', status: 'done', owner: 'trey', priority: 'high', size: 'L', dueDate: today, tags: ['business'], epicId: 'business', featureId: 'demo' },
    // Completed tasks (for velocity)
    { id: 'demo-task-11', title: 'Install new grow lights on rack 3', status: 'done', owner: 'trey', priority: 'high', size: 'L', dueDate: d(-2), tags: ['infrastructure'], epicId: 'operations', featureId: 'weekly' },
    { id: 'demo-task-12', title: 'Clean and sanitize all trays', status: 'done', owner: 'trey', priority: 'medium', size: 'M', dueDate: d(-1), tags: ['maintenance'], epicId: 'operations', featureId: 'weekly' },
    { id: 'demo-task-13', title: 'Set up ordering page for new chef accounts', status: 'done', owner: 'trey', priority: 'medium', size: 'M', dueDate: d(-3), tags: ['onboarding'], epicId: 'sales', featureId: 'weekly' },
    { id: 'demo-task-14', title: 'Photograph new product varieties for catalog', status: 'done', owner: 'trey', priority: 'low', size: 'M', dueDate: d(-4), tags: ['marketing'], epicId: 'marketing', featureId: 'weekly' },
    { id: 'demo-task-15', title: 'Run end-of-week financial reconciliation', status: 'done', owner: 'trey', priority: 'medium', size: 'S', dueDate: d(-5), tags: ['finance'], epicId: 'business', featureId: 'weekly' },
    // Roadblocked
    { id: 'demo-task-16', title: 'Fix irrigation timer on wall B', status: 'roadblock', owner: 'trey', priority: 'high', size: 'M', dueDate: d(1), tags: ['maintenance'], epicId: 'operations', featureId: 'weekly' },
  ];
}

function generateSprints() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevEnd.getDate() + 6);

  const nextStart = new Date(weekStart);
  nextStart.setDate(nextStart.getDate() + 7);
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + 6);

  return [
    {
      id: 'demo-sprint-prev',
      number: 7,
      name: 'Sprint 7',
      goal: 'Scale up production for February demand',
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
    },
    {
      id: 'demo-sprint-current',
      number: 8,
      name: 'Sprint 8',
      goal: 'Investor demo prep + maintain production velocity',
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    },
    {
      id: 'demo-sprint-next',
      number: 9,
      name: 'Sprint 9',
      goal: 'New customer onboarding + grow room expansion planning',
      startDate: nextStart.toISOString(),
      endDate: nextEnd.toISOString(),
    },
  ];
}

// ─── Demo Activities ──────────────────────────────────────────────────────

function generateActivities() {
  return [
    // Today
    { id: 'demo-act-1', type: 'harvest', note: 'Harvested 7 trays of Sunflower — 112 oz yield', createdAt: iso(0, 7), createdBy: 'Trey', taskTitle: 'Morning harvest' },
    { id: 'demo-act-2', type: 'planting', note: 'Sowed 10 trays Broccoli for next week orders', createdAt: iso(0, 8), createdBy: 'Trey', taskTitle: 'Morning sowing' },
    // Yesterday
    { id: 'demo-act-3', type: 'delivery', note: 'Delivered to Ember & Oak, Root & Branch, Jade Blossom', createdAt: iso(-1, 11), createdBy: 'Trey', taskTitle: 'Tuesday route' },
    { id: 'demo-act-4', type: 'harvest', note: 'Harvested 5 trays Pea Shoots + 4 trays Radish — top quality', createdAt: iso(-1, 7), createdBy: 'Trey', taskTitle: 'Morning harvest' },
    { id: 'demo-act-5', type: 'sale', note: 'New order from Grand Summit Hotel — $620', createdAt: iso(-1, 14), createdBy: 'System', taskTitle: null },
    // 2 days ago
    { id: 'demo-act-6', type: 'planting', note: 'Sowed 8 trays Broccoli + 6 trays Sunflower', createdAt: iso(-2, 14), createdBy: 'Trey', taskTitle: 'Afternoon sowing' },
    { id: 'demo-act-7', type: 'harvest', note: 'Harvested 3 trays Baby Kale — 48 oz for Stone Creek', createdAt: iso(-2, 7), createdBy: 'Trey', taskTitle: 'Morning harvest' },
    { id: 'demo-act-8', type: 'maintenance', note: 'Replaced filter on rack 2 humidifier', createdAt: iso(-2, 15), createdBy: 'Trey', taskTitle: 'Weekly maintenance' },
    // 3 days ago
    { id: 'demo-act-9', type: 'delivery', note: 'Delivered to Copper Ridge, Basin & Barrel, Lava Stone', createdAt: iso(-3, 10), createdBy: 'Trey', taskTitle: 'Friday route' },
    { id: 'demo-act-10', type: 'harvest', note: 'Harvested 5 trays Pea Shoots — 80 oz yield, excellent quality', createdAt: iso(-3, 7), createdBy: 'Trey', taskTitle: 'Morning harvest' },
    { id: 'demo-act-11', type: 'sale', note: 'Reorder from Copper Ridge Kitchen — $340', createdAt: iso(-3, 9), createdBy: 'System', taskTitle: null },
    // 4 days ago
    { id: 'demo-act-12', type: 'customer', note: 'Onboarded The Valley Resort — premium account, weekly delivery', createdAt: iso(-4, 10), createdBy: 'Trey', taskTitle: 'New customer setup' },
    { id: 'demo-act-13', type: 'planting', note: 'Sowed 6 trays Sunflower + 4 trays Pea Shoots', createdAt: iso(-4, 13), createdBy: 'Trey', taskTitle: 'Midday sowing' },
    // 5 days ago
    { id: 'demo-act-14', type: 'order', note: 'Big order from Stone Creek Table — $450 for Saturday event', createdAt: iso(-5, 16), createdBy: 'System', taskTitle: null },
    { id: 'demo-act-15', type: 'harvest', note: 'Harvested 6 trays Sunflower + 3 trays Basil', createdAt: iso(-5, 7), createdBy: 'Trey', taskTitle: 'Morning harvest' },
    // 6-7 days ago
    { id: 'demo-act-16', type: 'delivery', note: 'Delivered to Sage Garden, Grand Summit, Bitterroot', createdAt: iso(-6, 10), createdBy: 'Trey', taskTitle: 'Tuesday route' },
    { id: 'demo-act-17', type: 'planting', note: 'Sowed 12 trays Radish + 5 trays Cilantro', createdAt: iso(-6, 14), createdBy: 'Trey', taskTitle: 'Afternoon sowing' },
    { id: 'demo-act-18', type: 'maintenance', note: 'Cleaned and sanitized all germination trays', createdAt: iso(-7, 9), createdBy: 'Trey', taskTitle: 'Deep clean day' },
    { id: 'demo-act-19', type: 'sale', note: 'Subscription renewal — Foothills Juice Co — $180/week', createdAt: iso(-7, 15), createdBy: 'System', taskTitle: null },
    // 8-10 days ago
    { id: 'demo-act-20', type: 'harvest', note: 'Harvested 10 trays mixed greens for weekend orders', createdAt: iso(-8, 7), createdBy: 'Trey', taskTitle: 'Bulk harvest' },
    { id: 'demo-act-21', type: 'delivery', note: 'Delivered to 6 accounts — largest route this month', createdAt: iso(-8, 10), createdBy: 'Trey', taskTitle: 'Friday route' },
    { id: 'demo-act-22', type: 'planting', note: 'Sowed 8 trays Sunflower + 8 trays Broccoli — full rack', createdAt: iso(-9, 14), createdBy: 'Trey', taskTitle: 'Major sowing day' },
    { id: 'demo-act-23', type: 'customer', note: 'Price list review with Sage Garden Bistro — upped weekly order to 12 trays', createdAt: iso(-10, 11), createdBy: 'Trey', taskTitle: 'Account review' },
    { id: 'demo-act-24', type: 'maintenance', note: 'Installed new LED bar on rack 4 — 20% more light coverage', createdAt: iso(-10, 15), createdBy: 'Trey', taskTitle: 'Equipment upgrade' },
  ];
}

// ─── Demo Deliveries ──────────────────────────────────────────────────────

function generateDeliveries(customers) {
  const chefCustomers = customers.filter(c => c.segment === 'chef');
  const todayStr = d(0);

  return [
    {
      id: 'demo-deliv-1',
      driverName: 'Trey',
      date: todayStr,
      status: 'in-progress',
      stops: [
        { customerId: chefCustomers[0]?.id, customerName: chefCustomers[0]?.restaurant, address: chefCustomers[0]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[1]?.id, customerName: chefCustomers[1]?.restaurant, address: chefCustomers[1]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[2]?.id, customerName: chefCustomers[2]?.restaurant, address: chefCustomers[2]?.address, deliveryStatus: 'pending' },
        { customerId: chefCustomers[3]?.id, customerName: chefCustomers[3]?.restaurant, address: chefCustomers[3]?.address, deliveryStatus: 'pending' },
        { customerId: chefCustomers[4]?.id, customerName: chefCustomers[4]?.restaurant, address: chefCustomers[4]?.address, deliveryStatus: 'pending' },
      ],
      routeUrl: 'https://www.google.com/maps/dir/Boise,+ID/',
    },
    {
      id: 'demo-deliv-2',
      driverName: 'Trey',
      date: d(-2),
      status: 'completed',
      stops: [
        { customerId: chefCustomers[5]?.id, customerName: chefCustomers[5]?.restaurant, address: chefCustomers[5]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[6]?.id, customerName: chefCustomers[6]?.restaurant, address: chefCustomers[6]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[7]?.id, customerName: chefCustomers[7]?.restaurant, address: chefCustomers[7]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[8]?.id, customerName: chefCustomers[8]?.restaurant, address: chefCustomers[8]?.address, deliveryStatus: 'delivered' },
      ],
      routeUrl: 'https://www.google.com/maps/dir/Boise,+ID/',
    },
    {
      id: 'demo-deliv-3',
      driverName: 'Trey',
      date: d(-5),
      status: 'completed',
      stops: [
        { customerId: chefCustomers[0]?.id, customerName: chefCustomers[0]?.restaurant, address: chefCustomers[0]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[1]?.id, customerName: chefCustomers[1]?.restaurant, address: chefCustomers[1]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[9]?.id, customerName: chefCustomers[9]?.restaurant, address: chefCustomers[9]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[10]?.id, customerName: chefCustomers[10]?.restaurant, address: chefCustomers[10]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[11]?.id, customerName: chefCustomers[11]?.restaurant, address: chefCustomers[11]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[12]?.id, customerName: chefCustomers[12]?.restaurant, address: chefCustomers[12]?.address, deliveryStatus: 'delivered' },
      ],
      routeUrl: 'https://www.google.com/maps/dir/Boise,+ID/',
    },
    {
      id: 'demo-deliv-4',
      driverName: 'Trey',
      date: d(-7),
      status: 'completed',
      stops: [
        { customerId: chefCustomers[3]?.id, customerName: chefCustomers[3]?.restaurant, address: chefCustomers[3]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[5]?.id, customerName: chefCustomers[5]?.restaurant, address: chefCustomers[5]?.address, deliveryStatus: 'delivered' },
        { customerId: chefCustomers[13]?.id, customerName: chefCustomers[13]?.restaurant, address: chefCustomers[13]?.address, deliveryStatus: 'delivered' },
      ],
      routeUrl: 'https://www.google.com/maps/dir/Boise,+ID/',
    },
  ];
}

// ─── Demo Inventory ───────────────────────────────────────────────────────

function generateInventory() {
  return [
    { id: 'demo-inv-1', name: 'Sunflower Seeds (Black Oil)', category: 'seeds', currentQty: 8, unit: 'lbs', parLevel: 15, supplier: 'True Leaf Market', costPerUnit: 4.50 },
    { id: 'demo-inv-2', name: 'Broccoli Seeds', category: 'seeds', currentQty: 3, unit: 'lbs', parLevel: 5, supplier: 'True Leaf Market', costPerUnit: 12.00 },
    { id: 'demo-inv-3', name: 'Pea Seeds (Speckled)', category: 'seeds', currentQty: 6, unit: 'lbs', parLevel: 10, supplier: 'True Leaf Market', costPerUnit: 3.80 },
    { id: 'demo-inv-4', name: 'Radish Seeds (Daikon)', category: 'seeds', currentQty: 4, unit: 'lbs', parLevel: 5, supplier: 'True Leaf Market', costPerUnit: 5.00 },
    { id: 'demo-inv-5', name: 'Kale Seeds (Red Russian)', category: 'seeds', currentQty: 2, unit: 'lbs', parLevel: 3, supplier: 'True Leaf Market', costPerUnit: 8.00 },
    { id: 'demo-inv-6', name: 'Coco Coir (compressed)', category: 'media', currentQty: 12, unit: 'bricks', parLevel: 20, supplier: 'Bootstrap Farmer', costPerUnit: 3.50 },
    { id: 'demo-inv-7', name: 'Vermiculite', category: 'media', currentQty: 30, unit: 'lbs', parLevel: 25, supplier: 'Bootstrap Farmer', costPerUnit: 0.80 },
    { id: 'demo-inv-8', name: '10x20 Trays (no holes)', category: 'supplies', currentQty: 45, unit: 'trays', parLevel: 50, supplier: 'Bootstrap Farmer', costPerUnit: 2.20 },
    { id: 'demo-inv-9', name: '10x20 Trays (with holes)', category: 'supplies', currentQty: 52, unit: 'trays', parLevel: 50, supplier: 'Bootstrap Farmer', costPerUnit: 2.40 },
    { id: 'demo-inv-10', name: 'Humidity Domes', category: 'supplies', currentQty: 18, unit: 'domes', parLevel: 30, supplier: 'Bootstrap Farmer', costPerUnit: 3.80 },
    { id: 'demo-inv-11', name: 'Clamshell Containers (4oz)', category: 'packaging', currentQty: 200, unit: 'count', parLevel: 300, supplier: 'WebstaurantStore', costPerUnit: 0.18 },
    { id: 'demo-inv-12', name: 'Clamshell Containers (8oz)', category: 'packaging', currentQty: 150, unit: 'count', parLevel: 200, supplier: 'WebstaurantStore', costPerUnit: 0.22 },
    { id: 'demo-inv-13', name: 'Custom Labels (roll of 500)', category: 'packaging', currentQty: 3, unit: 'rolls', parLevel: 5, supplier: 'Sticker Giant', costPerUnit: 45.00 },
    { id: 'demo-inv-14', name: 'Spray Bottles', category: 'supplies', currentQty: 6, unit: 'count', parLevel: 4, supplier: 'Amazon', costPerUnit: 5.00 },
    { id: 'demo-inv-15', name: 'pH Test Kit', category: 'supplies', currentQty: 2, unit: 'kits', parLevel: 2, supplier: 'Amazon', costPerUnit: 12.00 },
  ];
}

// ─── Demo Budget Data ─────────────────────────────────────────────────────

function generateBudgetData(shopifyOrders) {
  // Generate expense entries from last 6 months
  const expenses = [];
  for (let m = -5; m <= 0; m++) {
    const dt = new Date();
    dt.setMonth(dt.getMonth() + m);
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const dateStr = `${y}-${mo}-15`;

    expenses.push(
      { id: uid(), category: 'seeds', description: 'Monthly seed order', amount: 1200 + sRand(-100, 100), date: dateStr },
      { id: uid(), category: 'soil', description: 'Coco coir + vermiculite', amount: 800 + sRand(-50, 50), date: dateStr },
      { id: uid(), category: 'packaging', description: 'Clamshells and labels', amount: 400 + sRand(-30, 30), date: dateStr },
      { id: uid(), category: 'labor', description: 'Staff wages', amount: 4500, date: dateStr },
      { id: uid(), category: 'utilities', description: 'Electric + water', amount: 1800 + sRand(-100, 100), date: dateStr },
      { id: uid(), category: 'delivery', description: 'Fuel costs', amount: 600 + sRand(-50, 50), date: dateStr },
      { id: uid(), category: 'equipment', description: 'Maintenance & repairs', amount: 500 + sRand(-200, 200), date: dateStr },
    );
  }

  // Revenue entries from recent shopify orders
  const revenue = [];
  const recentOrders = shopifyOrders.filter(o => {
    const d = new Date(o.createdAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return d >= sixMonthsAgo && o.status !== 'cancelled';
  });

  for (const o of recentOrders) {
    revenue.push({
      id: uid(),
      orderId: o.id,
      customerId: o.customerId,
      amount: parseFloat(o.total) || 0,
      date: o.createdAt.split('T')[0],
    });
  }

  const infrastructure = [
    {
      id: 'demo-infra-1',
      name: 'Grow Room B Expansion',
      budget: 25000,
      spent: 18500,
      status: 'in-progress',
      items: [
        { name: 'Steel racking (4 units)', cost: 6200, status: 'purchased' },
        { name: 'LED grow lights (16)', cost: 8400, status: 'purchased' },
        { name: 'Climate controller', cost: 2200, status: 'purchased' },
        { name: 'Additional trays (200)', cost: 1700, status: 'ordered' },
        { name: 'Electrical work', cost: 3500, status: 'pending' },
        { name: 'Plumbing / drainage', cost: 3000, status: 'pending' },
      ],
      notes: 'Expansion to double current capacity. Target completion: March 2026.',
    },
    {
      id: 'demo-infra-2',
      name: 'Walk-in Cooler Install',
      budget: 8000,
      spent: 8000,
      status: 'completed',
      items: [
        { name: 'Cooler unit', cost: 5500, status: 'installed' },
        { name: 'Shelving', cost: 1200, status: 'installed' },
        { name: 'Installation labor', cost: 1300, status: 'complete' },
      ],
      notes: 'Completed Jan 2026. Extends shelf life by 3 days.',
    },
  ];

  return { expenses, revenue, infrastructure };
}

// ─── Demo Crop Profiles ───────────────────────────────────────────────────

function generateCropProfiles() {
  return [
    { id: 'demo-cp-1', name: 'Broccoli', cropCategory: 'microgreens', varietyId: 'broccoli', active: true, dtm: 10, harvestWindow: 3, trayYield: 6.5, seedCost: 0.80, wholesalePrice: 20.00, unit: 'tray', germinationDays: 3, blackoutDays: 3, notes: 'Largest volume item. ~30% of production.' },
    { id: 'demo-cp-2', name: 'Radish', cropCategory: 'microgreens', varietyId: 'radish', active: true, dtm: 8, harvestWindow: 2, trayYield: 11, seedCost: 0.30, wholesalePrice: 18.00, unit: 'tray', germinationDays: 2, blackoutDays: 3, notes: 'Fast grower. Highest GPM at ~81%.' },
    { id: 'demo-cp-3', name: 'Sunflower', cropCategory: 'microgreens', varietyId: 'sunflower', active: true, dtm: 9, harvestWindow: 3, trayYield: 16, seedCost: 1.50, wholesalePrice: 16.00, unit: 'tray', germinationDays: 2, blackoutDays: 4, notes: '~27% of production. Presoak required.' },
    { id: 'demo-cp-4', name: 'Pea Shoots', cropCategory: 'microgreens', varietyId: 'pea', active: true, dtm: 9, harvestWindow: 3, trayYield: 16, seedCost: 1.20, wholesalePrice: 16.00, unit: 'tray', germinationDays: 2, blackoutDays: 3, notes: 'Presoak required. Sea-90 study in progress.' },
    { id: 'demo-cp-5', name: 'Kale (Microgreen)', cropCategory: 'microgreens', varietyId: 'kale', active: true, dtm: 10, harvestWindow: 3, trayYield: 8, seedCost: 0.90, wholesalePrice: 22.00, unit: 'tray', germinationDays: 3, blackoutDays: 3, notes: '~19% of production allocation.' },
    { id: 'demo-cp-6', name: 'Red Cabbage', cropCategory: 'microgreens', varietyId: 'red-cabbage', active: true, dtm: 10, harvestWindow: 3, trayYield: 8, seedCost: 0.85, wholesalePrice: 20.00, unit: 'tray', germinationDays: 3, blackoutDays: 3, notes: '~17% of production allocation.' },
    { id: 'demo-cp-7', name: 'Dill', cropCategory: 'microgreens', varietyId: 'dill', active: true, dtm: 14, harvestWindow: 3, trayYield: 4, seedCost: 1.00, wholesalePrice: 28.00, unit: 'tray', germinationDays: 4, blackoutDays: 4, notes: 'Slow grower but highest margin ~91%.' },
    { id: 'demo-cp-8', name: 'Arugula (Micro)', cropCategory: 'microgreens', varietyId: 'arugula-micro', active: true, dtm: 8, harvestWindow: 2, trayYield: 5, seedCost: 0.70, wholesalePrice: 24.00, unit: 'tray', germinationDays: 2, blackoutDays: 2, notes: 'Fast cycle. GPM ~72%.' },
    { id: 'demo-cp-9', name: 'Nasturtium', cropCategory: 'microgreens', varietyId: 'nasturtium', active: true, dtm: 14, harvestWindow: 3, trayYield: 4, seedCost: 6.00, wholesalePrice: 40.00, unit: 'tray', germinationDays: 4, blackoutDays: 4, notes: 'Premium product, highest seed cost.' },
    { id: 'demo-cp-10', name: 'Basil', cropCategory: 'herbs', varietyId: 'basil', active: true, dtm: 28, harvestWindow: 7, trayYield: 0.44, seedCost: 0.50, wholesalePrice: 12.00, unit: 'port', germinationDays: 5, blackoutDays: 0, notes: 'Highest margin crop.' },
  ];
}

// ─── Demo Reports ─────────────────────────────────────────────────────────

function generateReports() {
  return [
    { id: 'demo-rpt-1', reportType: 'Weekly Sales Summary', dateRange: 'Last 7 days', generatedAt: iso(-1, 10), generatedBy: 'Trey' },
    { id: 'demo-rpt-2', reportType: 'Monthly Customer Report', dateRange: 'January 2026', generatedAt: iso(-15, 14), generatedBy: 'Trey' },
    { id: 'demo-rpt-3', reportType: 'Product Performance', dateRange: 'Last 30 days', generatedAt: iso(-7, 11), generatedBy: 'Trey' },
  ];
}

// ─── Demo Vendors ─────────────────────────────────────────────────────────

function generateVendors() {
  return [
    { id: 'demo-vend-1', name: 'True Leaf Market', contact: 'sales@trueleafmarket.com', phone: '(801) 555-0101', category: 'Seeds', notes: 'Primary seed supplier. Good bulk pricing.' },
    { id: 'demo-vend-2', name: 'Bootstrap Farmer', contact: 'service@bootstrapfarmer.com', phone: '(503) 555-0202', category: 'Supplies', notes: 'Trays, domes, grow media. Fast shipping.' },
    { id: 'demo-vend-3', name: 'WebstaurantStore', contact: 'orders@webstaurantstore.com', phone: '(800) 555-0303', category: 'Packaging', notes: 'Clamshells, bags, bulk packaging.' },
    { id: 'demo-vend-4', name: 'Sticker Giant', contact: 'hello@stickergiant.com', phone: '(970) 555-0404', category: 'Packaging', notes: 'Custom labels and branding.' },
    { id: 'demo-vend-5', name: 'Idaho Power', contact: 'commercial@idahopower.com', phone: '(208) 555-0505', category: 'Utilities', notes: 'Commercial electric account.' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main export — creates a complete, consistent demo snapshot
// ═══════════════════════════════════════════════════════════════════════════

export function createDemoSnapshot() {
  _seed = 42; // Reset for consistent generation

  const customers = generateCustomers();
  const products = generateProducts();
  const shopifyOrders = generateShopifyOrders(customers, products);
  const orders = generateInternalOrders(customers, products);
  const tasks = generateTasks();
  const sprints = generateSprints();
  const batches = generateBatches();
  const costs = generateCosts();
  const activities = generateActivities();
  const deliveries = generateDeliveries(customers);
  const inventory = generateInventory();
  const budget = generateBudgetData(shopifyOrders);
  const cropProfiles = generateCropProfiles();
  const reports = generateReports();
  const vendors = generateVendors();

  // Assign all tasks to the current sprint
  const currentSprint = sprints.find(s => s.number === 8);
  if (currentSprint) {
    tasks.forEach(t => { t.sprintId = currentSprint.id; });
  }

  return {
    // Shopify data (BI dashboards)
    shopifyOrders,
    shopifyCustomers: customers,

    // Internal OMS data
    orders,
    customers,
    products,
    availableProducts: products.filter(p => p.available),

    // Production
    batches,
    activeBatches: batches.filter(b => b.stage !== 'harvested'),
    readyBatches: batches.filter(b => b.stage === 'ready'),
    cropProfiles,
    activeCropProfiles: cropProfiles.filter(p => p.active !== false),

    // Planning
    tasks,
    sprints,
    selectedSprintId: currentSprint?.id || null,

    // Finance
    costs,
    expenses: budget.expenses,
    revenue: budget.revenue,
    infrastructure: budget.infrastructure,

    // Operations
    activities,
    deliveries,
    todayDeliveries: deliveries.filter(d => d.date === new Date().toISOString().split('T')[0]),
    inventory,
    vendors,

    // Reports
    biReports: reports,

    // Team
    teamMembers: [
      { id: 'trey', displayName: 'Trey', email: 'trey@micosmicrofarm.com', role: 'admin' },
    ],
    teamInvites: [],

    // Loading states — all false since data is local
    loading: false,
  };
}
