'use client';

interface ModalConfirmacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    titulo: string;
    mensagem: string;
    textoConfirmar?: string;
    confirmText?: string; // Aliases for flexibility
    textoCancelar?: string;
    cancelText?: string;
    corBotao?: 'red' | 'yellow' | 'blue';
}

export default function ModalConfirmacao({ 
    isOpen, 
    onClose, 
    onConfirm, 
    titulo, 
    mensagem, 
    textoConfirmar,
    confirmText,
    textoCancelar,
    cancelText,
    corBotao = 'red'
}: ModalConfirmacaoProps) {
    const txtConfirm = textoConfirmar || confirmText || "Confirmar";
    const txtCancel = textoCancelar || cancelText || "Cancelar";
    if (!isOpen) return null;

    const cores = {
        red: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white',
        yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-white',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500 hover:text-white'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">{titulo}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{mensagem}</p>
                </div>
                
                <div className="flex border-t border-white/5">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-6 py-4 text-[10px] uppercase font-black text-gray-500 hover:bg-white/5 transition-colors tracking-widest"
                    >
                        {txtCancel}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-4 text-[10px] uppercase font-black transition-all tracking-widest border-l border-white/5 ${cores[corBotao]}`}
                    >
                        {txtConfirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
