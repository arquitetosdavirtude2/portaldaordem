'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

interface Globo3DProps {
    onEstadoClick: (sigla: string) => void;
    hoveredState: string | null;
    onHoverState: (sigla: string | null) => void;
}

const STATES_WITH_PRESENCE = ['ES', 'PR', 'RJ', 'SP', 'MG', 'MT', 'MS', 'PA', 'PB'];

export default function Globo3D({ onEstadoClick, hoveredState, onHoverState }: Globo3DProps) {
    const globeEl = useRef<any>();
    const [mounted, setMounted] = useState(false);
    const [brazilGeoJson, setBrazilGeoJson] = useState<any>(null);
    const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);

    // Initial load effect
    useEffect(() => {
        setMounted(true);

        // Fetch Brazil States GeoJSON
        fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson')
            .then(res => res.json())
            .then(data => {
                // Add a guaranteed 'sigla' property if not present or map from 'sigla' if available
                // The source usually has 'sigla' or 'name'. Let's check typical structure or map name to sigla if needed.
                // Assuming standard GeoJSON structure. We might need a map if sigla isn't perfect.
                setBrazilGeoJson(data);
            });

        // Fetch World Countries GeoJSON for context (optional, or use built-in polygons if needed, 
        // but explicit load gives more control)
        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(setCountriesGeoJson);

    }, []);

    // Set initial point of view to Brazil
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.pointOfView({
                lat: -15,
                lng: -55,
                altitude: 1.8
            }, 1000);

            // Add subtle auto-rotation that stops on interaction
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.3;
        }
    }, [mounted]);

    // Combined data for polygons: Brazil states strictly on top
    const globeData = useMemo(() => {
        if (!brazilGeoJson) return [];
        // Map features to ensure they have the properties we need
        return brazilGeoJson.features.map((f: any) => ({
            ...f,
            properties: {
                ...f.properties,
                // Ensure we have a sigla we can rely on. 
                // The dataset 'brazil-states.geojson' normally has 'sigla'.
                sigla: f.properties.sigla || f.properties.name
            }
        }));
    }, [brazilGeoJson]);

    // Dynamic Style Logic
    const getPolygonLabel = (d: any) => `
        <div style="background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 4px; font-family: sans-serif;">
            <b>${d.properties.name}</b> (${d.properties.sigla})
        </div>
    `;

    const getPolygonSideColor = () => 'rgba(0, 0, 0, 0)'; // Transparent sides

    const getPolygonCapColor = (d: any) => {
        const sigla = d.properties.sigla;
        const isPresence = STATES_WITH_PRESENCE.includes(sigla);
        const isHovered = hoveredState === sigla;

        // Active State (Presence)
        if (isPresence) {
            if (isHovered) return 'rgba(59, 130, 246, 0.8)'; // Bright Blue on Hover
            return 'rgba(46, 125, 50, 0.8)'; // Realistic Green
        }

        // Inactive State
        if (isHovered) return 'rgba(75, 85, 99, 0.6)'; // Hovering inactive state (lighter gray)
        return 'rgba(31, 41, 55, 0.4)'; // Dark Gray transparent (Fog of War)
    };

    const getPolygonStrokeColor = (d: any) => {
        const isPresence = STATES_WITH_PRESENCE.includes(d.properties.sigla);
        return isPresence ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
    };

    // Altitude logic for 3D effect
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

            // Polygon Layer (Brazil States)
            polygonsData={globeData}
            polygonSideColor={getPolygonSideColor}
            polygonCapColor={getPolygonCapColor}
            polygonStrokeColor={getPolygonStrokeColor}
            polygonAltitude={getPolygonAltitude}
            polygonLabel={getPolygonLabel}

            // Interaction
            onPolygonHover={(polygon: any) => {
                const sigla = polygon ? polygon.properties.sigla : null;
                onHoverState(sigla);
                // Pause rotation on hover
                if (globeEl.current) {
                    globeEl.current.controls().autoRotate = !polygon;
                }
            }}
            onPolygonClick={(polygon: any) => {
                if (polygon) {
                    onEstadoClick(polygon.properties.sigla);
                }
            }}

            // Atmosphere
            atmosphereColor="#3a228a"
            atmosphereAltitude={0.15}
        />
    );
}
