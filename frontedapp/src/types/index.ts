// ==================== Auth ====================
export interface UserProfile {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  phone: string;
  department: string;
  national_id: string;
  gender: string;
  join_date: string;
  is_admin: boolean;
  is_salesperson: boolean;
}

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
  message: string;
}

// ==================== Category ====================
export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

// ==================== Product ====================
export type CustomerCategory = 'factory' | 'distributor' | 'wholesale' | 'Towns' | 'Retail customer';
export type StoreLocation = 'mcdave' | 'kisii' | 'offshore';

export interface Product {
  id: number;
  name: string;
  description: string;
  barcode: string;
  category: number;
  category_name?: string;
  status: 'active' | 'inactive';
  image: string | null;
  factory_price: string;
  distributor_price: string;
  wholesale_price: string;
  offshore_price: string;
  retail_price: string;
  mcdave_stock: number;
  kisii_stock: number;
  offshore_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  barcode: string;
  category_name: string;
  status: 'available' | 'not_available' | 'limited' | 'offer' | string;
  // pricing tiers (returned by ProductListSerializer)
  factory_price?: number | string;
  distributor_price?: number | string;
  wholesale_price?: number | string;
  offshore_price?: number | string;
  retail_price?: number | string;
  // stock levels per store
  mcdave_stock: number;
  kisii_stock: number;
  offshore_stock: number;
  total_stock?: number; // Sum of all stocks
  // images
  image: string | null;
  image_url?: string; // Full URL from API
}

// ==================== Customer ====================
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone_number: string;
  email: string;
  address: string;
  default_category: CustomerCategory;
  sales_person: number | null;
  sales_person_name?: string;
  created_at: string;
}

// ==================== Order ====================
export type OrderPaidStatus = 'pending' | 'completed' | 'partially_paid';
export type OrderDeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';
export type VatVariation = 'with_vat' | 'without_vat';

export interface OrderItem {
  id: number;
  order: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: string;
  variance: string;
  line_total: string;
}

export interface Order {
  id: number;
  customer: number;
  customer_name?: string;
  customer_phone?: string;
  sales_person: number;
  sales_person_name?: string;
  store: StoreLocation;
  customer_category: CustomerCategory;
  address: string;
  phone: string;
  vat_variation: VatVariation;
  paid_status: OrderPaidStatus;
  delivery_status: OrderDeliveryStatus;
  order_date: string;
  total_amount: string;
  amount_paid: string;
  delivery_fee: string;
  balance?: string;
  latitude: string | null;
  longitude: string | null;
  location_address: string;
  created_at: string;
  items?: OrderItem[];
}

export interface CreateOrderPayload {
  customer_id: number;
  store: StoreLocation;
  customer_category: CustomerCategory;
  address: string;
  phone: string;
  vat_variation: VatVariation;
  delivery_fee?: number;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    variance?: number;
  }[];
  payment_method?: string;
  amount_paid?: number;
}

// ==================== Payment ====================
export type PaymentMethod = 'cash' | 'mpesa' | 'cheque' | 'bank_transfer' | 'buni';

export interface Payment {
  id: number;
  order: number;
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number: string;
  notes: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface AddPaymentPayload {
  order_id: number;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

// ==================== M-Pesa ====================
export interface MPesaTransaction {
  id: number;
  order: number;
  phone_number: string;
  amount: string;
  checkout_request_id: string;
  status: 'initiated' | 'completed' | 'failed' | 'pending';
  mpesa_receipt_number: string;
  created_at: string;
}

// ==================== Stock ====================
export interface StockMovement {
  id: number;
  product: number;
  product_name?: string;
  store: StoreLocation;
  quantity_change: number;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  reference: string;
  timestamp: string;
  created_by_name?: string;
}

export interface StockTransfer {
  id: number;
  from_store: StoreLocation;
  to_store: StoreLocation;
  transfer_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  items?: StockTransferItem[];
  created_by_name?: string;
}

export interface StockTransferItem {
  id: number;
  transfer: number;
  product: number;
  product_name?: string;
  quantity: number;
}

export interface StockAdjustment {
  id: number;
  product: number;
  product_name?: string;
  store: StoreLocation;
  quantity_change: number;
  reason: string;
  adjustment_date: string;
}

export interface StockAlert {
  id: number;
  product: number;
  product_name?: string;
  store: StoreLocation;
  min_threshold: number;
  alert_type: 'low_stock' | 'out_of_stock';
}

// ==================== Feedback ====================
export type FeedbackType = 'quality' | 'pricing' | 'payments' | 'delivery_time';

export interface CustomerFeedback {
  id: number;
  customer: number;
  customer_name?: string;
  shop_name: string;
  contact_person: string;
  exact_location: string;
  phone_number: string;
  feedback_type: FeedbackType;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  photo: string | null;
  latitude: string | null;
  longitude: string | null;
  created_by_name?: string;
  created_at: string;
}

// ==================== Messages ====================
export interface InternalMessage {
  id: number;
  sender: number;
  sender_name?: string;
  sender_username?: string;
  recipient: number | null;
  recipient_name?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ==================== Notifications ====================
export type NotificationType = 'feedback' | 'message' | 'order' | 'payment' | 'stock';

export interface Notification {
  id: number;
  user: number;
  notification_type: NotificationType;
  message: string;
  related_object_id: number | null;
  is_read: boolean;
  created_at: string;
}

// ==================== Beat Plan ====================
export interface BeatPlan {
  id: number;
  salesperson: number;
  salesperson_name?: string;
  date: string;
  day_of_week: string;
  visits?: BeatVisit[];
}

export interface BeatVisit {
  id: number;
  beat_plan: number;
  customer: number;
  customer_name?: string;
  visited_at: string | null;
  location: string;
  notes: string;
  status: 'planned' | 'visited' | 'skipped';
}

// ==================== Dashboard ====================
export interface DashboardStats {
  // Customer metrics
  total_customers: number;
  customers_this_month: number;
  customer_percentage_change: number;
  
  // Revenue metrics
  total_revenue: string;
  revenue_this_month: string;
  revenue_percentage_change: number;
  pending_revenue: string;
  
  // Order metrics
  orders_today: number;
  orders_percentage_change: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  
  // Deals
  total_deals: number;
  deals_percentage_change: number;
  
  // Products
  total_products: number;
  low_stock_alerts: number;
  
  // Recent orders
  recent_orders?: Order[];
  
  // Top products
  top_products?: Array<{
    product__name: string;
    total_units: number;
    percent: number;
  }>;
}

// ==================== Quote ====================
export interface Quote {
  id: number;
  customer: number;
  customer_name?: string;
  total_amount: string;
  created_at: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: number;
  quote: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: string;
  variance: string;
  line_total: string;
}

// ==================== Pagination ====================
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ==================== API Error ====================
export interface APIError {
  status: string;
  code: number;
  message: string;
  details?: unknown;
}
