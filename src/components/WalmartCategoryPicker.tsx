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

type Props = {
  userId: string // MUST be a non-empty Listora user UUID
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
  const fetchedForUserRef = React.useRef<string | null>(null)

  const [search, setSearch] = useState('')
  const [selectedPath, setSelectedPath] = useState<string[]>(initialPath)

  const canFetch = !!userId && userId.trim().length > 0

  useEffect(() => {
    let cancelled = false

    async function run() {
      // Guard: don’t even try until we have a real userId
      if (!canFetch) {
        setError('Missing userId — cannot load Walmart taxonomy.')
        setTaxonomy([])
        return
      }

      // ✅ do not refetch if we already fetched for this user
      if (fetchedForUserRef.current === userId) return

      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/walmart/taxonomy', {
          headers: { 'x-user-id': String(userId) },
          cache: 'no-store',
        })
        const text = await res.text()
        let json: any = {}
        try {
          json = text ? JSON.parse(text) : {}
        } catch {
          json = { raw: text }
        }

        if (!res.ok || json?.ok === false) {
          const msg =
            json?.error ||
            `Taxonomy request failed (${res.status}) — ensure the user is connected to Walmart.`
          throw new Error(msg)
        }

        const raw = json?.data ?? json
        const normalized = normalizeTaxonomy(raw)
        if (!cancelled) {
          setTaxonomy(normalized)
          if (initialPath.length) {
            setSelectedPath((prev) => (prev.length ? prev : initialPath))
          }
          // ✅ mark fetched for this user
          fetchedForUserRef.current = userId
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(String(e?.message || e))
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
  }, [userId]) // ✅ only depends on userId now

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

  async function onClickNode(node: Node) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    const isLeaf = node.isLeaf ?? !hasChildren

    if (!isLeaf) {
      setSelectedPath((prev) => [...prev, node.name])
      setSearch('')
      return
    }

    if (!autoFetchSpec) {
      if (onCategorySelect) onCategorySelect(node, {})
      else if (onLeafSelect)
        onLeafSelect({ category: node, spec: null, version: 'unknown' })
      return
    }

    setLoadingSpec(true)
    setError(null)
    try {
      const pt = encodeURIComponent(node.name)

      const v5 = await fetchJsonSafe(
        `/api/walmart/spec?productTypes=${pt}&version=5.0`,
        { 'x-user-id': String(userId) }
      )

      if (v5?.ok && v5?.data && (v5.version === '5.0' || v5.version === '5')) {
        const spec = unwrapSpec(v5.data, node.name)
        if (onCategorySelect) onCategorySelect(node, spec)
        else if (onLeafSelect)
          onLeafSelect({ category: node, spec, version: '5.0' })
      } else {
        const v42 = await fetchJsonSafe(
          `/api/walmart/spec?productTypes=${pt}&version=4.2`,
          { 'x-user-id': String(userId) }
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
  const onBreadcrumbTo = (i: number) => {
    setSelectedPath((prev) => prev.slice(0, i + 1))
    setSearch('')
  }

  return (
    <div className={className ?? 'space-y-4'}>
      {/* Debug helper: surface missing id instead of blank list */}
      {!canFetch && (
        <div className="text-sm text-red-600">
          Missing userId. Pass a valid Listora user id to WalmartCategoryPicker.
        </div>
      )}

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
        {levelItems.length === 0 && !loading && !error && (
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
      obj?.productTypeGroups ?? // older tree shape
      obj?.productTypes ?? // product types list
      obj?.children ?? // nested nodes
      obj?.nodes ?? // nested nodes
      obj?.items ?? // nested nodes
      obj?.data ?? // some APIs wrap under data
      obj?.payload ?? // ← YOUR CURRENT SHAPE
      null
    )
  }

  const toNode = (node: any): Node => {
    // Map Walmart variants into our canonical shape
    const name =
      node?.name ??
      node?.categoryName ?? // ← e.g., "Footwear"
      String(node?.id ?? node?.categoryId ?? 'Unnamed')

    const id =
      node?.id ??
      node?.categoryId ?? // ← e.g., "footwear_other"
      name

    const kidsRaw =
      node?.children ??
      node?.nodes ??
      node?.items ??
      node?.productTypes ??
      node?.payload ?? // if a node contains a payload list
      null

    const childrenArr = liftArray(kidsRaw)
    const children = Array.isArray(childrenArr) ? childrenArr.map(toNode) : []

    // Heuristic: entries that come from top-level payload are groups → not leaf
    return {
      id,
      name,
      children,
      isLeaf: children.length === 0, // ← treat as leaf when no children
      ...node,
    }
  }

  const arr = liftArray(raw)
  if (Array.isArray(arr)) return arr.map(toNode)
  if (raw?.name || raw?.id || raw?.categoryName || raw?.categoryId)
    return [toNode(raw)]
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
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
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
