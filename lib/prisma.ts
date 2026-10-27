import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const baseConnectionString = process.env.DATABASE_URL ?? ''
const schema = process.env.PRISMA_SCHEMA
const connectionString = schema
  ? `${baseConnectionString}${baseConnectionString.includes('?') ? '&' : '?'}options=-c%20search_path%3D${encodeURIComponent(schema)}`
  : baseConnectionString

const adapter = new PrismaPg(
  { connectionString },
  schema ? { schema } : undefined,
)

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma