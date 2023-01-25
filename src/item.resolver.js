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

    // Initializing custom caching arrays specifically for the graphql data interface.
    // All of this chaos needs to get rid of in the rewrite of this api
    this.itemService.servers = []
    this.itemService.users = []
    this.itemService.contents = []
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
  async servers () {
    console.log((_.map(this.itemService.allSpaces, (space) => space)).length)
    // const servers = [...new Set(_.map(this.itemService.allSpaces, (space) => space))] // filter out all of the double ones
    return this.itemService.servers
  }
}
