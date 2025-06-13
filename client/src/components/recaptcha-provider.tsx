import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { ReactNode } from 'react';

interface ReCaptchaProviderProps {
  children: ReactNode;
}

export function ReCaptchaProvider({ children }: ReCaptchaProviderProps) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  
  if (!siteKey) {
    console.warn('reCAPTCHA site key not provided. reCAPTCHA will be disabled.');
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