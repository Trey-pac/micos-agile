/**
 * OrdersContext — Domain context for orders, customers, and deliveries.
 *
 * Owns useOrders, useCustomers, useShopifyCustomers, useShopifyOrders,
 * and useDeliveries subscriptions. Provides all order-domain data,
 * loading, error, and mutation callbacks via useOrdersContext().
 */
import { createContext, useContext, useMemo } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useShopifyCustomers } from '../hooks/useShopifyCustomers';
import { useShopifyOrders } from '../hooks/useShopifyOrders';
import { useDeliveries } from '../hooks/useDeliveries';

const OrdersContext = createContext(null);

export function OrdersProvider({ farmId, chefUid, children }) {
  const {
    orders, loading: ordersLoading, error: ordersError,
    addOrder, advanceOrderStatus, updateOrder,
  } = useOrders(farmId, chefUid);

  const {
    customers, loading: customersLoading, error: customersError,
    addCustomer, editCustomer, removeCustomer,
  } = useCustomers(farmId);

  const {
    customers: shopifyCustomers, loading: shopifyCustomersLoading,
  } = useShopifyCustomers(farmId);

  const {
    orders: shopifyOrders, loading: shopifyOrdersLoading,
  } = useShopifyOrders(farmId);

  const {
    deliveries, todayDeliveries, activeDeliveries,
    loading: deliveriesLoading, error: deliveriesError,
  } = useDeliveries(farmId);

  const value = useMemo(() => ({
    // Orders
    orders, ordersLoading, ordersError,
    addOrder, advanceOrderStatus, updateOrder,
    // Customers
    customers, customersLoading, customersError,
    addCustomer, editCustomer, removeCustomer,
    // Shopify customers
    shopifyCustomers, shopifyCustomersLoading,
    // Shopify orders
    shopifyOrders, shopifyOrdersLoading,
    // Deliveries
    deliveries, todayDeliveries, activeDeliveries,
    deliveriesLoading, deliveriesError,
  }), [
    orders, ordersLoading, ordersError,
    addOrder, advanceOrderStatus, updateOrder,
    customers, customersLoading, customersError,
    addCustomer, editCustomer, removeCustomer,
    shopifyCustomers, shopifyCustomersLoading,
    shopifyOrders, shopifyOrdersLoading,
    deliveries, todayDeliveries, activeDeliveries,
    deliveriesLoading, deliveriesError,
  ]);

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrdersContext() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrdersContext must be used within an OrdersProvider');
  return ctx;
}
