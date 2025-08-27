import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import React from 'react'; 
import './App.css'
import Home from "../Frontend/components/home.jsx"
import List from "../Frontend/components/list.jsx"
import Login from "../Frontend/components/login.jsx"
import Register from "../Frontend/components/register.jsx"

function App() {
  const router = createBrowserRouter([
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
  ]);
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
