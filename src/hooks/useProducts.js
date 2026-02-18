import { useState, useEffect, useCallback } from 'react';
import {
  subscribeProducts,
  addProduct as addProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
} from '../services/productService';

/**
 * Product catalog hook — real-time Firestore subscription + CRUD.
 *
 * availableProducts is pre-filtered to available === true (chef-facing view).
 */
export function useProducts(farmId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    return subscribeProducts(
      farmId,
      (list) => { setProducts(list); setLoading(false); },
      (err) => { console.error('Products subscription error:', err); setError(err.message); setLoading(false); }
    );
  }, [farmId]);

  const addProduct = useCallback(async (data) => {
    if (!farmId) return;
    try { await addProductService(farmId, data); }
    catch (err) { console.error('Add product error:', err); setError(err.message); }
  }, [farmId]);

  const editProduct = useCallback(async (productId, updates) => {
    if (!farmId) return;
    try { await updateProductService(farmId, productId, updates); }
    catch (err) { console.error('Edit product error:', err); setError(err.message); }
  }, [farmId]);

  const removeProduct = useCallback(async (productId) => {
    if (!farmId) return;
    try { await deleteProductService(farmId, productId); }
    catch (err) { console.error('Delete product error:', err); setError(err.message); }
  }, [farmId]);

  const availableProducts = products
    .filter((p) => p.available)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return {
    products,
    availableProducts,
    loading,
    error,
    addProduct,
    editProduct,
    removeProduct,
  };
}
