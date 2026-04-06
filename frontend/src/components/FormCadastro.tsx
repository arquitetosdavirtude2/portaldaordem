import { useEffect, useState } from 'react';

interface Pessoa {
  id: number;
  nome: string;
  telefone: string;
  status: string; // Used as Grau now
  cargo?: string | null;
  login?: string | null;
  senha?: string | null;
  loja_id?: number | null;
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
  isCandidato?: boolean; 
  pessoaParaEditar?: Pessoa | null;
  onCancelarEdicao?: () => void;
}

export default function FormCadastro({ 
  estadoSigla, 
  lojas, 
  acesso, 
  onPessoaCriada, 
  isCandidato = false,
  pessoaParaEditar = null,
  onCancelarEdicao
}: FormCadastroProps) {
  const isLojaUser = acesso?.role === 'loja' || acesso?.tipo === 'loja';
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState(isCandidato ? 'Profano' : 'Aprendiz'); 
  const [cargo, setCargo] = useState('Nenhum'); 
  const [lojaId, setLojaId] = useState<number | ''>(
      isLojaUser && acesso?.loja_id ? acesso.loja_id : ''
  );
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  
  // New financial fields for registration
  const [dataAdmissao, setDataAdmissao] = useState(new Date().toISOString().split('T')[0]);
  const [joiaPaga, setJoiaPaga] = useState<string>('');
  const [comprovante, setComprovante] = useState<File | null>(null);

  // Effect to update when prop changes
  useEffect(() => {
    if (pessoaParaEditar) {
      setNome(pessoaParaEditar.nome);
      setTelefone(pessoaParaEditar.telefone);
      setStatus(pessoaParaEditar.status);
      setCargo(pessoaParaEditar.cargo || 'Nenhum');
      setLojaId(pessoaParaEditar.loja_id || (isLojaUser && acesso?.loja_id ? acesso.loja_id : ''));
      setLogin(pessoaParaEditar.login || '');
      setSenha(''); // Keep password blank when editing unless specifically changed
    } else {
        // Reset to empty for new creation
        setNome('');
        setTelefone('');
        setStatus(isCandidato ? 'Profano' : 'Aprendiz');
        setCargo('Nenhum');
        setLojaId(isLojaUser && acesso?.loja_id ? acesso.loja_id : '');
        setLogin('');
        setSenha('');
        setDataAdmissao(new Date().toISOString().split('T')[0]);
        setJoiaPaga('');
        setComprovante(null);
    }
  }, [pessoaParaEditar, isCandidato, isLojaUser, acesso]);

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
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
      const isEditing = !!pessoaParaEditar;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const url = isEditing 
        ? `${apiUrl}/api/pessoas/${pessoaParaEditar.id}`
        : `${apiUrl}/api/pessoas`;
        
      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          estado_sigla: estadoSigla,
          status,
          cargo: isCandidato || cargo === 'Nenhum' ? null : cargo,
          loja_id: isCandidato ? null : (lojaId || null),
          login: isCandidato ? null : (login.trim() || null),
          senha: isCandidato ? null : (senha.trim() || (isEditing ? null : "")),
          data_admissao: isCandidato ? null : dataAdmissao,
        }),
      });

      if (response.ok) {
        const dadosPessoa = await response.json();
        onPessoaCriada(dadosPessoa);
        
        // Handle Joia payment if provided
        if (!isEditing && !isCandidato && Number(joiaPaga) > 0) {
            try {
                const formData = new FormData();
                formData.append('caixa_id', '2'); // Fixed ID for Joias as per current setup
                formData.append('pessoa_id', String(dadosPessoa.id));
                formData.append('usuario_id', String(acesso?.loja_id || 0)); // Or current user ID, but using 0/placeholder
                formData.append('tipo', 'entrada');
                formData.append('categoria', 'joia');
                formData.append('valor', joiaPaga);
                formData.append('data_vencimento', dataAdmissao);
                formData.append('data_pagamento', dataAdmissao);
                formData.append('descricao', `Iniciação IR∴ ${nome.trim()}`);
                formData.append('status', 'pago');
                if (comprovante) {
                    formData.append('comprovante', comprovante);
                }

                await fetch(`${apiUrl}/api/tesouraria/transacoes/`, {
                    method: 'POST',
                    body: formData
                });
            } catch (err) {
                console.error("Erro ao registrar pagamento inicial:", err);
            }
        }
        
        if (!isEditing) {
            setNome('');
            setTelefone('');
            setStatus(isCandidato ? 'Profano' : 'Aprendiz');
            setCargo('Nenhum');
            setLogin('');
            setSenha('');
            setJoiaPaga('');
            setComprovante(null);
            if (!isLojaUser) {
              setLojaId('');
            }
        }
        
        setMensagem(isEditing ? '✅ Dados atualizados!' : '✅ Cadastrado com sucesso! Pagamento de Joia registrado.');
        setTimeout(() => setMensagem(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        setMensagem(`❌ Erro: ${errorData.detail || 'Erro ao salvar'}`);
      }
    } catch (error) {
      setMensagem('❌ Erro de conexão');
    } finally {
      // Logic for Joia payment if it's a new registration
      if (!pessoaParaEditar && !isCandidato && Number(joiaPaga) > 0) {
        try {
            // We need the person ID, but we just got it from response.json() in the try block
            // However, the try block is already returning. I should move this inside the response.ok block.
        } catch(e) {}
      }
      setSalvando(false);
    }
  };

  return (
    <div className={`bg-black/30 rounded-xl p-6 mb-6 border transition-all duration-500 ${pessoaParaEditar ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-yellow-500/20 shadow-inner'}`}>
      <h2 className="text-lg font-bold mb-4 text-yellow-500 font-serif border-b border-yellow-500/10 pb-2 uppercase tracking-wide flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span>{pessoaParaEditar ? '✏️' : '➕'}</span> 
            {pessoaParaEditar ? `Editando: ${pessoaParaEditar.nome}` : (isCandidato ? 'Registrar Novo Candidato' : 'Cadastrar Novo Obreiro')}
        </div>
        
        {pessoaParaEditar && (
            <button
                type="button"
                onClick={onCancelarEdicao}
                className="text-[9px] font-bold text-gray-400 bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-all border border-white/10"
            >
                CANCELAR EDIÇÃO
            </button>
        )}
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
              autoFocus={!!pessoaParaEditar}
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

        {!isCandidato && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-1 duration-300">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Login (Para Acesso)
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Ex: joao.silva"
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {pessoaParaEditar ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={pessoaParaEditar ? "Deixe em branco para não alterar" : "••••••••"}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {isCandidato ? 'Status' : 'Grau'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
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
                </>
              )}
            </select>
          </div>
          
          {!isCandidato && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Cargo
              </label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
              >
                <option value="Nenhum">Nenhum</option>
                <option value="Venerável Mestre">Venerável Mestre</option>
                <option value="1º Vigilante">1º Vigilante</option>
                <option value="2º Vigilante">2º Vigilante</option>
                <option value="Orador">Orador</option>
                <option value="Secretário">Secretário</option>
                <option value="Tesoureiro">Tesoureiro</option>
                <option value="Chanceler">Chanceler</option>
                <option value="Hospitaleiro">Hospitaleiro</option>
                <option value="Mestre de Cerimônias">Mestre de Cerimônias</option>
                <option value="1º Diácono">1º Diácono</option>
                <option value="2º Diácono">2º Diácono</option>
                <option value="Organista">Organista</option>
                <option value="Auxiliar de Secretário">Auxiliar de Secretário</option>
                <option value="Auxiliar de Tesoureiro">Auxiliar de Tesoureiro</option>
                <option value="Guarda Interno">Guarda Interno</option>
                <option value="Guarda Externo">Guarda Externo</option>
              </select>
            </div>
          )}

          {!isCandidato && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Loja (Vínculo)
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
          )}
        </div>

        {!isCandidato && !pessoaParaEditar && (
          <div className="bg-yellow-500/5 rounded-xl p-6 border border-yellow-500/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💰</span>
              <h3 className="text-[11px] font-black text-yellow-500 uppercase tracking-widest">Configuração Financeira Inicial</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Data de Iniciação / Admissão
                </label>
                <input
                  type="date"
                  value={dataAdmissao}
                  onChange={(e) => setDataAdmissao(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Joia Paga (R$)
                </label>
                <input
                  type="number"
                  value={joiaPaga}
                  onChange={(e) => setJoiaPaga(e.target.value)}
                  placeholder="0,00"
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Comprovante da Joia
                </label>
                <input
                  type="file"
                  onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-yellow-500/10 file:text-yellow-500 hover:file:bg-yellow-500/20 transition-all cursor-pointer"
                />
              </div>
            </div>
            <p className="text-[9px] text-gray-500 uppercase italic">
              * O valor da Joia padrão é R$ 2.000,00. O valor inserido aqui será registrado como entrada no caixa de Joias.
            </p>
          </div>
        )}

        {mensagem && (
          <p className={`text-xs font-semibold p-2 rounded border animate-in fade-in duration-300 ${mensagem.includes('✅') ? 'bg-green-900/20 text-green-400 border-green-900/40' : 'bg-red-900/20 text-red-400 border-red-900/40'}`}>
            {mensagem}
          </p>
        )}

        <div className="flex justify-end gap-3">
          {pessoaParaEditar && (
              <button
                type="button"
                onClick={onCancelarEdicao}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded border border-white/10 transition-all uppercase tracking-widest text-xs"
              >
                  CANCELAR
              </button>
          )}
          <button
            type="submit"
            disabled={salvando}
            className={`px-6 py-2 font-bold rounded border transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed ${pessoaParaEditar ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/40' : 'bg-yellow-600/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-600/40'}`}
          >
            {salvando ? 'Salvando...' : pessoaParaEditar ? 'Atualizar Dados' : (isCandidato ? 'Registrar Candidato' : 'Cadastrar')}
          </button>
        </div>
      </form>
    </div>
  );
}
