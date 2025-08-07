import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Componente para la página de registro de nuevos usuarios con
 * un flujo de verificación de código por WhatsApp.
 * @param {Object} props
 * @param {Function} props.onRegisterSuccess Función que se llama al completar el registro y la verificación.
 * @returns {JSX.Element} El componente de la página de registro.
 */
export default function Register({ onRegisterSuccess }) {
  // Estado para los datos del formulario de registro
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });

  // Estado para el código de verificación
  const [verificationCode, setVerificationCode] = useState('');
  
  // Estados de control para la interfaz de usuario
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  // Maneja los cambios en los campos del formulario de registro
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Maneja los cambios en el campo del código de verificación
  const handleCodeChange = (e) => {
    setVerificationCode(e.target.value);
  };

  // Maneja el envío del formulario de registro
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Llama al endpoint de registro con los datos del formulario
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // --- INICIO DE LA CORRECCIÓN EN EL MANEJO DE ERRORES ---
        let errorMessage = 'Error al registrar el usuario.';
        const responseText = await response.text(); // Lee el cuerpo UNA SOLA VEZ como texto
        try {
          // Intenta parsear el texto como JSON
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (jsonParseError) {
          // Si no es JSON válido, usa el texto plano como mensaje de error
          errorMessage = responseText || errorMessage;
          console.error("No se pudo parsear la respuesta de error como JSON:", jsonParseError, "Respuesta de texto:", responseText);
        }
        throw new Error(errorMessage);
        // --- FIN DE LA CORRECCIÓN ---
      }

      const data = await response.json();
      // Si el registro es exitoso, pasamos al paso de verificación
      setPendingUser(data);
      setIsCodeSent(true);
    } catch (err) {
      console.error('Error de registro:', err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Maneja el envío del formulario de verificación
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Llama a un endpoint hipotético para verificar el código
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Auth/verify-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber, code: verificationCode }),
      });

      if (!response.ok) {
        // --- INICIO DE LA CORRECCIÓN EN EL MANEJO DE ERRORES ---
        let errorMessage = 'Código de verificación incorrecto.';
        const responseText = await response.text(); // Lee el cuerpo UNA SOLA VEZ como texto
        try {
          // Intenta parsear el texto como JSON
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (jsonParseError) {
          // Si no es JSON válido, usa el texto plano como mensaje de error
          errorMessage = responseText || errorMessage;
          console.error("No se pudo parsear la respuesta de error como JSON:", jsonParseError, "Respuesta de texto:", responseText);
        }
        throw new Error(errorMessage);
        // --- FIN DE LA CORRECCIÓN ---
      }

      // Si la verificación es exitosa, se llama a la función de éxito del componente padre
      const data = await response.json();
      if (data.isSuccess && data.token) {
        localStorage.setItem('authToken', data.token);
        onRegisterSuccess(data.token);
      } else {
        throw new Error('Verificación fallida. Inténtalo de nuevo.');
      }

    } catch (err) {
      console.error('Error de verificación:', err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Renderiza el formulario de registro o el de verificación, dependiendo del estado
  const renderForm = () => {
    if (isCodeSent) {
      // Formulario de verificación
      return (
        <form onSubmit={handleVerifySubmit} className="space-y-6">
          <p className="text-sm text-gray-400 text-center mb-4">
            Se ha enviado un código de verificación a tu número de WhatsApp.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Código de Verificación
            </label>
            <input
              type="text"
              name="verificationCode"
              value={verificationCode}
              onChange={handleCodeChange}
              className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              required
              minLength="6"
              maxLength="6"
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
            {loading ? 'Verificando...' : 'Verificar y Entrar'}
          </button>
        </form>
      );
    }

    // Formulario de registro principal
    return (
      <form onSubmit={handleRegisterSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Usuario</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Nombre</label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Apellido</label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Número de WhatsApp</label>
          <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200" required />
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
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tienes una cuenta? <Link to="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
        </p>
      </form>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 text-gray-200">
        <h2 className="text-3xl font-extrabold text-center text-blue-400 mb-6">
          {isCodeSent ? 'VERIFICAR NÚMERO' : 'REGISTRARSE'}
        </h2>

        {error && (
          <div className="bg-red-900 text-red-300 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        
        {renderForm()}
      </div>
    </div>
  );
}
