import { Field, Int, ObjectTyp, Resolver, Query, Args, ObjectType } from '@nestjs/graphql'
import { Bind, Dependencies } from '@nestjs/common'
import { AppService } from './app.service'
import _ from 'lodash'

@Resolver('Space')
@Dependencies(AppService, 'ITEM_PROVIDER')
export class ItemResolver {
  constructor (appService, itemService) {
    this.appService = appService
    this.itemService = itemService
  }

  // @Query(returns => String)
  // async hello () {
  //   return 'Hello, World'
  // }

  // @Query()
  // @Bind(Args())
  // async getSpace ({ id }) {
  //   const space = this.itemService.getAbstract(id)
  //   return space
  // }

  @Query()
  async spaces () {
    const spaces = _.map(this.itemService.allSpaces, (space) => space)
    return spaces
  }

  @Query()
  async contexts () {
    return this.itemService.users
  }

  @Query()
  async items () {
    return this.itemService.allSpaces
  }

  @Query()
  async contents () {
    return this.itemService.contents
  }

  @Query()
  @Bind(Args())
  async user ({ id }) {
    return this.itemService.getUser(id)
  }

  @Query()
  async users () {
    return _.map(this.itemService.users, user => this.itemService.getUser(user.id))
  }

  @Query()
  @Bind(Args())
  async server ({ url }) {
    return this.itemService.getServer(url)
  }

  @Query()
  async servers () {
    return _.map(this.itemService.servers, server => this.itemService.getServer(server.url))
  }
}
