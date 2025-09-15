import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import React from 'react';
import './App.css'
import Home from "../Frontend/components/home.jsx"
import List from "../Frontend/components/list.jsx"
import Login from "../Frontend/components/login.jsx"
import Register from "../Frontend/components/register.jsx"
import { AuthProvider } from "../Frontend/components/AuthContext.jsx"; 
import AdvancedSearch from "../Frontend/components/advancedsearch.jsx"

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
  ]);
  
  return (
    <AuthProvider> {/* Wrap everything with AuthProvider */}
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App