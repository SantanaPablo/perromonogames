import React, { useState } from 'react';

/**
 * Componente para la página de inicio de sesión.
 * Utiliza clases de Tailwind CSS para un diseño con temática "gamer".
 * @param {Object} props
 * @param {Function} props.onLoginSuccess Función que se llama al iniciar sesión exitosamente, recibiendo el token.
 * @returns {JSX.Element} El componente de la página de inicio de sesión.
 */
export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Se usa la URL completa para la llamada a la API de autenticación.
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });


            if (!response.ok) {
                const errorText = await response.text();
                // Lanza un error si la respuesta no es exitosa
                throw new Error(errorText || 'Credenciales inválidas');
            }

            const data = await response.json();
            if (data.isSuccess && data.token) {
                // Guarda el token en el almacenamiento local para persistencia
                localStorage.setItem('authToken', data.token);
                // Llama a la función que maneja el éxito del login en el componente padre, pasando el token
                onLoginSuccess(data.token);
            } else {
                 throw new Error(data.message || 'Credenciales inválidas');
            }
        } catch (err) {
            console.error('Error de login:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
            <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 text-gray-200">
                <h2 className="text-3xl font-extrabold text-center text-blue-400 mb-6">
                    INICIAR SESIÓN
                </h2>

                {error && (
                    <div className="bg-red-900 text-red-300 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={`w-full py-3 rounded-lg text-lg font-bold transition duration-300 ${
                            loading
                                ? 'bg-gray-700 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        }`}
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
