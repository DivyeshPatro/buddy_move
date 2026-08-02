import { Module } from '@nestjs/common';
import { WebsocketController } from './websocket.controller';
import { WebsocketService } from './websocket.service';

@Module({
  controllers: [WebsocketController],
  providers: [WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
