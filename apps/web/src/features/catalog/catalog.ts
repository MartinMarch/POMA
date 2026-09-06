export type Restaurant = {
  id: number
  slug: string
  name: string
  description: string | null
  currency_code: string
  locale: string
  accent_color: string
}

export type CatalogItem = {
  id: number
  category_id: number
  name: string
  description: string | null
  price_cents: number
  emoji: string | null
  image_url: string | null
  allergens: string[]
}

export type CatalogCategory = {
  id: number
  name: string
  description: string | null
  sort_order: number
  items: CatalogItem[]
}

export type RestaurantCatalog = {
  restaurant: Restaurant
  menuName: string
  categories: CatalogCategory[]
  table: { id: number; name: string } | null
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class CatalogError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

export class CatalogNotFoundError extends CatalogError {}
export class TableAccessError extends CatalogError {}
export class CatalogUnavailableError extends CatalogError {}

export async function getRestaurantCatalog(
  slug: string,
  tableToken?: string | null,
  signal?: AbortSignal,
): Promise<RestaurantCatalog> {
  const url = new URL(
    `${apiBaseUrl}/api/v1/restaurants/${encodeURIComponent(slug)}/catalog`,
    window.location.origin,
  )
  if (tableToken) url.searchParams.set('table', tableToken)

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') throw reason
    throw new CatalogUnavailableError(
      'El servicio de cartas no está disponible en este momento.',
      'catalog_service_unavailable',
    )
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const code = body.error?.code ?? `http_${response.status}`
    const message = body.error?.message ?? 'No hemos podido cargar la carta.'
    if (response.status === 404) throw new CatalogNotFoundError(message, code)
    if (response.status === 403) throw new TableAccessError(message, code)
    throw new CatalogUnavailableError(message, code)
  }

  return (await response.json()) as RestaurantCatalog
}

export function formatPrice(
  cents: number,
  locale: string,
  currency: string,
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100)
}
