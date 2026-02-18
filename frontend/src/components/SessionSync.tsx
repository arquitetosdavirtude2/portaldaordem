'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionSync() {
    const router = useRouter();

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'acesso' && event.newValue === null) {
                // Token removed in another tab -> Logout here too
                router.push('/login');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [router]);

    return null;
}
