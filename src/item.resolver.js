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

  @Query()
  @Bind(Args())
  async spaces ({ template, type }) {
    return this.itemService.convertSpaces(this.itemService.getSpaces(template, type))
  }

  @Query()
  @Bind(Args())
  async space ({ id }) {
    return this.itemService.convertSpace(id)
  }

  // META TYPES

  //  CONTEXT

  @Query()
  async contexts () {
    return this.itemService.getSpaces(null, 'context')
  }

  // @Query()
  // @Bind(Args())
  // async context ({ id }) {
  //   return this.itemService.getUser(id)
  // }

  //  ITEM

  @Query()
  async items () {
    return this.itemService.getSpaces(null, 'item')
  }

  // @Query()
  // @Bind(Args())
  // async item ({ id }) {
  //   return this.itemService.getUser(id)
  // }

  //  CONTENT

  @Query()
  async contents () {
    return this.itemService.contents
  }

  // @Query()
  // @Bind(Args())
  // async content ({ id }) {
  //   return this.itemService.getUser(id)
  // }

  // USER

  @Query()
  @Bind(Args())
  async user ({ id }) {
    return this.itemService.getUser(id)
  }

  @Query()
  async users () {
    return _.map(this.itemService.users, user => this.itemService.getUser(user.id))
  }

  // SERVER

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
