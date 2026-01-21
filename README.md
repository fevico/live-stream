# ProFootball - Real-time Football Match Center Backend

This is a NestJS-based backend API for a real-time football match center, built as part of a take-home assessment.  
It provides live match data, real-time event streaming, match-specific chat rooms, and a background simulator that generates realistic match events.

## Features Implemented

- **REST API**
  - `GET /api/matches` — List all live/upcoming matches
  - `GET /api/matches/:id` — Get detailed match information (score, minute, status, events, stats)

- **Server-Sent Events (SSE)**
  - `GET /api/matches/:id/events/stream` — Real-time stream of match events

- **WebSocket / Socket.IO Real-time Communication**
  - Room-based subscriptions per match
  - Join / leave match rooms
  - Broadcast match updates (score, minute, status, new events)
  - Chat messaging in match-specific rooms
  - Typing indicators
  - User joined/left notifications

- **Background Match Simulator**
  - Simulates 5 concurrent matches
  - Advances match time (1 real second ≈ 1 match minute)
  - Generates realistic events:
    - Goals (~2.5 per match)
    - Yellow cards (~3–4 per match)
    - Full match lifecycle (NOT_STARTED → FIRST_HALF → HALF_TIME → SECOND_HALF → FULL_TIME)

- **Persistence**
  - Supabase PostgreSQL for match data storage
  - In-memory caching not used — all updates go through the database

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Real-time**: Socket.IO (@nestjs/websockets)
- **Database**: Supabase (PostgreSQL)
- **Scheduling**: @nestjs/schedule (for simulator)
- **Validation & DTOs**: Built-in NestJS pipes (class-validator optional)
- **CORS**: Configured for all origins (`*`) in development

## Project Structure (main folders)


## Setup Instructions

### Prerequisites

- Node.js ≥ 18
- PostgreSQL-compatible database (Supabase recommended)

### 1. Clone the repository

git clone <your-repo-url>
cd <project-folder>

# Supabase credentials
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key

# Optional – change port if needed
PORT=3000

4. Create Supabase table (if not already done)
In Supabase dashboard → Table Editor → New Table: matches
Columns (approximate types):

id → int8 (primary key)
home → text
away → text
score → text
minute → int8
status → text
events → jsonb
stats → jsonb

→ Enable RLS or use service_role key if you want stricter access (current setup uses anon key with public policies or RLS disabled for dev).

# Development mode (with hot-reload)
npm run start:dev

# Or production build
npm run build
npm run start:prod


# Api Documentation 
Method,Endpoint,Description,Response Example
GET,/api/matches,List all matches,Array of match objects
GET,/api/matches/:id,Get single match details,Match object with events & stats
GET,/api/matches/:id/events/stream,SSE stream of match events (real-time),text/event-stream


Socket.IO Events (Client → Server)
EventPayload ExampleDescriptionjoinMatch1 or { matchId: 1 }Join match roomleaveMatch1Leave match roomchatMessage{ matchId: 1, text: "Great goal!" }Send chat messagetyping{ matchId: 1, isTyping: true }Send typing indicator


Event,Payload Example,Description
joinMatch,1 or { matchId: 1 },Join match room
leaveMatch,1,Leave match room
chatMessage,"{ matchId: 1, text: ""Great goal!"" }",Send chat message
typing,"{ matchId: 1, isTyping: true }",Send typing indicator

# All matches
curl http://localhost:3000/api/matches

# Single match
curl http://localhost:3000/api/matches/1

# SSE stream (open in browser or curl)
http://localhost:3000/api/matches/1/events/stream