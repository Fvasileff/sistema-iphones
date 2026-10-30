import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { manejarErrorApi } from '@/lib/errores'
import { iphoneCreateSchema, iphoneUpdateSchema } from '@/lib/validaciones/iphones'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const iphones = await prisma.iPhone.findMany({
      include: { variantes: { orderBy: { color: 'asc' } } },
      orderBy: [{ modelo: 'asc' }, { almacenamiento: 'asc' }],
    })

    return NextResponse.json(
      iphones.map(iphone => ({
        ...iphone,
        stockTotal: iphone.variantes.reduce((total, variante) => total + variante.stock, 0),
      })),
    )
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const data = iphoneCreateSchema.parse(await request.json())

    const existente = await prisma.iPhone.findFirst({
      where: {
        modelo: data.modelo,
        variante: data.variante,
        almacenamiento: data.almacenamiento,
      },
      include: { variantes: true },
    })

    const nuevoIphone = existente
      ? await prisma.$transaction(async tx => {
          for (const item of data.variantes) {
            const actual = existente.variantes.find(
              color => color.color.toLowerCase() === item.color.toLowerCase(),
            )

            if (actual) {
              await tx.iphoneVariant.update({
                where: { id: actual.id },
                data: { stock: { increment: item.stock } },
              })
            } else {
              await tx.iphoneVariant.create({
                data: { iphoneId: existente.id, color: item.color, stock: item.stock },
              })
            }
          }

          return tx.iPhone.update({
            where: { id: existente.id },
            data: { precioBase: data.precioBase },
            include: { variantes: { orderBy: { color: 'asc' } } },
          })
        })
      : await prisma.iPhone.create({
          data: {
            modelo: data.modelo,
            variante: data.variante,
            almacenamiento: data.almacenamiento,
            precioBase: data.precioBase,
            variantes: {
              create: data.variantes.map(item => ({
                color: item.color,
                stock: item.stock,
              })),
            },
          },
          include: { variantes: { orderBy: { color: 'asc' } } },
        })

    return NextResponse.json(nuevoIphone, { status: existente ? 200 : 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const data = iphoneUpdateSchema.parse(await request.json())

    const actualizado = await prisma.$transaction(async tx => {
      if (data.variantes) {
        const existentes = await tx.iphoneVariant.findMany({ where: { iphoneId: data.id } })
        const idsConservados = new Set<string>()

        for (const item of data.variantes) {
          if (item.id && existentes.some(color => color.id === item.id)) {
            await tx.iphoneVariant.update({
              where: { id: item.id },
              data: { color: item.color, stock: item.stock },
            })
            idsConservados.add(item.id)
            continue
          }

          const porColor = existentes.find(
            color => color.color.toLowerCase() === item.color.toLowerCase(),
          )
          if (porColor) {
            await tx.iphoneVariant.update({
              where: { id: porColor.id },
              data: { stock: item.stock },
            })
            idsConservados.add(porColor.id)
          } else {
            const creada = await tx.iphoneVariant.create({
              data: { iphoneId: data.id, color: item.color, stock: item.stock },
            })
            idsConservados.add(creada.id)
          }
        }

        const idsEliminar = existentes
          .filter(color => !idsConservados.has(color.id))
          .map(color => color.id)

        if (idsEliminar.length > 0) {
          await tx.iphoneVariant.deleteMany({ where: { id: { in: idsEliminar } } })
        }
      }

      return tx.iPhone.update({
        where: { id: data.id },
        data: data.precioBase !== undefined ? { precioBase: data.precioBase } : {},
        include: { variantes: { orderBy: { color: 'asc' } } },
      })
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
