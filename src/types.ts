export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string;
}

export interface MedicinePrice {
  platform: string;
  price: number;
  link: string;
  logo: string;
  available: boolean;
  offers?: string[];
  stockStatus?: string;
  brand?: string;
  manufacturer?: string;
  deliveryTime?: string;
  rating?: number;
}

export interface Medicine {
  name: string;
  description: string;
  prices: MedicinePrice[];
}

export interface Prescription {
  id: string;
  userId: string;
  imageUrl: string;
  extractedMedicines: { name: string; dosage: string }[];
  createdAt: string;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  timestamp: string;
}

export interface TrafficLog {
  id: string;
  path: string;
  userId?: string;
  timestamp: string;
  userAgent: string;
}
