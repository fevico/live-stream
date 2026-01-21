import { Module } from '@nestjs/common';
import { MatchesController } from './match.controller';
import { MatchesService } from './match.service';
import { MatchEventsGateway } from 'src/event/match-event.gateway';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MatchSimulatorService } from 'src/simulator/match-sumulator.service';

@Module({
  controllers: [MatchesController],
  providers: [MatchesService, MatchEventsGateway, SupabaseService, MatchSimulatorService], // ← add gateway if injecting
  exports: [MatchesService], // so simulator can use it
})
export class MatchesModule {}