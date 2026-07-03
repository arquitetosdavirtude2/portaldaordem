'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { mapData } from './mapData';
import EstadoDetailsOverlay from './EstadoDetailsOverlay';
import Mapa2D from './Mapa2D';

export default function MapaBrasil2D() {
    const router = useRouter();
    const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null);
    const [estadoHover, setEstadoHover] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'master' | 'mestre' | 'estadual' | 'admin' | 'grao_mestre' | 'federal' | 'mestre_federal' | null>(null);
    const [userEstados, setUserEstados] = useState<string[]>([]);
    const [showPermissionWarning, setShowPermissionWarning] = useState(false);

    // Load user role on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const access = localStorage.getItem('acesso');
            if (access) {
                const user = JSON.parse(access);
                const realRole = (user.role || user.tipo || 'master').toLowerCase() as any;
                setUserRole(realRole);
                const statesAllowed = user.allowed_states || user.estados || (user.estado ? [user.estado] : []);
                setUserEstados(statesAllowed);
            } else {
                router.replace('/login');
            }
        }
    }, [router]);

    const handleClickEstado = useCallback((sigla: string) => {
        if (!sigla) return;
        
        const s = sigla.trim().toUpperCase();
        const roleStr = String(userRole).toLowerCase();
        
        const isFederal = roleStr.includes('admin') || 
                          roleStr.includes('federal') || 
                          roleStr.includes('master') ||
                          roleStr.includes('grao_mestre') ||
                          roleStr.includes('grao mestre');
                          
        const hasAccess = isFederal || userEstados.includes('*') || userEstados.some(allowed => allowed && allowed.trim().toUpperCase() === s);

        if (hasAccess) {
            setEstadoSelecionado(s);
            setShowPermissionWarning(false);
        } else {
            setShowPermissionWarning(true);
            setTimeout(() => setShowPermissionWarning(false), 3000);
        }
    }, [userRole, userEstados]);

    const handleCloseOverlay = () => {
        setEstadoSelecionado(null);
    };

    const getEstadoNome = (sigla: string) => {
        // @ts-ignore
        return mapData.find(e => e.sigla === sigla)?.nome || sigla;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen overflow-hidden relative bg-masonic-blue">

            {/* Flat Map Container */}
            <div className={`absolute inset-0 z-0 transition-all duration-700 ${estadoSelecionado ? 'translate-x-[-20%] scale-75 blur-sm opacity-50' : 'opacity-100'}`}>
                <Mapa2D
                    onEstadoClick={handleClickEstado}
                    hoveredState={estadoHover}
                    onHoverState={setEstadoHover}
                />
            </div>

            {/* State Details Overlay */}
            {estadoSelecionado && (
                <EstadoDetailsOverlay
                    sigla={estadoSelecionado}
                    nomeEstado={getEstadoNome(estadoSelecionado)}
                    userRole={(userRole as any) || 'master'}
                    onClose={handleCloseOverlay}
                />
            )}

            {/* UI Header */}
            {!estadoSelecionado && (
                <div className="z-10 w-full max-w-4xl flex flex-col items-center pointer-events-none fixed top-10 animate-in fade-in slide-in-from-top-10 duration-700">
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 mb-4 relative filter drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                            <img
                                src="/logo-gomb.png"
                                alt="GOMB Logo"
                                className="object-contain w-full h-full"
                            />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold mb-2 text-masonic-gold text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-widest font-serif uppercase">
                            GOMB
                        </h1>
                        <p className="text-gray-300 mb-8 text-center text-xs uppercase tracking-[0.5em] font-light border-t border-b border-gray-500/30 py-2 px-8">
                            Grande Oriente Maçônico do Brasil
                        </p>
                    </div>

                    <div className="h-12 mb-6 pointer-events-auto">
                        {estadoHover && (
                            <span className="px-8 py-3 bg-black/80 backdrop-blur-md text-masonic-gold border border-masonic-gold/50 rounded-full text-lg font-serif tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 animate-in fade-in zoom-in">
                                {getEstadoNome(estadoHover)}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer / Instructions */}
            <div className="z-10 fixed bottom-10 w-full text-center pointer-events-none flex flex-col items-center gap-4">

                {!estadoSelecionado && (
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] text-gray-400 font-light uppercase tracking-[0.3em] animate-pulse">
                            Selecione um Oriente no Mapa
                        </p>
                        {showPermissionWarning && (
                            <div className="mt-4 px-6 py-2 bg-red-950/80 border border-red-500/50 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-in slide-in-from-bottom-4 fade-in duration-300">
                                <p className="text-xs md:text-sm text-red-400 font-bold uppercase tracking-[0.2em] animate-pulse">
                                    ⚠️ Acesso Restrito: Sem permissão para este Oriente
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="inline-flex items-center gap-4 px-6 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 shadow-lg pointer-events-auto">
                    <button onClick={() => router.replace('/dashboard')} className="text-xs text-gray-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        Voltar ao Painel
                    </button>
                    {!estadoSelecionado && (
                        <>
                            <span className="text-white/10">|</span>
                            <p className="text-[10px] text-gray-500 font-light uppercase tracking-[0.2em]">
                                Mapa Interativo (Modo Leve)
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
