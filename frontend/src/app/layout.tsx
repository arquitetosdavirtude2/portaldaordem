import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import './globals.css';
import SessionSync from '@/components/SessionSync';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

export const metadata: Metadata = {
  title: 'GOMB - Grande Oriente Maçônico do Brasil',
  description: 'Sistema de Gestão de Lojas Jurisdicionadas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${cinzel.variable} font-sans bg-masonic-blue text-white`}>
        <SessionSync />
        {children}
      </body>
    </html>
  );
}
