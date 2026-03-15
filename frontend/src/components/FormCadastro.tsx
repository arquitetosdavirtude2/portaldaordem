'use client';

import { useState } from 'react';

interface Pessoa {
  id: number;
  nome: string;
  telefone: string;
  status: string;
}

interface Loja {
  id: number;
  nome: string;
  numero: string;
}

interface Acesso {
  tipo: string;
  role?: string;
  loja_id?: number | null;
}

interface FormCadastroProps {
  estadoSigla: string;
  lojas: Loja[];
  acesso: Acesso | null;
  onPessoaCriada: (pessoa: Pessoa) => void;
}

export default function FormCadastro({ estadoSigla, lojas, acesso, onPessoaCriada }: FormCadastroProps) {
  const isLojaUser = acesso?.role === 'loja' || acesso?.tipo === 'loja';
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState('Profano');
  const [lojaId, setLojaId] = useState<number | ''>(
      isLojaUser && acesso?.loja_id ? acesso.loja_id : ''
  );
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const formatarTelefone = (valor: string) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');

    // Formata: (11) 99999-9999
    if (numeros.length <= 11) {
      return numeros
        .replace(/^(\d{2})/, '($1) ')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return valor;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatarTelefone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !telefone.trim()) {
      setMensagem('Preencha todos os campos');
      return;
    }

    setSalvando(true);
    setMensagem('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/pessoas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          estado_sigla: estadoSigla,
          status,
          loja_id: lojaId || null
        }),
      });

      if (response.ok) {
        const novaPessoa = await response.json();
        onPessoaCriada(novaPessoa);
        setNome('');
        setTelefone('');
        setStatus('Profano');
        if (!isLojaUser) {
          setLojaId('');
        }
        setMensagem('✅ Cadastrado com sucesso!');
        setTimeout(() => setMensagem(''), 3000);
      } else {
        setMensagem('❌ Erro ao cadastrar');
      }
    } catch (error) {
      setMensagem('❌ Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-black/30 rounded-xl p-6 mb-6 border border-yellow-500/20 shadow-inner">
      <h2 className="text-lg font-bold mb-4 text-yellow-500 font-serif border-b border-yellow-500/10 pb-2 uppercase tracking-wide flex items-center gap-2">
        <span>➕</span> Cadastrar Novo Obreiro
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Telefone (WhatsApp)
            </label>
            <input
              type="text"
              value={telefone}
              onChange={handleTelefoneChange}
              placeholder="(11) 99999-9999"
              maxLength={15}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Grau / Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
            >
              <option value="Profano">Profano</option>
              <option value="Candidato em Andamento">Candidato em Andamento</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Vincular a uma Loja (Opcional)
            </label>
            <select
              value={lojaId}
              onChange={(e) => setLojaId(e.target.value ? Number(e.target.value) : '')}
              disabled={isLojaUser}
              className={`w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm ${isLojaUser ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <option value="">Sem vínculo</option>
              {lojas.map(loja => (
                <option key={loja.id} value={loja.id}>
                  Loja {loja.nome} N° {loja.numero}
                </option>
              ))}
            </select>
            {isLojaUser && (
                <p className="text-[9px] text-gray-500 mt-1 uppercase">Acesso restrito à sua Loja</p>
            )}
          </div>
        </div>

        {mensagem && (
          <p className={`text-xs font-semibold p-2 rounded border ${mensagem.includes('✅') ? 'bg-green-900/20 text-green-400 border-green-900/40' : 'bg-red-900/20 text-red-400 border-red-900/40'}`}>
            {mensagem}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 font-bold rounded border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)] hover:shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
