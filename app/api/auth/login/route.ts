import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log('🔐 Login attempt for:', username);

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check environment variables.
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      console.error('❌ Missing Supabase environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      console.error('⚠️ JWT_SECRET not properly configured!');
    }

    // First, check if users table exists and create initial user if needed
    const { data: existingUsers, error: selectError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Database error checking users table:', selectError.message);
      console.error('Hint: Have you created the users table in your database?');
      return NextResponse.json(
        { error: 'Database error. Please ensure users table exists.' },
        { status: 500 }
      );
    }

    // If users table is empty, create the initial user
    if (existingUsers?.length === 0) {
      console.log('📝 Creating initial admin user...');
      const hashedPassword = await bcrypt.hash('Avenir@9669', 12);
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          username: 'Bala',
          password_hash: hashedPassword,
          role: 'ADMIN'
        });
      
      if (insertError) {
        console.error('❌ Error creating initial user:', insertError.message);
        return NextResponse.json(
          { error: 'Failed to create initial user' },
          { status: 500 }
        );
      }
      console.log('✅ Initial admin user created');
    }

    // Find user by username
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ Database error finding user:', error.message);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (!user) {
      console.log('❌ User not found or inactive:', username);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 days
    );

    // Create JSON response
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

    // Set secure httpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    console.log('🍪 Cookie set for user:', user.username);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}