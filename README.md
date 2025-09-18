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

### 1. Registrasi Akun Baru

#### Langkah-langkah Registrasi:
1. **Akses Halaman Registrasi**
   - Buka aplikasi di browser: `http://localhost:3000` (development) atau URL deployment Anda
   - Klik tombol **"Daftar"** atau navigasi ke `/register`

2. **Isi Form Registrasi**
   - **Nama Lengkap**: Masukkan nama lengkap Anda
   - **Nomor HP**: Gunakan format Indonesia (contoh: 081234567890)
   - **Password**: Minimal 6 karakter, gunakan kombinasi huruf dan angka
   - **Konfirmasi Password**: Ketik ulang password yang sama

3. **Submit Registrasi**
   - Klik tombol **"Daftar"**
   - Sistem akan memvalidasi data dan membuat akun baru
   - Jika berhasil, Anda akan diarahkan ke halaman login

### 2. Login ke Aplikasi

#### Cara Login:
1. **Akses Halaman Login**
   - Navigasi ke `/login` atau klik **"Masuk"** dari halaman utama

2. **Masukkan Kredensial**
   - **Nomor HP**: Gunakan nomor HP yang sama saat registrasi
   - **Password**: Masukkan password Anda

3. **Proses Login**
   - Klik tombol **"Masuk"**
   - Sistem akan memverifikasi kredensial
   - Jika valid, Anda akan diarahkan ke dashboard

### 3. Navigasi Dashboard

#### Komponen Dashboard:
1. **Header Navigation**
   - Logo aplikasi CashGram di kiri atas
   - Menu navigasi utama
   - Tombol logout di kanan atas

2. **Ringkasan Keuangan**
   - **Total Pengeluaran Bulan Ini**: Menampilkan total spending bulan berjalan
   - **Rata-rata Harian**: Kalkulasi pengeluaran rata-rata per hari
   - **Jumlah Transaksi**: Total transaksi dalam bulan ini

3. **Visualisasi Data**
   - **Grafik Pengeluaran Harian**: Chart line menunjukkan tren pengeluaran
   - **Grafik Kategori**: Pie chart pembagian pengeluaran per kategori
   - **Grafik Bulanan**: Bar chart perbandingan pengeluaran bulanan

4. **Daftar Transaksi Terbaru**
   - 10 transaksi terakhir dengan detail lengkap
   - Informasi: tanggal, deskripsi, kategori, dan nominal

### 4. Mengelola Pengeluaran

#### Menambah Pengeluaran Baru:
1. **Akses Form Tambah Pengeluaran**
   - Klik tombol **"+ Tambah Pengeluaran"** di dashboard
   - Atau navigasi ke halaman expense management

2. **Isi Detail Pengeluaran**
   - **Nominal**: Masukkan jumlah uang (dalam Rupiah)
   - **Deskripsi**: Keterangan transaksi (opsional tapi disarankan)
   - **Kategori**: Pilih dari dropdown kategori yang tersedia
   - **Tanggal**: Secara default hari ini, bisa diubah sesuai kebutuhan

3. **Simpan Transaksi**
   - Klik tombol **"Simpan"**
   - Data akan tersimpan ke database
   - Kembali ke dashboard dengan data terupdate

#### Melihat Detail Pengeluaran:
1. **Akses Daftar Lengkap**
   - Klik **"Lihat Semua"** pada bagian transaksi terbaru
   - Atau navigasi ke `/expenses`

2. **Filter dan Pencarian**
   - Filter berdasarkan tanggal (harian, mingguan, bulanan)
   - Filter berdasarkan kategori
   - Pencarian berdasarkan deskripsi

3. **Aksi Transaksi**
   - **Edit**: Ubah detail transaksi yang sudah ada
   - **Hapus**: Menghapus transaksi (dengan konfirmasi)
   - **Detail**: Melihat informasi lengkap transaksi

### 5. Mengelola Kategori

#### Kategori Default:
Aplikasi menyediakan kategori default:
- 🍔 **Makanan** (Hijau)
- 🚗 **Transportasi** (Biru)
- 🎬 **Hiburan** (Purple)
- 🏥 **Kesehatan** (Merah)
- 📚 **Pendidikan** (Orange)
- 🏠 **Rumah Tangga** (Teal)

#### Menambah Kategori Baru:
1. **Akses Manajemen Kategori**
   - Navigasi ke `/api/categories` (untuk admin)
   - Atau hubungi administrator sistem

2. **Data Kategori Baru**
   - Nama kategori (unik)
   - Icon emoji yang sesuai
   - Warna kategori (hex code)

### 6. Tips Penggunaan Optimal

#### Best Practices:
1. **Konsistensi Input**
   - Catat pengeluaran secara real-time
   - Gunakan deskripsi yang jelas dan konsisten
   - Pilih kategori dengan tepat

2. **Monitoring Rutin**
   - Cek dashboard setiap hari
   - Review grafik pengeluaran mingguan
   - Analisis tren pengeluaran bulanan

3. **Analisis Data**
   - Gunakan grafik kategori untuk identifikasi area pengeluaran terbesar
   - Monitor grafik harian untuk mendeteksi pola tidak normal
   - Bandingkan data bulanan untuk melihat progress

#### Keyboard Shortcuts:
- `Ctrl + N`: Tambah pengeluaran baru (pada halaman dashboard)
- `Ctrl + D`: Kembali ke dashboard
- `Ctrl + L`: Logout

### 7. Fitur Keamanan

#### Proteksi Akun:
- **Session Management**: Otomatis logout setelah periode tidak aktif
- **JWT Authentication**: Token keamanan untuk setiap request
- **Password Encryption**: Password di-hash menggunakan bcrypt

#### Data Privacy:
- Data personal tersimpan dengan enkripsi
- Akses data dibatasi per user (tidak bisa melihat data user lain)
- Backup otomatis ke Supabase dengan keamanan tingkat enterprise

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
