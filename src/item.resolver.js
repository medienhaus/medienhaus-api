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
  async entries ({ template, type }) {
    return this.itemService.convertSpaces(this.itemService.getSpaces(template, type))
  }

  @Query()
  @Bind(Args())
  async entry ({ id }) {
    return this.itemService.convertSpace(id)
  }

  // META TYPES

  //  CONTEXT

  @Query()
  @Bind(Args())
  async context ({ id }) {
    if (!id) return {}
    const space = this.itemService.convertSpace(id)
    if (space && space?.type === 'context') {
      return space
    } else {
      return {}
    }
  }

  @Query()
  async contexts () {
    return this.itemService.getSpaces(null, 'context')
  }

  //  ITEM

  @Query()
  @Bind(Args())
  async items ({ pagination, start = 0, offset }) {
    const spaces = this.itemService.getSpaces(null, 'item')
    if (!pagination) return spaces

    if (offset) {
      return spaces.slice(start, offset)
    } else {
      return spaces.slice(start)
    }
  }

  @Query()
  @Bind(Args())
  async item ({ id }) {
    if (!id) return {}
    const space = this.itemService.convertSpace(id)
    if (space && space?.type === 'item') {
      return space
    } else {
      return {}
    }
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

  @Query()
  @Bind(Args())
  async content ({ id }) {
    return {}
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
