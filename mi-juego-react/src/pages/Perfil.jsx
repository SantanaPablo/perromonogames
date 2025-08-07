import React, { useEffect, useState, useCallback } from "react";
import * as lucide from 'lucide-react';

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

    // Estados para la lógica de subida de foto de perfil
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
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/User/profile`, {
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    onLogout();
                }
                throw new Error("Error al obtener el perfil: " + res.status);
            }
            const data = await res.json();
            setUser(data);

            // Si el usuario ya tiene una foto, la usamos para la vista previa
            if (data.profilePictureUrl) {
                setProfilePicturePreview(`${import.meta.env.VITE_API_URL}${data.profilePictureUrl}`);
            }
        } catch (err) {
            console.error("Error al cargar perfil:", err);
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/User/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`
                },
                body: JSON.stringify({
                    oldPassword: oldPassword,
                    newPassword: newPassword,
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
    // La subida se inicia inmediatamente después de seleccionar el archivo.
    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return; // No hay archivo seleccionado, salimos
        }

        setIsUploading(true);
        setProfilePictureMessage('');
        setProfilePictureError('');

        const token = localStorage.getItem("authToken");
        if (!token) {
            onLogout();
            setIsUploading(false);
            return;
        }

        try {
            // Mostramos una vista previa del archivo seleccionado antes de subirlo
            setProfilePicturePreview(URL.createObjectURL(file));

            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/ProfilePicture/upload`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`
                },
                body: formData,
            });

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json();
                throw new Error(errorData.message || 'Error al subir la imagen.');
            }

            const apiResponse = await uploadRes.json();
            const newUrl = `${import.meta.env.VITE_API_URL}${apiResponse.imageUrl}`;

            setUser(prevUser => ({
                ...prevUser,
                profilePictureUrl: apiResponse.imageUrl
            }));
            setProfilePicturePreview(newUrl); // Actualizamos la vista previa con la URL final
            setProfilePictureMessage('Foto de perfil actualizada exitosamente.');
        } catch (err) {
            setProfilePictureError(err.message || 'Error desconocido al subir la foto.');
            // Volvemos a la foto original si la subida falla
            if (user?.profilePictureUrl) {
                setProfilePicturePreview(`${import.meta.env.VITE_API_URL}${user.profilePictureUrl}`);
            }
        } finally {
            setIsUploading(false);
            // Limpiar la URL de objeto para evitar fugas de memoria
            if (profilePicturePreview && typeof profilePicturePreview === 'string' && profilePicturePreview.startsWith('blob:')) {
                URL.revokeObjectURL(profilePicturePreview);
            }
        }
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                <lucide.Loader2 className="animate-spin mr-2 text-blue-400" size={24} />
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
                        <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 md:mb-0 md:mr-8 group">
                            <img
                                src={profilePicturePreview || `https://placehold.co/150x150/2d3748/ffffff?text=${initials}`}
                                alt="Avatar"
                                className={`w-full h-full rounded-full border-4 border-gray-800 object-cover shadow-lg transition-opacity duration-300 ${isUploading ? 'opacity-50' : 'group-hover:opacity-75'}`}
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/150x150/2d3748/ffffff?text=${initials}`; }}
                            />
                            {/* Overlay y input de archivo */}
                            <label
                                htmlFor="profile-picture-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                title="Cambiar foto de perfil"
                            >
                                {isUploading ? (
                                    <lucide.Loader2 className="w-10 h-10 text-white animate-spin" />
                                ) : (
                                    <lucide.Camera className="w-10 h-10 text-white" />
                                )}
                                <input
                                    type="file"
                                    id="profile-picture-upload"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleProfilePictureChange}
                                    disabled={isUploading}
                                />
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
                    {(profilePictureError || profilePictureMessage) && (
                        <div className="mt-6 text-center md:text-left">
                            {profilePictureError && <p className="text-red-400 text-sm">{profilePictureError}</p>}
                            {profilePictureMessage && <p className="text-green-400 text-sm">{profilePictureMessage}</p>}
                        </div>
                    )}
                </div>

                {/* Detalles del perfil */}
                <div className="p-8">
                    <h3 className="text-2xl font-bold mb-4 text-white">Detalles de la cuenta</h3>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.User className="w-6 h-6 text-blue-500" />
                            <span className="text-gray-400">Usuario</span>
                            <span className="flex-1 text-right font-medium">@{user.username}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.Award className="w-6 h-6 text-green-500" />
                            <span className="text-gray-400">Puntos</span>
                            <span className="flex-1 text-right font-bold text-lg text-blue-400">{user.points}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.BarChart className="w-6 h-6 text-purple-500" />
                            <span className="text-gray-400">Ranking</span>
                            <span className="flex-1 text-right font-bold text-lg text-purple-400">{user.rankingPosition}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.Users className="w-6 h-6 text-red-500" />
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
