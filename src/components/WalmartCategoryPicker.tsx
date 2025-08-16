// WalmartCategoryPicker.tsx  (drop-in replacement)
'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Node = {
  id?: string
  name: string
  children?: Node[]
  isLeaf?: boolean
  // carry-through for any extra fields you might have
  [k: string]: any
}

type Props = {
  /** Your logged-in Listora user id */
  userId: string

  /**
   * Called when user selects a **leaf** Product Type.
   * You receive the normalized category, the resolved spec JSON, and the spec version used.
   */
  onLeafSelect: (payload: {
    category: Node
    spec: any | null // null if spec fetch disabled/fails
    version: '5.0' | '4.2' | 'unknown'
  }) => void

  /**
   * Auto-fetch the Walmart spec when a leaf is chosen.
   * Defaults to true. If false, we just return the leaf (category) and skip spec.
   */
  autoFetchSpec?: boolean

  /**
   * Optional: initial preselected path (breadcrumb), e.g. ['Home', 'Kitchen & Dining']
   * If provided, we’ll try to drill to that path on load (best-effort).
   */
  initialPath?: string[]

  /**
   * Optional CSS class wrapper.
   */
  className?: string
}

export default function WalmartCategoryPicker({
  userId,
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
        const res = await fetch(
          `/api/walmart/taxonomy?userId=${encodeURIComponent(userId)}`
        )
        const json = await res.json().catch(() => ({}))
        // Support either { ok, data } or raw array/object
        const raw = json?.data ?? json

        const normalized = normalizeTaxonomy(raw)
        if (!cancelled) {
          setTaxonomy(normalized)

          // Best-effort drill into initialPath if provided
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
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    // PTG → navigate deeper; PT leaf → continue
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    const isLeaf = node.isLeaf ?? !hasChildren

    if (!isLeaf) {
      // drill down
      setSelectedPath((prev) => [...prev, node.name])
      setSearch('')
      return
    }

    // Leaf selected → either auto-fetch spec or just return selection
    if (!autoFetchSpec) {
      onLeafSelect({ category: node, spec: null, version: 'unknown' })
      return
    }

    // Attempt spec v5.0 then v4.2 via your backend /api/walmart/spec
    setLoadingSpec(true)
    setError(null)
    try {
      const pt = encodeURIComponent(node.name)
      const v5 = await fetchJsonSafe(
        `/api/walmart/spec?userId=${encodeURIComponent(userId)}&productTypes=${pt}&version=5.0`
      )

      if (v5?.ok && v5?.data && (v5.version === '5.0' || v5.version === '5')) {
        onLeafSelect({
          category: node,
          spec: unwrapSpec(v5.data, node.name),
          version: '5.0',
        })
      } else {
        // fallback to 4.2 (or your server may already fallback; this is extra-safe)
        const v42 = await fetchJsonSafe(
          `/api/walmart/spec?userId=${encodeURIComponent(userId)}&productTypes=${pt}&version=4.2`
        )
        if (v42?.ok && v42?.data) {
          onLeafSelect({
            category: node,
            spec: unwrapSpec(v42.data, node.name),
            version: '4.2',
          })
        } else {
          // deliver leaf anyway so caller can proceed (e.g., offer-match doesn’t need spec)
          onLeafSelect({ category: node, spec: null, version: 'unknown' })
        }
      }
    } catch (e: any) {
      // don’t throw; return the leaf so users can still do offer-match
      setError(`Spec fetch failed: ${String(e?.message || e)}`)
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
      <div>
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

/**
 * Normalize any Walmart taxonomy response into a clean Node[] tree.
 * Handles common shapes:
 *  - array of nodes
 *  - { productTypeGroups: [...] }
 *  - { productTypes: [...] }
 *  - { children|nodes|items|data: [...] }
 *  - single node objects
 */
function normalizeTaxonomy(raw: any): Node[] {
  const liftArray = (obj: any): any[] | null => {
    if (!obj) return null
    if (Array.isArray(obj)) return obj
    return (
      obj.productTypeGroups ??
      obj.productTypes ??
      obj.children ??
      obj.nodes ??
      obj.items ??
      obj.data ??
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

/**
 * Some backends wrap the spec differently. Try to pull the PT section if present.
 */
function unwrapSpec(specResponse: any, productTypeName: string): any {
  if (!specResponse) return null

  // Common happy path: { productTypes: { [PT]: { ...spec } } }
  const ptMap = specResponse.productTypes || specResponse?.data?.productTypes
  if (ptMap && ptMap[productTypeName]) return ptMap[productTypeName]

  // Already a single spec object
  if (specResponse.attributes || specResponse.rules) return specResponse

  // Fallback to raw
  return specResponse
}

/**
 * Small fetch wrapper that won’t throw for non-2xx; returns parsed JSON or {}.
 */
async function fetchJsonSafe(url: string): Promise<any> {
  try {
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text()
    try {
      const json = text ? JSON.parse(text) : {}
      // Attach http status so callers can branch if needed
      ;(json as any).__status = res.status
      return json
    } catch {
      return { __status: res.status, raw: text }
    }
  } catch (e: any) {
    return { __status: 0, error: String(e?.message || e) }
  }
}
