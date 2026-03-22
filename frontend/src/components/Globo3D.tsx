'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

interface Globo3DProps {
    onEstadoClick: (sigla: string) => void;
    hoveredState: string | null;
    onHoverState: (sigla: string | null) => void;
}

const NAME_TO_SIGLA: { [key: string]: string } = {
    'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
    'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
    'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
    'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE', 'Piauí': 'PI',
    'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
    'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
    'Sergipe': 'SE', 'Tocantins': 'TO',
    'Mato Grosso Do Sul': 'MS', 'Rio Grande Do Norte': 'RN', 'Rio Grande Do Sul': 'RS',
    'Amapa': 'AP', 'Goias': 'GO', 'Maranhao': 'MA', 'Para': 'PA', 'Paraiba': 'PB', 'Parana': 'PR', 'Piaui': 'PI', 'Rondonia': 'RO', 'Sao Paulo': 'SP'
};

const STATES_WITH_PRESENCE = ['ES', 'PR', 'RJ', 'SP', 'MG', 'MT', 'MS', 'PA', 'PB'];

export default function Globo3D({ onEstadoClick, hoveredState, onHoverState }: Globo3DProps) {
    const globeEl = useRef<any>();
    const [mounted, setMounted] = useState(false);
    const [brazilGeoJson, setBrazilGeoJson] = useState<any>(null);

    // Initial load effect
    useEffect(() => {
        setMounted(true);
        fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson')
            .then(res => res.json())
            .then(data => {
                setBrazilGeoJson(data);
            });
    }, []);

    // Set initial point of view to Brazil
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.pointOfView({
                lat: -15,
                lng: -55,
                altitude: 1.8
            }, 1000);
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.3;
        }
    }, [mounted]);

    // Combined data for polygons
    const globeData = useMemo(() => {
        if (!brazilGeoJson) return [];
        return brazilGeoJson.features.map((f: any) => {
            const rawName = f.properties.name || f.properties.nome || "";
            // Use existing sigla if it's 2 chars, otherwise try mapping the name
            let sigla = f.properties.sigla;
            if (!sigla || sigla.length !== 2) {
                sigla = NAME_TO_SIGLA[rawName] || sigla || rawName;
            }
            
            return {
                ...f,
                properties: {
                    ...f.properties,
                    sigla: sigla 
                }
            };
        });
    }, [brazilGeoJson]);

    // Dynamic Style Logic
    const getPolygonLabel = (d: any) => `
        <div style="background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 4px; font-family: sans-serif;">
            <b>${d.properties.name || d.properties.nome}</b> (${d.properties.sigla})
        </div>
    `;

    const getPolygonSideColor = () => 'rgba(0, 0, 0, 0)'; 

    const getPolygonCapColor = (d: any) => {
        const sigla = d.properties.sigla;
        const isPresence = STATES_WITH_PRESENCE.includes(sigla);
        const isHovered = hoveredState === sigla;

        if (isPresence) {
            if (isHovered) return 'rgba(59, 130, 246, 0.8)'; 
            return 'rgba(46, 125, 50, 0.8)'; 
        }

        if (isHovered) return 'rgba(75, 85, 99, 0.6)'; 
        return 'rgba(31, 41, 55, 0.4)'; 
    };

    const getPolygonStrokeColor = (d: any) => {
        const isPresence = STATES_WITH_PRESENCE.includes(d.properties.sigla);
        return isPresence ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
    };

    const getPolygonAltitude = (d: any) => {
        const sigla = d.properties.sigla;
        const isPresence = STATES_WITH_PRESENCE.includes(sigla);
        const isHovered = hoveredState === sigla;

        if (isHovered) return 0.03;
        if (isPresence) return 0.015;
        return 0.005;
    };

    if (!mounted) return null;

    return (
        <Globe
            ref={globeEl}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            polygonsData={globeData}
            polygonSideColor={getPolygonSideColor}
            polygonCapColor={getPolygonCapColor}
            polygonStrokeColor={getPolygonStrokeColor}
            polygonAltitude={getPolygonAltitude}
            polygonLabel={getPolygonLabel}
            onPolygonHover={(polygon: any) => {
                const sigla = polygon ? polygon.properties.sigla : null;
                onHoverState(sigla);
                if (globeEl.current) {
                    globeEl.current.controls().autoRotate = !polygon;
                }
            }}
            onPolygonClick={(polygon: any) => {
                if (polygon) {
                    onEstadoClick(polygon.properties.sigla);
                }
            }}
            atmosphereColor="#3a228a"
            atmosphereAltitude={0.15}
        />
    );
}
