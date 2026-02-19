// Crop Configuration for Mico's Workspace
// Source: Master Business Brief, Harvest Today Specs, Sprint Plan documents
// NOTE: Trey's team should review and adjust growDays, harvestWindow, and yieldPerTray
// based on actual production data. These are research-based starting points.

export const cropConfig = {
  microgreens: {
    label: 'Microgreens',
    unit: 'tray',        // 10x20" Bootstrap Farmer trays
    stages: [
      { id: 'germination', label: 'Germination', description: 'Seeds planted, blackout dome on' },
      { id: 'blackout', label: 'Blackout', description: 'Growing under weight/dome, no light' },
      { id: 'light', label: 'Light', description: 'Dome removed, under grow lights' },
      { id: 'ready', label: 'Ready to Harvest', description: 'Within optimal harvest window' },
      { id: 'harvested', label: 'Harvested', description: 'Cut and packed' },
    ],
    varieties: [
      {
        id: 'broccoli',
        name: 'Broccoli',
        growDays: 10,           // days from sow to first harvest day
        harvestWindow: 3,       // days it stays in optimal range
        blackoutDays: 3,        // days in blackout before moving to light
        yieldPerTray: 6.5,      // oz per 10x20 tray (production calibrated)
        seedCostPerTray: 0.80,  // $ estimate
        wholesalePrice: 20.00,  // $ per lb — adjust to actual
        notes: 'Largest volume item historically. ~30.68% of total production allocation.',
      },
      {
        id: 'radish',
        name: 'Radish',
        growDays: 8,
        harvestWindow: 2,
        blackoutDays: 3,
        yieldPerTray: 11,
        seedCostPerTray: 0.30,
        wholesalePrice: 18.00,
        notes: 'Fast grower. GPM ~81%. One of the most cost-effective varieties.',
      },
      {
        id: 'sunflower',
        name: 'Black Oil Sunflower',
        growDays: 9,
        harvestWindow: 3,
        blackoutDays: 4,
        yieldPerTray: 16,
        seedCostPerTray: 1.50,
        wholesalePrice: 16.00,
        notes: '~26.7% of production allocation. Heavier seed cost. Presoak required.',
      },
      {
        id: 'pea',
        name: 'Pea Shoots',
        growDays: 9,
        harvestWindow: 3,
        blackoutDays: 3,
        yieldPerTray: 16,
        seedCostPerTray: 1.20,
        wholesalePrice: 16.00,
        notes: '~6.7% of production allocation. Presoak required. Sea-90 study in progress.',
      },
      {
        id: 'kale',
        name: 'Kale (Microgreen)',
        growDays: 10,
        harvestWindow: 3,
        blackoutDays: 3,
        yieldPerTray: 8,
        seedCostPerTray: 0.90,
        wholesalePrice: 22.00,
        notes: '~18.68% of production allocation.',
      },
      {
        id: 'red-cabbage',
        name: 'Red Acre Cabbage',
        growDays: 10,
        harvestWindow: 3,
        blackoutDays: 3,
        yieldPerTray: 8,
        seedCostPerTray: 0.85,
        wholesalePrice: 20.00,
        notes: '~17.34% of production allocation.',
      },
      {
        id: 'dill',
        name: 'Dill',
        growDays: 14,
        harvestWindow: 3,
        blackoutDays: 4,
        yieldPerTray: 4,
        seedCostPerTray: 1.00,
        wholesalePrice: 28.00,
        notes: 'Slower growing. GPM ~91% — highest margin microgreen.',
      },
      {
        id: 'arugula-micro',
        name: 'Arugula (Microgreen)',
        growDays: 8,
        harvestWindow: 2,
        blackoutDays: 2,
        yieldPerTray: 5,
        seedCostPerTray: 0.70,
        wholesalePrice: 24.00,
        notes: 'Fast cycle. GPM ~72%.',
      },
      {
        id: 'nasturtium',
        name: 'Nasturtium',
        growDays: 14,
        harvestWindow: 3,
        blackoutDays: 4,
        yieldPerTray: 4,
        seedCostPerTray: 6.00,
        wholesalePrice: 40.00,
        notes: 'Highest seed cost. Premium product, low volume.',
      },
    ],
  },

  leafyGreens: {
    label: 'Leafy Greens',
    unit: 'port',         // 2" net pot in Harvest Today wall
    stages: [
      { id: 'seedling', label: 'Seedling', description: 'Germinating in starter plugs' },
      { id: 'transplant', label: 'Transplanted', description: 'Moved to Harvest Today wall' },
      { id: 'growing', label: 'Growing', description: 'Active growth in wall system' },
      { id: 'ready', label: 'Ready to Harvest', description: 'Within optimal harvest window' },
      { id: 'harvested', label: 'Harvested', description: 'Cut — may regrow (cut-and-come-again)' },
    ],
    varieties: [
      {
        id: 'baby-kale',
        name: 'Baby Kale',
        growDays: 30,
        harvestWindow: 5,
        yieldPerPort: 0.55,     // lbs per port (avg of Cornell trials: 115-468g)
        wholesalePrice: 4.75,   // per lb — from Aubergine pricing strategy
        cyclesPerYear: 12,
        notes: 'PRIMARY CROP for Aubergine. Largest volume: 12,000 lbs/month. Multiple cut-and-come-again harvests possible.',
      },
      {
        id: 'romaine',
        name: 'Romaine Lettuce',
        growDays: 35,
        harvestWindow: 5,
        yieldPerPort: 0.35,     // 5-6 oz per head (Cornell CEA)
        wholesalePrice: 3.00,
        cyclesPerYear: 10,
        notes: '2,400 lbs/month for Aubergine. 2" net pot is industry standard.',
      },
      {
        id: 'spinach',
        name: 'Spinach',
        growDays: 35,
        harvestWindow: 5,
        yieldPerPort: 0.55,
        wholesalePrice: 5.00,
        cyclesPerYear: 8,
        notes: 'HIGH RISK: Notably susceptible to Pythium root rot in recirculating systems. 592 lbs/month for Aubergine.',
      },
      {
        id: 'arugula',
        name: 'Arugula',
        growDays: 13,
        harvestWindow: 3,
        yieldPerPort: 0.75,     // 12 oz per sq ft in 13 days (Cornell)
        wholesalePrice: 8.50,
        cyclesPerYear: 28,
        notes: 'FASTEST GROWING leafy green. Up to 21 lbs/sq ft/year theoretical. 248 lbs/month for Aubergine.',
      },
    ],
  },

  herbs: {
    label: 'Herbs',
    unit: 'port',
    stages: [
      { id: 'seedling', label: 'Seedling', description: 'Germinating in starter plugs' },
      { id: 'transplant', label: 'Transplanted', description: 'Moved to Harvest Today wall' },
      { id: 'growing', label: 'Growing', description: 'Active growth' },
      { id: 'ready', label: 'Ready to Harvest', description: 'Mature enough for first cut' },
      { id: 'harvested', label: 'Harvested', description: 'Cut — will regrow' },
    ],
    varieties: [
      {
        id: 'basil',
        name: 'Basil',
        growDays: 28,
        harvestWindow: 7,
        yieldPerPort: 0.44,     // 200g per harvest, 10 cycles/year = 4.4 lbs/port/year
        wholesalePrice: 12.00,  // per lb
        cyclesPerYear: 10,
        notes: 'HIGHEST MARGIN CROP. Production cost $3-6/lb. Revenue potential $14-27/sq ft annually. 77 lbs/month for Aubergine.',
      },
      {
        id: 'cilantro',
        name: 'Cilantro',
        growDays: 35,
        harvestWindow: 5,
        yieldPerPort: 0.20,
        wholesalePrice: 6.00,
        cyclesPerYear: 8,
        notes: 'Weakest space-use efficiency. Slow growth, lower yield per port. Evaluate if volume justifies space.',
      },
      {
        id: 'mint',
        name: 'Mint',
        growDays: 28,
        harvestWindow: 7,
        yieldPerPort: 0.35,
        wholesalePrice: 14.00,
        cyclesPerYear: 10,
        notes: 'Excellent cut-and-come-again. 60.5 lbs/month for Aubergine.',
      },
      {
        id: 'parsley',
        name: 'Parsley',
        growDays: 35,
        harvestWindow: 7,
        yieldPerPort: 0.20,
        wholesalePrice: 6.00,
        cyclesPerYear: 8,
        notes: 'Lower space-use efficiency, similar to cilantro.',
      },
      {
        id: 'green-onion',
        name: 'Green Onions',
        growDays: 30,
        harvestWindow: 7,
        yieldPerPort: 0.25,
        wholesalePrice: 3.00,
        cyclesPerYear: 10,
        notes: 'Good cut-and-come-again. 160 lbs/month for Aubergine.',
      },
    ],
  },

  mushrooms: {
    label: 'Mushrooms',
    unit: 'block',          // substrate block/bag
    stages: [
      { id: 'inoculation', label: 'Inoculation', description: 'Substrate inoculated with spawn' },
      { id: 'incubation', label: 'Incubation', description: 'Mycelium colonizing substrate' },
      { id: 'pinning', label: 'Pinning', description: 'Pins forming, ready for fruiting conditions' },
      { id: 'fruiting', label: 'Fruiting', description: 'Active mushroom growth' },
      { id: 'harvested', label: 'Harvested', description: 'Flush harvested — may produce more flushes' },
    ],
    varieties: [
      {
        id: 'oyster',
        name: 'Oyster Mushroom',
        growDays: 21,
        harvestWindow: 3,
        flushes: 3,             // number of harvest cycles per block
        yieldPerBlock: 1.5,     // lbs per block per flush
        wholesalePrice: 8.00,
        notes: 'Fastest and easiest mushroom. Best for starting. Future product line — backlog.',
      },
      {
        id: 'lions-mane',
        name: "Lion's Mane",
        growDays: 28,
        harvestWindow: 3,
        flushes: 2,
        yieldPerBlock: 1.0,
        wholesalePrice: 12.00,
        notes: 'Premium pricing $8-12/lb. Future product line — backlog.',
      },
      {
        id: 'shiitake',
        name: 'Shiitake',
        growDays: 60,
        harvestWindow: 5,
        flushes: 4,
        yieldPerBlock: 1.0,
        wholesalePrice: 10.00,
        notes: 'Longest grow cycle. Future product line — backlog.',
      },
    ],
  },
};

// Helper: Get all varieties as a flat array
export const getAllVarieties = () => {
  return Object.entries(cropConfig).flatMap(([category, config]) =>
    config.varieties.map(v => ({
      ...v,
      category,
      categoryLabel: config.label,
      unit: config.unit,
    }))
  );
};

// Helper: Get variety by ID
export const getVarietyById = (id) => {
  return getAllVarieties().find(v => v.id === id);
};

// Helper: Calculate estimated harvest date from sow date
export const getEstimatedHarvest = (varietyId, sowDate) => {
  const variety = getVarietyById(varietyId);
  if (!variety) return null;
  const sow = new Date(sowDate);
  const harvestStart = new Date(sow);
  harvestStart.setDate(harvestStart.getDate() + variety.growDays);
  const harvestEnd = new Date(harvestStart);
  harvestEnd.setDate(harvestEnd.getDate() + variety.harvestWindow);
  return { harvestStart, harvestEnd };
};
