import { Controller, Get, Param, NotFoundException, Res, Req } from '@nestjs/common';
import { MatchesService } from './match.service';
import type { Request, Response } from 'express';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  getAllMatches() {
    return this.matchesService.getAllMatches();
  }

  @Get(':id')
  getMatch(@Param('id') id: number) {
    const match = this.matchesService.getMatch(id);
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }


@Get(':id/events/stream')
async streamEvents(
  @Param('id') id: number,
  @Req() req: Request,    // better typing (import from 'express')
  @Res() res: Response,   // better typing
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write('retry: 5000\n\n');
  res.write(': connected\n\n'); // nice to have

  const interval = setInterval(async () => {
    try {
      // await the promise here
      const events = await this.matchesService.getRecentEvents(id, 5);

      if (events.length > 0) {
        res.write(`data: ${JSON.stringify(events)}\n\n`);
      }
    } catch (err) {
      console.error(`Error fetching recent events for ${id}:`, err);
      // optionally: res.write(`data: {"error": "fetch failed"}\n\n`);
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
    console.log(`SSE connection closed for match ${id}`);
  });

  // Optional: immediate first send (some clients like it)
  (async () => {
    try {
      const initialEvents = await this.matchesService.getRecentEvents(id, 5);
      if (initialEvents.length > 0) {
        res.write(`data: ${JSON.stringify(initialEvents)}\n\n`);
      }
    } catch {}
  })();
}


}