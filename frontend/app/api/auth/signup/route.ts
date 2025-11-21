import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { addDays } from "date-fns"

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
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
        organizations: {
          create: {
            name: name ? `${name}'s Organization` : `${email}'s Organization`,
            memberships: {
              create: {
                role: "owner",
                user: {
                  connect: { email }
                }
              }
            },
            subscription: {
              create: {
                status: "trialing",
                trialEndsAt: addDays(new Date(), parseInt(process.env.TRIAL_DAYS || "14")),
                provider: "stripe",
              }
            }
          }
        }
      },
      include: {
        organizations: {
          include: {
            subscription: true
          }
        }
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
