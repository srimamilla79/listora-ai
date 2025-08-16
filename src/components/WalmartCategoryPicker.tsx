// New component: WalmartCategoryPicker.tsx
import { useState, useEffect } from 'react'
import { Search, ChevronRight, Loader } from 'lucide-react'

interface WalmartCategoryPickerProps {
  userId: string
  onCategorySelect: (category: any, attributes: any) => void
}

export default function WalmartCategoryPicker({
  userId,
  onCategorySelect,
}: WalmartCategoryPickerProps) {
  const [taxonomy, setTaxonomy] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPath, setSelectedPath] = useState<string[]>([])

  useEffect(() => {
    loadTaxonomy()
  }, [userId])

  const loadTaxonomy = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/walmart/taxonomy?userId=${userId}`)
      const data = await response.json()
      if (data.ok) {
        setTaxonomy(data.data)
      }
    } catch (error) {
      console.error('Failed to load taxonomy:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLevel = () => {
    if (!taxonomy) return []

    let current = taxonomy
    for (const segment of selectedPath) {
      current =
        current.find((item: any) => item.name === segment)?.children || []
    }

    return current.filter(
      (item: any) =>
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // In selectCategory function:
  const selectCategory = async (category: any) => {
    // Check if it's a leaf node (Product Type, not Product Type Group)
    if (category.children?.length > 0) {
      // Navigate deeper - this is a PTG
      setSelectedPath([...selectedPath, category.name])
      setSearchTerm('')
    } else if (category.isLeaf || !category.children) {
      // This is a PT (leaf node) - safe to select
      setLoading(true)
      try {
        // Your existing spec loading code
        onCategorySelect(category, {})
      } catch (error) {
        console.error('Failed to select category:', error)
        // Show error to user
        alert('Please select a specific product type, not a category group')
      } finally {
        setLoading(false)
      }
    }
  }

  const extractRequiredAttributes = (spec: any) => {
    // Extract required fields from spec
    const required: any = {}

    if (spec.properties) {
      Object.entries(spec.properties).forEach(([key, value]: [string, any]) => {
        if (spec.required?.includes(key)) {
          required[key] = {
            type: value.type,
            description: value.description,
            enum: value.enum,
          }
        }
      })
    }

    return required
  }

  if (loading && !taxonomy) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="h-5 w-5 animate-spin text-blue-600" />
        <span className="ml-2">Loading categories...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      {selectedPath.length > 0 && (
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => setSelectedPath([])}
            className="text-blue-600 hover:underline"
          >
            All Categories
          </button>
          {selectedPath.map((segment, index) => (
            <span key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <button
                onClick={() =>
                  setSelectedPath(selectedPath.slice(0, index + 1))
                }
                className="text-blue-600 hover:underline ml-2"
              >
                {segment}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {/* Category List */}
      <div className="border rounded-lg max-h-60 overflow-y-auto">
        {getCurrentLevel().map((category: any) => (
          <button
            key={category.id || category.name}
            onClick={() => selectCategory(category)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b flex items-center justify-between"
            disabled={loading}
          >
            <span className="font-medium">{category.name}</span>
            {category.children?.length > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
