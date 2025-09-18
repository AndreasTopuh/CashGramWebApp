# CashGram Web App 💰

CashGram adalah aplikasi web untuk mengelola keuangan personal yang dibangun dengan Next.js 15, Prisma ORM, dan Supabase PostgreSQL. Aplikasi ini memungkinkan pengguna untuk mencatat pengeluaran, mengkategorikan transaksi, dan melihat visualisasi data keuangan mereka.

## 🌟 Fitur Utama

- ✅ **Authentication System**: Registrasi dan login dengan JWT
- 💸 **Expense Tracking**: Catat dan kelola pengeluaran harian
- 📊 **Data Visualization**: Grafik dan chart untuk analisis keuangan
- 🏷️ **Categories Management**: Kategorisasi pengeluaran
- 📱 **Responsive Design**: Mobile-friendly interface
- 🔒 **Secure**: JWT authentication dan password hashing

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT dengan bcryptjs
- **Charts**: Recharts
- **Deployment**: Vercel

## 📋 Prerequisites

Pastikan Anda telah menginstall:
- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)
- [Git](https://git-scm.com/)
- Account [Supabase](https://supabase.com/)
- Account [Vercel](https://vercel.com/) (untuk deployment)

## 🚀 Setup Project dari Awal

### 1. Setup Supabase Database

#### Buat Project Supabase
1. Kunjungi [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi detail project:
   - **Name**: CashGram
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih region terdekat (Asia Southeast - Singapore)
4. Klik **"Create new project"**
5. Tunggu hingga project selesai dibuat (~2-3 menit)

#### Dapatkan Connection String
1. Di dashboard project, pergi ke **Settings > Database**
2. Scroll ke bagian **Connection string**
3. Pilih **URI** dan copy connection string
4. Copy juga **Connection pooling** untuk production

**Video Tutorial**: [Cara Menghubungkan Project ke Supabase](https://youtu.be/jA2-IwR0zjk?si=qIfpAncS_rm8C5Tj)

### 2. Clone dan Setup Project

```bash
# Clone repository
git clone https://github.com/AndreasTopuh/CashGramWebApp.git
cd CashGramWebApp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Konfigurasi Environment Variables

Buat file `.env` di root project dan isi dengan:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# JWT Secret for authentication
JWT_SECRET="your-super-secret-jwt-key-here"
```

**Cara mendapatkan CONNECTION STRING:**
1. Buka Supabase Dashboard > Settings > Database
2. **DATABASE_URL**: Copy dari "Connection pooling" (port 6543)
3. **DIRECT_URL**: Copy dari "Connection string" (port 5432)
4. Ganti `[YOUR-PASSWORD]` dengan password database Anda

### 4. Setup Prisma dan Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema ke database (untuk development)
npx prisma db push

# Atau buat migration (untuk production)
npx prisma migrate dev --name init

# Seed default categories
npm run dev
# Buka http://localhost:3000/api/seed di browser untuk menambahkan kategori default
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk melihat aplikasi.

## 📁 Struktur Project

```
src/
├── app/
│   ├── api/                 # API Routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── categories/     # Categories management
│   │   ├── expenses/       # Expenses CRUD
│   │   └── seed/           # Database seeding
│   ├── dashboard/          # Dashboard page
│   ├── login/              # Login page
│   ├── register/           # Register page
│   └── globals.css         # Global styles
├── components/             # Reusable components
├── lib/
│   ├── auth.ts            # JWT utilities
│   └── prisma.ts          # Prisma client
└── generated/prisma/       # Generated Prisma files
```

## 🗄️ Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  name      String
  password  String
  createdAt DateTime @default(now())
  expenses  Expense[]
}

model Category {
  id       String    @id @default(cuid())
  name     String
  icon     String
  color    String
  expenses Expense[]
}

model Expense {
  id          String   @id @default(cuid())
  amount      Float
  description String?
  date        DateTime @default(now())
  userId      String
  categoryId  String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category @relation(fields: [categoryId], references: [id])
}
```

## 🔧 Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Prisma
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema to database
npx prisma migrate dev  # Create and apply migration
npx prisma studio       # Open Prisma Studio
```

## 🚀 Deployment ke Vercel

### 1. Push ke GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy ke Vercel

1. Kunjungi [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **"New Project"**
3. Import repository GitHub Anda
4. **Framework Preset**: Next.js (detected automatically)
5. Klik **"Deploy"**

### 3. Tambahkan Environment Variables

Di Vercel Dashboard > Project Settings > Environment Variables, tambahkan:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `DATABASE_URL` | Connection pooling string dari Supabase | Production |
| `DIRECT_URL` | Direct connection string dari Supabase | Production |
| `JWT_SECRET` | Secret key untuk JWT | Production |

**Contoh Values:**
```
DATABASE_URL=postgresql://postgres.abc123:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.abc123:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-here
```

### 4. Redeploy

Setelah menambahkan environment variables, klik **"Redeploy"** untuk menerapkan perubahan.

## 📱 Cara Menggunakan Aplikasi

### 1. Registrasi
- Buka aplikasi dan klik **"Daftar"**
- Isi nama, nomor HP, dan password
- Klik **"Daftar"** untuk membuat akun

### 2. Login
- Gunakan nomor HP dan password yang telah didaftarkan
- Klik **"Masuk"**

### 3. Dashboard
- Lihat ringkasan pengeluaran bulanan
- Grafik pengeluaran harian dan kategori
- Daftar transaksi terbaru

### 4. Tambah Pengeluaran
- Klik **"Tambah Pengeluaran"**
- Isi nominal, deskripsi, dan pilih kategori
- Klik **"Simpan"**

## 🔧 Troubleshooting

### Error: "Database connection failed"
- Pastikan connection string Supabase benar
- Cek apakah database password sudah benar
- Verifikasi environment variables sudah diset

### Error: "JWT Secret not found"
- Pastikan `JWT_SECRET` sudah diset di environment variables
- Generate secret baru jika diperlukan

### Build Error di Vercel
- Cek console log di Vercel dashboard
- Pastikan semua environment variables sudah diset
- Coba redeploy setelah fix

## 🤝 Contributing

1. Fork repository
2. Buat branch baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/AndreasTopuh/CashGramWebApp/issues)
- **Email**: figojen3@gmail.com
- **Documentation**: [Wiki](https://github.com/AndreasTopuh/CashGramWebApp/wiki)

## 🌟 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database ORM
- [Supabase](https://supabase.com/) - Database hosting
- [Vercel](https://vercel.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Recharts](https://recharts.org/) - Chart library
