export interface CustomerUser {
  id: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  newsletterOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPayload {
  userId: string;
  phone: string;
  fullName: string | null;
  exp: number;
}

export interface UserAddress {
  id: string;
  userId: string;
  label: string | null;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
}
