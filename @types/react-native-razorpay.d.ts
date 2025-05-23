declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    description?: string;
    image?: string;
    currency?: string;
    key: string;
    amount: number;
    name?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
    retry?: {
      enabled: boolean;
      max_count: number;
    };
    config?: {
      display?: {
        blocks?: {
          banks?: {
            name: string;
            instruments: Array<{
              method: string;
            }>;
          };
        };
        sequence?: string[];
        preferences?: {
          show_default_blocks?: boolean;
        };
      };
    };
  }

  interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpayResponse>;
  };

  export default RazorpayCheckout;
} 