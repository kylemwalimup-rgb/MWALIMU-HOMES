# Rental Property Admin System

A complete, production-ready rental property management system built with modern web technologies. This system provides comprehensive tools for managing properties, units, tenants, leases, invoices, and payments with an elegant, intuitive interface.

## Features

### Property & Unit Management
- **Multi-property support**: Manage multiple rental properties from a single dashboard
- **Unit management**: Create and manage individual units within each property
- **Unit types**: Support for bedsitter, 1BR, 2BR, and shop units
- **Status tracking**: Track unit status (vacant, occupied, maintenance)
- **Base rent configuration**: Set individual rent and service charges for each unit

### Tenant Management
- **Complete tenant profiles**: Store tenant information including contact details, ID numbers, and emergency contacts
- **Tenant onboarding**: Streamlined workflow for adding new tenants
- **Search and filtering**: Easily find and manage tenant records

### Lease Management
- **Comprehensive lease agreements**: Track all lease details including start/end dates, rent amounts, and deposits
- **Security deposit tracking**: Record and manage security deposits
- **Move-in inspections**: Document unit condition at move-in
- **Opening balance**: Support for existing arrears from previous tenancies
- **Lease termination**: Complete workflow for ending leases with deposit deduction support

### Financial Management
- **Manual invoice creation**: Generate invoices for rent, service charges, and utilities
- **Payment recording**: Record payments with multiple methods (Cash, M-Pesa, Bank Transfer)
- **Transaction references**: Track payment reference codes
- **Automatic status updates**: Invoices automatically update from Unpaid → Partially Paid → Fully Paid
- **Payment history**: Complete audit trail of all transactions

### Dashboard & Reporting
- **Occupancy rate**: Real-time calculation of property occupancy
- **Total arrears**: Track outstanding payments across all properties
- **Recent activity**: View latest payments and unpaid invoices
- **Quick actions**: Fast access to common tasks

### Security & Authentication
- **Admin-only access**: Secure authentication system
- **Protected routes**: All pages require authentication
- **Session management**: Secure cookie-based sessions

## Technology Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Backend**: Express 4 + tRPC 11
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: Manus OAuth (easily replaceable with NextAuth.js)
- **Type Safety**: TypeScript with end-to-end type safety via tRPC

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- pnpm 10.x or higher
- MySQL or compatible database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rental-property-admin
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:
- `DATABASE_URL`: Your MySQL connection string
- `JWT_SECRET`: Secret key for session signing
- Other authentication variables (see `.env.example`)

4. Run database migrations:
```bash
pnpm db:push
```

5. Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Database Schema

The system uses the following main tables:

- **users**: Admin user accounts
- **properties**: Rental properties
- **units**: Individual rental units within properties
- **tenants**: Tenant information
- **leases**: Rental agreements linking tenants to units
- **invoices**: Rent invoices with line items
- **payments**: Payment records linked to invoices

## Deployment

### Standard Deployment (Vercel, Netlify, Railway, etc.)

1. Build the application:
```bash
pnpm build
```

2. Set environment variables in your hosting platform

3. Deploy the `dist` folder

### Database Setup

The application requires a MySQL-compatible database. Supported options:
- MySQL 8.0+
- MariaDB 10.5+
- TiDB Cloud (recommended for serverless)
- PlanetScale
- AWS RDS MySQL
- Azure Database for MySQL

### Environment Variables

Required environment variables for production:

```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

## Usage Guide

### Initial Setup

1. **Add Properties**: Start by adding your rental properties with addresses and descriptions
2. **Create Units**: Add individual units to each property with rent amounts and unit types
3. **Register Tenants**: Add tenant information including contact details and emergency contacts
4. **Create Leases**: Link tenants to units with lease agreements, including deposits and move-in inspections

### Daily Operations

1. **Record Payments**: When tenants pay rent, record the payment with date, amount, method, and reference
2. **Create Invoices**: Generate monthly invoices for active leases
3. **Monitor Dashboard**: Check occupancy rates and outstanding arrears
4. **Manage Leases**: Terminate leases when tenants move out, with automatic deposit calculations

### Financial Workflow

1. Create invoices for the rental period (manual creation for now)
2. Tenants make payments
3. Record payments against invoices
4. System automatically updates invoice status
5. Track arrears on the dashboard

## Customization

### Replacing Authentication

The system currently uses Manus OAuth but can be easily adapted to use NextAuth.js or any other authentication system:

1. Replace the authentication logic in `server/_core/auth.ts`
2. Update the context in `server/_core/context.ts`
3. Modify the login flow in `client/src/components/DashboardLayout.tsx`

### Adding Features

The codebase is structured for easy extension:

- **New database tables**: Add to `drizzle/schema.ts`
- **New API endpoints**: Add to `server/routers.ts`
- **New pages**: Add to `client/src/pages/`
- **New components**: Add to `client/src/components/`

## Testing

Run the test suite:
```bash
pnpm test
```

The project includes comprehensive tests for:
- Property and unit management
- Tenant operations
- Dashboard statistics
- Authentication flows

## Project Structure

```
rental-property-admin/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # tRPC client setup
│   │   └── App.tsx        # Main app component
│   └── public/            # Static assets
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # tRPC API routes
│   ├── db.ts              # Database operations
│   └── _core/             # Core server functionality
├── drizzle/               # Database schema and migrations
│   └── schema.ts          # Database schema definitions
└── shared/                # Shared types and constants
```

## API Documentation

The application uses tRPC for type-safe API calls. Main routers:

- `properties`: CRUD operations for properties
- `units`: CRUD operations for units
- `tenants`: CRUD operations for tenants
- `leases`: Lease management including termination
- `invoices`: Invoice creation and listing
- `payments`: Payment recording and tracking
- `dashboard`: Statistics and reporting

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:
1. Verify `DATABASE_URL` is correctly formatted
2. Ensure database server is accessible
3. Check firewall rules and network connectivity
4. Verify database credentials

### Build Errors

If you encounter build errors:
1. Clear node_modules: `rm -rf node_modules && pnpm install`
2. Clear build cache: `rm -rf dist`
3. Ensure Node.js version is 22.x or higher

## Contributing

This is a private rental management system. For feature requests or bug reports, please contact the development team.

## License

MIT License - See LICENSE file for details

## Support

For support, please contact the system administrator or refer to the deployment documentation.

---

**Built with ❤️ for efficient rental property management**
