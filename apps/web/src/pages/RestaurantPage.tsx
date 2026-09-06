import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import {
  CatalogError,
  CatalogNotFoundError,
  CatalogUnavailableError,
  TableAccessError,
  formatPrice,
  getRestaurantCatalog,
  type CatalogItem,
  type RestaurantCatalog,
} from '../features/catalog/catalog'
import { PomaBrand } from '../components/PomaBrand'

type Cart = Record<number, number>
type CatalogResult = {
  requestKey: string
  catalog: RestaurantCatalog | null
  error: string | null
  settled: boolean
}

export function RestaurantPage() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const tableToken = new URLSearchParams(location.search).get('table')
  const requestKey = `${slug}:${tableToken ?? ''}`
  const [result, setResult] = useState<CatalogResult>(() => ({
    requestKey,
    catalog: null,
    error: null,
    settled: false,
  }))
  const [cart, setCart] = useState<Cart>({})
  const [cartOpen, setCartOpen] = useState(false)
  useEffect(() => {
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const robotsMeta = existingMeta ?? document.createElement('meta')
    const previousContent = existingMeta?.content
    robotsMeta.name = 'robots'
    robotsMeta.content = 'noindex, nofollow'
    if (!existingMeta) document.head.appendChild(robotsMeta)

    return () => {
      if (existingMeta) existingMeta.content = previousContent ?? ''
      else robotsMeta.remove()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    getRestaurantCatalog(slug, tableToken, controller.signal)
      .then((catalog) => {
        setResult({ requestKey, catalog, error: null, settled: true })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          requestKey,
          catalog: null,
          error:
            reason instanceof CatalogNotFoundError ||
            reason instanceof TableAccessError ||
            reason instanceof CatalogUnavailableError
              ? reason.message
              : reason instanceof CatalogError
                ? reason.message
                : 'No hemos podido cargar la carta. Inténtalo de nuevo.',
          settled: true,
        })
      })

    return () => controller.abort()
  }, [requestKey, slug, tableToken])

  const isCurrentResult = result.requestKey === requestKey
  const catalog = isCurrentResult ? result.catalog : null
  const error = isCurrentResult ? result.error : null
  const loading = !isCurrentResult || !result.settled

  const allItems = useMemo(
    () => catalog?.categories.flatMap((category) => category.items) ?? [],
    [catalog],
  )

  const cartLines = useMemo(
    () =>
      allItems
        .filter((item) => cart[item.id])
        .map((item) => ({ item, quantity: cart[item.id] })),
    [allItems, cart],
  )

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + line.item.price_cents * line.quantity,
    0,
  )

  function changeQuantity(item: CatalogItem, delta: number) {
    setCart((current) => {
      const quantity = Math.max(0, (current[item.id] ?? 0) + delta)
      const next = { ...current }
      if (quantity === 0) delete next[item.id]
      else next[item.id] = quantity
      return next
    })
  }

  if (loading) {
    return (
      <main className="catalog-state" aria-live="polite">
        <span className="loader" />
        <p>Preparando la mesa…</p>
      </main>
    )
  }

  if (error || !catalog) {
    return (
      <main className="catalog-state">
        <span className="state-icon">×</span>
        <h1>Carta no disponible</h1>
        <p>{error}</p>
        <Link className="button button-primary" to="/">
          Volver a POMA
        </Link>
      </main>
    )
  }

  const { restaurant, categories } = catalog
  const theme = {
    '--restaurant-accent': restaurant.accent_color,
  } as CSSProperties
  const price = (cents: number) =>
    formatPrice(cents, restaurant.locale, restaurant.currency_code)

  return (
    <div className="restaurant-app" style={theme}>
      <header className="restaurant-header">
        <PomaBrand compact linked={false} />
        <div className="table-badge">
          <span className={catalog.table ? 'online-dot' : 'preview-dot'} />
          {catalog.table
            ? `${restaurant.name} · ${catalog.table.name}`
            : 'Vista previa de carta'}
        </div>
      </header>

      <main className="menu-main">
        <section className="restaurant-intro">
          <p className="tiny-label">{catalog.menuName}</p>
          <h1>{restaurant.name}</h1>
          <p>{restaurant.description}</p>
        </section>

        <nav className="category-tabs" aria-label="Categorías de la carta">
          {categories.map((category, index) => (
            <a
              className={index === 0 ? 'active' : ''}
              href={`#category-${category.id}`}
              key={category.id}
            >
              {category.name}
            </a>
          ))}
        </nav>

        <div className="menu-sections">
          {categories.map((category, categoryIndex) => (
            <section id={`category-${category.id}`} key={category.id}>
              <div className="menu-section-heading">
                <div>
                  <p className="tiny-label">
                    {String(categoryIndex + 1).padStart(2, '0')}
                  </p>
                  <h2>{category.name}</h2>
                </div>
                {category.description && <p>{category.description}</p>}
              </div>
              <div className="dish-grid">
                {category.items.map((item) => (
                  <article className="dish-card" key={item.id}>
                    <div className="dish-art" aria-hidden="true">
                      <span>{item.emoji ?? '🍽️'}</span>
                    </div>
                    <div className="dish-copy">
                      <div>
                        <h3>{item.name}</h3>
                        <strong>{price(item.price_cents)}</strong>
                      </div>
                      <p>{item.description}</p>
                      {item.allergens.length > 0 && (
                        <small>Alérgenos: {item.allergens.join(', ')}</small>
                      )}
                    </div>
                    {(cart[item.id] ?? 0) === 0 ? (
                      <button
                        className="add-button"
                        type="button"
                        onClick={() => changeQuantity(item, 1)}
                        aria-label={`Añadir ${item.name}`}
                      >
                        +
                      </button>
                    ) : (
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item, -1)}
                          aria-label={`Quitar una unidad de ${item.name}`}
                        >
                          −
                        </button>
                        <span>{cart[item.id]}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item, 1)}
                          aria-label={`Añadir otra unidad de ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {cartCount > 0 && (
        <button
          className="floating-cart"
          type="button"
          onClick={() => setCartOpen(true)}
        >
          <span className="cart-count">{cartCount}</span>
          <strong>Ver mi comanda</strong>
          <span>{price(cartTotal)}</span>
        </button>
      )}

      {cartOpen && (
        <div
          className="cart-overlay"
          role="presentation"
          onMouseDown={() => setCartOpen(false)}
        >
          <aside
            className="cart-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="cart-sheet-header">
              <div>
                <p className="tiny-label">TU MESA</p>
                <h2 id="cart-title">Mi comanda</h2>
              </div>
              <button
                className="close-button"
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Cerrar carrito"
              >
                ×
              </button>
            </div>

            <div className="cart-lines">
              {cartLines.map(({ item, quantity }) => (
                <div className="cart-line" key={item.id}>
                  <span className="cart-line-emoji">{item.emoji ?? '🍽️'}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{price(item.price_cents)}</small>
                  </div>
                  <div className="quantity-control compact">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item, -1)}
                      aria-label={`Quitar una unidad de ${item.name}`}
                    >
                      −
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item, 1)}
                      aria-label={`Añadir otra unidad de ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{price(cartTotal)}</strong></div>
              <div><span>Servicio</span><strong>Incluido</strong></div>
              <div className="cart-total"><span>Total</span><strong>{price(cartTotal)}</strong></div>
            </div>

            <button className="apple-pay-button" type="button" disabled>
              Pagar con <span> Pay</span>
            </button>
            <p className="checkout-note">
              El carrito ya funciona. La creación del pedido y el cobro real se
              activarán en la siguiente iteración.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
