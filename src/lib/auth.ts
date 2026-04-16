import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import api from './api'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const { data } = await api.post('/auth/login', {
            email: credentials.email,
            password: credentials.password,
          })

          // Solo ADMIN puede acceder al panel
          if (data.user.role !== 'ADMIN') return null

          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            backendToken: data.token,
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = (user as any).role
        token.backendToken = (user as any).backendToken
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.userId
      session.user.role = token.role
      session.backendToken = token.backendToken
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
  },
}
