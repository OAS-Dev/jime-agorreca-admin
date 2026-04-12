'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import PostForm, { PostFormData } from '@/components/admin/PostForm';

interface RawPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  access: 'PUBLIC' | 'SUBSCRIBERS_ONLY';
  tags: string[];
}

export default function EditarNotaPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const [initialData, setInitialData] = useState<Partial<PostFormData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.backendToken || !id) return;

    api
      .get<RawPost>(`/posts/${id}`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => {
        setInitialData({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt ?? '',
          content: data.content,
          coverImage: data.coverImage ?? '',
          status: data.status,
          access: data.access,
          tags: data.tags,
        });
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ?? err?.message ?? 'Error al cargar la nota',
        );
      });
  }, [session?.backendToken, id]);

  if (error) {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='font-body font-semibold text-destructive'>{error}</p>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-6 w-6 text-primary animate-spin' />
      </div>
    );
  }

  return <PostForm mode='edit' postId={id} initialData={initialData} />;
}
