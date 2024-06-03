import {
  Field,
  Int,
  ObjectTyp,
  Resolver,
  Query,
  Args,
  ObjectType
} from '@nestjs/graphql'
import { Bind, Dependencies, NotFoundException } from '@nestjs/common'
import { AppService } from './app.service'
import _ from 'lodash'

import { RestrainService } from './restrain.service'
import { ConfigService } from '@nestjs/config'

@Resolver('Space')
@Dependencies(AppService, 'ITEM_PROVIDER', RestrainService, ConfigService)
export class ItemResolver {
  constructor (appService, itemService, restraintService, configService) {
    this.appService = appService
    this.itemService = itemService
    this.configService = configService
    this.restraintService = restraintService
  }

  @Query()
  @Bind(Args())
  async entries ({ template, type }) {
    const ret = this.itemService.convertSpaces(
      this.itemService.getSpaces(template, type)
    )
    return this.configService.get('interfaces.restrain')
      ? this.itemService.filterOutRetrainIds(
        ret,
        this.restraintService.getIdsAsStringArray()
      )
      : ret
  }

  @Query()
  @Bind(Args())
  async entry ({ id }) {
    const ret = this.itemService.convertSpace(id)

    return this.configService.get('interfaces.restrain')
      ? this.itemService.filterOutRetrainIds(
        ret,
        this.restraintService.getIdsAsStringArray()
      )
      : ret
  }

  // META TYPES

  //  CONTEXT

  @Query()
  @Bind(Args())
  async context ({ id }) {
    if (!id) return {}
    const space = this.itemService.convertSpace(id)
    let ret
    if (space && space?.type === 'context') {
      ret = space

      return this.configService.get('interfaces.restrain')
        ? this.itemService.filterOutRetrainIds(
          ret,
          this.restraintService.getIdsAsStringArray()
        )
        : ret
    } else {
      throw new NotFoundException()
    }
  }

  @Query()
  @Bind(Args())
  async contexts ({ pagination, start = 0, offset, template }) {
    const spaces = this.itemService.getSpaces(template, 'context')
    let ret
    if (!pagination) ret = spaces

    if (pagination) {
      if (offset) {
        ret = spaces.slice(start, start + offset)
      } else {
        ret = spaces.slice(start)
      }
    }

    return this.configService.get('interfaces.restrain')
      ? this.itemService.filterOutRetrainIds(
        ret,
        this.restraintService.getIdsAsStringArray()
      )
      : ret
  }

  //  ITEM

  @Query()
  @Bind(Args())
  async items ({ pagination, start = 0, offset, template }) {
    // const spaces = this.itemService.getSpaces(template, 'item', this.itemService.convertSpaces(this.itemService.allSpaces))
    const spaces = this.itemService.convertSpaces(
      this.itemService.getSpaces(template, 'item'),
      true
    )
    let ret
    if (!pagination) ret = spaces

    if (pagination) {
      if (offset) {
        ret = spaces.slice(start, start + offset)
      } else {
        ret = spaces.slice(start)
      }
    }

    console.log(ret)
    return this.configService.get('interfaces.restrain')
      ? this.itemService.filterOutRetrainIds(
        ret,
        this.restraintService.getIdsAsStringArray()
      )
      : ret
  }

  @Query()
  @Bind(Args())
  async item ({ id }) {
    if (!id) return {}
    const space = this.itemService.convertSpace(id)
    let ret
    if (space && space?.type === 'item') {
      ret = space
    } else {
      throw new NotFoundException()
    }

    return this.configService.get('interfaces.restrain')
      ? this.itemService.filterOutRetrainIds(
        ret,
        this.restraintService.getIdsAsStringArray()
      )
      : ret
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
    return _.map(this.itemService.users, (user) =>
      this.itemService.getUser(user.id)
    )
  }

  // SERVER

  @Query()
  @Bind(Args())
  async server ({ url }) {
    return this.itemService.getServer(url)
  }

  @Query()
  async servers () {
    return _.map(this.itemService.servers, (server) =>
      this.itemService.getServer(server.url)
    )
  }
}
