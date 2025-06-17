import { v4 as uuidv4 } from 'uuid';

interface MathCaptcha {
  question: string;
  answer: string;
}

interface TextCaptcha {
  question: string;
  answer: string;
}

export class CaptchaService {
  
  // Generate simple math questions
  private generateMathCaptcha(): MathCaptcha {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number, question: string;
    
    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        answer = num1 + num2;
        question = `What is ${num1} + ${num2}?`;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 25;
        num2 = Math.floor(Math.random() * 25) + 1;
        answer = num1 - num2;
        question = `What is ${num1} - ${num2}?`;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        question = `What is ${num1} × ${num2}?`;
        break;
      default:
        num1 = 5;
        num2 = 3;
        answer = 8;
        question = `What is 5 + 3?`;
    }
    
    return {
      question,
      answer: answer.toString()
    };
  }

  // Generate text-based questions
  private generateTextCaptcha(): TextCaptcha {
    const questions = [
      { question: "What color is the sky on a clear day?", answer: "blue" },
      { question: "How many days are in a week?", answer: "7" },
      { question: "What is the opposite of hot?", answer: "cold" },
      { question: "What is the first letter of the alphabet?", answer: "a" },
      { question: "How many legs does a cat have?", answer: "4" },
      { question: "What comes after Monday?", answer: "tuesday" },
      { question: "What is 2 + 2?", answer: "4" },
      { question: "What is the color of grass?", answer: "green" },
      { question: "How many fingers are on one hand?", answer: "5" },
      { question: "What is the opposite of up?", answer: "down" },
      { question: "What season comes after winter?", answer: "spring" },
      { question: "What do we call frozen water?", answer: "ice" },
      { question: "What is the largest ocean on Earth?", answer: "pacific" },
      { question: "How many hours are in a day?", answer: "24" },
      { question: "What is the capital of France?", answer: "paris" }
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  // Generate visual text CAPTCHA with random characters
  private generateVisualCaptcha(): { question: string; answer: string } {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return {
      question: result,
      answer: result
    };
  }

  // Generate a random CAPTCHA (visual text only)
  generateCaptcha(): { question: string; answer: string; sessionId: string } {
    const sessionId = uuidv4();
    const captcha = this.generateVisualCaptcha();
    
    return {
      question: captcha.question,
      answer: captcha.answer,
      sessionId
    };
  }

  // Validate answer (case-insensitive, trim whitespace)
  validateAnswer(userAnswer: string, correctAnswer: string): boolean {
    const cleanUserAnswer = userAnswer.trim().toLowerCase();
    const cleanCorrectAnswer = correctAnswer.trim().toLowerCase();
    
    return cleanUserAnswer === cleanCorrectAnswer;
  }
}

export const captchaService = new CaptchaService();