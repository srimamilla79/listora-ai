import { NextRequest, NextResponse } from 'next/server'
import { getAndCacheTaxonomy } from '@/lib/specCache'

// Minimal tree node
type Node = { id: string; name: string; children?: Node[]; isLeaf?: boolean }

/**
 * Synthetic leaves for common top-level groups that Walmart's taxonomy
 * endpoint sometimes returns without children.
 * Add more groups/leaves as needed.
 */
const SYNTHETIC_CHILDREN: Record<string, string[]> = {
  // *** Footwear ***
  Footwear: [
    'Athletic Shoes',
    'Boots',
    'Sandals',
    'Slippers',
    'Work & Safety Footwear',
    'Casual Shoes',
  ],

  // You can extend later:
  // 'Cell Phones': ['Smartphones', 'Feature Phones', 'Unlocked Phones'],
  // 'Cameras & Lenses': ['Digital Cameras', 'Lenses', 'Camcorders'],
}

/** Convert raw Walmart taxonomy shapes into a uniform Node[] */
function normalize(raw: any): Node[] {
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
      obj?.payload ?? // <- the shape you've been seeing
      null
    )
  }

  const toNode = (node: any): Node => {
    const name =
      node?.name ??
      node?.categoryName ??
      String(node?.id ?? node?.categoryId ?? 'Unnamed')

    const id = String(node?.id ?? node?.categoryId ?? name)

    // Try to discover real children from the raw node
    const kidsRaw =
      node?.children ?? node?.nodes ?? node?.items ?? node?.productTypes ?? null

    const kidsArr = liftArray(kidsRaw)
    let children: Node[] = Array.isArray(kidsArr) ? kidsArr.map(toNode) : []

    // If Walmart returned only group heads (no children), attach synthetic leaves
    if (children.length === 0 && SYNTHETIC_CHILDREN[name]) {
      children = SYNTHETIC_CHILDREN[name].map((leafName) => ({
        id: leafName,
        name: leafName,
        children: [],
        isLeaf: true,
      }))
    }

    // A node is a leaf only if it has no children and we didn't treat it as a group
    const isLeaf = children.length === 0

    return { id, name, children, isLeaf }
  }

  const arr = liftArray(raw)
  if (Array.isArray(arr)) return arr.map(toNode)
  if (raw?.name || raw?.id || raw?.categoryName || raw?.categoryId)
    return [toNode(raw)]
  return []
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = (
      req.headers.get('x-user-id') ||
      sp.get('userId') ||
      ''
    ).trim()
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing userId (send x-user-id header or ?userId=)',
        },
        { status: 401 }
      )
    }

    const refresh = sp.get('refresh') === '1'
    const raw = await getAndCacheTaxonomy(userId, refresh)
    const data = normalize(raw)

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 400 }
    )
  }
}
