// src/services/paymentService.ts
import { v4 as uuidv4 } from 'uuid';
import type { PaymentResult } from '../types';

interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  invoiceId: string;
  paymentMethod: string;
  paymentDetails: Record<string, string>;
  customerInfo: {
    userId: string;
    displayName: string;
    orderType: string;
    tableNumber: string;
  };
  merchantTransactionId?: string;
}

const paymentAmountMap = new Map<string, number>();

// PhonePe Sandbox Credentials (Replace with Production for Prod)
const PHONEPE_CONFIG = {
  MERCHANT_ID: __DEV__ ? 'PGTESTPAYUAT86' : 'YOUR_MERCHANT_ID',
  SALT_KEY: __DEV__ ? '96434309-7796-489d-8924-ab56988a6076' : 'YOUR_SALT_KEY',
  SALT_INDEX: 1,
  API_BASE_URL: __DEV__ ? 'https://api-preprod.phonepe.com/api/v1' : 'https://api.phonepe.com/api/v1',
};

const generateChecksum = (data: string, endpoint: string): string => {
  const hash = require('crypto').createHash('sha256').update(data + endpoint + PHONE_CONFIG.SALT_KEY).toString();
  return `${hash}###${PHONEPE_CONFIG.SALT_INDEX}`;
};

const processPaymentWithValidation = async (paymentData: PaymentData, isDev: boolean): Promise<PaymentResult> => {
  try {
    console.log('Processing payment:', { ...paymentData, paymentDetails: '***' });
    if (!['amount', 'orderId', 'paymentMethod'].every(key => paymentData[key])) {
      throw new Error('Missing required fields');
    }

    paymentAmountMap.set(paymentData.orderId, paymentData.amount);

    const requestData = {
      merchantId: PHONEPE_CONFIG.MERCHANT_ID,
      merchantTransactionId: paymentData.merchantTransactionId || `TXN_${paymentData.orderId}`,
      merchantUserId: paymentData.customerInfo.userId,
      amount: paymentData.amount * 100, // PhonePe expects amount in paisa
      redirectUrl: 'https://yourdomain.com/callback',
      callbackUrl: 'https://yourdomain.com/webhook',
      mobileNumber: '9876543210', // Replace with user data
      paymentInstrument: {
        type: paymentData.paymentMethod === 'UPI' ? 'UPI_INTENT' :
             paymentData.paymentMethod === 'Credit Card' ? 'CARD' :
             paymentData.paymentMethod === 'Net Banking' ? 'NET_BANKING' :
             paymentData.paymentMethod === 'Wallet' ? 'WALLET' : 'PAY_PAGE',
      },
    };

    const base64Data = Buffer.from(JSON.stringify(requestData)).toString('base64');
    const checksum = await generateChecksum(base64Data, '/pg/v1/pay');

    if (isDev) {
      return {
        success: true,
        status: 'PENDING',
        paymentId: `pay_${requestData.merchantTransactionId}`,
        data: {
          merchantTransactionId: requestData.merchantTransactionId,
          redirectUrl: `phonepe://pay?orderId=${paymentData.orderId}&txId=${requestData.merchantTransactionId}`,
        },
      };
    }

    const response = await fetch(`${PHONEPE_CONFIG.API_BASE_URL}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: base64Data }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Payment initiation failed');
    }

    return {
      success: true,
      status: result.data?.state || 'PENDING',
      paymentId: result.data?.transactionId,
      data: {
        merchantTransactionId: requestData.merchantTransactionId,
        redirectUrl: result.data?.redirectUrl,
      },
    };
  } catch (error) {
    console.error('Payment error:', error);
    if (String(error).includes('TOO_MANY_REQUESTS')) {
      throw new Error('TOO_MANY_REQUESTS');
    }
    throw error;
  }
};

const checkPaymentStatus = async (merchantTransactionId: string, orderId: string): Promise<PaymentResult> => {
  try {
    const requestData = {
      merchantId: PHONEPE_CONFIG.MERCHANT_ID,
      merchantTransactionId,
    };
    const base64Data = Buffer.from(JSON.stringify(requestData)).toString('base64');
    const checksum = generateChecksum(base64Data, '/pg/v1/status');

    if (__DEV__) {
      const amount = paymentAmountMap.get(orderId) ?? 0;
      return {
        success: true,
        status: 'SUCCESS',
        paymentId: `pay_${merchantTransactionId}`,
        orderId,
        amount,
      };
    }

    const response = await fetch(`${PHONEPE_CONFIG.API_BASE_URL}/pg/v1/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: base64Data }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Status check failed');
    }

    return {
      success: true,
      status: result.data?.state?.toUpperCase() || 'PENDING',
      paymentId: result.data?.transactionId,
      amount: result.data?.amount / 100, // Convert paisa to INR
    };
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
};

const clearPaymentAmountMap = (): void => {
  paymentAmountMap.clear();
};

export default { processPaymentWithValidation, checkPaymentStatus, clearPaymentAmountMap };