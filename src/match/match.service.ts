import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchEventsGateway } from 'src/event/match-event.gateway'; // adjust path if needed
import { SupabaseService } from 'src/supabase/supabase.service';

export interface Match {
  id: number;
  home: string;
  away: string;
  score: string; // e.g. "2-1"
  minute: number;
  status: 'NOT_STARTED' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FULL_TIME';
  events: MatchEvent[];
  stats: MatchStats;
}

export interface MatchEvent {
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'foul' | 'shot';
  team: string;
  minute: number;
  player?: string;
  details?: string;
}

export interface MatchStats {
  possessionHome: number;
  shotsHome: number;
  shotsAway: number;
  foulsHome: number;
  foulsAway: number;
  // add more fields later if needed
}


@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly gateway?: MatchEventsGateway, // optional injection
  ) {
    // Run initialization only once when service starts
    this.initializeSampleMatchesIfNeeded();
  }

  private async initializeSampleMatchesIfNeeded(): Promise<void> {
    try {
      // Check if we already have matches (avoid duplicating every restart)
      const { data: existing, error: checkError } = await this.supabaseService.client
        .from('matches')
        .select('id')
        .limit(1);

      if (checkError) {
        this.logger.error('Error checking existing matches:', checkError);
        return;
      }

      if (existing && existing.length > 0) {
        this.logger.log('Sample matches already exist in database — skipping init');
        return;
      }

      const sampleMatches: Match[] = [
        {
          id: 1,
          home: 'Manchester City',
          away: 'Arsenal',
          score: '0-0',
          minute: 0,
          status: 'NOT_STARTED',
          events: [],
          stats: { possessionHome: 50, shotsHome: 0, shotsAway: 0, foulsHome: 0, foulsAway: 0 },
        },
        {
          id: 2,   
          home: 'Real Madrid',
          away: 'Barcelona',
          score: '0-0',
          minute: 0,
          status: 'NOT_STARTED',
          events: [],
          stats: { possessionHome: 50, shotsHome: 0, shotsAway: 0, foulsHome: 0, foulsAway: 0 },
        },
        {
          id: 3,
          home: 'Liverpool',
          away: 'Chelsea', 
          score: '0-0',
          minute: 0,
          status: 'NOT_STARTED',
          events: [],
          stats: { possessionHome: 50, shotsHome: 0, shotsAway: 0, foulsHome: 0, foulsAway: 0 },
        },
        {
          id: 4,
          home: 'Arsenal',
          away: 'Manchester United', 
          score: '0-0',
          minute: 0,
          status: 'NOT_STARTED',
          events: [],
          stats: { possessionHome: 50, shotsHome: 0, shotsAway: 0, foulsHome: 0, foulsAway: 0 },
        },
        {
          id: 5,
          home: 'Sevila',
          away: 'Barcelona', 
          score: '0-0',
          minute: 0,
          status: 'NOT_STARTED',
          events: [],
          stats: { possessionHome: 50, shotsHome: 0, shotsAway: 0, foulsHome: 0, foulsAway: 0 },
        },
      ];

      const { error } = await this.supabaseService.client
        .from('matches')
        .insert(sampleMatches);

      if (error) {
        this.logger.error('Failed to insert sample matches:', error);
      } else {
        this.logger.log(`Initialized ${sampleMatches.length} sample matches in Supabase`);
      }
    } catch (err) {
      this.logger.error('Initialization error:', err);
    }
  }

  async getAllMatches(): Promise<Match[]> {
    const { data, error } = await this.supabaseService.client
      .from('matches')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      this.logger.error('Error fetching all matches:', error);
      return [];
    }

    return (data || []) as Match[];
  }

  async getMatch(id: number): Promise<Match> {
    const { data, error } = await this.supabaseService.client
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    return data as Match;
  }

  async upsertMatch(match: Match): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('matches')
      .upsert(match, { onConflict: 'id' });

    if (error) {
      this.logger.error(`Error upserting match ${match.id}:`, error);
      return;
    }

    // Fetch fresh version to broadcast accurate data
    const updatedMatch = await this.getMatch(match.id);
    this.broadcastUpdateIfNeeded(updatedMatch);
  }

  async addEvent(matchId: number, event: MatchEvent): Promise<void> {
    try {
      const match = await this.getMatch(matchId);

      // Append new event
      match.events = [...match.events, event];

      // Update score & stats based on event (basic example — expand as needed)
      if (event.type === 'goal') {
        const [home, away] = match.score.split('-').map(Number);
        match.score = event.team === match.home
          ? `${home + 1}-${away}`
          : `${home}-${away + 1}`;
      } else if (event.type === 'foul') {
        if (event.team === match.home) match.stats.foulsHome++;
        else match.stats.foulsAway++;
      }
      // Add logic for yellow_card, shot, etc. here when you implement them

      await this.upsertMatch(match);

      this.broadcastUpdateIfNeeded(match, { newEvent: event });
    } catch (err) {
      this.logger.error(`Failed to add event to match ${matchId}:`, err);
    }
  }

  async getRecentEvents(matchId: number, limit = 10): Promise<MatchEvent[]> {
    try {
      const match = await this.getMatch(matchId);
      return match.events.slice(-limit);
    } catch {
      return [];
    }
  }

private broadcastUpdateIfNeeded(match: Match, extraPayload: any = {}): void {
  if (!this.gateway) return;

  const payload = {
    matchId: match.id,           // number is fine here
    score: match.score,
    minute: match.minute,
    status: match.status,
    events: match.events.slice(-3),
    ...extraPayload,
  };

  this.gateway.broadcastToMatch(match.id, 'matchUpdate', payload);  // gateway converts inside
}

  // Optional — call this from a scheduled task if you want auto-cleanup
  async cleanupOldMatches(): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('matches')
      .delete()
      .eq('status', 'FULL_TIME')
      .gt('minute', 100);

    if (error) {
      this.logger.error('Error cleaning up old matches:', error);
    } else {
      this.logger.log('Cleaned up old finished matches');
    }
  }
}