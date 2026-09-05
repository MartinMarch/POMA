import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database.types'

export type ProfileSummary = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'email_confirmed_at'
  | 'last_sign_in_at'
  | 'created_at'
>

export type RestaurantSummary = Pick<
  Tables<'restaurants'>,
  'id' | 'slug' | 'name' | 'description' | 'is_published' | 'created_at'
>

export type MenuSummary = Pick<
  Tables<'menus'>,
  'id' | 'restaurant_id' | 'name' | 'is_active' | 'published_at'
>

export type MembershipSummary = Pick<
  Tables<'restaurant_members'>,
  'restaurant_id' | 'user_id' | 'role'
>

export type AdminDashboardData = {
  profiles: ProfileSummary[]
  admins: Pick<Tables<'app_admins'>, 'user_id'>[]
  restaurants: RestaurantSummary[]
  memberships: MembershipSummary[]
  menus: MenuSummary[]
  categories: Pick<Tables<'menu_categories'>, 'id' | 'menu_id'>[]
  items: Pick<Tables<'menu_items'>, 'id' | 'category_id'>[]
}

export type OwnerDashboardData = {
  restaurants: RestaurantSummary[]
  menus: MenuSummary[]
}

export async function isSuperAdmin(userId: string) {
  const { data, error } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const results = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, email_confirmed_at, last_sign_in_at, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('app_admins').select('user_id'),
    supabase
      .from('restaurants')
      .select('id, slug, name, description, is_published, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('restaurant_members').select('restaurant_id, user_id, role'),
    supabase
      .from('menus')
      .select('id, restaurant_id, name, is_active, published_at')
      .order('created_at', { ascending: false }),
    supabase.from('menu_categories').select('id, menu_id'),
    supabase.from('menu_items').select('id, category_id'),
  ])

  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error

  return {
    profiles: results[0].data ?? [],
    admins: results[1].data ?? [],
    restaurants: results[2].data ?? [],
    memberships: results[3].data ?? [],
    menus: results[4].data ?? [],
    categories: results[5].data ?? [],
    items: results[6].data ?? [],
  }
}

export async function getOwnerDashboard(
  userId: string,
): Promise<OwnerDashboardData> {
  const { data: memberships, error: membershipError } = await supabase
    .from('restaurant_members')
    .select('restaurant_id')
    .eq('user_id', userId)

  if (membershipError) throw membershipError

  const restaurantIds = memberships.map((membership) => membership.restaurant_id)
  if (restaurantIds.length === 0) return { restaurants: [], menus: [] }

  const [restaurantsResult, menusResult] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, slug, name, description, is_published, created_at')
      .in('id', restaurantIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('menus')
      .select('id, restaurant_id, name, is_active, published_at')
      .in('restaurant_id', restaurantIds)
      .order('created_at', { ascending: false }),
  ])

  if (restaurantsResult.error) throw restaurantsResult.error
  if (menusResult.error) throw menusResult.error

  return {
    restaurants: restaurantsResult.data,
    menus: menusResult.data,
  }
}
