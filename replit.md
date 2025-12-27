# StreamManager Pro

## Overview

StreamManager Pro is a streaming service management application built for resellers who manage multiple streaming accounts (Netflix, Spotify, Disney+, etc.) and sell profile access to customers. The app handles account tracking, profile sales, renewals, financial records, and customer management with a modern dark-themed UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context (StreamingContext) for global state with TanStack Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **UI Components**: Radix UI primitives wrapped with shadcn/ui styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage
- **Authentication**: Custom session-based auth with bcryptjs password hashing
- **API Pattern**: RESTful JSON API under `/api/*` routes

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via `drizzle-kit push` command
- **Key Entities**:
  - `users`: Admin accounts with email/password auth
  - `services`: Streaming platforms (Netflix, Spotify, etc.) with colors and max profiles
  - `accounts`: Master accounts for each service with credentials and expiration
  - `profiles`: Individual profiles within accounts that can be sold to clients
  - `clients`: Customer information (name, phone)
  - `expenses`: Financial transactions (income/expenses/adjustments)

### Authentication Flow
- Session-based authentication using express-session
- Sessions stored in PostgreSQL via connect-pg-simple
- Protected routes use `requireAuth` middleware on the backend
- Frontend redirects unauthenticated users to `/login`

### Key Application Features
- **Dashboard**: Overview of accounts, profiles expiring soon, quick actions for sales and renewals
- **Accounts**: Manage master streaming accounts with credentials and expiration tracking
- **Profiles**: Manage individual profiles within accounts, assign to customers
- **Sales**: Sell available profiles to customers with pricing and duration
- **Renewals**: Extend account or profile subscriptions (accounts record as expenses, profiles as income)
- **Finances**: Track all income, expenses, and adjustments
- **Services**: Configure streaming platforms with custom colors and profile limits
- **Settings**: Configure notifications (Telegram integration prepared, WhatsApp placeholder)

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Third-Party Integrations
- **Telegram Bot API**: Prepared for sending notifications (requires bot token and chat ID in settings)
- **WhatsApp Business API**: Placeholder structure for future integration

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `date-fns`: Date manipulation and formatting
- `sonner`: Toast notifications
- `framer-motion`: Animations
- `drizzle-orm` + `drizzle-zod`: Database ORM with Zod validation
- `bcryptjs`: Password hashing
- `express-session` + `connect-pg-simple`: Session management