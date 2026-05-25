import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { apiPost } from '../services/backendApi.js';

const CambiarContrasena = () => {
  const { currentUser } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const loadingRef = React.useRef(false);

  // No necesitamos este useEffect ya que el finally maneja el loading correctamente

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validaciones
    if (!newPassword) {
      setMessage({ type: 'error', text: 'Ingresa tu nueva contraseña' });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }


    setLoading(true);
    loadingRef.current = true;

    try {
      console.log('🔐 Intentando cambiar contraseña para:', currentUser?.email || currentUser?.usuario);

      const email = currentUser?.email || currentUser?.usuario;
      if (!email) {
        throw new Error('No se pudo determinar el correo del usuario actual.');
      }

      if (!currentPassword) {
        throw new Error('Ingresa tu contraseña actual');
      }

      const loginResponse = await apiPost('/auth/login', {
        email,
        password: currentPassword,
      });

      const session = loginResponse?.data?.session;
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('No se pudo validar la sesión actual.');
      }

      const updateResponse = await apiPost('/auth/password', {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        password: newPassword,
      });

      if (!updateResponse?.data) {
        throw new Error('No se pudo actualizar la contraseña');
      }

      console.log('✅ Contraseña actualizada exitosamente');

      setMessage({
        type: 'success',
        text: 'Contraseña actualizada exitosamente. Tu sesión se mantendrá activa.',
      });

      // Limpiar formulario
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('❌ Error al cambiar contraseña:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Error al cambiar la contraseña. Verifica tu conexión e intenta nuevamente.',
      });
    } finally {
      console.log('🏁 Finalizando cambio de contraseña, desactivando loading');
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { strength: 0, label: 'Muy débil', color: 'bg-red-500' },
      { strength: 1, label: 'Débil', color: 'bg-orange-500' },
      { strength: 2, label: 'Regular', color: 'bg-yellow-500' },
      { strength: 3, label: 'Buena', color: 'bg-blue-500' },
      { strength: 4, label: 'Fuerte', color: 'bg-green-500' },
      { strength: 5, label: 'Muy fuerte', color: 'bg-green-600' },
    ];

    return levels[strength];
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 rounded-lg">
              <KeyRound className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cambiar Contraseña
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Actualiza tu contraseña de acceso
              </p>
            </div>
          </div>
        </motion.div>

        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
        >
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Usuario:</strong> {currentUser?.nombre || currentUser?.email}
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Email:</strong> {currentUser?.email || currentUser?.usuario}
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info sobre autenticación */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">Cambio de contraseña seguro</p>
                  <p>Como ya estás autenticado en el sistema, puedes cambiar tu contraseña directamente. Solo ingresa tu nueva contraseña y confírmala.</p>
                </div>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ingresa tu nueva contraseña"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mínimo 6 caracteres. Recomendado: mayúsculas, minúsculas, números y símbolos.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Confirma tu nueva contraseña"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            {/* Message */}
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    message.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {message.text}
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <KeyRound size={18} />
                    Cambiar Contraseña
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Security Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Consejos de Seguridad
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Usa al menos 8 caracteres</li>
            <li>• Combina mayúsculas y minúsculas</li>
            <li>• Incluye números y símbolos</li>
            <li>• No uses información personal</li>
            <li>• No reutilices contraseñas de otros sitios</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default CambiarContrasena;
