import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database.types'

type Restaurant = Pick<
  Tables<'restaurants'>,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'currency_code'
  | 'locale'
  | 'accent_color'
>

export type CatalogItem = Pick<
  Tables<'menu_items'>,
  | 'id'
  | 'category_id'
  | 'name'
  | 'description'
  | 'price_cents'
  | 'emoji'
  | 'image_url'
  | 'allergens'
>

export type CatalogCategory = Pick<
  Tables<'menu_categories'>,
  'id' | 'name' | 'description' | 'sort_order'
> & {
  items: CatalogItem[]
}

export type RestaurantCatalog = {
  restaurant: Restaurant
  menuName: string
  categories: CatalogCategory[]
}

export class CatalogNotFoundError extends Error {}

export async function getRestaurantCatalog(
  slug: string,
  signal?: AbortSignal,
): Promise<RestaurantCatalog> {
  let restaurantQuery = supabase
    .from('restaurants')
    .select(
      'id, slug, name, description, currency_code, locale, accent_color',
    )
    .eq('slug', slug)
    .eq('is_published', true)

  if (signal) restaurantQuery = restaurantQuery.abortSignal(signal)

  const { data: restaurant, error: restaurantError } =
    await restaurantQuery.maybeSingle()

  if (restaurantError) throw restaurantError
  if (!restaurant) throw new CatalogNotFoundError('Restaurante no encontrado')

  let menuQuery = supabase
    .from('menus')
    .select('id, name')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)

  if (signal) menuQuery = menuQuery.abortSignal(signal)

  const { data: menu, error: menuError } = await menuQuery.maybeSingle()

  if (menuError) throw menuError
  if (!menu) throw new CatalogNotFoundError('Este restaurante no tiene una carta activa')

  const categoriesQuery = supabase
    .from('menu_categories')
    .select('id, name, description, sort_order')
    .eq('restaurant_id', restaurant.id)
    .eq('menu_id', menu.id)
    .eq('is_active', true)
    .order('sort_order')

  const itemsQuery = supabase
    .from('menu_items')
    .select(
      'id, category_id, name, description, price_cents, emoji, image_url, allergens',
    )
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
    .order('sort_order')

  if (signal) {
    categoriesQuery.abortSignal(signal)
    itemsQuery.abortSignal(signal)
  }

  const [categoriesResult, itemsResult] = await Promise.all([
    categoriesQuery,
    itemsQuery,
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error

  return {
    restaurant,
    menuName: menu.name,
    categories: categoriesResult.data.map((category) => ({
      ...category,
      items: itemsResult.data.filter(
        (item) => item.category_id === category.id,
      ),
    })),
  }
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
