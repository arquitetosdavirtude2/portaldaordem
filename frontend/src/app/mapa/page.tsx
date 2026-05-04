'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapaBrasil3D = dynamic(() => import('@/components/MapaBrasil'), { ssr: false });
const MapaBrasil2D = dynamic(() => import('@/components/MapaBrasil2D'), { ssr: false });

// Error Boundary Component to catch 3D crashes
class MapErrorBoundary extends React.Component<{ children: React.ReactNode, onError: () => void }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("[MAP_ERROR_BOUNDARY] 3D Map crashed:", error, errorInfo);
        this.props.onError();
    }
    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

export default function MapaPage() {
    const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("Otimizando experiência...");
    const [force2D, setForce2D] = useState(false);

    useEffect(() => {
        const checkHardware = () => {
            // 1. Try to get from cache first - VERSION 7
            const cachedResult = localStorage.getItem('gomb_map_hardware_v7');
            if (cachedResult !== null) {
                console.log(`[MAP_SWITCHER] Using hardware profile V7: ${cachedResult === '3D' ? 'PREMIUM (3D)' : 'LIGHT (2D)'}`);
                setWebglAvailable(cachedResult === '3D');
                return;
            }

            // 2. Perform the actual test if no cache
            setLoadingMessage("Analisando hardware...");
            
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
                    
                    if (!gl) {
                        localStorage.setItem('gomb_map_hardware_v7', '2D');
                        setWebglAvailable(false);
                        return;
                    }

                    // Strict Check: Check for old Intel chipsets that are known to crash
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
                        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
                        console.log(`[MAP_SWITCHER] GPU: ${vendor} | ${renderer}`);
                        
                        // Blacklist known problematic chips
                        if (renderer.includes('Q45') || renderer.includes('Q43') || renderer.includes('G41') || renderer.includes('Express Chipset')) {
                            console.warn("[MAP_SWITCHER] Legacy GPU detected. Forcing 2D for stability.");
                            localStorage.setItem('gomb_map_hardware_v7', '2D');
                            setWebglAvailable(false);
                            return;
                        }
                    }
                    
                    console.log(`[MAP_SWITCHER] Analysis complete: 3D OK`);
                    localStorage.setItem('gomb_map_hardware_v7', '3D');
                    setWebglAvailable(true);
                } catch (e) {
                    localStorage.setItem('gomb_map_hardware_v7', '2D');
                    setWebglAvailable(false);
                }
            }, 1200);
        };

        checkHardware();
    }, []);

    const handle3DFailure = () => {
        console.warn("[MAP_SWITCHER] 3D failed at runtime. Switching to 2D and updating cache.");
        localStorage.setItem('gomb_map_hardware_v7', '2D');
        setForce2D(true);
        setWebglAvailable(false);
    };

    useEffect(() => {
        console.log("%c--- SISTEMA DE MAPA HIBRIDO ATIVADO V7 ---", "color: #eab308; font-weight: bold; font-size: 14px;");
    }, []);

    if (webglAvailable === null) {
        return (
            <main className="min-h-screen bg-masonic-blue flex flex-col items-center justify-center gap-6 p-10 text-center">
                <div className="w-20 h-20 mb-4 relative filter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)] opacity-50">
                    <img src="/logo-gomb.png" alt="GOMB" className="object-contain w-full h-full" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-masonic-gold/50 to-transparent mb-4"></div>
                    <p className="text-masonic-gold/80 text-[10px] uppercase tracking-[0.6em] animate-pulse font-serif">
                        {loadingMessage}
                    </p>
                    <p className="text-white/20 text-[8px] uppercase tracking-[0.3em] mt-2">
                        Configurando mapa interativo para seu dispositivo
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black">
            {webglAvailable && !force2D ? (
                <MapErrorBoundary onError={handle3DFailure}>
                    <MapaBrasil3D /> 
                </MapErrorBoundary>
            ) : (
                <MapaBrasil2D />
            )}
        </main>
    );
}
