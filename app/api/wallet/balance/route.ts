import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Récupérer le portefeuille de l'utilisateur
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: userId },
      select: { balance: true }
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portefeuille non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      balance: portfolio.balance,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du solde:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du solde" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const { amount } = await request.json();
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: "Montant invalide. Veuillez fournir un nombre positif." },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    
    // Récupérer le portefeuille actuel
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: userId },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portefeuille non trouvé" },
        { status: 404 }
      );
    }

    // Mettre à jour le solde
    const updatedPortfolio = await prisma.portfolios.update({
      where: { id: portfolio.id },
      data: {
        balance: {
          increment: amount,
        },
      },
      select: { balance: true }
    });

    return NextResponse.json({
      balance: updatedPortfolio.balance,
      message: `${amount}$ ont été ajoutés à votre portefeuille`
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de fonds:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de fonds" },
      { status: 500 }
    );
  }
} 