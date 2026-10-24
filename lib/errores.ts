import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class ErrorApi extends Error {
  readonly status: number

  constructor(mensaje: string, status = 400) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
  }
}

export function esErrorUnico(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function manejarErrorApi(error: unknown) {
  if (error instanceof ErrorApi) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof ZodError) {
    const mensaje = error.issues.map(issue => issue.message).join('. ')
    return NextResponse.json({ error: mensaje || 'Datos inválidos' }, { status: 400 })
  }

  if (esErrorUnico(error)) {
    return NextResponse.json({ error: 'Ya existe un registro con ese dato único' }, { status: 409 })
  }

  console.error('Error en API:', error)
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}
