# Frontend Integration: Delete Category Button

## React Component Example

```tsx
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface CategoryItemProps {
  category: {
    id: string
    name: string
    userId: string
  }
  userToken: string
  onCategoryDeleted: () => void
}

const CategoryItem: React.FC<CategoryItemProps> = ({ 
  category, 
  userToken, 
  onCategoryDeleted 
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeleteClick = () => {
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('Kategori berhasil dihapus!')
        onCategoryDeleted()
      } else {
        // Show specific error message in Indonesian
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Terjadi kesalahan saat menghapus kategori')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const cancelDelete = () => {
    setShowConfirm(false)
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{category.name}</h3>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Edit button would go here */}
        
        {!showConfirm ? (
          <button
            onClick={handleDeleteClick}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Hapus kategori"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Yakin hapus?</span>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Ya'}
            </button>
            <button
              onClick={cancelDelete}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CategoryItem
```

## Usage in Main Component

```tsx
import { useState, useEffect } from 'react'
import CategoryItem from './CategoryItem'

const CategoryManagement = () => {
  const [categories, setCategories] = useState([])
  const [userToken, setUserToken] = useState('')

  useEffect(() => {
    // Get user token from localStorage or auth context
    const token = localStorage.getItem('authToken')
    if (token) {
      setUserToken(token)
      fetchCategories(token)
    }
  }, [])

  const fetchCategories = async (token: string) => {
    try {
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Fetch categories error:', error)
    }
  }

  const handleCategoryDeleted = () => {
    // Refresh categories list after deletion
    if (userToken) {
      fetchCategories(userToken)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Kelola Kategori</h2>
      
      <div className="space-y-3">
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            userToken={userToken}
            onCategoryDeleted={handleCategoryDeleted}
          />
        ))}
      </div>
    </div>
  )
}

export default CategoryManagement
```

## Integration with Existing Budget Interface

Based on your screenshot, you can add the delete functionality to your existing budget interface:

```tsx
// In your budget allocation component
const BudgetAllocationItem = ({ allocation, userToken }) => {
  return (
    <div className="budget-item">
      <span className="category-name">{allocation.category.name}</span>
      <input 
        type="number" 
        value={allocation.allocatedAmount}
        onChange={handleAmountChange}
      />
      <div className="action-buttons">
        <button onClick={handleEdit}>✏️</button>
        <button 
          onClick={() => handleDelete(allocation.categoryId)}
          className="delete-btn"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
```

## API Integration Points

1. **User Authentication**: Make sure user token is available
2. **Error Handling**: Display Indonesian error messages to user  
3. **UI Feedback**: Show loading state during deletion
4. **Confirmation**: Always confirm before deleting
5. **List Refresh**: Update category list after successful deletion

## Error Messages You'll Receive

- `"Kategori tidak ditemukan atau bukan milik Anda"` - Category not found/not owned
- `"Tidak dapat menghapus kategori yang memiliki X pengeluaran"` - Has expenses
- `"Tidak dapat menghapus kategori yang memiliki alokasi budget"` - Has budget allocations

The API is fully ready and secure! Just integrate with your UI components.