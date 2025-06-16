import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface CaptchaProps {
  onVerified: (sessionId: string, answer: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface CaptchaData {
  question: string;
  sessionId: string;
}

export function Captcha({ onVerified, onError, className }: CaptchaProps) {
  const [answer, setAnswer] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch CAPTCHA question
  const { data: captchaData, isLoading, refetch } = useQuery<CaptchaData>({
    queryKey: ['/api/captcha/generate'],
    staleTime: 0,
    gcTime: 0,
  });

  // Verify CAPTCHA mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ sessionId, answer }: { sessionId: string; answer: string }) => {
      const response = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answer }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setVerified(true);
        setError(null);
        onVerified(captchaData!.sessionId, answer);
      } else {
        setError("Incorrect answer. Please try again.");
        setAnswer("");
        if (onError) onError("Incorrect answer");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      setAnswer("");
      if (onError) onError(error.message);
    },
  });

  const handleSubmit = () => {
    if (!captchaData || !answer.trim()) return;
    
    setError(null);
    verifyMutation.mutate({
      sessionId: captchaData.sessionId,
      answer: answer.trim()
    });
  };

  const handleRefresh = () => {
    setAnswer("");
    setVerified(false);
    setError(null);
    queryClient.invalidateQueries({ queryKey: ['/api/captcha/generate'] });
    refetch();
  };

  useEffect(() => {
    if (verified) {
      setAnswer("");
    }
  }, [verified]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading CAPTCHA...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verified) {
    return (
      <Card className={`${className} border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800`}>
        <CardContent className="p-4">
          <div className="flex items-center text-green-700 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            CAPTCHA verified successfully
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Security Verification
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={verifyMutation.isPending}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {captchaData && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm font-mono">
              {captchaData.question}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="captcha-answer" className="text-sm">
              Your Answer
            </Label>
            <div className="flex gap-2">
              <Input
                id="captcha-answer"
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                disabled={verifyMutation.isPending}
                className="flex-1"
                autoComplete="off"
              />
              <Button 
                type="button"
                onClick={handleSubmit}
                disabled={!answer.trim() || verifyMutation.isPending}
                size="sm"
              >
                {verifyMutation.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
              <XCircle className="h-3 w-3 mr-1" />
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}