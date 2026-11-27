import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { email, newPassword } = body;

    const cleanEmail = email?.toLowerCase().trim();
    const cleanPass = newPassword?.trim();

    if (!cleanEmail || !cleanPass) {
      return NextResponse.json(
        { error: 'Email and new password are required.' },
        { status: 400 }
      );
    }

    if (cleanPass.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    user.password = await hashPassword(cleanPass);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully! You can now log in with your updated password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update password.' },
      { status: 500 }
    );
  }
}
