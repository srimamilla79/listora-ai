// WalmartCategoryPicker.tsx  (drop-in replacement)
'use client'
import React, { useEffect, useMemo, useState } from 'react'

type Node = {
  id?: string
  name: string
  children?: Node[]
  isLeaf?: boolean
  [k: string]: any
}

type LeafPayload = {
  category: Node
  spec: any | null
  version: '5.0' | '4.2' | 'unknown'
}

/**
 * This component supports EITHER:
 *  - onCategorySelect(category, attributes/spec)   // simpler callback
 *  - onLeafSelect({ category, spec, version })     // detailed payload
 * Provide whichever your parent uses; the component will call it.
 */
type Props = {
  userId: string
  onCategorySelect?: (category: Node, attributes: any) => void
  onLeafSelect?: (payload: LeafPayload) => void
  autoFetchSpec?: boolean
  initialPath?: string[]
  className?: string
}

export default function WalmartCategoryPicker({
  userId,
  onCategorySelect,
  onLeafSelect,
  autoFetchSpec = true,
  initialPath = [],
  className,
}: Props) {
  const [taxonomy, setTaxonomy] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSpec, setLoadingSpec] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [selectedPath, setSelectedPath] = useState<string[]>(initialPath)

  // ---- Fetch taxonomy and normalize safely ----
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        // IMPORTANT: send user id via header so the API can find the connection
        const res = await fetch(`/api/walmart/taxonomy`, {
          headers: { 'x-user-id': String(userId || '') },
        })
        const json = await res.json().catch(() => ({}))
        const raw = json?.data ?? json
        const normalized = normalizeTaxonomy(raw)
        if (!cancelled) {
          setTaxonomy(normalized)
          if (initialPath.length) {
            setSelectedPath((prev) => (prev.length ? prev : initialPath))
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(`Failed to load categories: ${String(e?.message || e)}`)
          setTaxonomy([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [userId, initialPath])

  // ---- Drill into the tree with guards (never assume arrays) ----
  const levelItems = useMemo<Node[]>(() => {
    let current: Node[] = taxonomy
    for (const segment of selectedPath) {
      if (!Array.isArray(current)) {
        current = []
        break
      }
      const match = current.find((n) => n?.name === segment)
      const next = match?.children
      current = Array.isArray(next) ? next : []
    }
    if (!Array.isArray(current)) return []
    if (!search) return current
    const q = search.toLowerCase()
    return current.filter((n) => (n?.name || '').toLowerCase().includes(q))
  }, [taxonomy, selectedPath, search])

  // ---- Click handlers ----
  const onClickNode = async (node: Node) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    const isLeaf = node.isLeaf ?? !hasChildren

    // Groups drill down; only leaf triggers callbacks/spec
    if (!isLeaf) {
      setSelectedPath((prev) => [...prev, node.name])
      setSearch('')
      return
    }

    // If you don't want spec here (e.g., offer-match), just call the simple callback
    if (!autoFetchSpec) {
      if (onCategorySelect) onCategorySelect(node, {})
      else if (onLeafSelect)
        onLeafSelect({ category: node, spec: null, version: 'unknown' })
      return
    }

    // Try spec v5.0 then v4.2 via your backend /api/walmart/spec (send x-user-id header)
    setLoadingSpec(true)
    setError(null)
    try {
      const pt = encodeURIComponent(node.name)
      const v5 = await fetchJsonSafe(
        `/api/walmart/spec?productTypes=${pt}&version=5.0`,
        { 'x-user-id': String(userId || '') }
      )
      if (v5?.ok && v5?.data && (v5.version === '5.0' || v5.version === '5')) {
        const spec = unwrapSpec(v5.data, node.name)
        if (onCategorySelect) onCategorySelect(node, spec)
        else if (onLeafSelect)
          onLeafSelect({ category: node, spec, version: '5.0' })
      } else {
        const v42 = await fetchJsonSafe(
          `/api/walmart/spec?productTypes=${pt}&version=4.2`,
          { 'x-user-id': String(userId || '') }
        )
        if (v42?.ok && v42?.data) {
          const spec = unwrapSpec(v42.data, node.name)
          if (onCategorySelect) onCategorySelect(node, spec)
          else if (onLeafSelect)
            onLeafSelect({ category: node, spec, version: '4.2' })
        } else {
          if (onCategorySelect) onCategorySelect(node, {})
          else if (onLeafSelect)
            onLeafSelect({ category: node, spec: null, version: 'unknown' })
        }
      }
    } catch (e: any) {
      setError(`Spec fetch failed: ${String(e?.message || e)}`)
      if (onCategorySelect) onCategorySelect(node, {})
      else if (onLeafSelect)
        onLeafSelect({ category: node, spec: null, version: 'unknown' })
    } finally {
      setLoadingSpec(false)
    }
  }

  const onBreadcrumbRoot = () => {
    setSelectedPath([])
    setSearch('')
  }
  const onBreadcrumbTo = (indexInclusive: number) => {
    setSelectedPath((prev) => prev.slice(0, indexInclusive + 1))
    setSearch('')
  }

  // ---- UI ----
  return (
    <div className={className ?? 'space-y-4'}>
      {/* Breadcrumbs */}
      <div className="flex items-center flex-wrap gap-x-2 text-sm">
        <button
          onClick={onBreadcrumbRoot}
          className="text-blue-600 hover:underline"
          aria-label="All Categories"
        >
          All Categories
        </button>
        {selectedPath.map((seg, i) => (
          <span key={`${seg}-${i}`} className="flex items-center">
            <span className="mx-1 text-gray-400">›</span>
            <button
              onClick={() => onBreadcrumbTo(i)}
              className="text-blue-600 hover:underline"
              aria-label={`Go to ${seg}`}
            >
              {seg}
            </button>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="w-full border rounded-lg px-3 py-2 pr-8"
        />
        {search && (
          <button
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={() => setSearch('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Status / Error */}
      {(loading || loadingSpec) && taxonomy.length === 0 && (
        <div className="text-sm text-gray-600">Loading categories…</div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* List */}
      <div className="border rounded-lg max-h-72 overflow-y-auto divide-y">
        {levelItems.map((n) => {
          const hasChildren = Array.isArray(n.children) && n.children.length > 0
          return (
            <button
              key={n.id || n.name}
              onClick={() => onClickNode(n)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
              disabled={loading || loadingSpec}
            >
              <span className="font-medium">{n.name}</span>
              {hasChildren ? (
                <span className="text-gray-400">›</span>
              ) : (
                <span className="text-gray-400">•</span>
              )}
            </button>
          )
        })}
        {levelItems.length === 0 && !loading && (
          <div className="px-4 py-3 text-sm text-gray-500">
            No categories found.
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------- helpers ------------------------- */

function normalizeTaxonomy(raw: any): Node[] {
  const liftArray = (obj: any): any[] | null => {
    if (!obj) return null
    if (Array.isArray(obj)) return obj
    return (
      obj?.productTypeGroups ??
      obj?.productTypes ??
      obj?.children ??
      obj?.nodes ??
      obj?.items ??
      obj?.data ??
      null
    )
  }

  const toNode = (node: any): Node => {
    const kidsRaw =
      node?.children ?? node?.nodes ?? node?.items ?? node?.productTypes ?? null
    const childrenArr = liftArray(kidsRaw)
    const kids = Array.isArray(childrenArr) ? childrenArr.map(toNode) : []
    return {
      id: node?.id ?? node?.name,
      name: node?.name ?? String(node?.id ?? 'Unnamed'),
      children: kids,
      isLeaf: kids.length === 0,
      ...node,
    }
  }

  const arr = liftArray(raw)
  if (Array.isArray(arr)) return arr.map(toNode)
  if (raw?.name || raw?.id) return [toNode(raw)]
  return []
}

function unwrapSpec(specResponse: any, productTypeName: string): any {
  if (!specResponse) return null
  const ptMap = specResponse.productTypes || specResponse?.data?.productTypes
  if (ptMap && ptMap[productTypeName]) return ptMap[productTypeName]
  if (specResponse.attributes || specResponse.rules) return specResponse
  return specResponse
}

async function fetchJsonSafe(
  url: string,
  headers?: Record<string, string>
): Promise<any> {
  try {
    const res = await fetch(url, { method: 'GET', headers })
    const text = await res.text()
    try {
      const json = text ? JSON.parse(text) : {}
      ;(json as any).__status = res.status
      return json
    } catch {
      return { __status: res.status, raw: text }
    }
  } catch (e: any) {
    return { __status: 0, error: String(e?.message || e) }
  }
}
