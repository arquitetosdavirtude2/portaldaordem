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
    nome?: string | null;
    cargo?: string | null;
}

export default function LojasDashboardPage() {
    const router = useRouter();

    const [pessoas, setPessoas] = useState<Pessoa[]>([]);
    const [lojas, setLojas] = useState<Loja[]>([]);
    const [acesso, setAcesso] = useState<Acesso | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [pessoaSendoEditada, setPessoaSendoEditada] = useState<Pessoa | null>(null);
    const [isModalAberto, setIsModalAberto] = useState(false);

    useEffect(() => {
        const acessoSalvo = localStorage.getItem('acesso');
        if (!acessoSalvo) {
            router.push('/');
            return;
        }

        const acessoObj: Acesso = JSON.parse(acessoSalvo);
        setAcesso(acessoObj);
        
        // Normalize state from allowed_states if needed
        const siglaEstado = acessoObj.estado || (acessoObj as any).allowed_states?.[0];
        
        if (siglaEstado || acessoObj.loja_id) {
            carregarDados((siglaEstado || '').toUpperCase(), acessoObj.loja_id, acessoObj);
        } else {
            router.push('/dashboard');
        }
    }, [router]);

    const carregarDados = async (sigla: string, lojaId: number | null | undefined, acessoAtual: Acesso) => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            
            // Fetch Pessoas
            const endpoint = lojaId 
                ? `${apiUrl}/api/pessoas/loja/${lojaId}`
                : `${apiUrl}/api/pessoas/${sigla}`;
                
            const resPessoas = await fetch(endpoint);
            if (resPessoas.ok) {
                let data = await resPessoas.json();
                data = Array.isArray(data) ? data : [];

                // Garantir que o VM logado apareça na lista (se for conta de loja e não estiver na lista)
                if (acessoAtual?.role === 'loja' && acessoAtual.nome && acessoAtual.nome !== 'Irmão') {
                    const jaNaLista = data.some((p: any) => 
                        p.nome.toLowerCase().includes(acessoAtual.nome!.toLowerCase()) ||
                        acessoAtual.nome!.toLowerCase().includes(p.nome.toLowerCase())
                    );
                    if (!jaNaLista) {
                        data.unshift({
                            id: -99, // ID Virtual
                            nome: acessoAtual.nome,
                            telefone: '-',
                            status: 'Mestre',
                            cargo_nome: 'Venerável Mestre',
                            loja_id: acessoAtual.loja_id,
                            ativo: 1,
                            tipo_pessoa: 'obreiro'
                        });
                    }
                }

                setPessoas(data);
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
        setIsModalAberto(false);
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
        ? <>{acesso.loja_nome}{acesso.loja_numero ? <span className="font-sans"> Nº {acesso.loja_numero}</span> : ''}</>
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
                        <div className="flex flex-row justify-between items-center mb-8 gap-4 flex-nowrap overflow-hidden">
                            <h2 className="text-lg md:text-xl font-black text-gray-200 uppercase tracking-[0.2em] flex items-center gap-3 whitespace-nowrap shrink-0">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span>
                                Lista de Obreiros
                            </h2>

                            {/* Summary Chips - Restored & Aligned */}
                            <div className="hidden lg:flex items-center gap-3 overflow-hidden flex-nowrap mx-4">
                                <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
                                    <span className="text-xs font-black text-white font-sans">{pessoas.length}</span>
                                </div>
                                <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[9px] font-bold text-green-500/70 uppercase tracking-widest">Ativos</span>
                                    <span className="text-xs font-black text-green-400 font-sans">
                                        {pessoas.filter(p => (p as any).ativo !== 0).length}
                                    </span>
                                </div>
                                <div className="px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-full flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Adormecidos</span>
                                    <span className="text-xs font-black text-gray-400 font-sans">
                                        {pessoas.filter(p => (p as any).ativo === 0).length}
                                    </span>
                                </div>
                                <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Luzes</span>
                                    <span className="text-xs font-black text-yellow-400 font-sans">
                                        {pessoas.filter(p => {
                                            const cargo = (p as any).cargo_nome?.toLowerCase() || '';
                                            return cargo.includes('venerável') || cargo.includes('vigilante');
                                        }).length}
                                    </span>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => {
                                    setPessoaSendoEditada(null);
                                    setIsModalAberto(true);
                                }}
                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Novo Obreiro
                            </button>
                        </div>



                        <ListaPessoas
                            pessoas={pessoas}
                            tipoAcesso="loja"
                            acesso={acesso}
                            onStatusAtualizado={(p) => setPessoas(pessoas.map(prev => prev.id === p.id ? p : prev))}
                            onPessoaDeletada={(id) => setPessoas(pessoas.filter(p => p.id !== id))}
                            onEditPessoa={(p) => {
                                setPessoaSendoEditada(p);
                                setIsModalAberto(true);
                            }}
                        />
                    </div>
                </div>

                {/* Modal de Cadastro/Edição */}
                {isModalAberto && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-300">
                        <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                                    {pessoaSendoEditada ? 'Editar Obreiro' : 'Cadastrar Novo Obreiro'}
                                </h3>

                                <button 
                                    onClick={() => {
                                        setIsModalAberto(false);
                                        setPessoaSendoEditada(null);
                                    }} 
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-8 max-h-[85vh] overflow-y-auto">
                                <FormCadastro
                                    estadoSigla={acesso?.estado || ''}
                                    lojas={lojas}
                                    acesso={acesso}
                                    onPessoaCriada={handlePessoaSalva}
                                    pessoaParaEditar={pessoaSendoEditada}
                                    onCancelarEdicao={() => {
                                        setIsModalAberto(false);
                                        setPessoaSendoEditada(null);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
