import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUser, deleteUser } from '@/lib/admin'

const ADMIN_EMAILS = ['admin@epic.dm']

/**
 * GET /api/admin/users/[userId] - Get user details
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params;
    const session = await auth()

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const user = await getUser(params.userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to get user:', error)
    return NextResponse.json(
      { error: 'Failed to get user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[userId] - Delete user and all data
 */
export async function DELETE(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params;
    const session = await auth()

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const user = await getUser(params.userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user (cascades to all related data)
    await deleteUser(params.userId)

    return NextResponse.json({
      success: true,
      message: `User ${user.email} and all associated data deleted`
    })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
