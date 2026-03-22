'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormCadastro from '@/components/FormCadastro';
import ListaPessoas from '@/components/ListaPessoas';

interface Pessoa {
    id: number;
    nome: string;
    telefone: string;
    status: string;
    loja_id?: number | null;
    loja_nome?: string | null;
}

interface Loja {
    id: number;
    nome: string;
    numero: string;
    estado_id: number;
    estado_sigla: string;
}

interface Acesso {
    estado: string;
    tipo: string;
    role?: string;
    loja_id?: number | null;
    loja_nome?: string | null;
    loja_numero?: string | null;
    loja_cidade?: string | null;
}

export default function LojasDashboardPage() {
    const router = useRouter();

    const [pessoas, setPessoas] = useState<Pessoa[]>([]);
    const [lojas, setLojas] = useState<Loja[]>([]);
    const [acesso, setAcesso] = useState<Acesso | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [pessoaSendoEditada, setPessoaSendoEditada] = useState<Pessoa | null>(null);

    useEffect(() => {
        const acessoSalvo = localStorage.getItem('acesso');
        if (!acessoSalvo) {
            router.push('/');
            return;
        }

        const acessoObj: Acesso = JSON.parse(acessoSalvo);
        setAcesso(acessoObj);
        
        if (acessoObj.estado) {
            carregarDados(acessoObj.estado.toUpperCase(), acessoObj.loja_id);
        } else {
            router.push('/dashboard');
        }
    }, [router]);

    const carregarDados = async (sigla: string, lojaId?: number | null) => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            
            // Fetch Pessoas
            const resPessoas = await fetch(`${apiUrl}/api/pessoas/${sigla}`);
            if (resPessoas.ok) {
                const data = await resPessoas.json();
                const filteredPessoas = (lojaId) 
                    ? (data as Pessoa[]).filter(p => p.loja_id === lojaId)
                    : (Array.isArray(data) ? data : []);
                setPessoas(filteredPessoas);
            }

            // Fetch Stores for the state
            const resLojas = await fetch(`${apiUrl}/api/lojas`);
            if (resLojas.ok) {
                const todasLojas: Loja[] = await resLojas.json();
                const lojasDoEstado = todasLojas.filter(l => l.estado_sigla === sigla);
                setLojas(lojasDoEstado);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setCarregando(false);
        }
    };

    const handlePessoaSalva = (novaPessoa: Pessoa) => {
        if (pessoaSendoEditada) {
            setPessoas(pessoas.map(p => p.id === novaPessoa.id ? novaPessoa : p));
        } else {
            setPessoas([...pessoas, novaPessoa]);
        }
        setPessoaSendoEditada(null);
    };

    const handleSair = () => {
        localStorage.removeItem('acesso');
        router.push('/');
    };

    if (carregando) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a1536]">
                <p className="text-xl text-yellow-500 font-serif animate-pulse">Carregando sua Loja...</p>
            </div>
        );
    }

    const displayTitle = acesso?.loja_nome 
        ? `${acesso.loja_nome}${acesso.loja_numero ? ` Nº ${acesso.loja_numero}` : ''}`
        : 'Sua Loja';

    return (
        <div className="min-h-screen flex flex-col relative font-serif text-gray-100 overflow-x-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1536] via-[#1c3879] to-black z-0 fixed"></div>

            <div className="z-10 w-full max-w-6xl mx-auto p-4 sm:p-6 relative">
                <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-6">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                            <div className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-green-400/50 text-green-400 bg-green-400/10">
                                Gestão da Loja
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-yellow-500 tracking-tight leading-tight uppercase drop-shadow-lg">
                                {displayTitle}
                            </h1>
                            <div className="text-[11px] text-gray-400 font-sans tracking-widest uppercase font-bold">
                                {acesso?.loja_cidade || acesso?.estado}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-all text-[10px] font-bold uppercase tracking-wider h-11"
                            >
                                Voltar ao Painel
                            </button>
                            <button
                                onClick={handleSair}
                                className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-wider h-11"
                            >
                                Sair
                            </button>
                        </div>
                    </div>

                    <div className="p-8 border-t border-white/5">
                        <div className="mb-10">
                            <FormCadastro
                                estadoSigla={acesso?.estado || ''}
                                lojas={lojas}
                                acesso={acesso}
                                onPessoaCriada={handlePessoaSalva}
                                pessoaParaEditar={pessoaSendoEditada}
                                onCancelarEdicao={() => setPessoaSendoEditada(null)}
                            />
                        </div>

                        <ListaPessoas
                            pessoas={pessoas}
                            tipoAcesso="loja"
                            acesso={acesso}
                            onStatusAtualizado={(p) => setPessoas(pessoas.map(prev => prev.id === p.id ? p : prev))}
                            onPessoaDeletada={(id) => setPessoas(pessoas.filter(p => p.id !== id))}
                            onEditPessoa={(p) => setPessoaSendoEditada(p)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
