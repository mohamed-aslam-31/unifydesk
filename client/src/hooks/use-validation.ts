import { useState, useCallback } from "react";
import { validateField } from "@/lib/auth";

interface ValidationState {
  isChecking: boolean;
  isValid: boolean | null;
  message: string;
}

interface UseValidationReturn {
  validationState: ValidationState;
  validateFieldValue: (field: string, value: string) => Promise<void>;
  resetValidation: () => void;
}

export function useValidation(): UseValidationReturn {
  const [validationState, setValidationState] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
    message: "",
  });

  const validateFieldValue = useCallback(async (field: string, value: string) => {
    if (!value || value.length < 3) {
      setValidationState({
        isChecking: false,
        isValid: null,
        message: "",
      });
      return;
    }

    setValidationState({
      isChecking: true,
      isValid: null,
      message: "Checking availability...",
    });

    try {
      const result = await validateField(field, value);
      setValidationState({
        isChecking: false,
        isValid: result.available,
        message: result.available 
          ? `${field === "username" ? "Username" : "Email"} is available` 
          : `${field === "username" ? "Username" : "Email"} is already taken`,
      });
    } catch (error) {
      setValidationState({
        isChecking: false,
        isValid: null,
        message: "Failed to check availability",
      });
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationState({
      isChecking: false,
      isValid: null,
      message: "",
    });
  }, []);

  return {
    validationState,
    validateFieldValue,
    resetValidation,
  };
}
