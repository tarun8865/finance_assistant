import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" />;
}

function AuthRoute({ children }) {
  return isLoggedIn() ? <Navigate to="/dashboard" /> : children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={isLoggedIn() ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default App;
