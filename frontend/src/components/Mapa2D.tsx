'use client';

import React, { useState } from 'react';
import { mapData } from './mapData';

interface Mapa2DProps {
    onEstadoClick: (sigla: string) => void;
    hoveredState: string | null;
    onHoverState: (sigla: string | null) => void;
}

const STATES_WITH_PRESENCE = ['ES', 'PR', 'RJ', 'SP', 'MG', 'MT', 'MS', 'PA', 'PB'];

export default function Mapa2D({ onEstadoClick, hoveredState, onHoverState }: Mapa2DProps) {
    const [viewBox] = useState("0 0 600 600"); // Standard Brazil Map viewbox

    const getFillColor = (sigla: string) => {
        const isPresence = STATES_WITH_PRESENCE.includes(sigla);
        const isHovered = hoveredState === sigla;

        if (isPresence) {
            if (isHovered) return '#3b82f6'; // blue-500
            return '#2e7d32'; // green-700
        }

        if (isHovered) return '#4b5563'; // gray-600
        return '#1f2937'; // gray-800
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4 md:p-20 bg-masonic-blue/30">
            <svg 
                viewBox={viewBox} 
                className="w-full h-full max-h-[80vh] drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                style={{ filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.2))' }}
            >
                <g>
                    {mapData.map((estado) => (
                        <path
                            key={estado.sigla}
                            d={estado.d}
                            fill={getFillColor(estado.sigla)}
                            stroke="#ffffff"
                            strokeWidth={hoveredState === estado.sigla ? "1" : "0.3"}
                            strokeOpacity={hoveredState === estado.sigla ? "0.8" : "0.2"}
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => onHoverState(estado.sigla)}
                            onMouseLeave={() => onHoverState(null)}
                            onClick={() => onEstadoClick(estado.sigla)}
                        >
                            <title>{estado.nome}</title>
                        </path>
                    ))}
                </g>
            </svg>
            
            {/* Tooltip Fallback for 2D */}
            <div className="absolute top-1/2 right-10 transform -translate-y-1/2 hidden lg:flex flex-col gap-4 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
                <h3 className="text-masonic-gold text-[10px] uppercase tracking-[0.3em] font-serif mb-2">Legenda</h3>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#2e7d32] border border-white/20"></div>
                    <span className="text-[9px] text-gray-300 uppercase tracking-widest">Presença GOMB</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#1f2937] border border-white/20"></div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest">Outros Orientes</span>
                </div>
            </div>
        </div>
    );
}
