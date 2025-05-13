// app/api/wallet/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const portfolios = await prisma.portfolios.findMany({
    orderBy: { balance: 'desc' },
  })

  return Response.json(portfolios)
}
