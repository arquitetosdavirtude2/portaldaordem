'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<{ estado: string; tipo: string; role?: string, loja_cidade?: string, nome?: string, cargo?: string, loja_nome?: string, loja_numero?: string } | null>(null);

    useEffect(() => {
        const access = localStorage.getItem('acesso');
        if (!access) {
            router.push('/login');
        } else {
            const userObj = JSON.parse(access);
            setUser(userObj);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('acesso');
        router.push('/login');
    };

    if (!user) return null;

    // Unified Role/Title Logic - Strictly prioritize official titles or Lodge Name
    const rawRole = (user.role || "").toLowerCase().trim();
    const isMaster = (user.tipo || "").toLowerCase().trim() === 'master';
    
    let roleTitle = "Irmão";
    if (rawRole === 'admin' || isMaster) {
        roleTitle = 'Grão-Mestrado Federal';
    } else if (rawRole === 'mestre' || rawRole === 'estadual') {
        roleTitle = 'Grão-Mestrado Estadual';
    } else if (rawRole === 'loja' && user.loja_nome) {
        roleTitle = `${user.loja_nome}${user.loja_numero ? ` Nº ${user.loja_numero}` : ''}`;
    }

    const headerRole = roleTitle;

    return (
        <div className="min-h-screen bg-masonic-blue text-gray-100 font-serif overflow-hidden relative selection:bg-masonic-gold selection:text-masonic-blue">
            <div className="absolute inset-0 bg-[url('/texture-noise.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-masonic-gold/5 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

            <nav className="border-b border-masonic-gold/20 px-8 py-6 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 relative filter drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                        <Image
                            src="/logo-gomb.png"
                            alt="GOMB Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-masonic-gold tracking-[0.2em] font-serif uppercase drop-shadow-sm">
                            GOMB
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em] border-t border-masonic-gold/30 pt-1 mt-1">
                            Grande Oriente Maçônico do Brasil
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                        {rawRole === 'loja' && (
                            <p className="text-sm text-masonic-gold/80 font-bold tracking-wider uppercase font-sans">
                                L∴ {headerRole}
                            </p>
                        )}
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                            {
                                (rawRole === 'admin' || isMaster) ? 'Administração Federal' :
                                (rawRole === 'mestre' || rawRole === 'estadual') ? `ADMINISTRAÇÃO ESTADUAL - ${user.estado ? user.estado.toUpperCase() : ''}` :
                                user.loja_cidade ? user.loja_cidade.toUpperCase() : 
                                user.estado ? `ORIENTE DE ${user.estado.toUpperCase()}` :
                                'ADMINISTRAÇÃO FEDERAL'
                           }
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="group flex items-center gap-2 px-5 py-2 border border-red-500/30 rounded-full text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all text-xs uppercase tracking-widest hover:border-red-500/60"
                    >
                        <span>Sair</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </nav>

            <main className="p-8 md:p-12 max-w-7xl mx-auto relative z-10">
                <section className="mb-16 text-center py-12 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-32 bg-masonic-gold/5 blur-3xl rounded-full -z-10"></div>

                    <h2 className="text-3xl md:text-4xl font-bold text-masonic-gold mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-serif uppercase tracking-wider">
                        Bem-vindo, IR∴ {user.nome ? user.nome.split(' ')[0].toUpperCase() : 'IRMÃO'}
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base font-light tracking-wide leading-relaxed">
                        Selecione abaixo a ferramenta de trabalho para hoje. <br />
                        <span className="text-masonic-gold/60">"Trabalhar com alegria e servir com dedicação."</span>
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(isMaster || ['admin', 'mestre', 'estadual'].includes(rawRole)) && (
                        <div
                            onClick={() => window.location.href = '/mapa'}
                            className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/5 hover:border-masonic-gold cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-masonic-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-masonic-gold/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-masonic-gold/20"></div>

                            <div className="w-14 h-14 bg-masonic-gold/10 rounded-lg flex items-center justify-center mb-8 text-3xl border border-masonic-gold/20 group-hover:border-masonic-gold group-hover:bg-masonic-gold text-masonic-gold group-hover:text-masonic-blue transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                🌍
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-masonic-gold mb-3 transition-colors uppercase tracking-widest font-serif">
                                Mapa Interativo
                            </h3>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed font-light">
                                Acesse o globo 3D para visualizar Lojas, cadastrar obreiros e gerenciar o quadro maçônico nacional.
                            </p>

                            <div className="mt-8 flex items-center text-masonic-gold text-xs font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">
                                Acessar <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                            </div>
                        </div>
                    )}

                    {(user.role === 'admin' || isMaster) && (
                        <div
                            onClick={() => router.push('/admin/users')}
                            className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/5 hover:border-red-500/50 cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="w-14 h-14 bg-red-900/20 rounded-lg flex items-center justify-center mb-8 text-3xl border border-red-500/20 group-hover:border-red-500 group-hover:bg-red-600 text-red-500 group-hover:text-white transition-all duration-300">
                                👥
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-red-500 mb-3 transition-colors uppercase tracking-widest font-serif">
                                Gestão de Usuários
                            </h3>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed font-light">
                                Painel exclusivo para administração de usuários, permissões e configurações globais do sistema.
                            </p>

                            <div className="mt-8 flex items-center text-red-500 text-xs font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">
                                Administrar <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                            </div>
                        </div>
                    )}

                    {(user.role === 'admin' || isMaster) && (
                        <div
                            onClick={() => router.push('/admin/lojas')}
                            className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/5 hover:border-yellow-500/50 cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="w-14 h-14 bg-yellow-900/20 rounded-lg flex items-center justify-center mb-8 text-3xl border border-yellow-500/20 group-hover:border-yellow-500 group-hover:bg-yellow-600 text-yellow-500 group-hover:text-white transition-all duration-300">
                                🏛️
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-yellow-500 mb-3 transition-colors uppercase tracking-widest font-serif">
                                Gestão de Lojas
                            </h3>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed font-light">
                                Cadastro e gerenciamento de Lojas, Orientes e Ritos em todo o território nacional.
                            </p>

                            <div className="mt-8 flex items-center text-yellow-500 text-xs font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">
                                Gerenciar <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                            </div>
                        </div>
                    )}

                    {rawRole === 'loja' && (
                        <div
                            onClick={() => router.push(`/lojas`)}
                            className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/5 hover:border-blue-500/50 cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="w-14 h-14 bg-blue-900/20 rounded-lg flex items-center justify-center mb-8 text-3xl border border-blue-500/20 group-hover:border-blue-500 group-hover:bg-blue-600 text-blue-500 group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                🏛️
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-blue-500 mb-3 transition-colors uppercase tracking-widest font-serif">
                                Gestão de Loja
                            </h3>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed font-light">
                                Painel exclusivo para gerenciar os obreiros ativos e candidatos vinculados à sua Loja.
                            </p>

                            <div className="mt-8 flex items-center text-blue-500 text-xs font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">
                                Gerenciar <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                            </div>
                        </div>
                    )}

                    {/* Liberado para todos os usuários (Obreiros e Diretoria) */}
                    {true && (
                        <div 
                            onClick={() => router.push('/trabalhos')}
                            className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/5 hover:border-yellow-500/50 cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center mb-8 text-3xl border border-white/10 group-hover:border-yellow-500/50 group-hover:bg-yellow-600/20 text-yellow-500">
                                🏛️
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-yellow-500 mb-3 uppercase tracking-widest font-serif">
                                Escola de Mistérios
                            </h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-200 leading-relaxed font-light">
                                Acesse trabalhos, preleções e avance em sua jornada maçônica de acordo com seu grau.
                            </p>

                            <div className="mt-8 flex items-center text-yellow-500 text-xs font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">
                                ACESSAR <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                            </div>
                        </div>
                    )}

                    {(rawRole === 'loja' || rawRole === 'tesoureiro') && (
                        <div 
                            onClick={() => router.push('/tesouraria')}
                            className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/5 hover:border-green-500/50 cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center mb-8 text-3xl border border-white/10 group-hover:border-green-500/50 group-hover:bg-green-600/20 text-green-500">
                                💰
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-green-500 mb-3 uppercase tracking-widest font-serif">
                                Tesouraria
                            </h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-200 leading-relaxed font-light">
                                Gestão completa de troncos de beneficência, capitação e balanços financeiros.
                            </p>

                            <div className="mt-8 flex items-center text-green-500 text-xs font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">
                                ACESSAR <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
