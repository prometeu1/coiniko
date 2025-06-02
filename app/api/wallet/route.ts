// app/api/wallet/route.ts
import { prisma, handleDatabaseOperation } from '@/lib/db'

export async function GET() {
  try {
    const portfolios = await handleDatabaseOperation(async () => {
      return prisma.portfolios.findMany({
        orderBy: { balance: 'desc' },
      });
    });

    return Response.json(portfolios);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return new Response('Database error', { status: 500 });
  }
}
