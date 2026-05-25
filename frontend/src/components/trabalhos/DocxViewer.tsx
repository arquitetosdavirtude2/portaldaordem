'use client';

import { useEffect, useRef, useState } from 'react';

export default function DocxViewer({ url }: { url: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadDocx = async () => {
            if (!containerRef.current) return;
            try {
                setLoading(true);
                const res = await fetch(url);
                if (!res.ok) throw new Error('Falha ao carregar');
                const blob = await res.blob();
                
                // Only import on client side since docx-preview uses DOM
                const { renderAsync } = await import('docx-preview');
                
                if (!isMounted) return;
                
                // Limpa o container antes de renderizar
                containerRef.current.innerHTML = '';
                
                await renderAsync(blob, containerRef.current, undefined, {
                    className: 'docx-viewer-document',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: true,
                    experimental: false,
                    trimXmlDeclaration: true,
                    useBase64URL: false,
                    renderChanges: false,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                    debug: false
                });
                
            } catch (err) {
                console.error('Erro ao renderizar docx:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDocx();
        return () => { isMounted = false; };
    }, [url]);

    return (
        <div className="w-full h-[600px] bg-white rounded-xl overflow-y-auto shadow-inner relative custom-scrollbar docx-preview-container">
            <style>{`
                .docx-preview-container .docx-wrapper {
                    background: transparent !important;
                    padding: 20px !important;
                }
                .docx-preview-container .docx-viewer-document {
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                    margin-bottom: 20px !important;
                }
            `}</style>
            
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Carregando Documento...</p>
                </div>
            )}
            
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-gray-800 font-bold mb-2">Erro ao renderizar arquivo</p>
                    <p className="text-gray-500 text-xs">Ocorreu um problema ao tentar exibir este documento DOCX. Por favor, use a opção de baixar o arquivo.</p>
                </div>
            )}
            
            <div ref={containerRef} className="w-full min-h-full" />
        </div>
    );
}
