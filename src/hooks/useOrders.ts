import { useState, useEffect } from 'react';
import { orderService } from '../services/firebaseService';

export const useOrders = (userId?: string) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders based on user role
  const fetchOrders = async () => {
    try {
      setLoading(true);
      let data;
      if (userId) {
        // Fetch user-specific orders
        data = await orderService.getUserOrders(userId);
      } else {
        // Fetch all orders (admin view)
        data = await orderService.getAllOrders();
      }
      setOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new order
  const addOrder = async (orderData: any) => {
    try {
      setLoading(true);
      await orderService.addOrder(orderData);
      await fetchOrders(); // Refresh the orders list
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setLoading(true);
      await orderService.updateOrderStatus(orderId, status);
      await fetchOrders(); // Refresh the orders list
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load orders on mount and when userId changes
  useEffect(() => {
    fetchOrders();
  }, [userId]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    addOrder,
    updateOrderStatus
  };
}; 