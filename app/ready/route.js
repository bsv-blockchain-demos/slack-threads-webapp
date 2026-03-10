import { NextResponse } from 'next/server'
import dbConnect from '@/src/lib/db'
import mongoose from 'mongoose'

// checks db liveness using the shared connection
export async function GET() {
  try {
    await dbConnect()
    await mongoose.connection.db.command({ ping: 1 })
    return NextResponse.json({ status: 'ready' })
  } catch (err) {
    return NextResponse.json(
      { status: 'not ready', error: err.message },
      { status: 503 }
    )
  }
}
