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
}

interface Acesso {
    estado: string;
    tipo: 'master' | 'estadual' | 'admin' | 'grao_mestre';
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
    const sigla = params.sigla;

    const [pessoas, setPessoas] = useState<Pessoa[]>([]);
    const [acesso, setAcesso] = useState<Acesso | null>(null);
    const [carregando, setCarregando] = useState(true);

    // Verifica se tem acesso
    useEffect(() => {
        const acessoSalvo = localStorage.getItem('acesso');

        if (!acessoSalvo) {
            router.push('/');
            return;
        }

        const acessoObj: Acesso = JSON.parse(acessoSalvo);

        // Permission Logic:
        // 'admin' or 'grao_mestre' -> Can access ALL states.
        // 'master' -> Can access ONLY their assigned state.

        const isGrandMaster = acessoObj.tipo === 'admin' || acessoObj.tipo === 'grao_mestre';
        const isMaster = acessoObj.tipo === 'master';

        if (isMaster && acessoObj.estado !== sigla) {
            // Master trying to access a different state -> Redirect to their own state or dashboard
            router.push('/dashboard');
            return;
        }
        // If it's a completely different role (e.g. unknown), maybe we should block too?
        // For now, let's assume if it's not master restricted, it's allowed if they got here.

        setAcesso(acessoObj);
        carregarPessoas();
    }, [sigla, router]);

    const carregarPessoas = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${sigla}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setPessoas(data);
                } else {
                    console.error("API retornou formato inválido:", data);
                    setPessoas([]);
                }
            } else {
                console.warn("Falha ao carregar pessoas:", response.status);
                setPessoas([]);
            }
        } catch (error) {
            console.error('Erro ao carregar pessoas:', error);
        } finally {
            setCarregando(false);
        }
    };

    const handlePessoaCriada = (novaPessoa: Pessoa) => {
        setPessoas([...pessoas, novaPessoa]);
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
        if (acesso?.tipo === 'master') {
            router.push('/mapa');
        } else {
            router.push('/dashboard');
        }
    };

    const handleSair = () => {
        localStorage.removeItem('acesso');
        router.push('/');
    };

    if (carregando) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-xl">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative font-serif text-gray-100 overflow-x-hidden">

            {/* Background Gradient - Same as Dashboard */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-black z-0 fixed"></div>

            {/* Watermark Logo - Fixed */}
            <div className="absolute inset-0 flex items-center justify-center z-0 opacity-[0.1] pointer-events-none fixed">
                <div className="relative w-[800px] h-[800px]">
                    <img
                        src="/logo-gomb.png"
                        alt="Watermark"
                        className="object-contain w-full h-full"
                    />
                </div>
            </div>

            {/* Content Container - Z-Index 10 */}
            <div className="z-10 w-full max-w-6xl mx-auto p-6 relative">

                {/* Header Card - Glassmorphism */}
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
                    <div className="p-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">

                        {/* Decorative Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                        <div className="z-10 mb-6 md:mb-0 text-center md:text-left">
                            <h1 className="text-4xl font-bold text-yellow-500 tracking-widest uppercase mb-2 drop-shadow-md">
                                {nomeEstados[sigla]}
                            </h1>
                            <div className="flex items-center justify-center md:justify-start gap-3 text-sm tracking-widest uppercase">
                                <span className={`px-3 py-1 rounded border ${(acesso?.tipo === 'admin' || acesso?.tipo === 'grao_mestre') ? 'border-yellow-500/50 text-yellow-200 bg-yellow-900/20' :
                                    acesso?.tipo === 'master' ? 'border-blue-400/50 text-blue-200 bg-blue-900/20' :
                                        'border-gray-500/50 text-gray-300'
                                    }`}>
                                    {
                                        (acesso?.tipo === 'admin' || acesso?.tipo === 'grao_mestre') ? '👑 Grão-Mestrado Federal' :
                                            acesso?.tipo === 'master' ? '🔑 Grão-Mestrado Estadual' :
                                                '👤 Secretaria Estadual'
                                    }
                                </span>
                                <span className="text-gray-500">|</span>
                                <span className="text-gray-300 font-bold">{sigla}</span>
                            </div>
                        </div>

                        <div className="flex gap-4 z-10">
                            <button
                                onClick={handleVoltar}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-200 rounded-full border border-white/10 transition-all text-xs uppercase tracking-[0.2em] hover:border-white/30"
                            >
                                {acesso?.tipo === 'master' ? 'Voltar ao Mapa' : 'Voltar ao Início'}
                            </button>
                            <button
                                onClick={handleSair}
                                className="px-6 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-full border border-red-500/30 transition-all text-xs uppercase tracking-[0.2em] hover:border-red-500/50"
                            >
                                Sair
                            </button>
                        </div>
                    </div>

                    {/* Content Area - Transparent */}
                    <div className="p-8">
                        {/* Formulário de Cadastro (só Grão-Mestrado Federal) */}
                        {(acesso?.tipo === 'admin' || acesso?.tipo === 'grao_mestre') && (
                            <div className="mb-10">
                                <FormCadastro
                                    estadoSigla={sigla}
                                    onPessoaCriada={handlePessoaCriada}
                                />
                            </div>
                        )}

                        {/* Lista de Pessoas */}
                        <ListaPessoas
                            pessoas={pessoas}
                            tipoAcesso={acesso?.tipo || 'estadual'}
                            onStatusAtualizado={handleStatusAtualizado}
                            onPessoaDeletada={handlePessoaDeletada}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
