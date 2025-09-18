import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

export interface ParsedExpense {
  amount: number
  description: string
  category?: string
  confidence: number
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

Berikan hanya JSON tanpa penjelasan tambahan:
`

      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      
      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate required fields
      if (!parsed.amount || !parsed.description) return null
      
      return {
        amount: Number(parsed.amount),
        description: parsed.description,
        category: parsed.category || 'Lainnya',
        confidence: parsed.confidence || 50
      }
    } catch (error) {
      console.error('Error parsing expense with Gemini:', error)
      return null
    }
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
Sebagai financial advisor AI, analisis data pengeluaran berikut dan berikan insight dalam bahasa Indonesia:

Data pengeluaran:
${JSON.stringify(expenseData, null, 2)}

Berikan analisis yang mencakup:
1. 📊 **Ringkasan Pengeluaran** - Total dan rata-rata harian
2. 🏆 **Kategori Tertinggi** - Kategori yang paling boros
3. 💡 **Insight & Pola** - Temukan pola pengeluaran yang menarik  
4. ⚠️ **Rekomendasi** - Saran untuk menghemat atau mengoptimalkan pengeluaran
5. 🎯 **Tips Praktis** - Tips konkret yang bisa diterapkan

Format dengan emoji dan markdown untuk tampilan yang menarik. Maksimal 500 kata.
`

      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Error generating analysis:', error)
      return 'Maaf, terjadi kesalahan saat menganalisis data pengeluaran Anda.'
    }
  }

  // Generate monthly/weekly analysis
  static async generatePeriodAnalysis(expenses: any[], period: 'week' | 'month'): Promise<string> {
    try {
      const periodText = period === 'week' ? 'minggu ini' : 'bulan ini'
      const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      const prompt = `
Analisis pengeluaran ${periodText} dengan data berikut:
- Total pengeluaran: Rp ${totalSpending.toLocaleString('id-ID')}
- Jumlah transaksi: ${expenses.length}
- Pengeluaran per hari: ${expenses.map(e => `${e.description}: Rp ${e.amount.toLocaleString('id-ID')}`).join(', ')}

Berikan insight singkat dan padat tentang:
1. Apakah pengeluaran wajar untuk ${periodText}?
2. Kategori mana yang dominan?
3. Saran singkat untuk periode selanjutnya

Maksimal 200 kata, gunakan bahasa santai dan emoji.
`

      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Error generating period analysis:', error)
      const periodText = period === 'week' ? 'minggu ini' : 'bulan ini'
      return `Maaf, terjadi kesalahan saat menganalisis pengeluaran ${periodText}.`
    }
  }
}