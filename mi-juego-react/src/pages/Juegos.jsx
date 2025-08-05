import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Componente de la página de Juegos.
 * Muestra una lista de juegos disponibles y permite la navegación
 * a cada uno de ellos usando React Router.
 */
export default function Juegos() {
  return (
    <div className="p-8 bg-gray-950 text-white min-h-screen md:min-h-0">
      <h2 className="text-3xl font-extrabold text-blue-400 mb-6">Juegos Disponibles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card para el juego "Adivinar la Palabra" */}
        {/* Usamos el componente Link para navegar a la ruta /palabradiaria */}
        <Link to="/palabradiaria"
          className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 cursor-pointer hover:scale-105 transform transition duration-300 ease-in-out"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 18h.01M16 18h.01M21 12c0-3.866-4.03-7-9-7s-9 3.134-9 7c0 1.942.84 3.738 2.213 5.083l-1.42 2.13a.5.5 0 00.41.807H6.5a.5.5 0 00.395-.195L8 16.5a.5.5 0 01.395-.195h7.21a.5.5 0 01.395.195l1.01 1.01a.5.5 0 00.395.195h2.29a.5.5 0 00.41-.807l-1.42-2.13A8.966 8.966 0 0021 12z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-blue-400 mb-2">Adivina la Palabra</h3>
          <p className="text-gray-400 text-sm text-center">
            Un juego diario para adivinar una palabra de 5 letras.
          </p>
        </Link>
        
        {/* Card para el juego "Adivinar Pin" */}
        <Link to="/pindiario"
          className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 cursor-pointer hover:scale-105 transform transition duration-300 ease-in-out"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2v2a2 2 0 01-2 2h-1a2 2 0 01-2-2V9a2 2 0 012-2h1zm0 0H9m6 0V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2m8 0v2a2 2 0 01-2 2H9a2 2 0 01-2-2V7m8 0h-6a2 2 0 00-2 2v2a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-green-400 mb-2">Adivinar Pin</h3>
          <p className="text-gray-400 text-sm text-center">
            Descifra un código numérico en el menor número de intentos.
          </p>
        </Link>
 {/* Card para el juego "El Ahorcado" */}
        <Link to="/ahorcado"
          className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 cursor-pointer hover:scale-105 transform transition duration-300 ease-in-out"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v2h-6V11zM18 13H6c-1.105 0-2 .895-2 2v4h16v-4c0-1.105-.895-2-2-2zM6 15h12v4H6v-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13v-2a3 3 0 016 0v2m-6 0h6m-6 0a3 3 0 00-3-3H6a3 3 0 00-3 3v2m16-2a3 3 0 00-3-3h-2a3 3 0 00-3 3v2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-red-400 mb-2">El Ahorcado</h3>
          <p className="text-gray-400 text-sm text-center">
            Adivina la palabra oculta letra por letra antes de quedarte sin intentos.
          </p>
        </Link>
        {/* Card para el juego "Juego de la Memoria" */}
        <Link to="/memoria"
          className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 cursor-pointer hover:scale-105 transform transition duration-300 ease-in-out"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-600 rounded-full mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.155V5.845a2 2 0 011.553-1.821L9 2m0 18v-8m0 8a2 2 0 002 2h4a2 2 0 002-2m-8 0v-8m8 0v-8m0 8a2 2 0 01-2 2h-4a2 2 0 01-2-2m-8 0V5.845a2 2 0 012-1.821l5.447-2.724M9 2v8m8 0V2m-8 10h.01M17 12h.01" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-yellow-400 mb-2">Juego de la Memoria</h3>
          <p className="text-gray-400 text-sm text-center">
            Encuentra las parejas de cartas idénticas antes de que se acabe el tiempo.
          </p>
        </Link>

        {/* Card para el juego "Adivinar el Famoso" */}
        <Link to="/adivinar-famoso"
          className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 cursor-pointer hover:scale-105 transform transition duration-300 ease-in-out"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.503 4.633a1 1 0 00.95.69h4.873c.969 0 1.371 1.24.588 1.81l-3.957 2.875a1 1 0 00-.364 1.118l1.503 4.633c.3.921-.755 1.688-1.54 1.118l-3.957-2.875a1 1 0 00-1.176 0l-3.957 2.875c-.785.57-1.84-.197-1.54-1.118l1.503-4.633a1 1 0 00-.364-1.118L2.57 10.12c-.783-.57-.38-1.81.588-1.81h4.873a1 1 0 00.95-.69l1.503-4.633z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-purple-400 mb-2">Adivinar el Famoso</h3>
          <p className="text-gray-400 text-sm text-center">
            ¿Puedes adivinar el nombre de la celebridad oculta?
          </p>
        </Link>

       
      </div>
    </div>
  );
}
