import { apiRequest } from "./queryClient";

export interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  countryCode: string;
  isWhatsApp: boolean;
  gender: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  address?: string;
  password: string;
  confirmPassword: string;
  captchaSessionId: string;
  captchaAnswer: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  message: string;
  sessionToken: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const signup = async (data: SignupData): Promise<AuthResponse> => {
  console.log("Making signup API request with data:", data);
  try {
    const response = await apiRequest("POST", "/api/auth/signup", data);
    console.log("Signup API response received:", response.status);
    const result = await response.json();
    console.log("Signup API result:", result);
    return result;
  } catch (error) {
    console.error("Signup API error:", error);
    throw error;
  }
};

export const validateField = async (field: string, value: string): Promise<{ available: boolean }> => {
  const response = await apiRequest("POST", "/api/validate", { field, value });
  return response.json();
};

export const sendOTP = async (identifier: string, type: "email" | "phone"): Promise<{ message: string; remainingAttempts: number }> => {
  const response = await apiRequest("POST", "/api/auth/send-otp", { identifier, type });
  return response.json();
};

export const verifyOTP = async (identifier: string, type: "email" | "phone", otp: string): Promise<{ message: string }> => {
  const response = await apiRequest("POST", "/api/auth/verify-otp", { identifier, type, otp });
  return response.json();
};

export const submitRoleData = async (role: string, data: any, sessionToken: string) => {
  const response = await fetch(`/api/roles/${role}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  
  return response.json();
};

export const getCurrentUser = async (sessionToken: string) => {
  const response = await fetch("/api/auth/me", {
    headers: {
      "Authorization": `Bearer ${sessionToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to get user");
  }
  
  return response.json();
};
