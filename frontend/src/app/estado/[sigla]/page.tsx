'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

const nomeEstados: Record<string, string> = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas',
    BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
    GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
    PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

export default function EstadoPage({ params }: { params: { sigla: string } }) {
    const router = useRouter();
    const sigla = (params.sigla || '').toUpperCase();

    const [pessoas, setPessoas] = useState<Pessoa[]>([]);
    const [lojas, setLojas] = useState<Loja[]>([]);
    const [acesso, setAcesso] = useState<Acesso | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [pessoaSendoEditada, setPessoaSendoEditada] = useState<Pessoa | null>(null);

    // Verifica se tem acesso
    useEffect(() => {
        const acessoSalvo = localStorage.getItem('acesso');

        if (!acessoSalvo) {
            router.push('/');
            return;
        }

        const acessoObj: Acesso = JSON.parse(acessoSalvo);

        // Permission Logic:
        // 'admin' (Federal) -> Can access ALL states.
        // 'master' (Estadual) -> Can access ONLY their assigned state.
        // 'loja' (Venerável) -> Can access ONLY their assigned state/lodge.

        const isFederal = acessoObj.role === 'admin' || acessoObj.tipo === 'admin';
        const isMaster = acessoObj.tipo === 'master' || acessoObj.role === 'mestre';

        if (isMaster && acessoObj.estado !== sigla) {
            router.push('/dashboard');
            return;
        }

        setAcesso(acessoObj);
        carregarDados();
    }, [sigla, router]);

    const carregarDados = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            
            // Fetch Pessoas
            const resPessoas = await fetch(`${apiUrl}/api/pessoas/${sigla}`);
            if (resPessoas.ok) {
                const data = await resPessoas.json();
                const filteredPessoas = acesso?.role === 'loja' 
                    ? (data as Pessoa[]).filter(p => p.loja_id === acesso.loja_id)
                    : (Array.isArray(data) ? data : []);
                setPessoas(filteredPessoas);
            } else {
                setPessoas([]);
            }

            // Fetch Lojas to pass to the Form
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

    const handlePessoaCriada = (novaPessoa: Pessoa) => {
        setPessoas([...pessoas, novaPessoa]);
        setPessoaSendoEditada(null); // Clear edit state after success
    };

    const handleStatusAtualizado = (pessoaAtualizada: Pessoa) => {
        setPessoas(pessoas.map(p =>
            p.id === pessoaAtualizada.id ? pessoaAtualizada : p
        ));
    };

    const handlePessoaDeletada = (pessoaId: number) => {
        setPessoas(pessoas.filter(p => p.id !== pessoaId));
    };

    const handleVoltar = () => {
        router.push('/dashboard');
    };

    const handleSair = () => {
        localStorage.removeItem('acesso');
        router.push('/');
    };

    if (carregando) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a1536]">
                <p className="text-xl text-yellow-500 font-serif animate-pulse">Carregando Templo...</p>
            </div>
        );
    }

    const isLojaUser = acesso?.role === 'loja';
    const displayTitle = isLojaUser && acesso?.loja_nome 
        ? `${acesso.loja_nome}${acesso.loja_numero ? ` Nº ${acesso.loja_numero}` : ''}`
        : (nomeEstados[sigla] || sigla);

    return (
        <div className="min-h-screen flex flex-col relative font-serif text-gray-100 overflow-x-hidden">

            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1536] via-[#1c3879] to-black z-0 fixed"></div>

            {/* Content Container */}
            <div className="z-10 w-full max-w-6xl mx-auto p-4 sm:p-6 relative">

                {/* Header Card */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-6">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        
                        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                            {/* Role Badge - Compact */}
                            <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm ${
                                (acesso?.role === 'admin') ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                                (acesso?.tipo === 'master') ? 'border-blue-400/50 text-blue-400 bg-blue-400/10' :
                                'border-green-400/50 text-green-400 bg-green-400/10'
                            }`}>
                                {
                                    (acesso?.role === 'admin') ? 'Grão-Mestrado Federal' :
                                    (acesso?.tipo === 'master') ? 'Grão-Mestrado Estadual' :
                                    'Loja'
                                }
                            </div>

                            {/* Main Title */}
                            <h1 className="text-2xl md:text-3xl font-bold text-yellow-500 tracking-tight leading-tight uppercase drop-shadow-lg">
                                {displayTitle}
                            </h1>

                            {/* Subtitle / Breadcrumb */}
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-sans tracking-widest uppercase font-bold">
                                <span>{nomeEstados[sigla]}</span>
                                {isLojaUser && acesso?.loja_cidade && (
                                    <>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-gray-300">{acesso.loja_cidade}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleVoltar}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-all text-[10px] font-bold uppercase tracking-wider h-11 min-w-[140px]"
                            >
                                Voltar ao Início
                            </button>
                            <button
                                onClick={handleSair}
                                className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-wider h-11"
                            >
                                Sair
                            </button>
                        </div>
                    </div>

                    {/* Content Area - Transparent */}
                    <div className="p-8 border-t border-white/5">
                        {/* Formulário de Cadastro (só Grão-Mestrado Federal, Estadual, ou Loja) */}
                        {(['admin', 'grao_mestre', 'master', 'loja'].includes(acesso?.tipo || '') || ['admin', 'grao_mestre', 'master', 'loja'].includes(acesso?.role || '')) && (
                            <div className="mb-10">
                                <FormCadastro
                                    estadoSigla={sigla}
                                    lojas={lojas}
                                    acesso={acesso}
                                    onPessoaCriada={handlePessoaCriada}
                                    pessoaParaEditar={pessoaSendoEditada}
                                    onCancelarEdicao={() => setPessoaSendoEditada(null)}
                                />
                            </div>
                        )}

                        {/* Lista de Pessoas */}
                        <ListaPessoas
                            pessoas={pessoas}
                            tipoAcesso={acesso?.tipo || 'estadual'}
                            acesso={acesso}
                            onStatusAtualizado={handleStatusAtualizado}
                            onPessoaDeletada={handlePessoaDeletada}
                            onEditPessoa={(p) => setPessoaSendoEditada(p)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
