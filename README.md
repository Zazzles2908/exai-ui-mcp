# EXAI UI MCP

A Next.js application with comprehensive UI components and MCP (Model Context Protocol) chat interface.

## Features

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Prisma** - Database ORM
- **NextAuth.js** - Authentication
- **React Query** - Data fetching and caching
- **Framer Motion** - Animation library
- **Chart.js & Recharts** - Data visualization
- **MCP Chat Interface** - Model Context Protocol integration

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Zazzles2908/exai-ui-mcp.git
cd exai-ui-mcp
```

2. Navigate to the app directory:
```bash
cd app
```

3. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

4. Set up environment variables:
```bash
cp .env.example .env.local
```

5. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

6. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
 app/                    # Next.js app directory
    app/               # App router pages
    components/        # React components
       ui/           # Reusable UI components
       mcp-chat-interface.tsx
    hooks/            # Custom React hooks
    lib/              # Utility functions and configurations
    prisma/           # Database schema and migrations
 .gitignore
 README.md
 package.json
```

## Key Components

- **MCP Chat Interface** - Interactive chat component for Model Context Protocol
- **UI Components** - Comprehensive set of accessible UI components built with Radix UI
- **Theme Provider** - Dark/light theme support
- **Database Integration** - Prisma ORM with schema management

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Lucide React
- **State Management**: Zustand, Jotai
- **Data Fetching**: React Query, SWR
- **Forms**: React Hook Form, Formik
- **Animation**: Framer Motion
- **Charts**: Chart.js, Recharts, Plotly.js
- **Database**: Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS, PostCSS

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
