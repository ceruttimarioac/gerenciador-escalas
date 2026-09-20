import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import Login from './pages/login/login.jsx'
import Home from './pages/home/home.jsx'
import Register from './pages/registrar/register.jsx'
import ConsEscalas from './pages/escalas/consescalas.jsx'
import CadEscalas from './pages/escalas/cadescalas.jsx'
import ConsUsuarios from './pages/usuarios/consusuarios.jsx'
import CadUsuarios from './pages/usuarios/cadusuarios.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Registrar" element={<Register />} />
        <Route path="/ConsEscalas" element={<ConsEscalas />} />
        <Route path="/CadEscalas" element={<CadEscalas />} />
        <Route path="/ConsUsuarios" element={<ConsUsuarios />} />
        <Route path="/CadUsuarios" element={<CadUsuarios />} />
        <Route path="/Escalas" element={<ConsEscalas />} />
        <Route path="/Usuarios" element={<ConsUsuarios />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)