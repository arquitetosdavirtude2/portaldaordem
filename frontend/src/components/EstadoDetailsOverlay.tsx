'use client';

import { useState, useEffect } from 'react';
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
    tipo: string;
    role?: string;
    loja_id?: number | null;
}

interface EstadoDetailsOverlayProps {
    sigla: string;
    nomeEstado: string;
    userRole: 'master' | 'mestre' | 'estadual' | 'admin' | 'grao_mestre';
    onClose: () => void;
}

export default function EstadoDetailsOverlay({ sigla, nomeEstado, userRole, onClose }: EstadoDetailsOverlayProps) {
    const [pessoas, setPessoas] = useState<Pessoa[]>([]);
    const [lojas, setLojas] = useState<Loja[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [pessoaSendoEditada, setPessoaSendoEditada] = useState<Pessoa | null>(null);
    
    // We mock the `acesso` based on userRole if it is passed this way
    const [acesso, setAcesso] = useState<Acesso>({ tipo: userRole, role: userRole });

    const carregarDados = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            
            const response = await fetch(`${apiUrl}/api/pessoas/${sigla}`);
            if (response.ok) {
                const data = await response.json();
                setPessoas(Array.isArray(data) ? data : []);
            } else {
                setPessoas([]);
            }

            const resLojas = await fetch(`${apiUrl}/api/lojas`);
            if (resLojas.ok) {
                const todasLojas: Loja[] = await resLojas.json();
                const lojasDoEstado = todasLojas.filter(l => l.estado_sigla === sigla);
                setLojas(lojasDoEstado);
            }
            
            // Re-sync local storage acesso just in case
            const acessoStorage = localStorage.getItem('acesso');
            if (acessoStorage) {
                setAcesso(JSON.parse(acessoStorage));
            }
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [sigla]);

    const handlePessoaCriada = (novaPessoa: Pessoa) => {
        if (pessoaSendoEditada) {
            setPessoas(pessoas.map(p => p.id === novaPessoa.id ? novaPessoa : p));
            setPessoaSendoEditada(null);
        } else {
            setPessoas([...pessoas, novaPessoa]);
        }
        setShowForm(false);
    };

    const handleStatusAtualizado = (pessoaAtualizada: Pessoa) => {
        setPessoas(pessoas.map(p => p.id === pessoaAtualizada.id ? pessoaAtualizada : p));
    };

    const handlePessoaDeletada = (pessoaId: number) => {
        setPessoas(pessoas.filter(p => p.id !== pessoaId));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 pointer-events-none">
            {/* The Overlay Container - Centered and Transparent */}
            <div className="bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="p-6 md:p-8 flex justify-between items-start border-b border-white/10 bg-gradient-to-r from-black/40 to-transparent relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div>
                        <h2 className="text-3xl font-bold text-yellow-500 font-serif tracking-widest uppercase mb-2 drop-shadow-md">
                            {nomeEstado}
                        </h2>
                        <div className="flex items-center gap-3 text-xs tracking-widest uppercase text-gray-400">
                            <span className="font-bold text-white">{sigla}</span>
                            <span>•</span>
                            <span>
                                {['admin', 'grao_mestre', 'master', 'federal'].includes(String(userRole).toLowerCase())
                                    ? '👑 Acesso Total'
                                    : ['mestre', 'estadual'].includes(String(userRole).toLowerCase())
                                        ? '⚒️ Loja'
                                        : '🔑 Acesso Visualização'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">

                    {/* Control Bar - Only for Admins */}
                    {['admin', 'grao_mestre', 'master', 'federal'].includes(String(userRole).toLowerCase()) && (
                        <div className="mb-6 flex justify-end">
                            <button
                                onClick={() => {
                                    if (showForm) {
                                        setShowForm(false);
                                        setPessoaSendoEditada(null);
                                    } else {
                                        setShowForm(true);
                                        setPessoaSendoEditada(null);
                                    }
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2 ${showForm
                                    ? 'bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/40'
                                    : 'bg-yellow-600/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-600/40 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                    }`}
                            >
                                {showForm ? 'Fechar Cadastro' : '➕ Novo Candidato'}
                            </button>
                        </div>
                    )}

                    {/* Form Cadastro (Collapsible) */}
                    {showForm && ['admin', 'grao_mestre', 'master', 'mestre', 'estadual', 'loja'].includes(String(userRole).toLowerCase()) && (
                        <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
                            <FormCadastro
                                estadoSigla={sigla}
                                lojas={lojas}
                                acesso={acesso}
                                isCandidato={true} // Map view is ALWAYS for candidates/profanos
                                pessoaParaEditar={pessoaSendoEditada}
                                onPessoaCriada={handlePessoaCriada}
                                onCancelarEdicao={() => {
                                    setShowForm(false);
                                    setPessoaSendoEditada(null);
                                }}
                            />
                        </div>
                    )}

                    {/* Loading State */}
                    {carregando ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                        </div>
                    ) : (
                        <ListaPessoas
                            pessoas={pessoas}
                            tipoAcesso={userRole}
                            acesso={acesso}
                            onStatusAtualizado={handleStatusAtualizado}
                            onPessoaDeletada={handlePessoaDeletada}
                            isCandidato={true}
                            onEditPessoa={(p) => {
                                setPessoaSendoEditada(p);
                                setShowForm(true);
                            }}
                        />
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded border border-white/10 text-xs uppercase tracking-widest transition-all"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        </div>
    );
}
