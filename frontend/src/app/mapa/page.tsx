'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapaBrasil3D = dynamic(() => import('@/components/MapaBrasil'), { ssr: false });
const MapaBrasil2D = dynamic(() => import('@/components/MapaBrasil2D'), { ssr: false });

export default function MapaPage() {
    const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        const checkWebGL = () => {
            try {
                const canvas = document.createElement('canvas');
                const isAvailable = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                console.log(`[MAP_SWITCHER] WebGL Status: ${isAvailable ? 'SUPPORTED' : 'UNSUPPORTED'}`);
                setWebglAvailable(isAvailable);
            } catch (e) {
                setWebglAvailable(false);
            }
        };
        checkWebGL();
    }, []);

    if (webglAvailable === null) {
        return (
            <main className="min-h-screen bg-masonic-blue flex items-center justify-center">
                <div className="text-white/20 animate-pulse text-[10px] uppercase tracking-[0.5em]">
                    Analisando Hardware...
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black">
            {webglAvailable ? <MapaBrasil3D /> : <MapaBrasil2D />}
        </main>
    );
}
