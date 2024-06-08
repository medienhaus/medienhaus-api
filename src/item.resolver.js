import {
  Resolver,
  Query,
  Args
} from '@nestjs/graphql'
import { Bind, Dependencies, NotFoundException } from '@nestjs/common'
import { AppService } from './app.service'
import _ from 'lodash'

import { RestrainService } from './restrain.service'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'

@Resolver('Space')
@Dependencies(AppService, 'ITEM_PROVIDER', RestrainService, ConfigService)
export class ItemResolver {
  constructor (appService, itemService, restraintService, configService) {
    this.appService = appService
    this.itemService = itemService
    this.configService = configService
    this.restraintService = restraintService
  }

  @Throttle(10, 60)
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

  @Throttle(10, 60)
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

  @Throttle(10, 60)
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

  @Throttle(10, 60)
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

  @Throttle(10, 60)
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

    return this.configService.get('interfaces.restrain')
      ? this.itemService.filterOutRetrainIds(
        ret,
        this.restraintService.getIdsAsStringArray()
      )
      : ret
  }

  @Throttle(10, 60)
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

  @Throttle(10, 60)
  @Query()
  async contents () {
    return this.itemService.contents
  }

  @Throttle(10, 60)
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

  @Throttle(10, 60)
  @Query()
  @Bind(Args())
  async user ({ id }) {
    const ret = this.itemService.getUser(id)
    return (this.configService.get('interfaces.restrain')) ? this.itemService.filterOutRetrainIds(ret, this.restraintService.getIdsAsStringArray()) : ret
  }

  @Throttle(10, 60)
  @Query()
  async users () {
    return _.map(this.itemService.users, (user) => {
      const ret = this.itemService.getUser(user.id)
      return (this.configService.get('interfaces.restrain')) ? this.itemService.filterOutRetrainIds(ret, this.restraintService.getIdsAsStringArray()) : ret
    }
    )
  }

  // SERVER

  @Throttle(10, 60)
  @Query()
  @Bind(Args())
  async server ({ url }) {
    return this.itemService.getServer(url)
  }

  @Throttle(10, 60)
  @Query()
  async servers () {
    return _.map(this.itemService.servers, (server) =>
      this.itemService.getServer(server.url)
    )
  }
}
