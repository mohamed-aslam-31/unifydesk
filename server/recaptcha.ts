interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptcha(token: string, action: string = 'submit'): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('reCAPTCHA secret key not configured, skipping verification');
    return true; // Allow submission when reCAPTCHA is not configured
  }

  if (!token) {
    console.warn('No reCAPTCHA token provided');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const result: RecaptchaResponse = await response.json();

    if (!result.success) {
      console.warn('reCAPTCHA verification failed:', result['error-codes']);
      return false;
    }

    // For reCAPTCHA v3, check the score (0.0 to 1.0, where 1.0 is very likely a good interaction)
    if (result.score !== undefined) {
      const minScore = 0.5; // Adjust this threshold as needed
      if (result.score < minScore) {
        console.warn(`reCAPTCHA score too low: ${result.score}`);
        return false;
      }
    }

    // Verify the action matches what we expect
    if (result.action && result.action !== action) {
      console.warn(`reCAPTCHA action mismatch: expected ${action}, got ${result.action}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}