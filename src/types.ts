export interface Category {
  id?: string;
  name: string;
  nameEs?: string;
  description?: string;
  descriptionEs?: string;
}

export interface Product {
  id: string;
  name: string;
  nameEs?: string; // Optional Spanish name
  description: string;
  descriptionEs?: string; // Optional Spanish description
  price: number;
  category: string; // e.g., "Health", "Vitamins", "Personal Care"
  categoryId?: string; // Link to dynamic category
  subCategory?: string;
  prescriptionRequired: boolean;
  stock: number;
  imageUrl: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id?: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: "pending" | "pending_approval" | "processing" | "ready_for_pickup" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  paymentMethod: "visa" | "paypal";
  prescriptionUrl?: string;
  prescriptionStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  orderType: "instant" | "scheduled";
  scheduledDate?: string;
  createdAt: string;
  language: "en" | "es";
  shippingAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    lat?: number;
    lng?: number;
  };
  deliveryInfo?: {
    type: "uber" | "doordash" | "internal" | "standard";
    status: "pending" | "dispatched" | "pickup" | "in_transit" | "completed" | "failed";
    trackingUrl?: string;
    courierName?: string;
    courierPhone?: string;
    scheduledFor?: string; // For scheduled orders
    assignedDriverId?: string; // For internal fleet
    routeId?: string;
    sequence?: number; // Sequence in current route
    externalDeliveryId?: string; // Uber/DoorDash ID
  };
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: "available" | "busy" | "offline";
  currentLocation?: {
    lat: number;
    lng: number;
  };
  activeRouteId?: string;
}

export interface Route {
  id: string;
  driverId: string;
  orderIds: string[];
  status: "pending" | "active" | "completed";
  optimizedStops: {
    orderId: string;
    sequence: number;
    estimatedArrival?: string;
  }[];
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "customer" | "admin" | "driver";
  createdAt: string;
}
