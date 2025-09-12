'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();

    useEffect(() => {
        // Token kontrolü
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenType');
        router.push('/login');
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>CRM Pro Dashboard</h1>
            <p>Hoş geldiniz! Başarıyla giriş yaptınız.</p>
            <button
                onClick={handleLogout}
                style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                Çıkış Yap
            </button>
        </div>
    );
}