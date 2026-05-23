import React from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    loading?: boolean;
    isAlertOnly?: boolean; // If true, only shows the confirm button
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'warning',
    loading = false,
    isAlertOnly = false
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    // Define colors based on variant
    const getConfirmButtonStyles = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:border-red-500 text-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.15)]';
            case 'success':
                return 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:border-emerald-500 text-emerald-500 hover:text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]';
            case 'info':
                return 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500 hover:border-blue-500 text-blue-500 hover:text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]';
            case 'warning':
            default:
                return 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500 hover:border-yellow-500 text-yellow-500 hover:text-black shadow-[0_0_15px_rgba(234,179,8,0.15)]';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <style>{`
                @keyframes confirmOverlayIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes confirmCardIn { from { opacity: 0; transform: translateY(12px) scale(0.96); filter: blur(4px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
            `}</style>

            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                style={{ animation: 'confirmOverlayIn 180ms ease-out' }}
                onClick={() => !loading && onCancel && onCancel()}
            ></div>

            {/* Modal Card */}
            <div 
                className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0f] p-6 lg:p-8 shadow-2xl relative z-10"
                style={{ animation: 'confirmCardIn 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                
                {/* Efeito luminoso no topo baseado na variante */}
                {variant === 'warning' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[200px] h-20 bg-yellow-500/10 blur-[40px] pointer-events-none"></div>
                )}
                {variant === 'danger' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[200px] h-20 bg-red-500/10 blur-[40px] pointer-events-none"></div>
                )}

                <h3 className="font-serif text-[clamp(1.2rem,1.8vw,1.6rem)] text-[rgba(248,248,252,0.9)] font-light leading-[1.3] tracking-[0.05em] mb-4 relative z-10 drop-shadow-sm uppercase">
                    {title}
                </h3>

                <div className="text-[0.95rem] leading-[1.6] text-[rgba(220,225,235,0.68)] font-normal mb-8 relative z-10">
                    {message}
                </div>

                <div className="flex gap-3 relative z-10">
                    {!isAlertOnly && onCancel && (
                        <button 
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-5 py-3.5 text-[0.7rem] sm:text-[0.75rem] font-medium uppercase tracking-[0.15em] text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelLabel}
                        </button>
                    )}

                    <button 
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-xl px-5 py-3.5 text-[0.7rem] sm:text-[0.75rem] font-medium uppercase tracking-[0.15em] transition-all transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonStyles()}`}
                    >
                        {loading ? 'Aguarde...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
