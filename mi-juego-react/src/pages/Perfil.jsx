import React, { useEffect, useState, useCallback } from "react";

/**
 * Componente para mostrar la página de perfil del usuario.
 * @param {Object} props
 * @param {Function} props.onLogout Función para cerrar la sesión, en caso de error de autenticación.
 * @returns {JSX.Element} El componente de perfil renderizado.
 */
export default function Perfil({ onLogout }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [newProfilePicture, setNewProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [profilePictureMessage, setProfilePictureMessage] = useState('');
    const [profilePictureError, setProfilePictureError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Función para obtener los datos del perfil desde la API.
    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No se encontró el token de autenticación.");
            onLogout();
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/Auth/profile`, {
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') } // Limpiar comillas del token
            });

            if (!res.ok) {
                if (res.status === 401) {
                    onLogout();
                }
                throw new Error("Error al obtener el perfil: " + res.status);
            }
            const data = await res.json();
            setUser(data);
            // Establecer la URL de la imagen de perfil actual si existe
            if (data.profilePictureUrl) {
                setProfilePicturePreview(data.profilePictureUrl);
            }
        } catch (err) {
            console.error("Error al cargar perfil:", err);
            // Podrías mostrar un mensaje de error en la UI aquí si lo deseas
        } finally {
            setLoading(false);
        }
    }, [onLogout]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Lógica para determinar el nivel del usuario según sus puntos.
    const getUserLevel = (points) => {
        if (points > 1000) return "Oro";
        if (points > 700) return "Plata";
        if (points > 400) return "Bronce";
        return "Novato";
    };
    
    // Lógica para asignar colores de fondo al nivel.
    const getLevelColor = (level) => {
        if (level === "Oro") return "bg-yellow-500 text-gray-900";
        if (level === "Plata") return "bg-gray-400 text-gray-900";
        if (level === "Bronce") return "bg-orange-500 text-gray-900";
        return "bg-gray-600 text-white";
    };

    // Genera las iniciales del usuario para el avatar dinámico
    const getUserInitials = useCallback((user) => {
        if (!user) return '';
        if (user.firstName && user.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
        }
        return (user.firstName || user.username || 'U').charAt(0);
    }, []);

    // Manejador para el cambio de contraseña
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage('');
        setPasswordError('');

        if (newPassword !== confirmNewPassword) {
            setPasswordError('Las nuevas contraseñas no coinciden.');
            return;
        }
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            setPasswordError('Todos los campos de contraseña son obligatorios.');
            return;
        }
        if (!user || !user.id) {
            setPasswordError('No se pudo obtener la información del usuario para cambiar la contraseña.');
            return;
        }

        const token = localStorage.getItem("authToken");
        if (!token) {
            onLogout();
            return;
        }

        try {
            // Se envía el objeto completo del usuario junto con las contraseñas
            // Esto asume que el endpoint /api/User/update de tu backend
            // está configurado para recibir y procesar 'oldPassword' y 'newPassword'.
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/User/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`
                },
                body: JSON.stringify({
                    ...user, // Envía todos los datos actuales del usuario
                    oldPassword: oldPassword,
                    newPassword: newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al cambiar la contraseña.');
            }
            
            setPasswordMessage('Contraseña cambiada exitosamente.');
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

        } catch (err) {
            setPasswordError(err.message || 'Error desconocido al cambiar la contraseña.');
        }
    };

    // Manejador para la selección de archivo de foto de perfil
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewProfilePicture(file);
            setProfilePicturePreview(URL.createObjectURL(file)); // Crear URL de previsualización
            setProfilePictureError('');
            setProfilePictureMessage('');
        } else {
            setNewProfilePicture(null);
            // No resetear profilePicturePreview para mantener la imagen actual si no se selecciona nada
        }
    };

    // Manejador para la subida de foto de perfil y actualización del perfil
    const handleUploadProfilePicture = async () => {
        if (!newProfilePicture) {
            setProfilePictureError('Por favor, selecciona una imagen para subir.');
            return;
        }

        setIsUploading(true);
        setProfilePictureMessage('');
        setProfilePictureError('');

        const token = localStorage.getItem("authToken");
        if (!token || !user?.id) { // Asegurarse de que el user.id esté disponible
            onLogout();
            setIsUploading(false);
            return;
        }

        try {
            // --- SIMULACIÓN DE SUBIDA DE ARCHIVO Y OBTENCIÓN DE URL ---
            // En un entorno real, aquí enviarías el 'newProfilePicture' a un endpoint
            // de subida de archivos (ej: /api/Upload/profilePicture) que devuelve la URL.
            // Este endpoint de backend sería el encargado de:
            // 1. Recibir el archivo de imagen.
            // 2. Guardarlo físicamente en la ruta `dist/fotos/` con el nombre `[user.id].jpg`.
            // 3. Reemplazar cualquier archivo existente con el mismo nombre.
            // 4. Devolver la URL pública como `/fotos/[user.id].jpg`.
            // 5. Para desarrollo, tu backend podría hacer una copia de este archivo
            //    en `public/fotos/` para que sea fácilmente accesible durante el desarrollo.
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simular retraso de red
            const simulatedPictureUrl = `/fotos/${user.id || 'default'}.jpg?t=${new Date().getTime()}`; // Simular URL pública
            // --- FIN DE SIMULACIÓN DE SUBIDA DE ARCHIVO Y OBTENCIÓN DE URL ---

            // Ahora, actualizamos el perfil del usuario con la nueva URL de la imagen
            const updatedUser = { ...user, profilePictureUrl: simulatedPictureUrl };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/User/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`
                },
                body: JSON.stringify(updatedUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar la foto de perfil en el servidor.');
            }
            
            // Si la actualización fue exitosa, actualizamos el estado local del usuario
            setUser(updatedUser);
            setProfilePicturePreview(simulatedPictureUrl);
            setProfilePictureMessage('Foto de perfil actualizada exitosamente.');
            setNewProfilePicture(null); // Limpiar el archivo seleccionado

        } catch (err) {
            setProfilePictureError(err.message || 'Error desconocido al subir o actualizar la foto.');
        } finally {
            setIsUploading(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                <p className="text-xl text-blue-400">Cargando perfil...</p>
            </div>
        );
    }

    const userLevel = getUserLevel(user.points);
    const initials = getUserInitials(user);

    return (
        <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center font-inter">
            <div className="w-full max-w-4xl bg-gray-900 rounded-xl shadow-xl border border-gray-800 text-gray-200 overflow-hidden">
                
                {/* Encabezado del perfil */}
                <div className="relative p-8 bg-gradient-to-r from-blue-700 to-purple-800 rounded-t-xl overflow-hidden">
                    <div className="absolute inset-0 bg-blue-900 opacity-20 transform skew-x-12 -ml-8"></div>
                    <div className="relative flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                        <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 md:mb-0 md:mr-8 group"> {/* Added group for hover effects */}
                            <img
                                src={profilePicturePreview || `https://placehold.co/150x150/2d3748/ffffff?text=${initials}`}
                                alt="Avatar"
                                className="w-full h-full rounded-full border-4 border-gray-800 object-cover shadow-lg transition-opacity duration-300 group-hover:opacity-75"
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/150x150/2d3748/ffffff?text=${initials}`; }}
                            />
                            {/* Input de archivo oculto */}
                            <input
                                type="file"
                                id="profile-picture-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {/* Botón de selección/subida de foto superpuesto */}
                            <label
                                htmlFor="profile-picture-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                title="Cambiar foto de perfil"
                            >
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A.997.997 0 0011.383 3H8.617a.997.997 0 00-.707.293L6.293 4.707A.997.997 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path>
                                </svg>
                            </label>
                            <span className="absolute bottom-0 right-0 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold transform translate-x-4 translate-y-2">
                                {user.points} pts
                            </span>
                        </div>
                        
                        <div className="flex-1">
                            <h2 className="text-4xl font-extrabold mb-1">{user.firstName} {user.lastName}</h2>
                            <p className="text-lg opacity-80 mb-4">@{user.username}</p>
                            <div className="flex justify-center md:justify-start space-x-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelColor(userLevel)}`}>
                                    Nivel: {userLevel}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Mensajes de estado de la foto de perfil */}
                    {(profilePictureError || profilePictureMessage || newProfilePicture) && (
                        <div className="mt-4 text-center md:text-left">
                            {newProfilePicture && (
                                <p className="text-gray-400 text-sm mb-2">Archivo seleccionado: {newProfilePicture.name}</p>
                            )}
                            {profilePictureError && <p className="text-red-500 text-sm">{profilePictureError}</p>}
                            {profilePictureMessage && <p className="text-green-500 text-sm">{profilePictureMessage}</p>}
                            <button
                                onClick={handleUploadProfilePicture}
                                disabled={!newProfilePicture || isUploading}
                                className={`mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md ${(!newProfilePicture || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isUploading ? 'Subiendo...' : 'Subir Nueva Foto'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Detalles del perfil */}
                <div className="p-8">
                    <h3 className="text-2xl font-bold mb-4 text-white">Detalles de la cuenta</h3>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                            <span className="text-gray-400">Usuario</span>
                            <span className="flex-1 text-right font-medium">@{user.username}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm1.5 5.5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-1zM7 10a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5H7zm4.5-.5a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-1zm4.5 0a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-1z"></path></svg>
                            <span className="text-gray-400">Puntos</span>
                            <span className="flex-1 text-right font-bold text-lg text-blue-400">{user.points}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 000 2h2a1 1 0 100-2h-2z" clipRule="evenodd"></path></svg>
                            <span className="text-gray-400">Ranking</span>
                            <span className="flex-1 text-right font-bold text-lg text-purple-400">{user.rankingPosition}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M11 12h3v1h-3v-1zm-3-3h7v1h-7v-1zm4-3h3v1h-3V6zm-4 0h3v1h-3V6z"></path></svg>
                            <span className="text-gray-400">Club</span>
                            <span className="flex-1 text-right font-medium">{user.clubName}</span>
                        </div>
                    </div>
                </div>

                {/* Sección de Cambio de Contraseña */}
                <div className="p-8 border-t border-gray-800">
                    <h3 className="text-2xl font-bold mb-4 text-white">Cambiar Contraseña</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label htmlFor="old-password" className="block text-sm font-medium text-gray-400 mb-1">Contraseña Actual</label>
                            <input
                                type="password"
                                id="old-password"
                                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-white"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-gray-400 mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                id="new-password"
                                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-white"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-400 mb-1">Confirmar Nueva Contraseña</label>
                            <input
                                type="password"
                                id="confirm-new-password"
                                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-white"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                        {passwordMessage && <p className="text-green-500 text-sm">{passwordMessage}</p>}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-md"
                        >
                            Cambiar Contraseña
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
