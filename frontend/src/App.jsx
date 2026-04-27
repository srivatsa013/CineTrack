import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from './context/authStore'
import Layout from './components/layout/Layout'

import LoginPage           from './pages/LoginPage'
import RegisterPage        from './pages/RegisterPage'
import HomePage            from './pages/HomePage'
import SearchPage          from './pages/SearchPage'
import ContentDetailPage   from './pages/ContentDetailPage'
import RecommendationsPage from './pages/RecommendationsPage'
import ListsPage           from './pages/ListsPage'
import SocialPage          from './pages/SocialPage'
import ProfilePage         from './pages/ProfilePage'
import YearInReviewPage    from './pages/YearInReviewPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

// Wrappers to extract URL params and pass to ListsPage
function ColDetailWrapper()   { const { colId }   = useParams(); return <ListsPage colId={colId} /> }
function NightDetailWrapper() { const { nightId } = useParams(); return <ListsPage nightId={nightId} /> }

function AppRoutes() {
  const { token } = useAuthStore()
  return (
    <Routes>
      <Route path="/login"    element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Legacy / removed page redirects */}
      <Route path="/watchlist"      element={<Navigate to="/lists" replace />} />
      <Route path="/collections/*"  element={<Navigate to="/lists" replace />} />
      <Route path="/discover"       element={<Navigate to="/search" replace />} />
      <Route path="/movie-nights"   element={<Navigate to="/lists" replace />} />
      <Route path="/movie-nights/*" element={<Navigate to="/lists" replace />} />

      <Route path="/*" element={
        <RequireAuth>
          <Layout>
            <Routes>
              <Route path="/"                              element={<HomePage />} />
              <Route path="/search"                        element={<SearchPage />} />
              <Route path="/content/:id"                   element={<ContentDetailPage />} />
              <Route path="/recommendations"               element={<RecommendationsPage />} />
              <Route path="/lists"                         element={<ListsPage />} />
              <Route path="/lists/collection/:colId"       element={<ColDetailWrapper />} />
              <Route path="/lists/movie-night/:nightId"    element={<NightDetailWrapper />} />
              <Route path="/social"                        element={<SocialPage />} />
              <Route path="/profile"                       element={<ProfilePage />} />
              <Route path="/year-in-review"                element={<YearInReviewPage />} />
              <Route path="*"                              element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#161616', color: '#e8e8e8',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', fontSize: '13px',
            fontFamily: '"DM Sans", sans-serif',
          },
          success: { iconTheme: { primary: '#e8ff47', secondary: '#000' } },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}