import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface VisualCaptchaProps {
  onVerified: (sessionId: string, answer: string) => void;
  onError?: (error: string) => void;
  hasError?: boolean;
  className?: string;
}

export function VisualCaptcha({ onVerified, onError, hasError, className = "" }: VisualCaptchaProps) {
  const [captchaData, setCaptchaData] = useState<{ question: string; sessionId: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = async () => {
    setIsLoading(true);
    setError("");
    setAnswer("");
    setIsVerified(false);

    try {
      const response = await fetch("/api/captcha/generate");
      if (!response.ok) {
        throw new Error("Failed to generate CAPTCHA");
      }
      
      const data = await response.json();
      setCaptchaData(data);
      drawVisualCaptcha(data.question);
    } catch (error) {
      const errorMsg = "Failed to generate CAPTCHA. Please try again.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const drawVisualCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
  };

  const verifyCaptcha = async () => {
    if (!answer.trim()) {
      const errorMsg = "Please enter the CAPTCHA text";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!captchaData) {
      const errorMsg = "Please generate a new CAPTCHA";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: captchaData.sessionId,
          answer: answer.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        setIsVerified(true);
        onVerified(captchaData.sessionId, answer.trim());
      } else {
        const errorMsg = result.message || "Invalid CAPTCHA. Please try again.";
        setError(errorMsg);
        if (onError) onError(errorMsg);
        // Generate new captcha after failed verification
        setTimeout(generateCaptcha, 1000);
      }
    } catch (error) {
      const errorMsg = "Verification failed. Please try again.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = () => {
    generateCaptcha();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isVerifying && answer.trim()) {
      verifyCaptcha();
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Security Verification</Label>
        
        {/* Visual CAPTCHA Canvas */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Enter the text shown below:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isVerifying}
              className="h-6 w-6 p-0 hover:bg-gray-100"
              title="Generate new CAPTCHA"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <canvas
              ref={canvasRef}
              className="w-full h-20 border border-gray-200 rounded"
              style={{ maxWidth: "200px", height: "80px" }}
            />
          </div>
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <Input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value.toUpperCase());
              setError(''); // Clear error when typing
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter CAPTCHA text"
            disabled={isLoading || isVerifying || isVerified}
            className={`flex-1 font-mono tracking-wider ${
              error ? "border-red-500 focus:ring-red-500" : ""
            } ${isVerified ? "border-green-500" : ""}`}
            autoComplete="off"
            maxLength={6}
          />
          
          <Button
            type="button"
            onClick={verifyCaptcha}
            disabled={isLoading || isVerifying || !answer.trim() || isVerified}
            size="sm"
            className="px-4"
            variant={isVerified ? "default" : "outline"}
          >
            {isVerifying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isVerified ? (
              <CheckCircle className="h-4 w-4 text-white" />
            ) : (
              "Verify"
            )}
          </Button>
        </div>

        {/* Error message under input - small font with background */}
        {error && (
          <div className="mt-1">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800">
              Wrong captcha! Please try again
            </p>
          </div>
        )}
        
        {/* Success message under input */}
        {isVerified && (
          <div className="mt-1">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified
            </p>
          </div>
        )}
        
        {isLoading && (
          <div className="mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 px-2 py-1 rounded border border-gray-200 dark:border-gray-800">
              Generating new CAPTCHA...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}