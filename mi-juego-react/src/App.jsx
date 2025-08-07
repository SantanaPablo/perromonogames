import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Perfil from './pages/Perfil';
import Rankings from './pages/Rankings';
import Clubes from './pages/Clubes';
import Juegos from './pages/Juegos';
import AdivinarLaPalabra from './pages/juegos/palabradiaria';
import AdivinarPin from './pages/juegos/pindiario';
import Ahorcado from './pages/juegos/ahorcado';

/**
 * Componente principal de la aplicación que gestiona el estado de autenticación
 * y el ruteo condicional basado en si el usuario ha iniciado sesión.
 * @returns {JSX.Element} El componente principal de la aplicación.
 */
export default function App() {
    const [isOpen, setIsOpen] = useState(false);
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    // El estado isLoggedIn ahora se deriva del token para mayor consistencia.
    const isLoggedIn = !!token;

    // Función para cerrar la barra lateral.
    const handleLinkClick = () => {
        setIsOpen(false);
    };

    // Se llama a esta función al iniciar sesión o al registrarse exitosamente.
    const handleAuthSuccess = (newToken) => {
        setToken(newToken);
        localStorage.setItem('authToken', newToken);
    };

    // Función para cerrar sesión, elimina el token del estado y del localStorage.
    // Ahora también cierra la barra lateral al cerrar sesión.
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setIsOpen(false);
    };

    // Renderiza la interfaz de usuario basada en el estado de autenticación.
    if (!isLoggedIn) {
        // Si el usuario no ha iniciado sesión, solo se muestran las páginas
        // de login y registro.
        return (
            <Router>
                <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/login" element={<Login onLoginSuccess={handleAuthSuccess} />} />
                        {/* El componente Register también debe poder iniciar sesión exitosamente */}
                        <Route path="/register" element={<Register onRegisterSuccess={handleAuthSuccess} />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                </div>
            </Router>
        );
    }

    // Si el usuario ha iniciado sesión, se renderiza la aplicación completa.
    return (
        <Router>
            <div className="flex h-screen bg-gray-950">
                {/* Menú Hamburguesa */}
                <div className="md:hidden">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="absolute top-4 left-4 z-50 text-white focus:outline-none"
                    >
                        {isOpen ? (
                            <svg className="h-8 w-8" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="h-8 w-8" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Sidebar */}
                <aside
                    className={`fixed top-0 left-0 w-64 h-full bg-gray-900 text-white z-40 transform transition-transform duration-300 md:translate-x-0 ${
                        isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="p-6">
                        <h1 className="text-2xl font-bold mb-8 text-blue-400">Perromono Juegos</h1>
                        <nav>
                            <ul className="space-y-4">
                                <li>
                                    {/* Al hacer clic en un enlace, el menú se cierra */}
                                    <Link to="/perfil" onClick={handleLinkClick} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800">
                                        <span>👤</span>
                                        <span>Perfil</span>
                                    </Link>
                                </li>
                                <li>
                                    {/* Al hacer clic en un enlace, el menú se cierra */}
                                    <Link to="/juegos" onClick={handleLinkClick} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800">
                                        <span>🎮</span>
                                        <span>Juegos</span>
                                    </Link>
                                </li>
                                <li>
                                    {/* Al hacer clic en un enlace, el menú se cierra */}
                                    <Link to="/rankings" onClick={handleLinkClick} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800">
                                        <span>🏆</span>
                                        <span>Rankings</span>
                                    </Link>
                                </li>
                                <li>
                                    {/* Al hacer clic en un enlace, el menú se cierra */}
                                    <Link to="/clubes" onClick={handleLinkClick} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800">
                                        <span>⚽</span>
                                        <span>Clubes</span>
                                    </Link>
                                </li>
                            </ul>
                        </nav>
                        <div className="mt-8 pt-4 border-t border-gray-700">
                            <button
                                onClick={handleLogout}
                                className="w-full text-left flex items-center space-x-4 p-3 rounded-lg text-red-400 hover:bg-gray-800"
                            >
                                <span>🚪</span>
                                <span>Cerrar sesión</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Contenido principal con rutas */}
                <main className="flex-1 md:ml-64 p-8 overflow-y-auto text-white">
                    <Routes>
                        <Route path="/" element={<Navigate to="/perfil" />} />
                        {/* AQUÍ ES DONDE SE CORRIGE: Pasar la prop onLogout al componente Perfil */}
                        <Route path="/perfil" element={<Perfil onLogout={handleLogout} />} />
                        <Route path="/register" element={<Navigate to="/perfil" />} /> {/* Redirige si está logueado */}
                        <Route path="/login" element={<Navigate to="/perfil" />} /> {/* Redirige a /perfil si ya está logueado */}
                        <Route path="/rankings" element={<Rankings />} />
                        <Route path="/clubes" element={<Clubes />} />
                        <Route path="/juegos" element={<Juegos />} />
                        <Route path="/palabradiaria" element={<AdivinarLaPalabra authToken={token} onLogout={handleLogout} />} />
                        <Route path="/pindiario" element={<AdivinarPin authToken={token} onLogout={handleLogout} />} />
                        <Route path="/ahorcado" element={<Ahorcado authToken={token} onLogout={handleLogout} />} />
                        <Route path="*" element={<p>Página no encontrada</p>} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}
