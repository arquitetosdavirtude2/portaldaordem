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
        }),
      });

      if (response.ok) {
        const dadosPessoa = await response.json();
        onPessoaCriada(dadosPessoa);
        
        if (!isEditing) {
            setNome('');
            setTelefone('');
            setStatus(isCandidato ? 'Profano' : 'Aprendiz');
            setCargo('Nenhum');
            setLogin('');
            setSenha('');
            if (!isLojaUser) {
              setLojaId('');
            }
        }
        
        setMensagem(isEditing ? '✅ Dados atualizados!' : '✅ Cadastrado com sucesso!');
        setTimeout(() => setMensagem(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        setMensagem(`❌ Erro: ${errorData.detail || 'Erro ao salvar'}`);
      }
    } catch (error) {
      setMensagem('❌ Erro de conexão');
    } finally {
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
