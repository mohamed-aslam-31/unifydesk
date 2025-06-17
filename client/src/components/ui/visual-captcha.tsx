import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Volume2 } from "lucide-react";

interface VisualCaptchaProps {
  onVerify: (isValid: boolean) => void;
  isVerified: boolean;
  className?: string;
}

export function VisualCaptcha({ onVerify, isVerified, className }: VisualCaptchaProps) {
  const [captchaText, setCaptchaText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = () => {
    // Generate random captcha text (mix of letters and numbers)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
    setUserInput("");
    setError("");
    onVerify(false);
    
    // Draw captcha on canvas
    setTimeout(() => drawCaptcha(result), 0);
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

  const handleVerify = () => {
    if (userInput.toUpperCase() === captchaText.toUpperCase()) {
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

  const handleAudioCaptcha = () => {
    // Simple text-to-speech for accessibility
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(captchaText.split('').join(' '));
      utterance.rate = 0.6;
      utterance.pitch = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            captcha
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAudioCaptcha}
              className="p-2 h-8 w-8"
              title="Listen to captcha"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
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
              disabled={userInput.length === 0}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              GO
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