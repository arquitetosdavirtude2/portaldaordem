'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapaBrasil3D = dynamic(() => import('@/components/MapaBrasil'), { ssr: false });
const MapaBrasil2D = dynamic(() => import('@/components/MapaBrasil2D'), { ssr: false });

export default function MapaPage() {
    const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("Otimizando experiência...");

    useEffect(() => {
        const checkHardware = () => {
            // 1. Try to get from cache first for instant load
            const cachedResult = localStorage.getItem('gomb_map_hardware_3d');
            if (cachedResult !== null) {
                console.log(`[MAP_SWITCHER] Using cached hardware profile: ${cachedResult === 'true' ? '3D' : '2D'}`);
                setWebglAvailable(cachedResult === 'true');
                return;
            }

            // 2. Perform the actual test if no cache
            setLoadingMessage("Analisando hardware...");
            
            // Artificial small delay for UX so the user sees we are optimizing
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    const isAvailable = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                    
                    console.log(`[MAP_SWITCHER] Hardware test complete: ${isAvailable ? '3D SUPPORTED' : '2D MODE'}`);
                    
                    // Save to cache
                    localStorage.setItem('gomb_map_hardware_3d', String(isAvailable));
                    setWebglAvailable(isAvailable);
                } catch (e) {
                    localStorage.setItem('gomb_map_hardware_3d', 'false');
                    setWebglAvailable(false);
                }
            }, 800);
        };

        checkHardware();
    }, []);

    // Safety function to allow the 3D component to report a failure and force 2D next time
    const handle3DFailure = () => {
        console.warn("[MAP_SWITCHER] 3D failure reported, reverting to 2D for next visit.");
        localStorage.setItem('gomb_map_hardware_3d', 'false');
        setWebglAvailable(false);
    };

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
            {webglAvailable ? (
                <MapaBrasil3D /> 
            ) : (
                <MapaBrasil2D />
            )}
        </main>
    );
}
