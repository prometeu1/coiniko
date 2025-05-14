// app/api/wallet/route.ts
import { prisma } from '@/lib/db'

export async function GET() {
  const portfolios = await prisma.portfolios.findMany({
    orderBy: { balance: 'desc' },
  })

  return Response.json(portfolios)
}
