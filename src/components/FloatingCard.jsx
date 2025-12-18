import React from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import DepositCard from './DepositCard';

const FloatingCard = ({ deposit, onClose }) => {
  const controls = useDragControls();

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-5 right-5 bg-gray-50 rounded-xl shadow-2xl border border-gray-200 z-[100] w-80"
    >
      <div 
        onPointerDown={(e) => controls.start(e)}
        className="p-2 flex items-center justify-between border-b border-gray-200 bg-white rounded-t-xl cursor-move"
      >
        <div className="flex items-center text-gray-500">
          <GripVertical size={16} />
          <span className="text-xs font-bold text-gray-700 ml-1">Tarjeta Flotante</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600">
          <X size={16} />
        </button>
      </div>
      <div className="p-2 pointer-events-none">
        <div className="select-none">
          <DepositCard deposit={deposit} />
        </div>
      </div>
    </motion.div>
  );
};

export default FloatingCard;
