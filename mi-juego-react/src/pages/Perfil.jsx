import React, { useEffect, useState, useCallback } from "react";
import * as lucide from 'lucide-react';

export default function Perfil({ onLogout }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [profilePictureMessage, setProfilePictureMessage] = useState('');
    const [profilePictureError, setProfilePictureError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        if (!token) {
            onLogout();
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/User/profile`, {
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') }
            });

            if (!res.ok) {
                if (res.status === 401) onLogout();
                throw new Error("Error al obtener el perfil: " + res.status);
            }
            const data = await res.json();
            setUser(data);
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

    const getUserLevel = (points) => {
        if (points > 1000) return "Oro";
        if (points > 700) return "Plata";
        if (points > 400) return "Bronce";
        return "Novato";
    };

    const getLevelColor = (level) => {
        if (level === "Oro") return "bg-yellow-500 text-gray-900";
        if (level === "Plata") return "bg-gray-400 text-gray-900";
        if (level === "Bronce") return "bg-orange-500 text-gray-900";
        return "bg-gray-600 text-white";
    };

    const getUserInitials = useCallback((user) => {
        if (!user) return '';
        if (user.firstName && user.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
        }
        return (user.firstName || user.username || 'U').charAt(0);
    }, []);

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
                body: JSON.stringify({ oldPassword, newPassword })
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

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

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
            setProfilePicturePreview(URL.createObjectURL(file));

            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/ProfilePicture/upload`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token.replace(/"/g, '')}` },
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
            setProfilePicturePreview(newUrl);
            setProfilePictureMessage('Foto de perfil actualizada exitosamente.');
        } catch (err) {
            setProfilePictureError(err.message || 'Error desconocido al subir la foto.');
            if (user?.profilePictureUrl) {
                setProfilePicturePreview(`${import.meta.env.VITE_API_URL}${user.profilePictureUrl}`);
            }
        } finally {
            setIsUploading(false);
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
        <div className="min-h-screen bg-gray-950 p-4 sm:p-6 flex items-center justify-center font-inter">
            <div className="w-full max-w-4xl bg-gray-900 rounded-xl shadow-xl border border-gray-800 text-gray-200 overflow-hidden">
                
                {/* Encabezado del perfil - MODIFICADO */}
                <div className="relative p-6 sm:p-8 bg-gradient-to-r from-blue-700 to-purple-800 rounded-t-xl overflow-hidden">
                    <div className="absolute inset-0 bg-blue-900 opacity-20 transform skew-x-12 -ml-8"></div>
                    <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
                        {/* Avatar */}
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-4 sm:mb-0 sm:mr-8 group flex-shrink-0">
                            <img
                                src={profilePicturePreview || `https://placehold.co/150x150/2d3748/ffffff?text=${initials}`}
                                alt="Avatar"
                                className={`w-full h-full rounded-full border-4 border-gray-800 object-cover shadow-lg transition-opacity duration-300 ${isUploading ? 'opacity-50' : 'group-hover:opacity-75'}`}
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/150x150/2d3748/ffffff?text=${initials}`; }}
                            />
                            <label
                                htmlFor="profile-picture-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                title="Cambiar foto de perfil"
                            >
                                {isUploading ? (
                                    <lucide.Loader2 className="w-8 h-8 text-white animate-spin" />
                                ) : (
                                    <lucide.Camera className="w-8 h-8 text-white" />
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
                            <span className="absolute bottom-0 right-0 bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full text-xs font-bold transform translate-x-2 translate-y-1">
                                {user.points} pts
                            </span>
                        </div>
                        
                        {/* Información del usuario */}
                        <div className="flex-1">
                            <h2 className="text-3xl sm:text-4xl font-extrabold mb-1">{user.firstName} {user.lastName}</h2>
                            <p className="text-md sm:text-lg opacity-80 mb-2">@{user.username}</p>
                            <div className="flex justify-center sm:justify-start space-x-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelColor(userLevel)}`}>
                                    Nivel: {userLevel}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Mensajes de estado */}
                    {(profilePictureError || profilePictureMessage) && (
                        <div className="mt-4 text-center sm:text-left">
                            {profilePictureError && <p className="text-red-400 text-sm">{profilePictureError}</p>}
                            {profilePictureMessage && <p className="text-green-400 text-sm">{profilePictureMessage}</p>}
                        </div>
                    )}
                </div>

                {/* Detalles del perfil - MODIFICADO */}
                <div className="p-6 sm:p-8">
                    <h3 className="text-xl sm:text-2xl font-bold mb-4 text-white">Detalles de la cuenta</h3>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.User className="w-5 h-5 text-blue-500" />
                            <span className="text-gray-400">Usuario</span>
                            <span className="flex-1 text-right font-medium text-sm sm:text-base">@{user.username}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.Award className="w-5 h-5 text-green-500" />
                            <span className="text-gray-400">Puntos</span>
                            <span className="flex-1 text-right font-bold text-md sm:text-lg text-blue-400">{user.points}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.BarChart className="w-5 h-5 text-purple-500" />
                            <span className="text-gray-400">Ranking</span>
                            <span className="flex-1 text-right font-bold text-md sm:text-lg text-purple-400">{user.rankingPosition}</span>
                        </div>
                        <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition duration-300">
                            <lucide.Users className="w-5 h-5 text-red-500" />
                            <span className="text-gray-400">Club</span>
                            <span className="flex-1 text-right font-medium text-sm sm:text-base">{user.clubName}</span>
                        </div>
                    </div>
                </div>

                {/* Sección de Cambio de Contraseña - MODIFICADO */}
                <div className="p-6 sm:p-8 border-t border-gray-800">
                    <h3 className="text-xl sm:text-2xl font-bold mb-4 text-white">Cambiar Contraseña</h3>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                            <label htmlFor="old-password" className="block text-sm font-medium text-gray-400 mb-1">Contraseña Actual</label>
                            <input
                                type="password"
                                id="old-password"
                                className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-white"
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
                                className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-white"
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
                                className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-white"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
                        {passwordMessage && <p className="text-green-500 text-sm mt-2">{passwordMessage}</p>}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md mt-4"
                        >
                            Cambiar Contraseña
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}