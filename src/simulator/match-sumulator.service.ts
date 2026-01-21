import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MatchEventsGateway } from 'src/event/match-event.gateway';
import { MatchesService } from 'src/match/match.service';
import { MatchEvent, Match } from 'src/match/match.service'; // ← import the interfaces

@Injectable()
export class MatchSimulatorService {
  private readonly logger = new Logger(MatchSimulatorService.name);
  private matches: Match[] = []; // better typing than any[]

  constructor(
    private matchesService: MatchesService,
    private gateway: MatchEventsGateway,
  ) {
    this.initializeMatches();
  }

  private initializeMatches() {
    // You can keep this for first run, but later better to load from DB
    this.matches = [
      {
        id: 1,
        home: 'Man City',
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
        home: 'Chelsea',
        away: 'Liverpool',
        score: '0-0',
        minute: 0,
        status: 'NOT_STARTED',
        events: [],
        stats: { possessionHome: 50, shotsHome: 0, shotsAway: 0, foulsHome: 0, foulsAway: 0 },
      },
      // Add more matches if you want
    ];

    this.matches.forEach((m) => this.matchesService.upsertMatch(m));
    this.logger.log(`Initialized ${this.matches.length} sample matches`);
  }

  @Interval(1000)
  async simulateMinute() {           // ← made async so we can await inside
    for (const match of this.matches) {   // better than forEach + async
      if (match.status === 'FULL_TIME') continue;

      match.minute += 1;

      if (match.minute === 1) match.status = 'FIRST_HALF';

      // ── Goal ────────────────────────────────────────
      if (Math.random() < 0.015) { // ~2.5 goals per match
        const scorer = Math.random() > 0.5 ? match.home : match.away;

        const event: MatchEvent = {    // ← explicit type = fixes the error
          type: 'goal',
          team: scorer,
          minute: match.minute,
        };

        match.events.push(event);
        match.score = this.updateScore(match.score, scorer === match.home);

        await this.matchesService.addEvent(match.id, event);
        this.logger.log(`Goal! ${scorer} at minute ${match.minute} (match ${match.id})`);
      }

      // ── Yellow card ─────────────────────────────────
      if (Math.random() < 0.04) { // ~3-4 per match
        const team = Math.random() > 0.5 ? match.home : match.away;

        const event: MatchEvent = {
          type: 'yellow_card',
          team, 
          minute: match.minute,
          player: `Player ${Math.floor(Math.random() * 11 + 1)}`,
        };

        await this.matchesService.addEvent(match.id, event);
        this.logger.log(`Yellow card for ${team} at minute ${match.minute}`);
      }

      // You can add red card, substitution, foul, shot similarly...

      // ── End of match ────────────────────────────────
      if (match.minute >= 90) {
        match.status = 'FULL_TIME';
        await this.matchesService.upsertMatch(match);
        this.logger.log(`Match ${match.id} finished`);
      }

      // Periodic full update (every 10 minutes or after important events)
      if (match.minute % 10 === 0) {
        await this.matchesService.upsertMatch(match);
      }
    }
  }

  private updateScore(score: string, homeScored: boolean): string {
    let [h, a] = score.split('-').map(Number);
    if (homeScored) h++;
    else a++;
    return `${h}-${a}`;
  }

  // Optional helper if you want to create events in a cleaner way later
  private createEvent(
    type: MatchEvent['type'],
    team: string,
    minute: number,
    extra: Partial<MatchEvent> = {},
  ): MatchEvent {
    return { type, team, minute, ...extra };
  }
}