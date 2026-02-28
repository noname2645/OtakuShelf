import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import React, { useEffect } from 'react';
import './App.css'
import Home from "../Frontend/components/home.jsx"
import List from "../Frontend/components/list.jsx"
import Login from "../Frontend/components/login.jsx"
import Register from "../Frontend/components/register.jsx"
import { AuthProvider } from "../Frontend/components/AuthContext.jsx";
import AdvancedSearch from "../Frontend/components/advancedsearch.jsx"
import Profile from "../Frontend/components/profile.jsx"
import AIPage from "../Frontend/components/aipage.jsx"

const API = import.meta.env.VITE_API_BASE_URL;

// Fire-and-forget: wake up the Render server immediately on page load
// so auth + hero trailer fetches hit a warm server
const wakePing = () => {
  fetch(`${API}/api/ping`, { method: 'GET' }).catch(() => { });
};
wakePing();

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/home",
      element: <Home />,
    },
    {
      path: "/list",
      element: <List />,
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/register",
      element: <Register />,
    },
    {
      path: "/advance",
      element: <AdvancedSearch />,
    },
    {
      path: "/profile",
      element: <Profile />,
    },
    {
      path: "/ai",
      element: <AIPage />,
    },
  ]);

  return (
    <AuthProvider> {/* Wrap everything with AuthProvider */}
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App