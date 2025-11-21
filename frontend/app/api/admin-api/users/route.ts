import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listAllUsers } from '@/lib/admin'

const ADMIN_EMAILS = ['admin@epic.dm']

/**
 * GET /api/admin/users - List all users
 */
export async function GET() {
  try {
    const session = await auth()
    
    console.log('🔍 Admin API called:', {
      hasSession: !!session,
      email: session?.user?.email,
      isAdmin: session?.user?.email ? ADMIN_EMAILS.includes(session.user.email) : false
    })
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      console.log('❌ Access denied:', { email: session?.user?.email, adminEmails: ADMIN_EMAILS })
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    console.log('✅ Fetching users...')
    const users = await listAllUsers()
    console.log(`✅ Found ${users.length} users`)
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Failed to list users:', error)
    return NextResponse.json(
      { error: 'Failed to list users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
