import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { ApiV2Controller } from './api_v2.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from '../config'
import { ItemService } from './item.service'
import { ScheduleModule } from '@nestjs/schedule'
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
      playground: true
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
    },
    ItemResolver
  ]
})
export class AppModule {}
