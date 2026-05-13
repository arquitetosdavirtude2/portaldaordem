'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import DashboardTrabalhos from '@/components/trabalhos/DashboardTrabalhos';
import { useRouter } from 'next/navigation';

export default function TrabalhosPage() {
    const [acesso, setAcesso] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (!auth) {
            router.push('/login');
            return;
        }
        setAcesso(JSON.parse(auth));
    }, [router]);

    if (!acesso) return null;

    return (
        <main className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500/30">
            <Header />
            
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-24 pb-20">
                {/* Hero Section */}
                <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Escola de Mistérios</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-white mb-2 uppercase">
                        Trabalhos & Preleções
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base max-w-2xl font-light leading-relaxed">
                        Gerencie sua evolução no Grau de {acesso.status || 'Aprendiz'}. Acompanhe estudos, 
                        assista conteúdos exclusivos e submeta seus trabalhos para avaliação.
                    </p>
                </div>

                <DashboardTrabalhos acesso={acesso} />
            </div>
        </main>
    );
}
