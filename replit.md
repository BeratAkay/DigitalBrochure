# E-Brochure Creator Application

## Overview

This is a full-stack web application for creating digital brochures and promotional campaigns. The system allows users to create campaigns by selecting products, applying discounts, and generating professional brochures. Built with a React frontend, Express.js backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack TypeScript Application
The application follows a monorepo structure with separate client and server directories, sharing common types and schemas through a shared directory. The system uses modern web technologies with TypeScript throughout for type safety.

### Frontend Architecture
- **Framework**: React 18 with Vite for development and building
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **File Uploads**: Multer for handling file uploads (templates, logos)
- **Development**: Hot reload with Vite integration

## Key Components

### Authentication System
- Simple username/password authentication
- Client-side session management with localStorage
- Protected routes requiring authentication
- Default test credentials (username: "test", password: "test")

### Campaign Management
- Campaign creation with product selection
- Product search and filtering by category
- Discount calculation and pricing management
- Campaign status tracking (draft, active, completed)

### Product Management
- Product catalog with categories (Electronics, Fashion, Home & Garden)
- Product search functionality
- Image handling for product displays
- Price management with discount calculations

### Template System
- Custom template upload functionality
- Template management for brochure generation
- File storage for template assets
- Thumbnail generation for template previews

### Brochure Generation
- Visual brochure editor with template selection
- Product positioning and customization on brochures
- PDF/PNG/JPEG export for final output
- Product rotation and scaling controls

## Data Flow

### Client-Server Communication
1. Frontend makes HTTP requests to backend API endpoints
2. Backend processes requests and interacts with PostgreSQL database
3. Responses are returned as JSON with appropriate status codes
4. TanStack Query manages caching and state synchronization

### File Upload Flow
1. Files uploaded through multipart/form-data
2. Multer middleware processes uploads to local storage
3. File paths stored in database for reference
4. Files served through static routes or API endpoints

### Campaign Creation Workflow
1. User searches and selects products
2. Products added to campaign with quantities and discounts
3. Template selected for brochure design
4. Products positioned and customized on brochure pages
5. Campaign saved as draft or activated
6. Brochure generated and available for download

## External Dependencies

### Database
- **Neon Database**: PostgreSQL hosting service
- **Connection**: Uses @neondatabase/serverless for connections
- **Migrations**: Drizzle Kit for schema management

### UI Components
- **Radix UI**: Comprehensive set of unstyled, accessible components
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel/slider functionality
- **Date-fns**: Date manipulation and formatting

### Development Tools
- **Vite**: Build tool and development server
- **ESBuild**: Fast JavaScript bundler for production
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Build Process
1. Frontend built using Vite to static assets in `dist/public`
2. Backend bundled using ESBuild to `dist/index.js`
3. Single deployable artifact with server serving static files

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Development vs production mode detection
- File upload directory configuration

### Production Considerations
- Static file serving for uploaded assets
- Database connection pooling
- Error handling and logging
- CORS configuration for cross-origin requests

## Recent Changes: Latest modifications with dates

### November 26, 2025 - Campaign Date Selection Feature
- **New Date Step**: Added dedicated "Date" step in creation workflow between Templates and Design
- **Turkish Date Formatting**: All dates display in Turkish locale (e.g., "27 KASIM", "22-27 KASIM")
- **Date Range Support**: Users can select single dates or date ranges for campaigns
- **Visual Date Badge**: Red badge (#E31E24) displays campaign dates in top-right corner of brochures
- **Design Section Controls**: Date can be edited in Design sidebar with calendar pickers and live preview
- **Date Sync**: Two-way date synchronization between create-campaign.tsx and brochure-editor.tsx via callbacks

### November 25, 2025 - Simplified Brochure Editor
- **Removed Phone Elements**: All phone number display and header phone area elements completely removed
- **Removed Banner Elements**: Banner upload, positioning, and customization features removed
- **Removed Logo Elements**: Logo upload, positioning, rotation, and scaling features removed
- **Streamlined UI**: Simplified brochure editor focusing solely on product placement and customization
- **Cleaner Codebase**: Reduced complexity by removing logo/banner/phone state management and UI controls
- **Transform Controls**: Simplified to only handle product rotation and scaling

### January 27, 2025 - Enhanced Supermarket Style Design
- **Authentic Supermarket Price Tags**: Redesigned to match Turkish supermarket catalogs with white name labels and red/yellow price backgrounds
- **Maximum Product Sizing**: Single product 380px, 2 products 300px, 3 products 240px for optimal space utilization  
- **Complete Background Removal**: Products appear as pure shapes without any container backgrounds or frames
- **Modern Price Display**: Large white prices on colored backgrounds (red for discounts, yellow for regular)
- **Turkish Promotional Elements**: Added "FIRSAT!" and "ÇOK UCUZ" badges matching local supermarket style
- **Enhanced Visual Separation**: Drop shadows and floating price tags for professional appearance
- **Smart Layout System**: Intelligent grid arrangement preventing overlaps with proper spacing

### January 24, 2025 - Enhanced Design Experience
- **Date Management**: Date selector moved outside design area for better UX
- **Interactive Elements**: Added draggable date elements on each brochure page 
- **Logo Interaction**: Logo area now clickable for upload/removal in Design view
- **Auto Layout**: Added automatic product arrangement feature enabled by default
- **Export Quality**: Enhanced JPEG download with 2x scale and 95% quality
- **Multi-page Support**: Fixed Create Campaign button and ZIP download for multiple pages

### Development Environment
- Hot module replacement for frontend
- TypeScript compilation checking
- Automatic server restart on changes
- Integrated error overlay for development

The application provides a complete solution for digital brochure creation with a focus on user experience, performance, and maintainability. The modular architecture allows for easy extension and modification of features while maintaining type safety throughout the stack.