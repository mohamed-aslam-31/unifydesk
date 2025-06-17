import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2 } from "lucide-react";

interface LoginCaptchaProps {
  onValidation: (isValid: boolean, sessionId: string) => void;
  resetTrigger?: boolean;
}

export function LoginCaptcha({ onValidation, resetTrigger }: LoginCaptchaProps) {
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const generateCaptcha = async () => {
    setIsLoading(true);
    setError("");
    setUserAnswer("");
    setIsVerified(false);
    onValidation(false, "");

    try {
      const response = await fetch("/api/captcha/generate");
      if (!response.ok) {
        throw new Error("Failed to generate CAPTCHA");
      }
      
      const data = await response.json();
      setCaptchaQuestion(data.question);
      setSessionId(data.sessionId);
    } catch (error) {
      setError("Failed to load CAPTCHA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCaptcha = async () => {
    if (!userAnswer.trim()) {
      setError("Please enter the CAPTCHA answer");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answer: userAnswer.trim()
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify CAPTCHA");
      }

      const data = await response.json();
      if (data.valid) {
        setIsVerified(true);
        onValidation(true, sessionId);
      } else {
        setError("Incorrect answer. Please try again.");
        generateCaptcha(); // Generate new CAPTCHA on failure
      }
    } catch (error) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (resetTrigger) {
      generateCaptcha();
    }
  }, [resetTrigger]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value);
    if (error) setError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && userAnswer.trim()) {
      verifyCaptcha();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            captcha
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generateCaptcha}
            disabled={isLoading}
            className="p-2 h-8 w-8"
            title="Refresh captcha"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600 min-h-[80px] flex items-center justify-center font-mono text-xl font-bold tracking-widest text-slate-800 dark:text-slate-200 select-none">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            captchaQuestion
          )}
        </div>
        
        <div className="mt-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Type the characters shown above:
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter captcha text"
              value={userAnswer}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading || isVerified}
              className={`flex-1 ${
                isVerified 
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                  : error 
                  ? "border-red-500" 
                  : ""
              }`}
              maxLength={6}
              autoComplete="off"
            />
            <Button
              type="button"
              onClick={verifyCaptcha}
              disabled={isLoading || !userAnswer.trim() || isVerified}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Verifying..." : isVerified ? "Verified" : "Verify"}
            </Button>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {isVerified && (
        <p className="text-sm text-green-600 dark:text-green-400">✓ Captcha verified successfully</p>
      )}
    </div>
  );
}