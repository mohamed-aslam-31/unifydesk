import { useState, useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = async () => {
    console.log("Generating new captcha...");
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
      console.log("New captcha data:", data);
      setCaptchaQuestion(data.question);
      setSessionId(data.sessionId);
      drawVisualCaptcha(data.question);
    } catch (error) {
      console.error("Captcha generation error:", error);
      setError("Failed to load CAPTCHA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const drawVisualCaptcha = (text: string) => {
    console.log("Drawing captcha:", text);
    
    // Use requestAnimationFrame to ensure the canvas is rendered
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas ref not available");
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Canvas context not available");
        return;
      }

      // Set canvas size
      canvas.width = 200;
      canvas.height = 80;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add background with subtle pattern
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add noise dots
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, 0.3)`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
      }

      // Add wavy lines
      ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, Math.random() * canvas.height);
        for (let x = 0; x < canvas.width; x += 10) {
          ctx.lineTo(x, Math.sin(x * 0.1 + i) * 15 + canvas.height / 2);
        }
        ctx.stroke();
      }

      // Draw the text with distortion
      const letters = text.split("");
      const letterWidth = canvas.width / letters.length;
      
      letters.forEach((letter, index) => {
        const x = index * letterWidth + letterWidth / 2;
        const y = canvas.height / 2;
        
        ctx.save();
        
        // Random font size
        const fontSize = 20 + Math.random() * 8;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        
        // Random rotation
        const rotation = (Math.random() - 0.5) * 0.6;
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Random color
        const colors = ["#2563eb", "#dc2626", "#059669", "#7c2d12", "#4338ca"];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        
        // Add text shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw letter
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(letter, 0, 0);
        
        ctx.restore();
      });
    });
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
    setUserAnswer(e.target.value.toUpperCase());
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
            onClick={() => {
              console.log("Refresh button clicked");
              generateCaptcha();
            }}
            disabled={isLoading}
            className="p-2 h-8 w-8"
            title="Refresh captcha"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600 min-h-[80px] flex items-center justify-center select-none">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <canvas
              ref={canvasRef}
              className="border border-gray-200 rounded bg-white"
              style={{ width: "200px", height: "80px" }}
            />
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