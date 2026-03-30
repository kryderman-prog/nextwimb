# Next.js Map Application

A complete Next.js application with Google OAuth authentication, interactive Leaflet maps, and Supabase database integration.

## Features

- **Authentication**: Google OAuth via Supabase
- **Interactive Maps**: Leaflet with OpenStreetMap tiles
- **Database**: Supabase with real-time updates
- **State Management**: Custom React hooks
- **TypeScript**: Full type safety
- **App Router**: Next.js 14+ App Router

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
4. Create a `markers` table with the following schema:

```sql
CREATE TABLE markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE markers ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own markers
CREATE POLICY "Users can view their own markers" ON markers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own markers" ON markers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own markers" ON markers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own markers" ON markers
  FOR DELETE USING (auth.uid() = user_id);
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
    /login          # Login page
  /dashboard        # Protected dashboard
  /map              # Map page
/components
  Map.tsx           # Leaflet map component
  SignOutButton.tsx # Sign out component
/hooks
  useMarkers.ts     # Custom hook for marker management
/services
  markers.ts        # Database service for markers
/lib
  supabase.ts       # Client-side Supabase client
  supabase-server.ts # Server-side Supabase client
middleware.ts       # Auth middleware
```

## Usage

1. Visit the application - you'll be redirected to login
2. Sign in with Google
3. Access the dashboard and navigate to the map
4. Click on the map to add markers
5. Markers are stored in Supabase and sync in real-time

## Technologies Used

- Next.js 14+ App Router
- TypeScript
- Supabase (Auth + Database)
- Leaflet + React-Leaflet
- Tailwind CSS
