# 🤖 Panduan Testing Telegram Bot CashGram

## ✅ Perbaikan yang Sudah Dilakukan

### 1. **Refactoring Auth Flow**
- ✅ `/login` dan `/reset` dipindah ke awal (sebelum load telegramUser)
- ✅ Menghapus duplikasi handler command
- ✅ Perbaikan parameter function (hapus parameter tidak perlu)

### 2. **Perbaikan Login System**
- ✅ Login membuat/update `telegramUser` dengan `isActive: true`
- ✅ Logout set `isActive: false`
- ✅ Reset menghapus record `telegramUser` dari database

### 3. **Debug Commands**
- ✅ `/mystatus` - Cek status autentikasi
- ✅ `/checkdb [nomorhp]` - Cek data user di database
- ✅ `/debuglogin [nomorhp] [password]` - Test login tanpa benar-benar login

---

## 🚀 Cara Testing di Telegram

### **Persiapan:**
1. Buka Telegram
2. Cari bot: `@YOUR_BOT_NAME` 
3. Atau klik link: `https://t.me/YOUR_BOT_USERNAME`

### **Test Flow Lengkap:**

#### **STEP 1: Reset Data (Opsional)**
```
/reset
```
✅ Harapan: "Reset berhasil! Data Telegram Anda sudah dihapus."

---

#### **STEP 2: Cek Status Awal**
```
/mystatus
```
✅ Harapan: Menunjukkan `IsActive: false` atau user tidak ditemukan

---

#### **STEP 3: Coba Akses Tanpa Login (Harus Ditolak)**
```
50000 makan siang
```
❌ Harapan: "Anda belum terdaftar di sistem Telegram"

---

#### **STEP 4: Cek Data User di Database**
```
/checkdb 085717797065
```
✅ Harapan: Menampilkan data user dengan password

---

#### **STEP 5: Login**
```
/login 085717797065 11111
```
✅ Harapan: "LOGIN BERHASIL - Selamat datang kembali, Test User Telegram!"

---

#### **STEP 6: Cek Status Setelah Login**
```
/mystatus
```
✅ Harapan: 
- `IsActive: true`
- `UserID: [user_id]`
- `User Name: Test User Telegram`

---

#### **STEP 7: Catat Pengeluaran**
```
50000 makan siang
```
✅ Harapan: Menampilkan pilihan kategori dengan nomor 1-8

---

#### **STEP 8: Pilih Kategori**
```
1
```
✅ Harapan: "BERHASIL DICATAT! Rp 50.000 - makan siang - 🍔 Makanan"

---

#### **STEP 9: Cek Saldo**
```
/saldo
```
✅ Harapan: Menampilkan total pengeluaran hari ini (Rp 50.000)

---

#### **STEP 10: Cek Budget**
```
/budget
```
✅ Harapan: Menampilkan status budget dengan detail per kategori

---

#### **STEP 11: Catat Pengeluaran Format Alternatif**
```
beli kopi 25000
```
✅ Harapan: Menampilkan pilihan kategori

---

#### **STEP 12: Pilih Kategori Lain**
```
2
```
✅ Harapan: "BERHASIL DICATAT! Rp 25.000 - beli kopi - 🚗 Transportasi"

---

#### **STEP 13: Cek Saldo Lagi**
```
/saldo
```
✅ Harapan: Total pengeluaran hari ini (Rp 75.000)

---

#### **STEP 14: Test Analisis AI**
```
/analisis
```
✅ Harapan: Menampilkan analisis AI dari pengeluaran

---

#### **STEP 15: Logout**
```
/logout
```
✅ Harapan: "Anda telah logout dari CashGram Bot"

---

#### **STEP 16: Coba Akses Setelah Logout (Harus Ditolak)**
```
/saldo
```
❌ Harapan: "Anda belum login. Ketik /start untuk memulai."

---

#### **STEP 17: Login Ulang**
```
/login 085717797065 11111
```
✅ Harapan: "LOGIN BERHASIL"

---

## 🎯 Commands Yang Tersedia

### **Autentikasi:**
- `/start` - Mulai bot / Panduan awal
- `/login [nomorhp] [password]` - Login ke akun
- `/logout` - Keluar dari bot
- `/reset` - Hapus data Telegram dan login ulang

### **Pencatatan:**
- `[nominal] [deskripsi]` - Catat pengeluaran
  - Contoh: `50000 makan siang`
  - Contoh: `beli kopi 25000`
- `[nomor]` - Pilih kategori

### **Informasi:**
- `/saldo` - Total pengeluaran hari ini
- `/budget` - Status budget saat ini
- `/tabungan` - Total tabungan
- `/analisis` - AI analisis pengeluaran
- `/info` - Panduan lengkap

### **Debug:**
- `/mystatus` - Cek status autentikasi
- `/checkdb [nomorhp]` - Cek data user
- `/debuglogin [nomorhp] [password]` - Test login

---

## ⚠️ Troubleshooting

### **Masalah: "Anda belum login" padahal sudah login**
**Solusi:**
1. Cek status dengan `/mystatus`
2. Jika `IsActive: false`, logout dan login ulang:
   ```
   /reset
   /login 085717797065 11111
   ```

### **Masalah: Login gagal**
**Solusi:**
1. Cek data user:
   ```
   /checkdb 085717797065
   ```
2. Pastikan nomor HP dan password benar
3. Test login:
   ```
   /debuglogin 085717797065 11111
   ```

### **Masalah: Kategori tidak muncul**
**Solusi:**
1. Pastikan sudah login
2. Buat kategori di dashboard web: https://cash-gram-web-app.vercel.app
3. Refresh dengan logout/login ulang

---

## 📊 Hasil Yang Diharapkan

Setelah testing lengkap, Anda harus bisa:

✅ Login dan logout berhasil  
✅ Mencatat pengeluaran dengan berbagai format  
✅ Memilih kategori dengan mengetik nomor  
✅ Melihat saldo harian  
✅ Melihat status budget  
✅ Mendapat analisis AI  
✅ Session tetap aktif antar request  

---

## 🔧 Development Notes

### **Issue yang Sudah Diperbaiki:**
1. ✅ Duplikasi handler `/login`, `/reset`, `/mystatus`
2. ✅ Auth flow yang salah (telegramUser di-load setelah command di-handle)
3. ✅ Parameter function yang tidak perlu
4. ✅ Debug logging untuk troubleshooting

### **Deployment:**
- Kode sudah diperbaiki di `webhook-improved/route.ts`
- Perlu commit & push ke Git untuk Vercel auto-deploy
- Atau deploy manual via Vercel dashboard

---

## 📝 Test User Credentials

**Phone:** 085717797065  
**Password:** 11111  
**Name:** Test User Telegram

**Command untuk membuat test user:**
```bash
node dummyScripts/create-test-telegram-user.js
```

**Command untuk cek database:**
```bash
node dummyScripts/check-telegram-user-db.js
```

---

## 🚀 Next Steps

1. **Commit & Push** perubahan ke Git
2. **Deploy** ke Vercel (auto-deploy atau manual)
3. **Test** di Telegram menggunakan guide di atas
4. **Monitor** logs di Vercel untuk debug

---

**Happy Testing! 🎉**
