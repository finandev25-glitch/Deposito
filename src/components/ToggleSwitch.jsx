import React from 'react';
import { motion } from 'framer-motion';

const ToggleSwitch = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        checked ? 'bg-emerald-500' : 'bg-rose-500'
      }`}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
    >
      <motion.span
        aria-hidden="true"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0"
      />
    </button>
  );
};

export default ToggleSwitch;
