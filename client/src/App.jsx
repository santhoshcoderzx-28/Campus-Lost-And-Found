import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Toast from './components/Toast.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Browse from './pages/Browse.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ReportItem from './pages/ReportItem.jsx';
import ItemDetails from './pages/ItemDetails.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import EditItem from './pages/EditItem.jsx';
import Info from './pages/Info.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/items/:id" element={<ItemDetails />} />
          <Route path="/about" element={<Info type="about" />} />
          <Route path="/privacy" element={<Info type="privacy" />} />
          <Route path="/terms" element={<Info type="terms" />} />
          <Route path="/contact" element={<Info type="contact" />} />

          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/items/:id/edit"
            element={
              <ProtectedRoute>
                <EditItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toast />
    </div>
  );
}
