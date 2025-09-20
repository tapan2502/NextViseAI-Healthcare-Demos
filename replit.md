# Overview

This is a full-stack healthcare demo application called "NextViseAI — Healthcare Demos" that showcases telehealth and telepharmacy services. The application provides AI-powered voice agents, avatar consultations, appointment booking, prescription generation, and multi-channel communication features (SMS, WhatsApp, email). It's built as a demonstration platform with simulated functionality rather than a production healthcare system.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React SPA**: Built with React and TypeScript using Vite as the build tool
- **UI Framework**: Implements shadcn/ui component library with Tailwind CSS for styling
- **State Management**: Uses React Query (@tanstack/react-query) for server state and local React state for component-level data
- **Routing**: Implements client-side routing with Wouter library
- **Internationalization**: Multi-language support (English, German, Arabic) with RTL layout support
- **Component Structure**: Modular component architecture with separate sections for telehealth and telepharmacy features

## Backend Architecture
- **Express.js Server**: RESTful API server with middleware for request logging and error handling
- **Database Layer**: Uses Drizzle ORM with PostgreSQL (Neon serverless) for data persistence
- **Service Layer**: Organized into separate services for email, SMS/WhatsApp, and prescription generation
- **Development Setup**: Vite integration for hot module replacement in development mode

## Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Centralized schema definitions in shared directory
- **Fallback Storage**: In-memory storage implementation for development/demo purposes

## Authentication and Authorization
- **User Management**: Basic user system with username/password authentication
- **Session Handling**: Express session management with PostgreSQL session store
- **Demo Mode**: Consent-based access for healthcare demonstrations

## External Service Integrations
- **Email Service**: SendGrid integration for sending healthcare summaries and prescriptions
- **SMS/WhatsApp**: Twilio integration for text messaging and WhatsApp communications
- **Communication Channels**: Multi-channel messaging system supporting email, SMS, and WhatsApp delivery
- **Demo Fallback**: All external services have demo mode implementations that simulate functionality when API keys are not configured

# External Dependencies

- **Database**: Neon PostgreSQL serverless database
- **Email Provider**: SendGrid for transactional emails
- **SMS/WhatsApp Provider**: Twilio for messaging services  
- **UI Components**: Radix UI primitives via shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens
- **Development Tools**: Vite for development server and build tooling
- **Replit Integration**: Specialized plugins for Replit development environment