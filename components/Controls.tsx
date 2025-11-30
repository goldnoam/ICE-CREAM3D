import React from 'react';
import { Flavor, Topping, Container } from '../types';
import { FLAVOR_COLORS } from '../constants';

interface ControlsProps {
  onAddFlavor: (flavor: Flavor) => void;
  onSetContainer: (container: Container) => void;
  onSetTopping: (topping: Topping) => void;
  onClear: () => void;
  onSubmit: () => void;
  currentContainer: Container;
  currentTopping: Topping;
  isProcessing: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  onAddFlavor,
  onSetContainer,
  onSetTopping,
  onClear,
  onSubmit,
  currentContainer,
  currentTopping,
  isProcessing
}) => {
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto pointer-events-auto">
      
      {/* Container Selection */}
      <div className="bg-white/90 p-3 rounded-2xl shadow-lg backdrop-blur-sm">
        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">1. Choose Base</h3>
        <div className="flex gap-2">
            {Object.values(Container).map((c) => (
                <button
                    key={c}
                    onClick={() => onSetContainer(c)}
                    disabled={isProcessing}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all ${currentContainer === c ? 'bg-orange-400 text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    {c}
                </button>
            ))}
        </div>
      </div>

      {/* Flavor Selection */}
      <div className="bg-white/90 p-3 rounded-2xl shadow-lg backdrop-blur-sm">
        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">2. Add Scoops</h3>
        <div className="grid grid-cols-5 gap-2">
            {Object.values(Flavor).map((f) => (
                <div key={f} className="relative group">
                    <button
                        onClick={() => onAddFlavor(f)}
                        disabled={isProcessing}
                        className="w-full h-12 rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all border-2 border-white"
                        style={{ backgroundColor: FLAVOR_COLORS[f] }}
                        aria-label={`Add ${f}`}
                    />
                    {/* Enhanced Tooltip */}
                     <div 
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-1.5 bg-white text-gray-800 text-xs font-black rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none whitespace-nowrap z-20 shadow-xl border-2" 
                        style={{ borderColor: FLAVOR_COLORS[f] }}
                    >
                        {f}
                         {/* Triangle pointing down */}
                         <div 
                            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]" 
                            style={{ borderTopColor: FLAVOR_COLORS[f] }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Topping Selection */}
      <div className="bg-white/90 p-3 rounded-2xl shadow-lg backdrop-blur-sm">
        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">3. Top It Off</h3>
        <div className="flex gap-2">
            {Object.values(Topping).map((t) => (
                <button
                    key={t}
                    onClick={() => onSetTopping(t)}
                    disabled={isProcessing}
                    className={`flex-1 py-2 text-sm rounded-xl font-bold transition-all ${currentTopping === t ? 'bg-pink-500 text-white shadow-md transform scale-105' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}`}
                >
                    {t}
                </button>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <button 
            onClick={onClear} 
            disabled={isProcessing}
            className="flex-1 bg-red-100 text-red-600 py-4 rounded-2xl font-black text-xl hover:bg-red-200 transition-colors"
        >
            TRASH
        </button>
        <button 
            onClick={onSubmit}
            disabled={isProcessing}
            className="flex-[2] bg-gradient-to-r from-green-400 to-green-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg hover:shadow-green-300/50 hover:scale-[1.02] active:scale-95 transition-all"
        >
            SERVE!
        </button>
      </div>

    </div>
  );
};