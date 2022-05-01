import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { ApiV2Controller } from './api_v2.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from '../config'
import { ItemService } from './item.service'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule, HttpService } from '@nestjs/axios'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    HttpModule
  ],
  controllers: [AppController, ApiV2Controller],
  providers: [
    AppService,
    {
      provide: 'ITEM_PROVIDER',
      inject: [ConfigService, HttpService],
      useFactory: async (configService, httpService) => {
        const x = new ItemService(configService, httpService)
        await x.fetch()
        return x
      }
    }
  ]
})
export class AppModule {}
