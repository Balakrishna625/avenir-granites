'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to customers page after successful login
    router.replace('/customers');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Login successful! Redirecting...</p>
      </div>
    </div>
  );
}