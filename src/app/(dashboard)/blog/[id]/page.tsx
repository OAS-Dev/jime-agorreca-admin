'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import PostForm, { PostFormData } from '@/components/admin/PostForm'

interface RawPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  access: 'PUBLIC' | 'SUBSCRIBERS_ONLY'
  tags: string[]
}

const EditarNotaPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()

  const [initialData, setInitialData] = useState<Partial<PostFormData> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.backendToken || !id) return

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
        })
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar la nota')
      })
  }, [session?.backendToken, id])

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-body font-semibold text-destructive">{error}</p>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return <PostForm mode="edit" postId={id} initialData={initialData} />
}

export default EditarNotaPage
