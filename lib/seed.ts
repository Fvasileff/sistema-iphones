
import 'dotenv/config'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const password = await bcrypt.hash('Zapatilla.nike', 10)
  
  await prisma.usuario.upsert({
    where: { email: 'busto78@gmail.com' },
    update: {},
    create: {
      nombre: 'Pablo',
      email: 'busto78@gmail.com',
      password,
      rol: 'admin'
    }
  })

  console.log('Usuario creado!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())