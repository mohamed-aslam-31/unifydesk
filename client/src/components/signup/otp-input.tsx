import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input if current field is filled
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    const otpValue = newOtp.join("");
    if (otpValue.length === length) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const pastedOtp = pasteData.slice(0, length).split("");
    
    if (pastedOtp.every(char => !isNaN(Number(char)))) {
      const newOtp = [...otp];
      pastedOtp.forEach((value, index) => {
        if (index < length) {
          newOtp[index] = value;
        }
      });
      setOtp(newOtp);
      
      if (pastedOtp.length === length) {
        onComplete(pastedOtp.join(""));
      }
      
      // Focus last filled input or next empty
      const nextIndex = Math.min(pastedOtp.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-1 max-w-full overflow-x-auto px-2">
      {otp.map((value, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-10 h-10 text-center text-sm font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200 flex-shrink-0 min-w-[28px]"
        />
      ))}
    </div>
  );
}
