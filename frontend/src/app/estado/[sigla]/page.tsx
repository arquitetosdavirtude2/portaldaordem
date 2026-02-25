// Server Component — exporta generateStaticParams para o static export
import EstadoPageClient from './EstadoPageClient';

export function generateStaticParams() {
    const siglas = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];
    return siglas.map((sigla) => ({ sigla }));
}

export default function EstadoPage() {
    return <EstadoPageClient />;
}
