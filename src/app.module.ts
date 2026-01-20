import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchModule } from './match/match.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [MatchModule, SupabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
