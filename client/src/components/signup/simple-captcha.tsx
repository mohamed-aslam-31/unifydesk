import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
  isVerified: boolean;
}

export function SimpleCaptcha({ onVerify, isVerified }: SimpleCaptchaProps) {
  const [captchaText, setCaptchaText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState("");

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
    setUserInput("");
    setError("");
    onVerify(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleVerify = () => {
    if (userInput.toUpperCase() === captchaText) {
      onVerify(true);
      setError("");
    } else {
      onVerify(false);
      setError("Incorrect captcha. Please try again.");
      generateCaptcha();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    if (error) setError("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg font-mono text-lg font-bold tracking-widest select-none border-2 border-dashed border-slate-300 dark:border-slate-600">
          {captchaText}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateCaptcha}
          className="p-2"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Enter captcha text"
          value={userInput}
          onChange={handleInputChange}
          className="flex-1"
          maxLength={6}
        />
        <Button
          type="button"
          onClick={handleVerify}
          disabled={userInput.length !== 6}
          className="px-6"
        >
          Verify
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {isVerified && (
        <p className="text-sm text-green-600">✓ Captcha verified successfully</p>
      )}
    </div>
  );
}