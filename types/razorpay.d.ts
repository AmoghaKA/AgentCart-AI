interface RazorpayInstance {
  open: () => void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

interface Window {
  Razorpay?: RazorpayConstructor;
}
