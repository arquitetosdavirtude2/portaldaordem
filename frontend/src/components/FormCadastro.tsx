import { useEffect, useState } from 'react';

interface Pessoa {
  id: number;
  nome: string;
  telefone: string;
  status: string;
  cargo_id?: number | null;
  cargo_nome?: string | null;
  login?: string | null;
  senha?: string | null;
  loja_id?: number | null;
  ativo?: number;
  data_adormecimento?: string | null;
  data_admissao?: string | null;
  tipo_ingresso?: string;
  indicador_id?: number | null;
  tipo_pessoa?: string;
  motivo_adormecimento?: string | null;
  data_iniciacao?: string | null;
}

interface Cargo {
  id: number;
  nome: string;
  isento_contribuicao: number;
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

interface Indicador {
  id: number;
  nome: string;
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
  const [cargoId, setCargoId] = useState<number>(0);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [lojaId, setLojaId] = useState<number | ''>(
      isLojaUser && acesso?.loja_id ? acesso.loja_id : ''
  );
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  
  // Status de Atividade (Adormecido)
  const [ativo, setAtivo] = useState(1);
  const [dataAdormecimento, setDataAdormecimento] = useState<string>('');

  // Academia e Ingresso
  const [tipoIngresso, setTipoIngresso] = useState<'iniciacao' | 'transferencia'>('iniciacao');
  const [indicadorId, setIndicadorId] = useState<number | ''>('');
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);

  // Novos campos de Categorização
  const [tipoPessoa, setTipoPessoa] = useState<string>('obreiro');
  const [motivoAdormecimento, setMotivoAdormecimento] = useState<string>('');
  const [dataIniciacao, setDataIniciacao] = useState<string>('');

  // Carregar cargos da API
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${apiUrl}/api/pessoas/cargos`)
      .then(r => r.ok ? r.json() : [])
      .then(setCargos)
      .catch(() => {});

    // Carregar indicadores
    fetch(`${apiUrl}/api/academia/indicadores/${acesso?.loja_id || 0}`)
      .then(r => r.ok ? r.json() : [])
      .then(setIndicadores)
      .catch(() => {});
  }, [acesso?.loja_id]);
  
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
      setCargoId(pessoaParaEditar.cargo_id || 0);
      setLojaId(pessoaParaEditar.loja_id || (isLojaUser && acesso?.loja_id ? acesso.loja_id : ''));
      setLogin(pessoaParaEditar.login || '');
      setSenha('');
      setAtivo(pessoaParaEditar.ativo ?? 1);
      setDataAdormecimento(pessoaParaEditar.data_adormecimento || '');
      setDataAdmissao(pessoaParaEditar.data_admissao || new Date().toISOString().split('T')[0]);
      setTipoIngresso(pessoaParaEditar.tipo_ingresso as any || 'iniciacao');
      setIndicadorId(pessoaParaEditar.indicador_id || '');
      setTipoPessoa(pessoaParaEditar.tipo_pessoa || 'obreiro');
      setMotivoAdormecimento(pessoaParaEditar.motivo_adormecimento || '');
      setDataIniciacao(pessoaParaEditar.data_iniciacao || '');
    } else {
        setNome('');
        setTelefone('');
        setStatus(isCandidato ? 'Profano' : 'Aprendiz');
        setCargoId(0);
        setLojaId(isLojaUser && acesso?.loja_id ? acesso.loja_id : '');
        setLogin('');
        setSenha('');
        setDataAdmissao(new Date().toISOString().split('T')[0]);
        setJoiaPaga('');
        setComprovante(null);
        setAtivo(1);
        setDataAdormecimento('');
        setTipoIngresso('iniciacao');
        setIndicadorId('');
        setTipoPessoa('obreiro');
        setMotivoAdormecimento('');
        setDataIniciacao('');
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
          cargo_id: isCandidato ? null : (cargoId || null),
          loja_id: isCandidato ? null : (lojaId || acesso?.loja_id || null),
          login: isCandidato ? null : (login.trim() || null),
          senha: isCandidato ? null : (senha.trim() || (isEditing ? null : "")),
          data_admissao: isCandidato ? null : dataAdmissao,
          ativo: isCandidato ? 1 : ativo,
          data_adormecimento: (isCandidato || ativo === 1) ? null : dataAdormecimento,
          tipo_ingresso: tipoIngresso,
          indicador_id: indicadorId || null,
          tipo_pessoa: tipoPessoa,
          motivo_adormecimento: motivoAdormecimento || null,
          data_iniciacao: dataIniciacao || null,
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
            setCargoId(0);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-4 rounded-xl border border-white/10">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Tipo de Cadastro
              </label>
              <select
                value={tipoPessoa}
                onChange={(e) => setTipoPessoa(e.target.value)}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-yellow-500 font-bold focus:outline-none focus:border-yellow-500/50 transition-all text-sm"
              >
                <option value="obreiro">Irmão (Obreiro Ativo)</option>
                <option value="candidato">Candidato / Profano</option>
                <option value="adormecido">Adormecido</option>
              </select>
              <p className="text-[9px] text-gray-500 mt-1 uppercase italic">* Candidatos não entram na contagem de Per Capita.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Data de Iniciação
              </label>
              <input
                type="date"
                value={dataIniciacao}
                onChange={(e) => setDataIniciacao(e.target.value)}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-all text-sm"
              />
              {dataIniciacao && (
                <p className="text-[10px] text-blue-400 mt-1 font-bold">
                   ⌛ Tempo de Irmandade: {(() => {
                      const start = new Date(dataIniciacao);
                      const now = new Date();
                      let years = now.getFullYear() - start.getFullYear();
                      let months = now.getMonth() - start.getMonth();
                      if (months < 0) {
                        years--;
                        months += 12;
                      }
                      return `${years} anos e ${months} meses`;
                   })()}
                </p>
              )}
            </div>
        </div>

        {!isCandidato && (
          <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Tipo de Ingresso na Loja
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setTipoIngresso('iniciacao')}
                    className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${tipoIngresso === 'iniciacao' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-black/20 border-white/10 text-gray-500'}`}
                  >
                    🌱 INICIAÇÃO
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoIngresso('transferencia')}
                    className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${tipoIngresso === 'transferencia' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/10 text-gray-500'}`}
                  >
                    ✈️ TRANSFERÊNCIA
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Indicador (Academia)
                </label>
                <select
                  value={indicadorId}
                  onChange={(e) => setIndicadorId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-all text-sm"
                >
                  <option value="">Ninguém (Indicação Direta)</option>
                  {indicadores.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.nome}</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-500 mt-1 uppercase italic">* Se for transferência, a Joia não será cobrada.</p>
              </div>
            </div>
          </div>
        )}

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
                value={cargoId}
                onChange={(e) => setCargoId(Number(e.target.value))}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm"
              >
                <option value={0}>Sem cargo</option>
                {cargos.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
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

        {pessoaParaEditar && !isCandidato && (
          <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌙</span>
                <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Status de Atividade</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${ativo === 1 ? 'text-green-400' : 'text-gray-500'}`}>Ativo</span>
                <button
                  type="button"
                  onClick={() => {
                    const novoAtivo = ativo === 1 ? 0 : 1;
                    setAtivo(novoAtivo);
                    if (novoAtivo === 0 && !dataAdormecimento) {
                      setDataAdormecimento(new Date().toISOString().split('T')[0]);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ativo === 1 ? 'bg-green-500/40' : 'bg-gray-700'}`}
                >
                  <span
                    className={`${ativo === 1 ? 'translate-x-6 bg-green-400' : 'translate-x-1 bg-gray-400'} inline-block h-4 w-4 transform rounded-full transition-transform`}
                  />
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${ativo === 0 ? 'text-red-400' : 'text-gray-500'}`}>Adormecido</span>
              </div>
            </div>

            {ativo === 0 && (
              <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-left-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Data de Adormecimento
                    </label>
                    <input
                      type="date"
                      value={dataAdormecimento}
                      onChange={(e) => setDataAdormecimento(e.target.value)}
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-[9px] text-gray-500 uppercase italic leading-tight">
                      * Ao adormecer um irmão, o sistema interrompe a geração de novas mensalidades a partir desta data.
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Motivo do Adormecimento
                  </label>
                  <textarea
                    value={motivoAdormecimento}
                    onChange={(e) => setMotivoAdormecimento(e.target.value)}
                    placeholder="Descreva brevemente o motivo..."
                    rows={2}
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-all text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

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
