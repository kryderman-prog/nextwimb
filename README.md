# WIMB - Where Is My Buddy?

A real-time buddy-finder web application built with Next.js 14, TypeScript, Supabase, and Leaflet maps.

## Features

- **Google OAuth Authentication** - Secure sign-in with Google
- **Real-time Location Tracking** - Find your friends on an interactive map
- **User Search** - Search for buddies by name
- **Responsive Design** - Modern UI with glassmorphism effects
- **Geolocation Support** - Automatic location detection with fallback

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React 19
- **Styling**: Tailwind CSS, Outfit Font, Framer Motion animations
- **Maps**: React Leaflet with OpenStreetMap
- **Backend**: Supabase (Auth + Database)
- **Authentication**: Google OAuth via Supabase

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Authentication > Providers and enable Google OAuth
3. Configure the OAuth redirect URL to: `https://your-domain.com/auth/callback`
4. Create a `users` table with the following schema:

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  firstname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

## Project Structure

```
/app
  /auth
    /login          # Google OAuth login page
    /callback       # OAuth callback handler
    /signout        # Sign out API route
  /dashboard        # Protected dashboard with map
  layout.tsx        # Root layout with AuthProvider

/components
  Map.tsx           # Interactive Leaflet map component
  UserSearch.tsx    # Debounced user search with dropdown
  Navbar.tsx        # Navigation bar with search and logout
  /ui
    Button.tsx      # Reusable button component

/hooks
  useAuth.ts        # Authentication context and state
  useSupabase.ts    # Supabase client hook

/services
  authService.ts    # Authentication operations
  userService.ts    # User-related database operations

/lib
  supabaseClient.ts # Supabase client configuration

middleware.ts       # Route protection middleware
```

## Usage

1. Visit the application - you'll see the hero page
2. Click "Get Started" to sign in with Google
3. On first login, your profile is automatically created
4. Access the dashboard with the interactive map
5. Use the search bar to find other users
6. Your location is automatically detected and displayed

## Design System

- **Primary Color**: `#0f172a` (Slate-900)
- **Background**: `#fafbfc` (Gray-50)
- **Font**: Outfit (Google Fonts)
- **Border Radius**: 16px
- **Effects**: Glassmorphism with backdrop blur

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. On callback, check if user exists in `users` table by `google_id`
4. If not exists, create new user record
5. Redirect to dashboard with authenticated session

## Map Features

- **Default Location**: Kochi, Kerala (9.9312, 76.2673)
- **Geolocation**: Requests user location on load
- **Fallback**: Uses default location if geolocation fails
- **Real-time**: Map updates with user position
- **Responsive**: Adapts to different screen sizes

## Search System

- **Debounced**: 300ms delay to prevent excessive API calls
- **Case-insensitive**: Searches `firstname` field
- **Exclusion**: Current user excluded from results
- **Dropdown**: Results appear above map with z-index fix
- **Animations**: Smooth open/close with Framer Motion
