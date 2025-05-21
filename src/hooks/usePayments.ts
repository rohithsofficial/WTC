import { useState } from 'react';
import { Alert } from 'react-native';
import { initStripe, createPaymentMethod, confirmPayment } from '@stripe/stripe-react-native';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order, PaymentMethod } from '../types/interfaces';

interface PaymentState {
  loading: boolean;
  error: string | null;
  paymentMethods: PaymentMethod[];
}

export const usePayments = (userId: string) => {
  const [state, setState] = useState<PaymentState>({
    loading: false,
    error: null,
    paymentMethods: [],
  });

  const initializePayments = async (publishableKey: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await initStripe({
        publishableKey,
        merchantIdentifier: 'your_merchant_identifier',
      });
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const processPayment = async (
    order: Order,
    paymentMethodId?: string
  ) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      let paymentMethod;
      if (paymentMethodId) {
        // Use existing payment method
        paymentMethod = { id: paymentMethodId };
      } else {
        // Create new payment method
        const { paymentMethod: newPaymentMethod, error } = await createPaymentMethod({
          paymentMethodType: 'Card',
        });

        if (error) {
          throw new Error(error.message);
        }

        paymentMethod = newPaymentMethod;
      }

      // Create payment intent on your server
      const response = await fetch('your-backend-url/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: order.total * 100, // Convert to cents
          currency: 'usd',
          payment_method: paymentMethod.id,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const { error: confirmError } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Update order with payment status
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: 'completed',
        paymentMethod: {
          type: 'card',
          id: paymentMethod.id,
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
        },
        updatedAt: new Date(),
      });

      setState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const savePaymentMethod = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      // Save payment method to user's profile
      await addDoc(collection(db, `users/${userId}/payment_methods`), {
        type: 'card',
        id: paymentMethod.id,
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        createdAt: new Date(),
      });

      setState(prev => ({ ...prev, loading: false }));
      return paymentMethod;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Delete from Stripe (implement on your backend)
      await fetch('your-backend-url/remove-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method_id: paymentMethodId,
        }),
      });

      // Delete from Firestore
      const querySnapshot = await db
        .collection(`users/${userId}/payment_methods`)
        .where('id', '==', paymentMethodId)
        .get();

      const batch = db.batch();
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const handlePaymentError = (error: Error) => {
    Alert.alert(
      'Payment Error',
      error.message || 'An error occurred while processing your payment.',
      [{ text: 'OK' }]
    );
  };

  return {
    loading: state.loading,
    error: state.error,
    paymentMethods: state.paymentMethods,
    initializePayments,
    processPayment,
    savePaymentMethod,
    removePaymentMethod,
    handlePaymentError,
  };
}; 