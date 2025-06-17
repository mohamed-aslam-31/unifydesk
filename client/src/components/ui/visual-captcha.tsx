import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

interface VisualCaptchaProps {
  onVerified: (sessionId: string, answer: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function VisualCaptcha({ onVerified, onError, className }: VisualCaptchaProps) {
  const [captchaText, setCaptchaText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        
        // Draw captcha on canvas
        setTimeout(() => drawCaptcha(data.question), 0);
      } else {
        setError("Failed to generate CAPTCHA");
      }
    } catch (err) {
      setError("Failed to load CAPTCHA");
    } finally {
      setLoading(false);
    }
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 200;
    canvas.height = 80;

    // Clear canvas with light background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some noise lines for security
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw the text
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#2d3748';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add slight rotation and positioning variation for each character
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const spacing = 25;
    const startX = centerX - (text.length - 1) * spacing / 2;

    for (let i = 0; i < text.length; i++) {
      ctx.save();
      const x = startX + i * spacing;
      const y = centerY + (Math.random() - 0.5) * 10;
      const rotation = (Math.random() - 0.5) * 0.3;
      
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }

    // Add some noise dots
    ctx.fillStyle = '#a0aec0';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2,
        0,
        2 * Math.PI
      );
      ctx.fill();
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
            className="p-2 h-8 w-8"
            title="Refresh captcha"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <canvas
          ref={canvasRef}
          className="border border-slate-200 dark:border-slate-600 rounded bg-white"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        <div className="mt-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Type the word above:
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter captcha text"
              value={userInput}
              onChange={handleInputChange}
              className="flex-1"
              maxLength={6}
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