# UnifyDesk Store Platform

## Overview

UnifyDesk is a comprehensive business management platform that serves as an e-commerce store and business operations hub. The application is built as a full-stack web application with user authentication, role-based access, and integrated e-commerce functionality.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API architecture
- **File Structure**: Monorepo with shared schema between client and server

### Database Layer
- **Primary Database**: PostgreSQL with Drizzle ORM (Active)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Database Tables**: Users, Sessions, OTP Attempts, Role Data
- **Connection**: Neon serverless PostgreSQL with connection pooling

## Key Components

### Authentication System
- **Multi-provider Auth**: Email/password and Google OAuth via Firebase
- **Session Management**: JWT-based sessions with secure token storage
- **Role-based Access**: Customer, Admin, Employee, and Shopkeeper roles
- **Email/Phone Verification**: OTP-based verification system
- **Security**: reCAPTCHA v3 integration for bot protection

### User Management
- **Registration Flow**: Multi-step signup wizard with role selection
- **Profile Management**: Comprehensive user profiles with personal and business information
- **Role Assignment**: Dynamic role assignment with approval workflows
- **Validation**: Real-time username/email availability checking

### Data Storage Solutions
- **User Data**: PostgreSQL tables for users, sessions, OTP attempts, and role-specific data
- **File Storage**: Profile pictures and asset management
- **Session Storage**: Secure session token management with expiration

### External Integrations
- **Firebase**: Authentication provider for Google OAuth
- **reCAPTCHA**: Google reCAPTCHA v3 for form protection
- **Location API**: Countries Now API for location data (countries, states, cities)
- **Email Service**: Nodemailer integration for transactional emails

## Data Flow

### User Registration
1. User fills multi-step signup form with validation
2. reCAPTCHA verification for security
3. Email/phone OTP verification
4. Role selection (Customer, Admin, Employee, Shopkeeper)
5. Role-specific additional information collection
6. Account creation and session establishment

### Authentication Flow
1. Login via email/password or Google OAuth
2. Firebase handles OAuth redirect flow
3. Server validates credentials and creates session
4. JWT token stored securely for subsequent requests
5. Role-based route protection and UI adaptation

### Database Operations
1. Drizzle ORM handles all database interactions
2. Type-safe queries with shared schema
3. Automatic migrations via Drizzle Kit
4. Connection pooling for performance optimization

## External Dependencies

### Core Framework Dependencies
- React ecosystem (React, React DOM, React Hook Form)
- Vite build system with TypeScript support
- Express.js with middleware for CORS, body parsing
- Drizzle ORM with PostgreSQL driver

### UI and Styling
- Tailwind CSS for utility-first styling
- Radix UI for accessible component primitives
- Lucide React for icon system
- Class Variance Authority for component variants

### Authentication and Security
- Firebase SDK for authentication
- bcryptjs for password hashing
- jsonwebtoken for session management
- Google reCAPTCHA v3 for bot protection

### Database and Storage
- @neondatabase/serverless for PostgreSQL connections
- MongoDB support via Mongoose (alternative)
- Drizzle Kit for schema management

## Deployment Strategy

### Build Process
- Vite builds optimized frontend bundle to `dist/public`
- esbuild compiles backend TypeScript to `dist/index.js`
- Shared schema ensures type consistency across client/server

### Environment Configuration
- Development: Hot reload with Vite dev server
- Production: Static file serving with Express
- Database: Configurable between PostgreSQL and in-memory fallback
- Environment variables for API keys and configuration

### Hosting Requirements
- Node.js 20+ runtime environment
- PostgreSQL database (Neon serverless recommended)
- Environment variables for Firebase, reCAPTCHA, and database credentials
- HTTPS required for OAuth and secure session handling

## Changelog

- June 15, 2025: Initial project setup with authentication system
- June 15, 2025: Added PostgreSQL database integration with Drizzle ORM
- June 15, 2025: Fixed authentication UI - removed session timer display, improved email/phone verification logic with proper "already registered" detection
- June 16, 2025: Successfully migrated from Replit Agent to standard Replit environment
- June 16, 2025: Fixed Firebase configuration to prevent connection issues
- June 16, 2025: Configured fallback storage system (in-memory with PostgreSQL option)
- June 16, 2025: Application now running successfully with all core features functional
- June 16, 2025: Completed migration from Replit Agent to standard Replit environment
- June 16, 2025: Updated Firebase configuration with secure API key integration via server endpoint
- June 16, 2025: Firebase authentication now properly configured and ready for Google OAuth setup
- June 16, 2025: Added Google OAuth client secret and configured redirect URI setup process
- June 16, 2025: Completed full Google OAuth integration with server-side authentication endpoint
- June 17, 2025: Successfully migrated from Replit Agent to standard Replit environment
- June 17, 2025: Implemented visual text-based CAPTCHA with canvas rendering for improved security
- June 17, 2025: Activated PostgreSQL database with Drizzle ORM, switched from in-memory to database storage
- June 17, 2025: Enhanced CAPTCHA UX - removed speaker button, changed "GO" to "Verify"
- June 17, 2025: Made Last Name field optional in signup form
- June 17, 2025: Fixed mobile responsiveness for OTP input boxes down to 200px width
- June 17, 2025: Successfully migrated from Replit Agent to standard Replit environment with PostgreSQL database setup and all core functionality operational

## User Preferences

Preferred communication style: Simple, everyday language.