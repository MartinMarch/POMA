import { Route, Routes } from 'react-router'
import './App.css'
import { AdminDemoPage } from './pages/AdminDemoPage'
import { AuthPage } from './pages/AuthPage'
import { CreateRestaurantPage } from './pages/CreateRestaurantPage'
import { MarketingPage } from './pages/MarketingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PanelRouter } from './pages/PanelRouter'
import { RegistrationPage } from './pages/RegistrationPage'
import { RestaurantPage } from './pages/RestaurantPage'
import { RequireAuth } from './features/auth/RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingPage />} />
      <Route path="/r/:slug" element={<RestaurantPage />} />
      <Route path="/registro" element={<RegistrationPage />} />
      <Route path="/acceso" element={<AuthPage />} />
      <Route
        path="/panel"
        element={<RequireAuth><PanelRouter /></RequireAuth>}
      />
      <Route
        path="/alta-restaurante"
        element={<RequireAuth><CreateRestaurantPage /></RequireAuth>}
      />
      <Route
        path="/admin/:slug"
        element={<RequireAuth><AdminDemoPage /></RequireAuth>}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
