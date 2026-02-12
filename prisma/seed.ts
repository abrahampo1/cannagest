import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'

// Usar la variable de entorno DATABASE_URL o el path por defecto
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Crear categorías básicas de productos
  console.log('Creating product categories...')
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Flores' },
      update: {},
      create: {
        name: 'Flores',
        description: 'Flores de cannabis',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Extracciones' },
      update: {},
      create: {
        name: 'Extracciones',
        description: 'Concentrados y extracciones',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Comestibles' },
      update: {},
      create: {
        name: 'Comestibles',
        description: 'Productos comestibles',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Accesorios' },
      update: {},
      create: {
        name: 'Accesorios',
        description: 'Accesorios y parafernalia',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Otros' },
      update: {},
      create: {
        name: 'Otros',
        description: 'Otros productos',
      },
    }),
  ])
  console.log(`✅ Created ${categories.length} categories`)

  // Crear usuario Admin por defecto
  console.log('Creating admin user...')
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@cannagest.local',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log(`✅ Created admin user: ${adminUser.username}`)
  console.log('   📝 Username: admin')
  console.log('   🔑 Password: admin123')
  console.log('   ⚠️  IMPORTANTE: Cambiar esta contraseña en producción!')

  // Crear algunos productos de ejemplo (opcional)
  console.log('Creating sample products...')
  const floresCategory = categories.find(c => c.name === 'Flores')!

  const sampleProducts = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'FLOR-001' },
      update: {},
      create: {
        name: 'Ejemplo Flores Premium',
        description: 'Producto de ejemplo - eliminar o modificar',
        sku: 'FLOR-001',
        pointsPrice: 10,
        categoryId: floresCategory.id,
        currentStock: 100,
        minStock: 10,
        unit: 'gramo',
        isActive: true,
      },
    }),
  ])
  console.log(`✅ Created ${sampleProducts.length} sample products`)

  console.log('✅ Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
