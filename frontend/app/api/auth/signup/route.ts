import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { addDays } from "date-fns"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with organization and trial
    // Note: We create the organization and membership separately to avoid circular references
    const userId = randomUUID()
    const organizationId = randomUUID()

    const user = await prisma.users.create({
      data: {
        id: userId,
        email,
        password: hashedPassword,
        name,
        organizations: {
          create: {
            id: organizationId,
            name: name ? `${name}'s Organization` : `${email}'s Organization`,
            updatedAt: new Date(),
            subscriptions: {
              create: {
                id: randomUUID(),
                status: "trialing",
                trialEndsAt: addDays(new Date(), parseInt(process.env.TRIAL_DAYS || "14")),
                provider: "stripe",
                updatedAt: new Date(),
              }
            }
          }
        }
      } as any,
      include: {
        organizations: {
          include: {
            subscriptions: true
          }
        }
      }
    })

    // Create membership linking user to their organization
    await prisma.memberships.create({
      data: {
        id: randomUUID(),
        userId: userId,
        organizationId: organizationId,
        role: "owner"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
