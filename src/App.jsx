import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from './components/providers/AuthProvider'
import RootLayout from './components/layout/RootLayout'
import ScrollToTop from './components/layout/ScrollToTop'
import RootScale from './components/layout/RootScale'
import { AREAS, FAQ, GUIDE } from './seo/content'

// Home page — loaded eagerly for first paint
import HomePage from './pages/HomePage'

// Public pages — lazy loaded after first paint
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'))
const LayoutViewPage = lazy(() => import('./pages/LayoutViewPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PaperworkPage = lazy(() => import('./pages/PaperworkPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const AreaPage = lazy(() => import('./pages/AreaPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Auth + Agent
const AppEntryPage = lazy(() => import('./pages/AppEntryPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AgentPage = lazy(() => import('./pages/AgentPage'))

// Dashboard — lazy loaded (large bundle, only needed by admins)
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'))
const ProtectedRoute = lazy(() => import('./components/dashboard/ProtectedRoute'))
const AdminOverviewPage = lazy(() => import('./pages/AdminOverviewPage'))
const LayoutManager = lazy(() => import('./components/dashboard/LayoutManager'))
const OverlayEditor = lazy(() => import('./components/dashboard/OverlayEditor'))
const PlotTable = lazy(() => import('./components/dashboard/PlotTable'))
const PlotDetail = lazy(() => import('./components/dashboard/PlotDetail'))
const AgentManager = lazy(() => import('./components/dashboard/AgentManager'))
const PaymentTracker = lazy(() => import('./components/dashboard/PaymentTracker'))
const DocumentVault = lazy(() => import('./components/dashboard/DocumentVault'))
const CustomersPage = lazy(() => import('./components/dashboard/CustomersPage'))
const VisitSchedule = lazy(() => import('./components/dashboard/VisitSchedule'))
const UpdatesPage = lazy(() => import('./components/dashboard/UpdatesPage'))

// Buyer portal — lazy loaded (only needed by buyers)
const BuyerProtectedRoute = lazy(() => import('./components/buyer/BuyerProtectedRoute'))
const BuyerLayout = lazy(() => import('./components/buyer/BuyerLayout'))
const BuyerOverviewPage = lazy(() => import('./pages/BuyerOverviewPage'))
const BuyerPlotPage = lazy(() => import('./pages/BuyerPlotPage'))
const BuyerDocumentsPage = lazy(() => import('./pages/BuyerDocumentsPage'))
const BuyerVisitsPage = lazy(() => import('./pages/BuyerVisitsPage'))

function DashFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}>
      <div style={{ width: '3.2rem', height: '3.2rem', border: '0.3rem solid #e5e5ea', borderTopColor: '#046ebc', borderRadius: '50%', animation: 'dash-spin 0.7s linear infinite' }} />
    </div>
  )
}

function PublicFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '3rem', height: '3rem', border: '0.28rem solid #e5e5ea', borderTopColor: '#046ebc', borderRadius: '50%', animation: 'dash-spin 0.7s linear infinite' }} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <RootScale />
        <Routes>
          {/* Marketing site routes — wrapped in RootLayout (header + footer) */}
          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="properties" element={<Suspense fallback={<PublicFallback />}><PropertiesPage /></Suspense>} />
            <Route path="properties/:slug" element={<Suspense fallback={<PublicFallback />}><LayoutViewPage /></Suspense>} />
            <Route path="contact" element={<Suspense fallback={<PublicFallback />}><ContactPage /></Suspense>} />
            <Route path="paperwork" element={<Suspense fallback={<PublicFallback />}><PaperworkPage /></Suspense>} />
            <Route path="about" element={<Suspense fallback={<PublicFallback />}><AboutPage /></Suspense>} />
            <Route path={GUIDE.path.slice(1)} element={<Suspense fallback={<PublicFallback />}><GuidePage /></Suspense>} />
            <Route path={FAQ.path.slice(1)} element={<Suspense fallback={<PublicFallback />}><FaqPage /></Suspense>} />
            {AREAS.map(area => (
              <Route key={area.key} path={area.path.slice(1)} element={<Suspense fallback={<PublicFallback />}><AreaPage area={area} /></Suspense>} />
            ))}
            <Route path="*" element={<Suspense fallback={<PublicFallback />}><NotFoundPage /></Suspense>} />
          </Route>

          {/* App entry — sends each signed-in user to their portal, others to sign in */}
          <Route path="app" element={<Suspense fallback={<DashFallback />}><AppEntryPage /></Suspense>} />

          {/* Auth */}
          <Route path="login" element={<Suspense fallback={<DashFallback />}><LoginPage /></Suspense>} />

          {/* Agent check-in — public, mobile-first, no marketing layout */}
          <Route path="agent" element={<Suspense fallback={<DashFallback />}><AgentPage /></Suspense>} />

          {/* Buyer portal — role=buyer protected */}
          <Route
            path="my"
            element={
              <Suspense fallback={<DashFallback />}>
                <BuyerProtectedRoute>
                  <BuyerLayout />
                </BuyerProtectedRoute>
              </Suspense>
            }
          >
            <Route index element={<Suspense fallback={<DashFallback />}><BuyerOverviewPage /></Suspense>} />
            <Route path="plot" element={<Suspense fallback={<DashFallback />}><BuyerPlotPage /></Suspense>} />
            <Route path="documents" element={<Suspense fallback={<DashFallback />}><BuyerDocumentsPage /></Suspense>} />
            <Route path="visits" element={<Suspense fallback={<DashFallback />}><BuyerVisitsPage /></Suspense>} />
            <Route path="*" element={<Navigate to="/my" replace />} />
          </Route>

          {/* Admin dashboard — protected, no marketing layout */}
          <Route
            path="admin"
            element={
              <Suspense fallback={<DashFallback />}>
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              </Suspense>
            }
          >
            <Route index element={<Suspense fallback={<DashFallback />}><AdminOverviewPage /></Suspense>} />
            <Route path="layouts" element={<Suspense fallback={<DashFallback />}><LayoutManager /></Suspense>} />
            <Route path="layouts/:id/overlay" element={<Suspense fallback={<DashFallback />}><OverlayEditor /></Suspense>} />
            <Route path="plots" element={<Suspense fallback={<DashFallback />}><PlotTable /></Suspense>} />
            <Route path="plots/:id" element={<Suspense fallback={<DashFallback />}><PlotDetail /></Suspense>} />
            <Route path="agents" element={<Suspense fallback={<DashFallback />}><AgentManager /></Suspense>} />
            <Route path="payments" element={<Suspense fallback={<DashFallback />}><PaymentTracker /></Suspense>} />
            <Route path="documents" element={<Suspense fallback={<DashFallback />}><DocumentVault /></Suspense>} />
            <Route path="customers" element={<Suspense fallback={<DashFallback />}><CustomersPage /></Suspense>} />
            <Route path="visits" element={<Suspense fallback={<DashFallback />}><VisitSchedule /></Suspense>} />
            <Route path="updates" element={<Suspense fallback={<DashFallback />}><UpdatesPage /></Suspense>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
