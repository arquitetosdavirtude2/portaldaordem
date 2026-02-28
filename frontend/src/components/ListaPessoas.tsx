'use client';

import { useState } from 'react';

interface Pessoa {
    id: number;
    nome: string;
    telefone: string;
    status: string;
}

interface ListaPessoasProps {
    pessoas: Pessoa[];
    tipoAcesso: 'master' | 'mestre' | 'estadual' | 'admin' | 'grao_mestre';
    onStatusAtualizado: (pessoa: Pessoa) => void;
    onPessoaDeletada: (pessoaId: number) => void;
}

export default function ListaPessoas({
    pessoas,
    tipoAcesso,
    onStatusAtualizado,
    onPessoaDeletada
}: ListaPessoasProps) {
    const [filtroStatus, setFiltroStatus] = useState<string>('todos');
    const [editandoId, setEditandoId] = useState<number | null>(null);

    const pessoasSafe = Array.isArray(pessoas) ? pessoas : [];

    const pessoasFiltradas = pessoasSafe.filter(p => {
        if (filtroStatus === 'todos') return true;
        return p.status === filtroStatus;
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

    const handleDeletar = async (pessoaId: number) => {
        if (!confirm('Tem certeza que deseja remover esta pessoa?')) return;

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas/${pessoaId}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                onPessoaDeletada(pessoaId);
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const cores = {
            'Profano': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'Candidato em Andamento': 'bg-green-100 text-green-800 border-green-300',
        };
        return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
    };

    const roleStr = String(tipoAcesso).toLowerCase();
    const podeEditar = ['master', 'mestre', 'admin', 'grao_mestre', 'estadual'].includes(roleStr);
    const podeDeletar = ['admin', 'grao_mestre', 'master'].includes(roleStr);

    return (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden">
            {/* ... (Header remains same) ... */}
            <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/5 bg-black/20">
                <h2 className="text-xl font-bold text-yellow-500 font-serif uppercase tracking-widest flex items-center gap-3">
                    <span className="text-2xl">📜</span>
                    Lista de Obreiros
                    <span className="text-xs bg-yellow-500/10 text-yellow-200 px-2 py-1 rounded-full border border-yellow-500/20">
                        {pessoasFiltradas.length}
                    </span>
                </h2>

                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtrar por Status:</label>
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="bg-gray-900/80 border border-gray-700 text-gray-300 text-xs rounded-lg p-2 focus:outline-none focus:border-yellow-500 transition-colors uppercase tracking-wider"
                    >
                        <option value="todos">Todos</option>
                        <option value="Profano">Profano</option>
                        <option value="Candidato em Andamento">Candidato</option>
                    </select>
                </div>
            </div>

            {/* Lista */}
            {pessoasFiltradas.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4 opacity-20">📜</div>
                    <p className="text-gray-500 font-serif text-lg tracking-wider">
                        Nenhum registro encontrado neste Oriente.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-[0.15em] border-b border-white/5">
                                <th className="py-4 px-6 font-medium">Nome</th>
                                <th className="py-4 px-6 font-medium">Contato</th>
                                <th className="py-4 px-6 font-medium">Status</th>
                                <th className="py-4 px-6 font-medium text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {pessoasFiltradas.map((pessoa) => (
                                <tr key={pessoa.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-6 font-medium text-gray-200 tracking-wide">
                                        {pessoa.nome}
                                    </td>
                                    <td className="py-4 px-6">
                                        <a
                                            href={`https://wa.me/55${pessoa.telefone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-green-400 transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">📱</span>
                                            <span className="group-hover:underline decoration-green-500/50 underline-offset-4">{pessoa.telefone}</span>
                                        </a>
                                    </td>
                                    <td className="py-4 px-6">
                                        {editandoId === pessoa.id && podeEditar ? (
                                            <select
                                                defaultValue={pessoa.status}
                                                onChange={(e) => handleMudarStatus(pessoa, e.target.value)}
                                                onBlur={() => setEditandoId(null)}
                                                autoFocus
                                                className="bg-gray-800 border border-yellow-500/50 text-yellow-100 text-xs rounded p-1 w-full"
                                            >
                                                <option value="Profano">Profano</option>
                                                <option value="Candidato em Andamento">Candidato</option>
                                            </select>
                                        ) : (
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${pessoa.status === 'Profano'
                                                    ? 'bg-yellow-900/20 text-yellow-500 border-yellow-500/30'
                                                    : 'bg-green-900/20 text-green-500 border-green-500/30'
                                                    } ${podeEditar ? 'cursor-pointer hover:bg-opacity-40' : 'cursor-default opacity-80'}`}
                                                onClick={() => podeEditar && setEditandoId(pessoa.id)}
                                                title={podeEditar ? "Clique para alterar" : "Apenas leitura"}
                                            >
                                                {pessoa.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex justify-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                            {podeEditar && (
                                                <button
                                                    onClick={() => setEditandoId(pessoa.id)}
                                                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
                                                    title="Editar Status"
                                                >
                                                    ✏️
                                                </button>
                                            )}

                                            {podeDeletar && (
                                                <button
                                                    onClick={() => handleDeletar(pessoa.id)}
                                                    className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded transition"
                                                    title="Remover"
                                                >
                                                    🗑️
                                                </button>
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
    );
}
