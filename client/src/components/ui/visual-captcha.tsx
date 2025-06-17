import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

interface VisualCaptchaProps {
  onVerified: (sessionId: string, answer: string) => void;
  onError?: (error: string) => void;
  className?: string;
  hasError?: boolean;
}

export function VisualCaptcha({ onVerified, onError, className, hasError }: VisualCaptchaProps) {
  const [captchaText, setCaptchaText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);


  const generateCaptcha = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/captcha/generate');
      const data = await response.json();
      
      if (response.ok) {
        setCaptchaText(data.question);
        setSessionId(data.sessionId);
        setUserInput("");
        setError("");
        setVerified(false);
        
        // No need to draw on canvas for text questions
      } else {
        setError("Failed to generate CAPTCHA");
      }
    } catch (err) {
      setError("Failed to load CAPTCHA");
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleVerify = async () => {
    if (!sessionId || !userInput) {
      setError("Please enter the CAPTCHA text");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answer: userInput }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setVerified(true);
        setError("");
        onVerified(sessionId, userInput);
      } else {
        setError("Incorrect CAPTCHA. Please try again.");
        setVerified(false);
        if (onError) onError("Incorrect CAPTCHA");
        await generateCaptcha(); // Generate new CAPTCHA
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
      if (onError) onError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    if (error) setError("");
  };



  return (
    <div className={`space-y-4 ${className}`}>
      <div className={`bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-dashed ${hasError || error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            captcha
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generateCaptcha}
            className="p-2 h-8 w-8"
            title="Refresh captcha"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm font-medium text-center">
          {captchaText}
        </div>
        
        <div className="mt-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Answer the question above:
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter your answer"
              value={userInput}
              onChange={handleInputChange}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              onClick={handleVerify}
              disabled={userInput.length === 0 || loading}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {verified && (
        <p className="text-sm text-green-600 dark:text-green-400">✓ Captcha verified successfully</p>
      )}
    </div>
  );
}