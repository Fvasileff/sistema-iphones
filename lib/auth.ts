// lib/auth.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/api/auth',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Buscamos el usuario en tu tabla real de Prisma
        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string }
        })

        if (!usuario) return null

        // Comparamos la contraseña (por ahora si está en texto plano usá: credentials.password === usuario.password)
        const match = await bcrypt.compare(credentials.password as string, usuario.password)
        if (!match) return null

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
        }
      }
    })
  ],
  pages: {
    signIn: '/login', // Si no están logueados, los manda acá
  },
})