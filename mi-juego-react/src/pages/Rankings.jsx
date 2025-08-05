import React, { useState, useEffect } from 'react';
import { FaTrophy, FaCrown } from "react-icons/fa";

/**
 * Componente para mostrar la página de rankings.
 * Obtiene los datos de rankings de la API y los muestra en una tabla.
 * @returns {JSX.Element} El componente de la página de rankings.
 */
export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Usamos la variable de entorno para la URL de la API.
    // Se añade un fallback en caso de que la variable no esté definida.
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem("authToken");

    if (!token) {
        setError("No estás autenticado. Por favor, inicia sesión.");
        setLoading(false);
        return;
    }

    const cleanedToken = token.replace(/"/g, '');

    try {
        // Decodificamos el token para obtener el ID del usuario
        const payload = JSON.parse(atob(cleanedToken.split('.')[1]));
        setUserId(+payload.nameid); // aseguramos que sea número
    } catch (e) {
        console.error("Error decodificando el token:", e);
        setError("Error de autenticación. Por favor, inicia sesión de nuevo.");
        setLoading(false);
        return;
    }
    
    fetch(`${apiUrl}/api/rankings`, {
      headers: { Authorization: "Bearer " + cleanedToken }
    })
      .then(res => {
        if (!res.ok) {
            throw new Error(`Error al cargar los rankings: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => setRankings(data))
      .catch(err => {
        console.error("Error rankings:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const getAvatarUrl = (id, url) =>
    url || `https://i.pravatar.cc/150?u=${id}`;

  const getCrownColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <p className="text-xl text-blue-400">Cargando rankings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 bg-gray-950 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-extrabold text-blue-400 mb-8 flex items-center justify-center">
          <FaTrophy className="mr-4 text-blue-400" />
          Clasificación Global
        </h2>

        {error && (
          <div className="bg-red-900 text-red-300 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {rankings && rankings.length > 0 ? (
            rankings.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-xl transition duration-300 transform hover:scale-105 shadow-lg ${
                  Number(player.id) === userId
                    ? 'bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                {/* RANK */}
                <div className="flex items-center space-x-6">
                  <div className={`relative flex items-center justify-center font-bold text-xl w-10 h-10 rounded-full ${
                    player.rankingPosition === 1
                      ? 'bg-yellow-600'
                      : player.rankingPosition === 2
                      ? 'bg-gray-600'
                      : player.rankingPosition === 3
                      ? 'bg-amber-800'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {player.rankingPosition <= 3 && (
                      <FaCrown className={`absolute w-8 h-8 -top-1 ${getCrownColor(player.rankingPosition)}`} />
                    )}
                    <span className="relative z-10 text-white">
                      {player.rankingPosition}
                    </span>
                  </div>

                  {/* AVATAR + NOMBRE */}
                  <img
                    src={getAvatarUrl(player.id, player.profilePictureUrl)}
                    className="w-12 h-12 rounded-full border-2 border-gray-600"
                    alt={player.username}
                  />
                  <div>
                    <div className={`font-semibold text-lg ${Number(player.id) === userId ? 'text-white' : ''}`}>
                      {player.firstName} {player.lastName}
                      {Number(player.id) === userId && (
                        <span className="ml-2 text-sm bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">
                          🎮 Tú
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">@{player.username}</div>
                  </div>
                </div>

                {/* CLUB (opcional) */}
                <div className="flex-1 text-right mr-8 hidden md:block">
                  {player.clubName && (
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                      {player.clubName}
                    </span>
                  )}
                </div>

                {/* PUNTOS */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-300">{player.points}</div>
                  <div className="text-sm text-gray-500 uppercase">pts</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 text-xl py-12">
              No hay datos de ranking disponibles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
