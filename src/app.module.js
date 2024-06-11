import { Module, RequestMethod } from '@nestjs/common'
import { AppController } from './app.controller'
import { ApiV2Controller } from './api_v2.controller'
import { ApiPostController } from './api_post.controller'
import { ApiRestrainController } from './api_restrain.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from '../config'
import { ItemService } from './item.service'
import { RestrainService } from './restrain.service'
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule'
import { HttpModule, HttpService } from '@nestjs/axios'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver } from '@nestjs/apollo'
import { ItemResolver } from './item.resolver'
import { join } from 'path'
import * as fs from 'fs'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import RestrainTokenMiddleware from './restrain-token.middleware'

import { GqlThrottlerGuard } from './GqlThrottlerGuard'

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
      introspection: true,
      context: ({ req, res }) => ({ req, res })
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100
      }
    ])
  ],
  controllers: [
    AppController,
    ApiV2Controller,
    ApiPostController,
    ApiRestrainController
  ],
  providers: [

    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard
    },
    AppService,
    {
      provide: 'ITEM_PROVIDER',
      inject: [ConfigService, HttpService, SchedulerRegistry],
      useFactory: async (configService, httpService, schedulerRegistry) => {
        const x = new ItemService(configService, httpService)
        if (
          fs.existsSync('./dump/dump.json') &&
          configService.get('fetch.dump')
        ) {
          console.log('loading dump')
          const dump = JSON.parse(fs.readFileSync('./dump/dump.json'))
          if (dump) {
            x.allSpaces = dump.allSpaces
            x.items = dump.items
            x.structure = dump.structure
            x._allRawSpaces = dump._allRawSpaces
            x.servers = dump.servers
            x.users = dump.users
            x.contents = dump.contents
          }
          x._generateLocalDepth()
        }
        if (!configService.get('fetch.autoFetch')) return x

        if (x.configService.get('fetch.initalyLoad')) await x.fetch()

        if (x.configService.get('fetch.interval')) {
          const fetchCallback = async () => {
            await x.fetch()
          }
          const fetchInterval = setInterval(
            fetchCallback,
            x.configService.get('fetch.interval') * 1000
          ) // seconds to ms
          schedulerRegistry.addInterval('fetchInterval', fetchInterval)
        }
        x._generateLocalDepth()
        return x
      }
    },
    RestrainService,
    ItemResolver
  ]
})
export class AppModule {
  configure (consumer) {
    consumer
      .apply(RestrainTokenMiddleware)
      .forRoutes({ path: '/api/v3/restrain/*', method: RequestMethod.ALL })
  }
}
