import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { ReactNode, useState, useEffect } from 'react';

interface ReCaptchaProviderProps {
  children: ReactNode;
}

interface RecaptchaConfig {
  siteKey: string;
}

export function ReCaptchaProvider({ children }: ReCaptchaProviderProps) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRecaptchaConfig = async () => {
      try {
        const response = await fetch('/api/recaptcha-config');
        const config: RecaptchaConfig = await response.json();
        if (config.siteKey) {
          setSiteKey(config.siteKey);
        } else {
          console.warn('reCAPTCHA site key not provided. reCAPTCHA will be disabled.');
        }
      } catch (error) {
        console.error('Failed to fetch reCAPTCHA config:', error);
        console.warn('reCAPTCHA site key not available. reCAPTCHA will be disabled.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecaptchaConfig();
  }, []);
  
  if (loading) {
    return <>{children}</>;
  }
  
  if (!siteKey) {
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}