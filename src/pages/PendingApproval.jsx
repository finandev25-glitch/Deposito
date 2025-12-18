import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Clock, LogOut, ShieldCheck } from 'lucide-react';

const PendingApproval = () => {
  const { logout, currentUser } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-block bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-full mb-4">
          <Clock className="text-yellow-600 dark:text-yellow-400" size={34} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Cuenta Pendiente de Aprobación</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Hola, <span className="font-semibold">{currentUser?.nombre}</span>. Tu cuenta ha sido creada pero necesita ser activada por un administrador. Por favor, contacta a soporte si la espera es muy larga.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
        >
          <LogOut size={14} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
