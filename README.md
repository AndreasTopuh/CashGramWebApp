# CashGram Web App 💰

CashGram adalah aplikasi web untuk mengelola keuangan personal yang dibangun dengan Next.js 15, Prisma ORM, dan Supabase PostgreSQL. Aplikasi ini memungkinkan pengguna untuk mencatat pengeluaran, mengkategorikan transaksi, dan melihat visualisasi data keuangan mereka.

## 🌟 Fitur Utama

- ✅ **Authentication System**: Registrasi dan login dengan JWT
- 💸 **Expense Tracking**: Catat dan kelola pengeluaran harian
- 📊 **Data Visualization**: Grafik dan chart untuk analisis keuangan
- 🏷️ **Categories Management**: Kategorisasi pengeluaran
- 📱 **Responsive Design**: Mobile-friendly interface
- 🔒 **Secure**: JWT authentication dan password hashing
- 🤖 **AI Integration**: Integration dengan Gemini AI untuk analisis keuangan
- 🌙 **Dark Mode**: Support tema gelap dan terang
- 💱 **Multi Currency**: Support multiple mata uang
- 📊 **Advanced Analytics**: Laporan keuangan detail dengan prediksi

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.x
- **Styling**: Tailwind CSS 4 dengan shadcn/ui components
- **Database**: Supabase PostgreSQL dengan Real-time subscriptions
- **ORM**: Prisma 5.x dengan advanced query optimization
- **Authentication**: NextAuth.js v5 + JWT dengan refresh tokens
- **Charts**: Recharts + Chart.js untuk visualisasi advanced
- **AI**: Google Gemini AI untuk analisis dan insights
- **State Management**: Zustand + React Query (TanStack Query)
- **Testing**: Jest + Testing Library + Playwright (E2E)
- **Deployment**: Vercel dengan Edge Functions
- **Monitoring**: Vercel Analytics + Sentry error tracking

## 📋 Prerequisites

Pastikan Anda telah menginstall:
- [Node.js](https://nodejs.org/) (versi 20 LTS atau lebih baru)
- [Git](https://git-scm.com/) (versi 2.40+)
- [pnpm](https://pnpm.io/) atau npm/yarn
- Account [Supabase](https://supabase.com/) (Free tier sudah cukup)
- Account [Vercel](https://vercel.com/) (untuk deployment)
- Account [Google Cloud](https://cloud.google.com/) (untuk Gemini AI API)

### Rekomendasi Development Environment:
- **IDE**: Visual Studio Code dengan extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prisma
  - Tailwind CSS IntelliSense
  - TypeScript Importer
  - Prettier
  - ESLint
- **Browser**: Chrome/Edge dengan React Developer Tools
- **Terminal**: Windows Terminal atau iTerm2 (macOS)

## 🚀 Setup Project dari Awal

### 1. Setup Supabase Database

#### Buat Project Supabase
1. Kunjungi [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi detail project:
   - **Organization**: Pilih atau buat organization baru
   - **Name**: CashGram
   - **Database Password**: Buat password yang kuat (minimal 12 karakter, kombinasi huruf besar/kecil, angka, dan simbol)
   - **Region**: Pilih region terdekat:
     - Asia Southeast (Singapore): `ap-southeast-1`
     - Asia East (Tokyo): `ap-northeast-1`
     - Asia South (Mumbai): `ap-south-1`
   - **Pricing Plan**: Free (Up to 500MB database, 2GB bandwidth)
4. Klik **"Create new project"**
5. Tunggu hingga project selesai dibuat (~2-5 menit)

#### Konfigurasi Database Security
1. **Row Level Security (RLS)**:
   - Pergi ke **Authentication > Policies**
   - Enable RLS untuk semua tabel
   - Buat policies untuk user access control

2. **Database Settings**:
   ```sql
   -- Enable necessary extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

#### Dapatkan Connection Strings
1. Di dashboard project, pergi ke **Settings > Database**
2. **Connection String**:
   - **URI (Direct)**: Untuk migrations dan development
   - **Connection Pooling**: Untuk production dan serverless
3. **API Keys**:
   - **Anon (public)**: Untuk client-side operations
   - **Service Role**: Untuk server-side admin operations

**Video Tutorial**: [Setup Supabase Database 2024](https://youtu.be/jA2-IwR0zjk?si=qIfpAncS_rm8C5Tj)

### 2. Setup Google Gemini AI

#### Dapatkan API Key Gemini
1. Kunjungi [Google AI Studio](https://aistudio.google.com/)
2. Login dengan akun Google
3. Klik **"Get API Key"**
4. **Create API Key in new project** atau pilih existing project
5. Copy API key yang dihasilkan
6. **Important**: Simpan API key dengan aman, jangan share publicly

#### Konfigurasi Quota dan Limits
- **Free Tier Limits**:
  - 60 requests per minute
  - 1,500 requests per day
  - Rate limit per model dapat bervariasi
- **Pro Account** (jika diperlukan):
  - Request limit lebih tinggi
  - Priority access
  - Advanced features

### 3. Clone dan Setup Project

```bash
# Clone repository
git clone https://github.com/AndreasTopuh/CashGramWebApp.git
cd CashGramWebApp

# Install dependencies (recommended: pnpm untuk performance)
pnpm install
# atau
npm install
# atau
yarn install

# Copy environment template
cp .env.example .env.local
```

### 4. Konfigurasi Environment Variables

Buat file `.env.local` di root project dengan konfigurasi lengkap:

```env
# Database Configuration (Supabase)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE-ROLE-KEY]"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-nextauth-key-32-chars-min"
JWT_SECRET="your-super-secret-jwt-key-here-32-chars-minimum"

# Google Gemini AI
GOOGLE_GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-1.5-pro-latest"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Analytics & Monitoring (Optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="your-analytics-id"
SENTRY_DSN="your-sentry-dsn"

# File Upload (Optional - untuk future features)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"
```

#### Cara Mendapatkan Setiap Environment Variable:

**Supabase Variables:**
1. **PROJECT-REF**: Dari URL project Supabase
2. **PASSWORD**: Password database yang dibuat saat setup
3. **REGION**: Region yang dipilih (contoh: ap-southeast-1)
4. **ANON-KEY**: Settings > API > anon public key
5. **SERVICE-ROLE-KEY**: Settings > API > service_role key (rahasia)

**Secrets Generation:**
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Setup Prisma dan Database Schema

#### Generate Prisma Client
```bash
# Generate Prisma client
npx prisma generate

# Format schema
npx prisma format
```

#### Database Migration
```bash
# Untuk Development (Push schema langsung)
npx prisma db push

# Untuk Production (Dengan migration history)
npx prisma migrate dev --name init

# Reset database (hati-hati - akan hapus semua data)
npx prisma migrate reset
```

#### Seed Database dengan Data Default
```bash
# Jalankan seeder untuk kategori default
npx prisma db seed

# Atau manual melalui API
npm run dev
# Buka http://localhost:3000/api/seed di browser
```

#### Prisma Studio (Database GUI)
```bash
# Buka Prisma Studio untuk manage database
npx prisma studio
# Akses di http://localhost:5555
```

### 6. Development Server

```bash
# Development mode
npm run dev
# atau
pnpm dev
# atau
yarn dev

# Production build test
npm run build
npm run start

# Linting dan Type checking
npm run lint
npm run type-check
```

**Development URLs:**
- App: [http://localhost:3000](http://localhost:3000)
- Prisma Studio: [http://localhost:5555](http://localhost:5555)
- API Documentation: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## 📁 Struktur Project yang Diperbaiki

```
cashgramwebapp/
├── src/
│   ├── app/                         # Next.js 15 App Router
│   │   ├── (auth)/                 # Auth routes group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/            # Protected routes group
│   │   │   ├── dashboard/
│   │   │   ├── expenses/
│   │   │   ├── categories/
│   │   │   ├── analytics/
│   │   │   └── profile/
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/               # Authentication endpoints
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── refresh/route.ts
│   │   │   ├── expenses/           # Expenses CRUD
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── categories/         # Categories management
│   │   │   ├── analytics/          # Analytics endpoints
│   │   │   ├── ai/                 # AI integration
│   │   │   │   ├── analyze/route.ts
│   │   │   │   └── insights/route.ts
│   │   │   └── seed/               # Database seeding
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── auth/                   # Authentication components
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── auth-guard.tsx
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── stats-card.tsx
│   │   ├── expenses/               # Expense components
│   │   │   ├── expense-form.tsx
│   │   │   ├── expense-list.tsx
│   │   │   └── expense-item.tsx
│   │   ├── charts/                 # Chart components
│   │   │   ├── expense-chart.tsx
│   │   │   ├── category-chart.tsx
│   │   │   └── trend-chart.tsx
│   │   └── common/                 # Common components
│   │       ├── loading.tsx
│   │       ├── error-boundary.tsx
│   │       └── pagination.tsx
│   ├── lib/                        # Utility functions
│   │   ├── auth.ts                 # JWT utilities
│   │   ├── prisma.ts               # Prisma client
│   │   ├── supabase.ts             # Supabase client
│   │   ├── gemini.ts               # Gemini AI client
│   │   ├── utils.ts                # General utilities
│   │   ├── validations.ts          # Zod schemas
│   │   └── constants.ts            # App constants
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-expenses.ts
│   │   ├── use-categories.ts
│   │   └── use-analytics.ts
│   ├── store/                      # State management
│   │   ├── auth-store.ts
│   │   ├── expense-store.ts
│   │   └── ui-store.ts
│   ├── types/                      # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── expense.ts
│   │   ├── category.ts
│   │   └── api.ts
│   └── styles/                     # Global styles
│       ├── globals.css
│       └── components.css
├── prisma/                         # Prisma configuration
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/                         # Static assets
│   ├── icons/
│   ├── images/
│   └── manifest.json
├── docs/                           # Documentation
│   ├── api.md
│   ├── deployment.md
│   └── contributing.md
├── tests/                          # Test files
│   ├── __mocks__/
│   ├── components/
│   ├── pages/
│   └── api/
├── .env.example                    # Environment variables template
├── .env.local                      # Local environment variables
├── .gitignore
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
├── pnpm-lock.yaml                  # Lock file
└── README.md
```

## 🗄️ Database Schema Terbaru

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  email     String?  @unique
  name      String
  password  String
  avatar    String?
  settings  Json?    @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  expenses     Expense[]
  budgets      Budget[]
  categories   Category[]
  sessions     Session[]
  
  @@map("users")
}

model Category {
  id          String   @id @default(cuid())
  name        String
  icon        String
  color       String
  description String?
  isDefault   Boolean  @default(false)
  userId      String?  // null untuk default categories
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user     User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses Expense[]
  budgets  Budget[]
  
  @@unique([name, userId])
  @@map("categories")
}

model Expense {
  id          String   @id @default(cuid())
  amount      Decimal  @db.Decimal(10, 2)
  description String?
  notes       String?
  date        DateTime @default(now())
  location    String?
  receipt     String?  // URL to receipt image
  tags        String[] @default([])
  isRecurring Boolean  @default(false)
  userId      String
  categoryId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])
  
  @@index([userId, date])
  @@index([categoryId])
  @@map("expenses")
}

model Budget {
  id         String   @id @default(cuid())
  name       String
  amount     Decimal  @db.Decimal(10, 2)
  period     Period   @default(MONTHLY)
  startDate  DateTime
  endDate    DateTime?
  userId     String
  categoryId String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  // Relations
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])
  
  @@map("budgets")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

enum Period {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}
```

## 🤖 AI Integration dengan Gemini

### Setup Gemini AI Client

```typescript
// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro-latest",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
  },
});

export async function analyzeExpenses(expenseData: any[]) {
  const prompt = `
    Analisis data pengeluaran berikut dan berikan insights:
    ${JSON.stringify(expenseData)}
    
    Berikan analisis dalam format JSON dengan:
    1. Total pengeluaran dan persentase perubahan
    2. Kategori dengan pengeluaran tertinggi
    3. Tren pengeluaran (naik/turun)
    4. Rekomendasi penghematan
    5. Prediksi pengeluaran bulan depan
  `;
  
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}
```

### Fitur AI yang Tersedia:

1. **Expense Analysis**: Analisis pola pengeluaran otomatis
2. **Smart Categorization**: Auto-categorize expenses berdasarkan deskripsi
3. **Budget Recommendations**: Saran budget berdasarkan historical data
4. **Financial Insights**: Insights dan tips pengelolaan keuangan
5. **Expense Prediction**: Prediksi pengeluaran masa depan

## 🔧 Commands Lengkap

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors automatically
npm run type-check      # TypeScript type checking
npm run format          # Format code with Prettier

# Database & Prisma
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema to database (dev)
npx prisma db pull      # Pull schema from database
npx prisma migrate dev  # Create and apply migration
npx prisma migrate reset # Reset database (WARNING: deletes all data)
npx prisma migrate deploy # Deploy migrations (production)
npx prisma studio       # Open Prisma Studio GUI
npx prisma db seed      # Run database seeder

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:e2e        # Run end-to-end tests
npm run test:e2e:ui     # Run E2E tests with UI

# Build & Deploy
npm run build           # Production build
npm run build:analyze   # Analyze bundle size
npm run preview         # Preview production build locally
npm run deploy          # Deploy to Vercel

# Code Quality
npm run format:check    # Check code formatting
npm run format:write    # Format all files
npm run lint:staged     # Lint staged files (used in pre-commit)
```

## 🚀 Deployment ke Vercel (Updated 2024)

### 1. Persiapan Deployment

```bash
# Pastikan semua test pass
npm run test
npm run build

# Commit semua perubahan
git add .
git commit -m "feat: ready for deployment"
git push origin main
```

### 2. Setup Vercel Project

#### Via Vercel CLI (Recommended):
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Setup project
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your personal account
# - Link to existing project? No
# - Project name: cashgram-webapp
# - In which directory is your code located? ./
# - Override settings? No
```

#### Via Vercel Dashboard:
1. Kunjungi [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **"New Project"**
3. Import repository dari GitHub
4. **Framework Preset**: Next.js (auto-detected)
5. **Root Directory**: `./` (default)
6. **Build Command**: `npm run build` (default)
7. **Output Directory**: `.next` (default)
8. **Install Command**: `npm install` (atau `pnpm install`)

### 3. Environment Variables untuk Production

Di Vercel Dashboard > Project Settings > Environment Variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `DATABASE_URL` | Supabase connection pooling URL | Production |
| `DIRECT_URL` | Supabase direct connection URL | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Production |
| `NEXTAUTH_URL` | Production URL (https://yourapp.vercel.app) | Production |
| `NEXTAUTH_SECRET` | 32+ character secret | Production |
| `JWT_SECRET` | 32+ character secret | Production |
| `GOOGLE_GEMINI_API_KEY` | Gemini AI API key | Production |
| `GEMINI_MODEL` | gemini-1.5-pro-latest | Production |

### 4. Production Database Migration

```bash
# Deploy migrations to production database
npx prisma migrate deploy

# Generate production client
npx prisma generate

# Seed production database (optional)
# Gunakan endpoint /api/seed atau manual via Prisma Studio
```

### 5. Domain Setup (Optional)

1. **Custom Domain**:
   - Vercel Dashboard > Project > Settings > Domains
   - Add domain dan follow DNS setup instructions

2. **HTTPS & Security**:
   - SSL certificates auto-managed oleh Vercel
   - Setup Security Headers di `next.config.js`

### 6. Performance Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  images: {
    domains: ['supabase.com', 'cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
  ],
};

module.exports = nextConfig;
```

## 📱 Panduan Penggunaan Aplikasi (Updated)

### 1. Getting Started

#### Akses Aplikasi:
- **Development**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

#### Browser Support:
- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+

### 2. Registrasi dan Authentication

#### Registrasi Akun Baru:
1. **Akses Halaman Registrasi**
   - Klik **"Daftar"** di halaman utama
   - Atau navigasi langsung ke `/register`

2. **Form Registrasi**:
   ```
   Nama Lengkap: Minimal 2 karakter, maksimal 50 karakter
   Nomor HP: Format Indonesia (08xxx atau +62xxx)
   Email: Format email valid (opsional)
   Password: Minimal 8 karakter, harus mengandung:
            - Huruf besar dan kecil
            - Minimal 1 angka
            - Minimal 1 karakter khusus
   Konfirmasi Password: Harus sama dengan password
   ```

3. **Validasi & Verification**:
   - Form validation real-time
   - Password strength indicator
   - Phone number format validation
   - Duplicate check untuk phone/email

4. **Berhasil Registrasi**:
   - Auto-redirect ke dashboard
   - Welcome toast notification
   - Auto-generate default categories

#### Login Process:
1. **Input Credentials**:
   - Phone/Email + Password
   - Support "Remember me" option
   - Forgot password link

2. **Authentication Flow**:
   - JWT token generation
   - Refresh token mechanism
   - Session persistence
   - Auto-redirect based on previous session

### 3. Dashboard Overview

#### Main Dashboard Components:

1. **Header Section**:
   ```
   - App logo (CashGram)
   - Navigation menu (Dashboard, Expenses, Analytics, Categories)
   - User profile dropdown
   - Notification bell
   - Theme toggle (dark/light)
   - Logout button
   ```

2. **Financial Summary Cards**:
   ```
   📊 Total Pengeluaran Bulan Ini
   - Amount dengan currency formatting
   - Persentase perubahan vs bulan lalu
   - Color indicator (green/red untuk naik/turun)
   
   📈 Rata-rata Harian
   - Kalkulasi berdasarkan hari aktif
   - Tren 7 hari terakhir
   - Target vs actual indicator
   
   🧾 Total Transaksi
   - Jumlah transaksi bulan ini
   - Perbandingan periode sebelumnya
   - Transaction frequency insights
   
   💰 Saldo Tersisa (jika budget diset)
   - Remaining budget amount
   - Burn rate calculation
   - Days remaining indicator
   ```

3. **Visualisasi Data Advanced**:
   ```
   📊 Expense Trend Chart (Line Chart)
   - Daily expense trends (30 days)
   - Moving average overlay
   - Hover tooltips dengan detail
   - Responsive design untuk mobile
   
   🥧 Category Distribution (Pie Chart)
   - Expense breakdown by category
   - Interactive slices
   - Percentage dan amount display
   - Custom color scheme
   
   📊 Monthly Comparison (Bar Chart)
   - Last 6 months comparison
   - YoY growth indicators
   - Drill-down capability
   - Export chart sebagai image
   
   📈 Budget vs Actual (Progress Bars)
   - Budget utilization per category
   - Visual progress indicators
   - Over-budget warnings
   - Recommendations dari AI
   ```

4. **Recent Transactions**:
   ```
   - 10 transaksi terbaru
   - Search dan filter capability
   - Quick actions (edit, delete, duplicate)
   - Infinite scroll untuk load more
   - Bulk operations (select multiple)
   ```

5. **AI Insights Panel** (New):
   ```
   🤖 Smart Insights powered by Gemini AI:
   - Spending pattern analysis
   - Budget recommendations
   - Anomaly detection
   - Financial tips personalized
   - Expense predictions
   ```

### 4. Expense Management (Enhanced)

#### Menambah Expense Baru:

1. **Access Methods**:
   - Floating action button (+) di dashboard
   - Header menu "Add Expense"
   - Keyboard shortcut: `Ctrl + N`
   - Quick add dari recent transactions

2. **Enhanced Expense Form**:
   ```typescript
   interface ExpenseForm {
     amount: number;           // Currency input dengan formatter
     description: string;      // Auto-suggestions berdasarkan history
     category: string;         // Dropdown dengan search
     date: Date;              // Date picker dengan calendar
     notes?: string;          // Rich text editor
     location?: string;       // GPS integration atau manual input
     receipt?: File;          // Image upload dengan preview
     tags: string[];          // Tag system untuk better organization
     isRecurring: boolean;    // Recurring expense setup
     paymentMethod?: string;  // Cash, card, digital wallet, etc.
   }
   ```

3. **Smart Features**:
   ```
   🤖 AI Auto-Categorization:
   - Otomatis suggest kategori berdasarkan deskripsi
   - Learning dari historical data user
   - Manual override available
   
   📱 Receipt OCR (Future Feature):
   - Extract amount dan merchant dari foto receipt
   - Auto-fill form berdasarkan OCR results
   
   📍 Location Services:
   - Auto-detect location untuk context
   - Merchant recognition
   - Location-based spending insights
   
   🔄 Recurring Expenses:
   - Setup interval (daily, weekly, monthly, yearly)
   - Auto-create future expenses
   - Notification sebelum due date
   ```

#### View & Manage Expenses:

1. **Expense List View**:
   ```
   📋 Advanced Filtering:
   - Date range picker (presets: today, week, month, year)
   - Category multi-select
   - Amount range slider
   - Payment method filter
   - Tag-based filtering
   - Custom search queries
   
   📊 Sorting Options:
   - Date (newest/oldest first)
   - Amount (high to low / low to high)
   - Category alphabetical
   - Recently modified
   
   💫 Display Options:
   - List view (detailed)
   - Card view (visual)
   - Table view (compact)
   - Calendar view (by date)
   ```

2. **Bulk Operations**:
   ```
   ✅ Select Multiple Expenses:
   - Checkbox selection
   - Select all/none
   - Select by criteria
   
   🔄 Bulk Actions:
   - Delete multiple expenses
   - Change category en masse
   - Export selected expenses
   - Duplicate expenses
   - Apply tags to multiple items
   ```

3. **Individual Expense Actions**:
   ```
   ✏️ Edit: Full form editing dengan validation
   🗑️ Delete: Soft delete dengan undo option
   📋 Duplicate: Create similar expense
   📤 Share: Export sebagai receipt atau report
   📊 View Analytics: Expense-specific insights
   ```

### 5. Categories Management (Enhanced)

#### Default Categories (Updated):
```typescript
const defaultCategories = [
  { name: 'Makanan & Minuman', icon: '🍔', color: '#10B981', budget: 1000000 },
  { name: 'Transportasi', icon: '🚗', color: '#3B82F6', budget: 500000 },
  { name: 'Hiburan', icon: '🎬', color: '#8B5CF6', budget: 300000 },
  { name: 'Kesehatan', icon: '🏥', color: '#EF4444', budget: 400000 },
  { name: 'Pendidikan', icon: '📚', color: '#F59E0B', budget: 200000 },
  { name: 'Rumah Tangga', icon: '🏠', color: '#14B8A6', budget: 800000 },
  { name: 'Belanja', icon: '🛒', color: '#EC4899', budget: 600000 },
  { name: 'Tagihan', icon: '📄', color: '#6B7280', budget: 1500000 },
  { name: 'Investasi', icon: '📈', color: '#059669', budget: 1000000 },
  { name: 'Lain-lain', icon: '📦', color: '#94A3B8', budget: 200000 }
];
```

#### Custom Categories:
1. **Create New Category**:
   ```
   - Name: Unique nama kategori
   - Icon: Emoji picker atau custom upload
   - Color: Color palette atau custom hex
   - Budget: Optional monthly budget limit
   - Description: Category purpose explanation
   ```

2. **Category Analytics**:
   ```
   📊 Per-Category Insights:
   - Monthly spending trends
   - Budget vs actual comparison
   - Transaction frequency
   - Average transaction amount
   - Peak spending days/times
   ```

### 6. Advanced Analytics & Reports

#### Financial Dashboard:
```typescript
interface AnalyticsDashboard {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
  };
  trends: {
    monthlyTrends: MonthlyData[];
    categoryTrends: CategoryTrend[];
    dailyPatterns: DailyPattern[];
  };
  insights: {
    topCategories: CategoryInsight[];
    spendingPatterns: SpendingPattern[];
    recommendations: AIRecommendation[];
  };
  projections: {
    nextMonthForecast: number;
    yearEndProjection: number;
    budgetBurnRate: number;
  };
}
```

#### Export & Reporting:
```
📊 Report Formats:
- PDF detailed reports
- Excel/CSV data export
- JSON untuk developers
- Chart images (PNG/SVG)

📅 Report Periods:
- Daily, Weekly, Monthly, Quarterly, Yearly
- Custom date ranges
- Comparative periods (YoY, MoM)

📧 Scheduled Reports:
- Auto-email monthly reports
- Weekly spending summaries
- Budget alerts dan warnings
```

### 7. AI-Powered Features

#### Expense Analysis:
```
🤖 Gemini AI Integration:
1. Smart Categorization
2. Spending Pattern Analysis
3. Budget Recommendations
4. Anomaly Detection
5. Financial Health Score
6. Personalized Tips
7. Future Expense Predictions
```

#### AI Insights Examples:
```
💡 Sample AI Insights:
"Pengeluaran makanan Anda naik 25% bulan ini. Pertimbangkan untuk masak di rumah 2x seminggu untuk menghemat ~Rp 300,000."

"Pola pengeluaran menunjukkan spending paling tinggi di weekend. Setup budget khusus weekend untuk kontrol yang lebih baik."

"Berdasarkan tren 6 bulan terakhir, Anda bisa mencapai target tabungan dengan mengurangi hiburan 15% dan transportasi 10%."
```

### 8. Mobile Experience

#### Progressive Web App (PWA):
```
📱 Mobile Features:
- Add to home screen
- Offline functionality
- Push notifications
- Touch gestures
- Camera integration untuk receipt
- GPS location services
```

#### Mobile-Optimized UI:
```
📲 Mobile Design:
- Bottom navigation
- Swipe gestures
- Pull-to-refresh
- Infinite scroll
- Touch-friendly buttons
- Responsive charts
```

## 🔒 Security & Privacy

### Data Protection:
```typescript
// Security Measures Implemented
const securityFeatures = {
  authentication: {
    jwtTokens: 'Secure JWT dengan expiration',
    refreshTokens: 'Auto-refresh mechanism',
    sessionManagement: 'Secure session handling',
    passwordHashing: 'bcrypt dengan salt rounds 12'
  },
  dataProtection: {
    encryption: 'AES-256 untuk sensitive data',
    validation: 'Zod schema validation',
    sanitization: 'Input sanitization',
    sqlInjection: 'Prisma ORM protection'
  },
  privacy: {
    dataMinimization: 'Collect only necessary data',
    userConsent: 'Explicit consent untuk data usage',
    dataRetention: 'Auto-delete policy',
    anonymization: 'Personal data anonymization'
  }
};
```

### GDPR Compliance:
```
🔐 Privacy Rights:
- Right to access personal data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object to processing
```

## 🚨 Troubleshooting Guide

### Common Issues & Solutions:

#### 1. Database Connection Issues:
```bash
# Error: "Database connection failed"
# Solutions:
1. Verify connection strings di .env.local
2. Check Supabase project status
3. Confirm database password
4. Test connection:
   npx prisma db push --force-reset

# Connection string format check:
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

#### 2. Authentication Issues:
```bash
# Error: "JWT Secret not found"
# Solutions:
1. Set JWT_SECRET di environment variables
2. Generate new secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
3. Restart development server

# Error: "Invalid token"
# Solutions:
1. Clear browser localStorage
2. Check token expiration
3. Verify JWT_SECRET consistency
```

#### 3. Gemini AI Issues:
```bash
# Error: "Gemini API key invalid"
# Solutions:
1. Verify API key di Google AI Studio
2. Check API key permissions
3. Confirm quota limits tidak terlampaui
4. Test dengan curl:
   curl -H "Content-Type: application/json" \
        -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

#### 4. Build/Deployment Issues:
```bash
# Error: "Build failed"
# Solutions:
1. Check TypeScript errors:
   npm run type-check
2. Fix ESLint issues:
   npm run lint:fix
3. Verify environment variables
4. Clear Next.js cache:
   rm -rf .next

# Error: "Vercel deployment failed"
# Solutions:
1. Check build logs di Vercel dashboard
2. Verify environment variables di production
3. Check package.json dependencies
4. Try local build test:
   npm run build && npm run start
```

#### 5. Performance Issues:
```typescript
// Optimization Tips:
const performanceOptimizations = {
  database: {
    indexing: 'Add proper indexes pada frequently queried fields',
    connectionPooling: 'Use Supabase connection pooling',
    queryOptimization: 'Use Prisma select untuk specific fields'
  },
  frontend: {
    codesplitting: 'Dynamic imports untuk large components',
    imageOptimization: 'Next.js Image component',
    caching: 'React Query untuk API caching',
    bundleAnalysis: 'npm run build:analyze'
  }
};
```

## 📈 Monitoring & Analytics

### Production Monitoring:
```typescript
// Recommended monitoring tools
const monitoring = {
  performance: {
    vercelAnalytics: 'Built-in Vercel analytics',
    webVitals: 'Core Web Vitals monitoring',
    lighthouse: 'Lighthouse CI integration'
  },
  errors: {
    sentry: 'Error tracking dan alerting',
    logRocket: 'Session replay untuk debugging',
    vercelLogs: 'Server-side logging'
  },
  business: {
    googleAnalytics: 'User behavior tracking',
    mixpanel: 'Event tracking',
    hotjar: 'User experience insights'
  }
};
```

## 🤝 Contributing

### Development Workflow:
```bash
# 1. Fork repository
git clone https://github.com/YourUsername/CashGramWebApp.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Install dependencies
pnpm install

# 4. Setup environment
cp .env.example .env.local
# Fill in environment variables

# 5. Run development server
pnpm dev

# 6. Make changes dan test
pnpm test
pnpm build

# 7. Commit dengan conventional commits
git commit -m "feat: add amazing feature"

# 8. Push dan create PR
git push origin feature/amazing-feature
```

### Code Standards:
```typescript
// ESLint + Prettier configuration
const codeStandards = {
  formatting: 'Prettier dengan 2 spaces',
  linting: 'ESLint dengan TypeScript rules',
  commits: 'Conventional commits format',
  testing: 'Jest + Testing Library + Playwright',
  typeChecking: 'Strict TypeScript mode'
};
```

## 📚 Additional Resources

### Learning Materials:
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Gemini AI Documentation](https://ai.google.dev/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Video Tutorials:
- [CashGram Setup Tutorial](https://youtu.be/setup-tutorial)
- [Supabase Integration](https://youtu.be/supabase-integration)
- [Deployment to Vercel](https://youtu.be/vercel-deployment)

### Community:
- [GitHub Discussions](https://github.com/AndreasTopuh/CashGramWebApp/discussions)
- [Discord Server](https://discord.gg/cashgram)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/cashgram)

## 📞 Support & Contact

### Get Help:
- **Bug Reports**: [GitHub Issues](https://github.com/AndreasTopuh/CashGramWebApp/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/AndreasTopuh/CashGramWebApp/discussions)
- **Email Support**: figojen3@gmail.com
- **Documentation**: [Project Wiki](https://github.com/AndreasTopuh/CashGramWebApp/wiki)

### Response Times:
- Bug reports: 24-48 hours
- Feature requests: 1-2 weeks
- General questions: 24 hours
- Critical issues: 2-4 hours

## 📝 License & Legal

```
MIT License

Copyright (c) 2024 Andreas Topuh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🌟 Acknowledgments

### Special Thanks:
- [Next.js Team](https://nextjs.org/) - Amazing React framework
- [Prisma Team](https://prisma.io/) - Best-in-class database ORM
- [Supabase Team](https://supabase.com/) - Open source Firebase alternative
- [Vercel Team](https://vercel.com/) - Seamless deployment platform
- [Google AI](https://ai.google.dev/) - Gemini AI integration
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

### Contributors:
- Andreas Topuh ([@AndreasTopuh](https://github.com/AndreasTopuh)) - Creator & Lead Developer
- Community contributors who help improve this project

---

**CashGram Web App** - Mengelola keuangan personal dengan mudah dan cerdas 💰

*Last updated: September 2024*