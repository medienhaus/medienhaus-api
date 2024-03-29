import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { ApiV2Controller } from './api_v2.controller'
import { ApiPostController } from './api_post.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from '../config'
import { ItemService } from './item.service'
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule'
import { HttpModule, HttpService } from '@nestjs/axios'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ItemResolver } from './item.resolver'
import { join } from 'path'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration]
    }),
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql.js'),
        outputAs: 'class'
      },
      playground: true,
      introspection: true
    }),
    ScheduleModule.forRoot(),
    HttpModule
  ],
  controllers: [AppController, ApiV2Controller, ApiPostController],
  providers: [
    AppService,
    {
      provide: 'ITEM_PROVIDER',
      inject: [ConfigService, HttpService, SchedulerRegistry],
      useFactory: async (configService, httpService, schedulerRegistry) => {
        const x = new ItemService(configService, httpService)
        if (x.configService.get('fetch.initalyLoad')) await x.fetch()

        if (x.configService.get('fetch.interval')) {
          const fetchCallback = async () => {
            await x.fetch()
          }
          const fetchInterval = setInterval(fetchCallback, x.configService.get('fetch.interval') * 1000) // seconds to ms
          schedulerRegistry.addInterval('fetchInterval', fetchInterval)
        }

        return x
      }
    },
    ItemResolver
  ]
})
export class AppModule {}
