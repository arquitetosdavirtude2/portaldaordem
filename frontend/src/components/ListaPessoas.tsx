'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Pessoa {
    id: number;
    nome: string;
    telefone: string;
    status: string; // Grau
    cargo_id?: number | null;
    cargo_nome?: string | null;
    loja_id?: number | null;
    loja_nome?: string | null;
    login?: string | null;
    senha?: string | null;
    ativo?: number;
    data_adormecimento?: string | null;
    data_admissao?: string | null;
    tipo_pessoa?: string;
}

interface Cargo {
    id: number;
    nome: string;
    isento_contribuicao: number;
}

interface Acesso {
    tipo: string;
    role?: string;
    loja_id?: number | null;
}

interface ListaPessoasProps {
    pessoas: Pessoa[];
    tipoAcesso: string;
    acesso?: Acesso | null;
    onStatusAtualizado: (pessoa: Pessoa) => void;
    onPessoaDeletada: (pessoaId: number) => void;
    isCandidato?: boolean;
    onEditPessoa?: (pessoa: Pessoa) => void;
}

export default function ListaPessoas({
    pessoas,
    tipoAcesso,
    acesso,
    onStatusAtualizado,
    onPessoaDeletada,
    isCandidato = false,
    onEditPessoa
}: ListaPessoasProps) {
    const [filtroStatus, setFiltroStatus] = useState<string>('todos');
    const [filtroSituacao, setFiltroSituacao] = useState<string>('ativos');
    const [busca, setBusca] = useState<string>('');

    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editandoTelefone, setEditandoTelefone] = useState<string>('');
    const [editandoLogin, setEditandoLogin] = useState<string>('');
    const [editandoSenha, setEditandoSenha] = useState<string>('');
    const [pessoaParaDeletar, setPessoaParaDeletar] = useState<Pessoa | null>(null);
    const [deletando, setDeletando] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [cargos, setCargos] = useState<Cargo[]>([]);

    useEffect(() => {
        setIsMounted(true);
        // Carregar lista de cargos da API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        fetch(`${apiUrl}/api/pessoas/cargos`)
            .then(r => r.ok ? r.json() : [])
            .then(setCargos)
            .catch(() => {});
    }, []);

    const pessoasSafe = Array.isArray(pessoas) ? pessoas : [];
    
    // Isolation rule for Loja role
    const isLojaUser = acesso?.role === 'loja' || acesso?.tipo === 'loja';
    const storeId = acesso?.loja_id;

    const pessoasFiltradas = pessoasSafe.filter(p => {
        // Se estivermos na aba de candidatos, mostrar apenas Profanos/Candidatos
        // Se estivermos na aba de obreiros, mostrar tudo que NÃO for Profano/Candidato
        const isCandidateStatus = ['Profano', 'Candidato'].includes(p.status);
        if (isCandidato) {
            if (!isCandidateStatus) return false;
        } else {
            if (isCandidateStatus) return false;
        }

        // Filtro de Grau selecionado no Dropdown
        const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;

        // Filtro por Situação (Ativo/Adormecido)
        const matchSituacao = isCandidato ? true : (
            filtroSituacao === 'todos' ? true :
            filtroSituacao === 'ativos' ? p.ativo !== 0 :
            filtroSituacao === 'adormecidos' ? p.ativo === 0 : true
        );

        // Filtro por Busca (Nome/Cargo)
        const buscaLower = busca.toLowerCase().trim();
        const matchBusca = !buscaLower || 
                          p.nome.toLowerCase().includes(buscaLower) || 
                          (p.cargo_nome || '').toLowerCase().includes(buscaLower);

        return matchStatus && matchSituacao && matchBusca;
    });


    const handleMudarStatus = async (pessoa: Pessoa, novoStatus: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoa.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: novoStatus }),
                }
            );

            if (response.ok) {
                const pessoaAtualizada = await response.json();
                onStatusAtualizado(pessoaAtualizada);
                setEditandoId(null);
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    const handleMudarTelefone = async (pessoa: Pessoa, novoTelefone: string) => {
        if (!novoTelefone.trim() || novoTelefone === pessoa.telefone) {
            setEditandoId(null);
            return;
        }
        
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoa.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telefone: novoTelefone }),
                }
            );

            if (response.ok) {
                const pessoaAtualizada = await response.json();
                onStatusAtualizado(pessoaAtualizada);
                // Not closing edit mode yet in case user wants to change cargo/status
            }
        } catch (error) {
            console.error('Erro ao atualizar telefone:', error);
        }
    };

    const actStartEdit = (pessoa: Pessoa) => {
        setEditandoId(pessoa.id);
        setEditandoTelefone(pessoa.telefone);
        setEditandoLogin(pessoa.login || '');
        setEditandoSenha(pessoa.senha || '');
    };

    const handleMudarCargo = async (pessoa: Pessoa, novoCargoId: number) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoa.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cargo_id: novoCargoId === 0 ? null : novoCargoId }),
                }
            );
            if (response.ok) {
                const pessoaAtualizada = await response.json();
                onStatusAtualizado(pessoaAtualizada);
            }
        } catch (error) {
            console.error('Erro ao atualizar cargo:', error);
        }
    };

    const handleMudarLogin = async (pessoa: Pessoa, novoLogin: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoa.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: novoLogin }),
                }
            );

            if (response.ok) {
                const pessoaAtualizada = await response.json();
                onStatusAtualizado(pessoaAtualizada);
            }
        } catch (error) {
            console.error('Erro ao atualizar login:', error);
        }
    };

    const handleMudarSenha = async (pessoa: Pessoa, novaSenha: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoa.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ senha: novaSenha }),
                }
            );

            if (response.ok) {
                const pessoaAtualizada = await response.json();
                onStatusAtualizado(pessoaAtualizada);
            }
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
        }
    };

    const confirmarDelecao = (pessoa: Pessoa) => {
        setPessoaParaDeletar(pessoa);
    };

    const executarDelecao = async () => {
        if (!pessoaParaDeletar) return;
        setDeletando(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoaParaDeletar.id}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                onPessoaDeletada(pessoaParaDeletar.id);
                setPessoaParaDeletar(null);
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
        } finally {
            setDeletando(false);
        }
    };

    const roleStr = String(tipoAcesso).toLowerCase().trim();
    const isFederal = ['admin', 'master', 'federal', 'grao_mestre'].includes(roleStr);
    const isEstadual = ['mestre', 'estadual'].includes(roleStr);
    const isLoja = roleStr === 'loja' || acesso?.role === 'loja';

    // Permissions logic
    // On Map (isCandidato): Federal=Full CRUD, Estadual=Status Only
    // On Lojas Dashboard (!isCandidato): All authorized roles (Federal, Estadual, Loja) have Full CRUD
    const podeFullEdit = isCandidato ? isFederal : (isFederal || isEstadual || isLoja);
    const podeMudarStatus = isCandidato ? (isFederal || isEstadual) : (isFederal || isEstadual || isLoja);
    const podeDeletar = isCandidato ? isFederal : (isFederal || isEstadual || isLoja);
    const podeEditar = podeFullEdit || podeMudarStatus;

    return (
        <>
            <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/5 bg-black/20">
                    <div></div>





                    <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0 w-full md:w-auto">
                        {/* Busca */}
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Buscar nome ou cargo..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 text-gray-300 text-[10px] rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:border-yellow-500 transition-all uppercase tracking-widest"
                            />
                            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>

                        {/* Situação (Somente se não for candidato) */}
                        {!isCandidato && (
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Situação:</label>
                                <select
                                    value={filtroSituacao}
                                    onChange={(e) => setFiltroSituacao(e.target.value)}
                                    className="bg-gray-900/80 border border-gray-700 text-gray-300 text-[9px] font-bold rounded-lg p-2 focus:outline-none focus:border-yellow-500 transition-colors uppercase tracking-widest"
                                >
                                    <option value="ativos">Ativos</option>
                                    <option value="adormecidos">Adormecidos</option>
                                    <option value="todos">Todos</option>
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Grau:</label>
                            <select
                                value={filtroStatus}
                                onChange={(e) => setFiltroStatus(e.target.value)}
                                className="bg-gray-900/80 border border-gray-700 text-gray-300 text-[9px] font-bold rounded-lg p-2 focus:outline-none focus:border-yellow-500 transition-colors uppercase tracking-widest"
                            >
                                <option value="todos">Todos</option>
                                {isCandidato ? (
                                    <>
                                        <option value="Profano">Profano</option>
                                        <option value="Candidato">Candidato</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Aprendiz">Aprendiz</option>
                                        <option value="Companheiro">Companheiro</option>
                                        <option value="Mestre">Mestre</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                </div>

                {/* Lista */}
                {pessoasFiltradas.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-4xl mb-4 opacity-20">📜</div>
                        <p className="text-gray-500 font-serif text-lg tracking-wider">
                            {isCandidato ? 'Nenhum candidato encontrado.' : 'Nenhum obreiro encontrado neste Oriente.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left table-auto">
                            <thead>
                                <tr className="bg-white/5 text-gray-500 uppercase tracking-widest text-[9px] font-bold">
                                    <th className="py-3 px-3 font-medium whitespace-nowrap">{isCandidato ? 'Candidato' : 'Obreiro'}</th>
                                    <th className="py-3 px-3 font-medium whitespace-nowrap">Contato</th>
                                    <th className="py-3 px-3 font-medium whitespace-nowrap">{isCandidato ? 'Situação' : 'Grau'}</th>
                                    
                                    {!isCandidato && (
                                        <>
                                            <th className="py-3 px-3 font-medium whitespace-nowrap">Cargo</th>
                                            <th className="py-3 px-3 font-medium whitespace-nowrap">Login</th>
                                            <th className="py-3 px-3 font-medium whitespace-nowrap">Senha</th>
                                            {!isLojaUser && <th className="py-3 px-3 font-medium whitespace-nowrap">Loja</th>}
                                        </>
                                    )}
                                    
                                    <th className="py-3 px-3 font-medium text-center whitespace-nowrap">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-[10px]">
                                {pessoasFiltradas.map((pessoa) => (
                                    <tr key={pessoa.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-3 px-3 font-medium text-gray-200 tracking-wide whitespace-nowrap">
                                            <div className="flex flex-col">
                                                {isCandidato ? (
                                                    <span className="text-[11px] text-gray-200 font-bold">{pessoa.nome}</span>
                                                ) : (
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[11px] font-bold ${pessoa.ativo === 0 ? 'text-red-500/50' : 'text-gray-200'}`}>{pessoa.nome}</span>
                                                                {pessoa.ativo === 0 && (
                                                                    <span className="text-[7px] text-red-500/50 font-bold uppercase tracking-tighter">
                                                                        Adormecido {pessoa.data_adormecimento ? `desde ${pessoa.data_adormecimento.split('-').reverse().join('/')}` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(!isLojaUser && pessoa.loja_nome) && (
                                                                <span className="text-[9px] text-masonic-gold uppercase tracking-tighter font-sans">{pessoa.loja_nome}</span>
                                                            )}
                                                        </div>
                                                )}
                                            </div>
                                        </td>
                                        
                                        {/* Telefone Edit or Link */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            {editandoId === pessoa.id && podeFullEdit ? (
                                                <input
                                                    type="text"
                                                    value={editandoTelefone}
                                                    onChange={(e) => {
                                                        const formatarTelefone = (valor: string) => {
                                                            const numeros = valor.replace(/\D/g, '');
                                                            if (numeros.length <= 11) {
                                                                return numeros
                                                                    .replace(/^(\d{2})/, '($1) ')
                                                                    .replace(/(\d{5})(\d)/, '$1-$2');
                                                            }
                                                            return valor;
                                                        };
                                                        setEditandoTelefone(formatarTelefone(e.target.value));
                                                    }}
                                                    onBlur={() => handleMudarTelefone(pessoa, editandoTelefone)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="bg-gray-800 border border-yellow-500/50 text-yellow-100 text-xs rounded p-1 w-[130px] focus:outline-none"
                                                    maxLength={15}
                                                    autoFocus
                                                />
                                            ) : (
                                                <a
                                                    href={`https://wa.me/55${pessoa.telefone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-green-400 transition-colors flex items-center gap-2"
                                                >
                                                    <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">📱</span>
                                                    <span className="group-hover:underline decoration-green-500/50 underline-offset-4 font-sans">{pessoa.telefone}</span>
                                                </a>
                                            )}
                                        </td>
                                        
                                        {/* Grau/Status Dropdown/Label */}
                                        <td className="py-3 px-3">
                                            {editandoId === pessoa.id && podeMudarStatus ? (
                                                <select
                                                    defaultValue={pessoa.status}
                                                    onChange={(e) => handleMudarStatus(pessoa, e.target.value)}
                                                    className="bg-[#0a0a0a] border border-white/10 text-gray-200 text-xs rounded p-1 w-full focus:border-yellow-500/50 outline-none"
                                                >
                                                    {isCandidato ? (
                                                        <>
                                                            <option value="Profano">Profano</option>
                                                            <option value="Candidato">Candidato</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="Aprendiz">Aprendiz</option>
                                                            <option value="Companheiro">Companheiro</option>
                                                            <option value="Mestre">Mestre</option>
                                                            <option value="Mestre Instalado">Mestre Instalado</option>
                                                        </>
                                                    )}
                                                </select>
                                            ) : (
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider border transition-all ${
                                                        pessoa.tipo_pessoa === 'candidato' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.1)]' :
                                                        pessoa.status === 'Aprendiz' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        pessoa.status === 'Companheiro' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        pessoa.status === 'Mestre' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        pessoa.status === 'Mestre Instalado' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.1)]' :
                                                        pessoa.status === 'Candidato' || pessoa.status === 'Profano' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' :
                                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                    } ${podeMudarStatus ? 'cursor-pointer hover:bg-opacity-40' : 'cursor-default opacity-80'}`}
                                                    onClick={() => podeMudarStatus && actStartEdit(pessoa)}
                                                    title={podeEditar ? "Clique para alterar" : "Apenas leitura"}
                                                >
                                                    {pessoa.tipo_pessoa === 'candidato' ? 'Candidato' : pessoa.status}
                                                </span>
                                            )}
                                        </td>

                                        {!isCandidato && (
                                            <>
                                                {/* Cargo */}
                                                <td className="py-3 px-3">
                                                    {editandoId === pessoa.id && podeFullEdit ? (
                                                        <select
                                                            defaultValue={pessoa.cargo_id || 0}
                                                            onChange={(e) => handleMudarCargo(pessoa, Number(e.target.value))}
                                                            className="bg-gray-800 border border-yellow-500/50 text-yellow-100 text-xs rounded p-1 max-w-[180px]"
                                                        >
                                                            <option value={0}>Sem cargo</option>
                                                            {cargos.map(c => (
                                                                <option key={c.id} value={c.id}>{c.nome}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className={`text-[10px] font-sans ${pessoa.cargo_nome ? 'text-yellow-400 font-medium' : 'text-gray-500 italic'} ${podeFullEdit ? 'cursor-pointer hover:underline underline-offset-2 decoration-white/20' : ''}`}
                                                            onClick={() => podeFullEdit && actStartEdit(pessoa)}
                                                            title={podeFullEdit ? "Clique para alterar cargo" : ""}
                                                        >
                                                            {pessoa.cargo_nome || 'Sem cargo'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Login */}
                                                <td className="py-3 px-3">
                                                    {editandoId === pessoa.id && podeFullEdit ? (
                                                        <input
                                                            type="text"
                                                            value={editandoLogin}
                                                            onChange={(e) => setEditandoLogin(e.target.value)}
                                                            onBlur={() => handleMudarLogin(pessoa, editandoLogin)}
                                                            className="bg-gray-800 border border-yellow-500/50 text-yellow-100 text-[10px] rounded p-1 w-full focus:outline-none"
                                                            placeholder="Login"
                                                        />
                                                    ) : (
                                                        <span className="text-[11px] text-gray-400 font-sans">
                                                            {pessoa.login || '-'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Senha */}
                                                <td className="py-3 px-3">
                                                    {editandoId === pessoa.id && podeFullEdit ? (
                                                        <input
                                                            type="text"
                                                            value={editandoSenha}
                                                            onChange={(e) => setEditandoSenha(e.target.value)}
                                                            onBlur={() => handleMudarSenha(pessoa, editandoSenha)}
                                                            className="bg-gray-800 border border-yellow-500/50 text-yellow-100 text-[10px] rounded p-1 w-full focus:outline-none"
                                                            placeholder="Senha"
                                                        />
                                                    ) : (
                                                        <span className="text-[11px] text-gray-500 font-mono">
                                                            {pessoa.senha ? '••••••' : '-'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Loja */}
                                                {!isLojaUser && (
                                                    <td className="py-3 px-3">
                                                        {pessoa.loja_nome ? (
                                                            <span className="bg-yellow-900/10 text-yellow-500 px-2 py-1 rounded text-[10px] uppercase font-bold border border-yellow-500/20 font-sans">
                                                                {pessoa.loja_nome}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs italic">-</span>
                                                        )}
                                                    </td>
                                                )}
                                            </>
                                        )}

                                        <td className="py-3 px-3 text-center">
                                            <div className="flex justify-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                                {podeFullEdit && (
                                                    pessoa.cargo_nome === 'Venerável Mestre' ? (
                                                        <span className="p-1.5 text-gray-600 cursor-not-allowed opacity-50" title="Gestão via Grão-Mestrado">
                                                            🔒
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => onEditPessoa ? onEditPessoa(pessoa) : actStartEdit(pessoa)}
                                                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                    )
                                                )}
                                                {podeEditar && editandoId === pessoa.id && (
                                                    <button
                                                        onClick={() => {
                                                            handleMudarTelefone(pessoa, editandoTelefone);
                                                            setEditandoId(null);
                                                        }}
                                                        className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition"
                                                        title="Concluir"
                                                    >
                                                        ✅
                                                    </button>
                                                )}

                                                {podeDeletar && (
                                                   pessoa.cargo_nome === 'Venerável Mestre' ? (
                                                       <span className="p-1.5 text-gray-600 cursor-not-allowed opacity-50" title="Exclusão via Grão-Mestrado">
                                                           🔒
                                                       </span>
                                                   ) : (
                                                       <button
                                                           onClick={() => confirmarDelecao(pessoa)}
                                                           className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded transition"
                                                           title="Remover"
                                                       >
                                                           🗑️
                                                       </button>
                                                   )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Exclusão Renderizado via Portal */}
            {isMounted && pessoaParaDeletar && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-300">
                    <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900/20 text-red-500 mb-4 border border-red-500/20 mx-auto">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-center text-red-500 font-serif mb-2 uppercase tracking-wide">
                                Confirmar Exclusão
                            </h3>
                            <p className="text-gray-400 text-center text-sm mb-6">
                                Tem certeza que deseja remover {isCandidato ? 'o candidato' : 'o obreiro'} <br />
                                <strong className="text-gray-200 text-base">{pessoaParaDeletar.nome}</strong>?
                                <br /><br />
                                Esta ação não pode ser desfeita.
                            </p>
                            
                            <div className="flex gap-3 justify-center mt-8">
                                <button
                                    onClick={() => setPessoaParaDeletar(null)}
                                    disabled={deletando}
                                    className="px-6 py-2.5 rounded border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium text-sm tracking-wide disabled:opacity-50"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={executarDelecao}
                                    disabled={deletando}
                                    className="px-6 py-2.5 rounded bg-red-900/80 hover:bg-red-800 text-white border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all font-bold text-sm tracking-wider uppercase disabled:opacity-50"
                                >
                                    {deletando ? 'REMOVENDO...' : 'SIM, EXCLUIR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
