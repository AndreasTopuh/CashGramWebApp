import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

// Helper function for retry mechanism
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (attempt === maxRetries) throw error
      
      // Only retry on 503 (overloaded) or 429 (rate limit) errors
      if (error.status === 503 || error.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`Gemini API retry attempt ${attempt}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
  throw new Error('Max retries exceeded')
}

export interface ParsedExpense {
  amount: number
  description: string
  category?: string
  confidence: number
}

export interface MultipleExpenseResult {
  expenses: ParsedExpense[]
  totalFound: number
}

export class GeminiService {
  // Parse natural language expense input
  static async parseExpenseText(text: string): Promise<ParsedExpense | null> {
    try {
      const prompt = `
Analisis teks berikut untuk mengekstrak informasi pengeluaran dalam format JSON.
Teks: "${text}"

Ekstrak:
1. amount (angka dalam rupiah, hapus "rb", "ribu", "k" dll)
2. description (deskripsi singkat pengeluaran)
3. category (tebak kategori dari: Makanan, Transportasi, Belanja, Hiburan, Kesehatan, Pendidikan, Lainnya)
4. confidence (0-100, seberapa yakin parsing ini benar)

Contoh input: "nasi goreng 20rb" 
Output: {"amount": 20000, "description": "nasi goreng", "category": "Makanan", "confidence": 95}

Contoh input: "ojek 15k"
Output: {"amount": 15000, "description": "ojek", "category": "Transportasi", "confidence": 90}

PENTING: Berikan HANYA JSON murni tanpa teks tambahan apapun!
`

      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt)
      })
      const response = result.response.text().trim()
      
      // Enhanced JSON extraction
      let jsonString = response
      
      // Remove markdown code blocks if present
      jsonString = jsonString.replace(/```json\n?|\n?```/g, '').trim()
      
      // Try to extract JSON from response
      const jsonMatch = jsonString.match(/\{[^}]*\}/)
      if (jsonMatch) {
        jsonString = jsonMatch[0]
      }
      
      // Clean up common issues
      jsonString = jsonString
        .replace(/,\s*}/, '}')  // Remove trailing commas
        .replace(/,\s*,/g, ',') // Remove double commas
        .trim()
      
      console.log('Attempting to parse JSON:', jsonString)
      
      const parsed = JSON.parse(jsonString)
      
      // Validate required fields
      if (!parsed.amount || !parsed.description) {
        console.log('Missing required fields in parsed JSON')
        return null
      }
      
      return {
        amount: Number(parsed.amount),
        description: parsed.description,
        category: parsed.category || 'Lainnya',
        confidence: parsed.confidence || 50
      }
    } catch (error) {
      console.error('Error parsing expense with Gemini:', error)
      
      // Fallback: Try to parse manually for simple cases
      try {
        const fallbackResult = GeminiService.fallbackExpenseParser(text)
        if (fallbackResult) {
          console.log('Using fallback parser result')
          return fallbackResult
        }
      } catch (fallbackError) {
        console.error('Fallback parser also failed:', fallbackError)
      }
      
      return null
    }
  }

  // Fallback parser for when Gemini fails
  private static fallbackExpenseParser(text: string): ParsedExpense | null {
    try {
      // Simple regex-based parsing for common patterns
      const amountPattern = /(\d+(?:\.\d+)?)\s*(rb|ribu|k|000)/i
      const amountMatch = text.match(amountPattern)
      
      if (!amountMatch) return null
      
      let amount = parseFloat(amountMatch[1])
      const unit = amountMatch[2].toLowerCase()
      
      // Convert to rupiah
      if (unit === 'rb' || unit === 'ribu') {
        amount *= 1000
      } else if (unit === 'k') {
        amount *= 1000
      }
      
      // Extract description (remove amount and common words)
      let description = text
        .replace(amountPattern, '')
        .replace(/\b(kemarin|tadi|beli|bayar|untuk|ke|di|dari|saya|kan|trus|setelah|itu|pulang)\b/gi, '')
        .trim()
        .replace(/\s+/g, ' ')
      
      if (!description || description.length < 2) {
        description = 'Pengeluaran'
      }
      
      // Simple category detection
      let category = 'Lainnya'
      const foodKeywords = ['makan', 'nasi', 'ayam', 'soto', 'bakso', 'mie', 'kopi', 'teh', 'roti']
      const transportKeywords = ['ojek', 'bus', 'taksi', 'bensin', 'parkir', 'tol']
      
      const lowerText = text.toLowerCase()
      if (foodKeywords.some(keyword => lowerText.includes(keyword))) {
        category = 'Makanan'
      } else if (transportKeywords.some(keyword => lowerText.includes(keyword))) {
        category = 'Transportasi'
      }
      
      return {
        amount,
        description,
        category,
        confidence: 70 // Lower confidence for fallback parsing
      }
    } catch (error) {
      return null
    }
  }

  // Parse multiple expenses from one text input
  static async parseMultipleExpenses(text: string): Promise<MultipleExpenseResult | null> {
    try {
      const prompt = `
Parse this Indonesian text and extract ALL expenses/purchases mentioned.

Text: "${text}"

Find every expense/purchase mentioned and return as JSON:
{
  "expenses": [
    {
      "amount": number (in rupiah),
      "description": "item description only",
      "category": "Makanan|Transportasi|Belanja|Hiburan|Kesehatan|Komunikasi|Lainnya",
      "confidence": number (0-100)
    }
  ],
  "totalFound": number
}

Rules:
- Only extract actual purchases with monetary amounts
- Convert: rb/ribu → 1000, k → 1000
- Examples: "5rb" → 5000, "23ribu" → 23000, "15k" → 15000
- Ignore time references: kemarin, trus, setelah itu, pulang
- Category based on item: food items → Makanan, transport → Transportasi
- Clean description: "beli ayam goreng 5rb" → "ayam goreng"
- High confidence for clear amounts and items

PENTING: Berikan HANYA JSON murni tanpa teks tambahan!
`

      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt)
      })
      const response = result.response.text().trim()
      
      // Enhanced JSON cleaning
      let jsonString = response
      
      // Remove markdown formatting
      jsonString = jsonString.replace(/```json\n?|\n?```/g, '').trim()
      
      // Try to extract valid JSON object
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonString = jsonMatch[0]
      }
      
      // Clean up common JSON issues
      jsonString = jsonString
        .replace(/,\s*}/g, '}')      // Remove trailing commas in objects
        .replace(/,\s*]/g, ']')      // Remove trailing commas in arrays
        .replace(/,\s*,/g, ',')      // Remove double commas
        .replace(/}\s*{/g, '},{')    // Fix missing commas between objects
        .trim()
      
      console.log('Parsing multiple expenses JSON:', jsonString)
      
      const parsed = JSON.parse(jsonString)
      
      // Validate and filter response
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        const validExpenses = parsed.expenses.filter((exp: any) => 
          exp.amount && exp.amount > 0 && exp.description && exp.confidence > 60
        )
        
        return {
          expenses: validExpenses,
          totalFound: validExpenses.length
        }
      }
      
      return null
    } catch (error) {
      console.error('Error parsing multiple expenses:', error)
      
      // Try fallback: split by common separators and parse individually
      try {
        const parts = text.split(/\s+(trus|terus|lalu|kemudian|setelah itu)\s+/i)
        const expenses: ParsedExpense[] = []
        
        for (const part of parts) {
          const singleExpense = await GeminiService.parseExpenseText(part.trim())
          if (singleExpense && singleExpense.confidence > 60) {
            expenses.push(singleExpense)
          }
        }
        
        if (expenses.length > 0) {
          console.log('Using fallback multiple parsing')
          return {
            expenses,
            totalFound: expenses.length
          }
        }
      } catch (fallbackError) {
        console.error('Fallback multiple parsing failed:', fallbackError)
      }
      
      return null
    }
  }

  // Fallback analysis when AI quota is exceeded
  static generateFallbackAnalysis(expenses: any[]): string {
    if (!expenses || expenses.length === 0) {
      return `## 📊 **Analisis Pengeluaran**

### ❌ **Belum Ada Data**
Belum ada pengeluaran untuk dianalisis.

### 💡 **Mulai Catat**
- Mulai catat pengeluaran harian
- Gunakan format: "nasi goreng 20rb"
- Cek hasil dengan /saldo

### 💰 **Jangan Lupa**
- **Menabung**: Sisihkan minimal 20% untuk tabungan
- **Investasi**: Mulai investasi untuk masa depan yang lebih baik`
    }

    const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const categoryStats = expenses.reduce((acc: any, exp) => {
      const category = exp.category?.name || 'Lainnya'
      acc[category] = (acc[category] || 0) + exp.amount
      return acc
    }, {})

    const topCategory = Object.entries(categoryStats)
      .sort(([,a]: any, [,b]: any) => b - a)[0]

    const avgDaily = totalSpending / 7 // assuming weekly analysis
    
    return `## 📊 **Analisis Pengeluaran**

### 💰 **Ringkasan**
- **Total**: Rp ${totalSpending.toLocaleString('id-ID')}
- **Transaksi**: ${expenses.length} kali
- **Rata-rata**: Rp ${Math.round(avgDaily).toLocaleString('id-ID')} per hari

### 🏆 **Kategori Teratas**
${topCategory ? `${topCategory[0]} adalah yang tertinggi dengan Rp ${(topCategory[1] as number).toLocaleString('id-ID')}` : 'Belum ada kategori dominan'}

### 💡 **Saran Sederhana**
- Pantau pengeluaran harian secara rutin
- Buat budget untuk kategori yang sering digunakan
- Cari alternatif yang lebih hemat untuk pengeluaran besar

### 💰 **Jangan Lupa**
- **Menabung**: Sisihkan minimal 20% untuk tabungan  
- **Investasi**: Mulai investasi untuk masa depan yang lebih baik
- **Emergency Fund**: Siapkan dana darurat 3-6 bulan pengeluaran`
  }

  // Generate spending analysis
  static async generateSpendingAnalysis(expenses: any[]): Promise<string> {
    try {
      const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const categories = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount
        return acc
      }, {})

      const expenseData = {
        total: totalSpending,
        count: expenses.length,
        categories,
        recent: expenses.slice(0, 10)
      }

      const prompt = `
Analisis data pengeluaran berikut dan berikan insight dalam bahasa Indonesia yang mudah dipahami:

Data pengeluaran:
${JSON.stringify(expenseData, null, 2)}

Buat analisis dengan format MARKDOWN berikut:

## 📊 **Ringkasan Pengeluaran**
- **Total:** Rp [total]
- **Transaksi:** [jumlah] kali
- **Rata-rata harian:** Rp [rata-rata]

## 🏆 **Yang Paling Banyak**
[Kategori] adalah yang paling banyak dengan Rp [jumlah] ([persentase]% dari total).

## 💡 **Yang Menarik**
- [Insight sederhana tentang pola pengeluaran]
- [Pola kebiasaan yang terlihat]

## 💰 **Saran Sederhana**
- [Saran praktis dan mudah diterapkan]
- [Tips hemat yang realistis]

## � **Jangan Lupa!**
- **Menabung:** Sisihkan minimal 10% dari penghasilan untuk tabungan darurat
- **Investasi:** Mulai investasi kecil-kecilan untuk masa depan yang lebih baik
- **Evaluasi:** Periksa pengeluaran setiap minggu agar tetap terkontrol

Gunakan bahasa santai dan mudah dipahami. Maksimal 350 kata.
`

      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt)
      })
      return result.response.text()
    } catch (error: any) {
      console.error('Error generating analysis:', error)
      
      // Check if it's quota exceeded error
      if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
        console.log('Quota exceeded, using fallback analysis')
        return this.generateFallbackAnalysis(expenses)
      }
      
      // For other errors, also use fallback
      return this.generateFallbackAnalysis(expenses)
    }
  }

  // Generate monthly/weekly analysis
  static async generatePeriodAnalysis(expenses: any[], period: 'week' | 'month'): Promise<string> {
    try {
      const periodText = period === 'week' ? 'minggu ini' : 'bulan ini'
      const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      const prompt = `
Analisis pengeluaran ${periodText} dengan data berikut dan buat dalam format MARKDOWN:
- Total pengeluaran: Rp ${totalSpending.toLocaleString('id-ID')}
- Jumlah transaksi: ${expenses.length}
- Pengeluaran per hari: ${expenses.map(e => `${e.description}: Rp ${e.amount.toLocaleString('id-ID')}`).join(', ')}

Buat analisis dengan format MARKDOWN berikut:

## 📊 **Analisis Pengeluaran ${periodText.charAt(0).toUpperCase() + periodText.slice(1)}**

### 💰 **Ringkasan**
- **Total:** Rp [total]
- **Transaksi:** [jumlah] kali
- **Rata-rata:** Rp [rata-rata] per hari

### 📈 **Status Pengeluaran**
[Apakah pengeluaran wajar/normal untuk ${periodText}?]

### 🏆 **Kategori Favorit**
[Kategori mana yang paling banyak dan berapa persentasenya?]

### 💡 **Saran Sederhana**
- [Saran praktis yang mudah diterapkan]
- [Tips hemat yang realistis]

### 🏦 **Jangan Lupa**
- **Menabung:** Sisihkan minimal 20% untuk tabungan
- **Investasi:** Mulai investasi untuk masa depan

Gunakan bahasa santai dan mudah dipahami. Maksimal 200 kata.
`

      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt)
      })
      return result.response.text()
    } catch (error: any) {
      console.error('Error generating period analysis:', error)
      
      // Check if it's quota exceeded error
      if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
        console.log('Quota exceeded, using fallback period analysis')
        const periodText = period === 'week' ? 'Minggu' : 'Bulan'
        
        if (!expenses || expenses.length === 0) {
          return `## 📊 **Analisis ${periodText} Ini**

### ❌ **Belum Ada Data**
Belum ada pengeluaran untuk ${periodText.toLowerCase()} ini.

### 💡 **Mulai Catat**
- Catat pengeluaran harian dengan format: "nasi goreng 20rb"
- Gunakan /saldo untuk cek total hari ini

### 💰 **Jangan Lupa**
- **Menabung**: Sisihkan minimal 20% untuk tabungan
- **Investasi**: Mulai investasi untuk masa depan`
        }
        
        const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const avgDaily = totalSpending / (period === 'week' ? 7 : 30)
        const categoryStats = expenses.reduce((acc: any, exp) => {
          const category = exp.category?.name || 'Lainnya'
          acc[category] = (acc[category] || 0) + exp.amount
          return acc
        }, {})
        
        const topCategory = Object.entries(categoryStats)
          .sort(([,a]: any, [,b]: any) => b - a)[0]
        
        return `## 📊 **Analisis ${periodText} Ini**

### 💰 **Ringkasan**
- **Total**: Rp ${totalSpending.toLocaleString('id-ID')}
- **Transaksi**: ${expenses.length} kali
- **Rata-rata**: Rp ${Math.round(avgDaily).toLocaleString('id-ID')} per hari

### 🏆 **Kategori Favorit**
${topCategory ? `${topCategory[0]} adalah yang paling banyak dengan Rp ${(topCategory[1] as number).toLocaleString('id-ID')}` : 'Belum ada kategori dominan'}

### 💡 **Saran Sederhana**
- Pantau pengeluaran harian agar tetap terkontrol
- Cari alternatif hemat untuk pengeluaran besar
- Buat target pengeluaran untuk ${periodText.toLowerCase()} depan

### 🏦 **Jangan Lupa**
- **Menabung**: Sisihkan minimal 20% untuk tabungan
- **Investasi**: Mulai investasi untuk masa depan`
      }
      
      // For other errors, return simple error message
      const periodText = period === 'week' ? 'minggu ini' : 'bulan ini'
      return `## ❌ **Error**\nMaaf, terjadi kesalahan saat menganalisis pengeluaran ${periodText}.`
    }
  }
}