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
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-h-[60px] bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center font-mono text-xl font-bold tracking-wider text-slate-800 dark:text-slate-200 select-none">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            captchaQuestion
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={generateCaptcha}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter CAPTCHA"
            value={userAnswer}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isVerified}
            className={`${
              isVerified 
                ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                : error 
                ? "border-red-500" 
                : ""
            }`}
          />
          <Button
            type="button"
            onClick={verifyCaptcha}
            disabled={isLoading || !userAnswer.trim() || isVerified}
            size="sm"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isVerified ? (
              "Verified"
            ) : (
              "Verify"
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        {isVerified && (
          <p className="text-sm text-green-600 dark:text-green-400">
            CAPTCHA verified successfully!
          </p>
        )}
      </div>
    </div>
  );
}