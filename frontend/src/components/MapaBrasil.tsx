'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { mapData } from './mapData';
import EstadoDetailsOverlay from './EstadoDetailsOverlay';

// Dynamically import Globo3D to avoid SSR issues with window/webgl
const Globo3D = dynamic(() => import('./Globo3D'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-full h-full text-white/50 animate-pulse">
            Carregando Satélite...
        </div>
    )
});

export default function MapaBrasil() {
    const router = useRouter();
    const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null);
    const [estadoHover, setEstadoHover] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'master' | 'mestre' | 'estadual' | 'admin' | 'grao_mestre' | null>(null);
    const [userEstados, setUserEstados] = useState<string[]>([]);
    const [showPermissionWarning, setShowPermissionWarning] = useState(false);

    // Load user role on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const access = localStorage.getItem('acesso');
            if (access) {
                const user = JSON.parse(access);
                const realRole = user.role || user.tipo || 'master';
                setUserRole(realRole);
                const statesAllowed = user.allowed_states || user.estados || (user.estado ? [user.estado] : []);
                setUserEstados(statesAllowed);
            } else {
                setUserRole('master');
            }
        }
    }, []);

    const handleClickEstado = (sigla: string) => {
        // Only Master/Admin or users with explicit permission can select the state (case-insensitive and trimmed)
        const isMestreWithAccess = ['mestre', 'estadual'].includes(String(userRole).toLowerCase()) && userEstados.some(s => s.trim().toUpperCase() === sigla.trim().toUpperCase());

        if (['master', 'admin', 'grao_mestre'].includes(String(userRole).toLowerCase()) || isMestreWithAccess) {
            setEstadoSelecionado(sigla);
            setShowPermissionWarning(false);
        } else {
            // Flash a warning or just ignore the click
            setShowPermissionWarning(true);
            setTimeout(() => setShowPermissionWarning(false), 2000);
        }
    };

    const handleCloseOverlay = () => {
        setEstadoSelecionado(null);
    };

    const getEstadoNome = (sigla: string) => {
        // @ts-ignore
        return mapData.find(e => e.sigla === sigla)?.nome || sigla;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen overflow-hidden relative bg-masonic-blue">

            {/* Globe Container - Full Screen Background */}
            <div className={`absolute inset-0 z-0 transition-all duration-700 ${estadoSelecionado ? 'translate-x-[-20%] scale-75 blur-sm opacity-50' : 'opacity-100'}`}>
                <Globo3D
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
                    userRole={userRole || 'master'}
                    onClose={handleCloseOverlay}
                />
            )}

            {/* UI Header - Z-Index 10 */}
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

                {/* Instruction Text - Moved Up */}
                {!estadoSelecionado && (
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] text-gray-400 font-light uppercase tracking-[0.3em] animate-pulse">
                            Selecione um Oriente no Globo
                        </p>
                        {showPermissionWarning && (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-[0.2em] mt-2 animate-bounce">
                                ⚠️ Acesso Restrito: Sem permissão para este Oriente
                            </p>
                        )}
                    </div>
                )}

                <div className="inline-flex items-center gap-4 px-6 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 shadow-lg pointer-events-auto">
                    <button onClick={() => {
                        // All logged users can go to Dashboard since it handles permissions
                        // Use replace to avoid pushing duplicate entries to browser history (fixing back button loops)
                        router.replace('/dashboard');
                    }} className="text-xs text-gray-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        Voltar ao Painel
                    </button>
                    {!estadoSelecionado && (
                        <>
                            <span className="text-white/10">|</span>
                            <p className="text-[10px] text-gray-500 font-light uppercase tracking-[0.2em]">
                                Mapa Interativo
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
