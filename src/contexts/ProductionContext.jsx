/**
 * ProductionContext — Domain context for batches, products, crop profiles, and inventory.
 *
 * Owns useBatches, useProducts, useCropProfiles, and useInventory subscriptions.
 * Provides all production-domain data, loading, error, and mutation callbacks
 * via useProductionContext().
 */
import { createContext, useContext, useMemo } from 'react';
import { useBatches } from '../hooks/useBatches';
import { useProducts } from '../hooks/useProducts';
import { useCropProfiles } from '../hooks/useCropProfiles';
import { useInventory } from '../hooks/useInventory';

const ProductionContext = createContext(null);

export function ProductionProvider({ farmId, children }) {
  const {
    batches, activeBatches, readyBatches,
    loading: batchesLoading, error: batchesError,
    addBatch, editBatch, removeBatch, advanceStage, harvestBatch,
    plantCrewBatch, advanceCrewStage, harvestCrewBatch,
  } = useBatches(farmId);

  const {
    products, availableProducts,
    loading: productsLoading, error: productsError,
    addProduct, editProduct, removeProduct,
  } = useProducts(farmId);

  const {
    profiles: cropProfiles, activeProfiles: activeCropProfiles,
    loading: cropProfilesLoading, error: cropProfilesError,
    addProfile: addCropProfile, editProfile: editCropProfile,
    removeProfile: removeCropProfile,
  } = useCropProfiles(farmId);

  const {
    inventory, alertItems, loading: inventoryLoading, error: inventoryError,
    addItem, editItem, removeItem,
  } = useInventory(farmId);

  const value = useMemo(() => ({
    // Batches
    batches, activeBatches, readyBatches,
    batchesLoading, batchesError,
    addBatch, editBatch, removeBatch, advanceStage, harvestBatch,
    plantCrewBatch, advanceCrewStage, harvestCrewBatch,
    // Products
    products, availableProducts,
    productsLoading, productsError,
    addProduct, editProduct, removeProduct,
    // Crop profiles
    cropProfiles, activeCropProfiles,
    cropProfilesLoading, cropProfilesError,
    addCropProfile, editCropProfile, removeCropProfile,
    // Inventory
    inventory, alertItems, inventoryLoading, inventoryError,
    addItem, editItem, removeItem,
  }), [
    batches, activeBatches, readyBatches,
    batchesLoading, batchesError,
    addBatch, editBatch, removeBatch, advanceStage, harvestBatch,
    plantCrewBatch, advanceCrewStage, harvestCrewBatch,
    products, availableProducts,
    productsLoading, productsError,
    addProduct, editProduct, removeProduct,
    cropProfiles, activeCropProfiles,
    cropProfilesLoading, cropProfilesError,
    addCropProfile, editCropProfile, removeCropProfile,
    inventory, alertItems, inventoryLoading, inventoryError,
    addItem, editItem, removeItem,
  ]);

  return (
    <ProductionContext.Provider value={value}>
      {children}
    </ProductionContext.Provider>
  );
}

export function useProductionContext() {
  const ctx = useContext(ProductionContext);
  if (!ctx) throw new Error('useProductionContext must be used within a ProductionProvider');
  return ctx;
}
