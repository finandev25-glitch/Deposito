import React from 'react';
import { motion } from 'framer-motion';

const PasswordStrengthMeter = ({ password }) => {
  const checkPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = checkPasswordStrength(password);

  const getStrengthInfo = () => {
    if (!password) return { label: '', color: 'bg-gray-200', width: '0%' };
    switch (strength) {
      case 0:
      case 1:
        return { label: 'Muy Débil', color: 'bg-red-500', width: '20%' };
      case 2:
        return { label: 'Débil', color: 'bg-orange-500', width: '40%' };
      case 3:
        return { label: 'Media', color: 'bg-yellow-500', width: '60%' };
      case 4:
        return { label: 'Fuerte', color: 'bg-green-400', width: '80%' };
      case 5:
        return { label: 'Muy Fuerte', color: 'bg-green-600', width: '100%' };
      default:
        return { label: '', color: 'bg-gray-200', width: '0%' };
    }
  };

  const { label, color, width } = getStrengthInfo();

  return (
    <div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
      {label && <p className="text-xs text-right mt-1 font-medium" style={{ color: color.replace('bg-', '').replace('-500', '-600').replace('-400', '-500') }}>{label}</p>}
    </div>
  );
};

export default PasswordStrengthMeter;
