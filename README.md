# UnifyDesk Store Platform

A comprehensive business management platform that serves as an e-commerce store and business operations hub with user authentication, role-based access, and integrated e-commerce functionality.

## Quick Start

### Running in Replit

1. **Fork or Import this project** to your Replit account
2. **Set up the database** (automatic on first run):
   - Go to Tools > Database in the left sidebar
   - Click "Create Database" and select PostgreSQL
   - Wait for the database to be created
3. **Run the application**:
   - The app will automatically detect the new database
   - Database tables will be created automatically
   - Server will start on the assigned port

### Running Locally

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up environment variables**:
   ```bash
   # Create .env file with:
   DATABASE_URL=your_postgresql_connection_string
   ```
4. **Run the application**:
   ```bash
   npm run dev
   ```

## Features

- **Multi-provider Authentication**: Email/password and Google OAuth
- **Role-based Access Control**: Customer, Admin, Employee, Shopkeeper roles
- **User Management**: Registration, profile management, role assignment
- **Database Integration**: PostgreSQL with automatic setup
- **Security**: reCAPTCHA v3, secure sessions, input validation
- **Responsive UI**: Mobile-friendly design with Tailwind CSS

## Architecture

### Frontend
- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS + Radix UI components
- React Hook Form with Zod validation

### Backend
- Node.js with Express.js
- PostgreSQL database with Drizzle ORM
- JWT-based authentication
- RESTful API design

### Database
- Automatic PostgreSQL setup in Replit
- Tables: users, sessions, otp_attempts, role_data, captchas
- Migrations handled automatically

## Project Structure

```
├── client/              # Frontend React application
├── server/              # Backend Express server
│   ├── storage-pg.ts    # PostgreSQL storage implementation
│   ├── storage-replit.ts # Replit Database fallback
│   ├── auto-setup.ts    # Automatic database setup
│   └── routes.ts        # API routes
├── shared/              # Shared types and schemas
└── scripts/             # Setup and utility scripts
```

## Environment Variables

The following variables are automatically set up in Replit:

- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Database connection details

For local development, you'll need to set these manually.

## Database Setup

The application includes automatic database setup:

1. **First Run**: When you start the app without a database, it will guide you through setup
2. **Automatic Migrations**: Database tables are created automatically using Drizzle migrations
3. **Fallback Storage**: If PostgreSQL isn't available, the app falls back to Replit Database

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/captcha/generate` - Generate CAPTCHA
- `POST /api/captcha/verify` - Verify CAPTCHA

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details