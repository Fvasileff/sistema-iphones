
import 'dotenv/config'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const password = await bcrypt.hash('Tati2142', 10)
  
  await prisma.usuario.upsert({
    where: { email: 'fvasileff2142@hotmail.com' },
    update: {},
    create: {
      nombre: 'Franco',
      email: 'fvasileff2142@hotmail.com',
      password,
      rol: 'admin'
    }
  })

  console.log('Usuario creado!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())