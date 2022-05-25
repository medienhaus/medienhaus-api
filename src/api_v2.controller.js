import { Bind, Controller, Dependencies, Get, Post, Body, Req, Param, NotFoundException, HttpException, HttpStatus } from '@nestjs/common'
import { AppService } from './app.service'

import _ from 'lodash'

@Controller()
@Dependencies(AppService, 'ITEM_PROVIDER')
export class ApiV2Controller {
  constructor (appService, itemService) {
    this.appService = appService
    this.itemService = itemService
  }

  @Get('/api/v2')
  apiV2 () {
    return this.itemService.getApiConfig()
  }

  @Get('/api/v2/:id')
  @Bind(Param())
  apiV2Get ({ id }) {
    return this.itemService.getAbstract(id)
  }

  @Get('/api/v2/:id/path')
  @Bind(Param())
  apiV2GetPath ({ id }) {
    return this.itemService.getPath(id)
  }

  @Get('/api/v2/:id/tree')
  @Bind(Param())
  apiGetTree ({ id }) {
    return this.itemService.getTree(id)
  }

  @Get('/api/v2/:id/list')
  @Bind(Param())
  apiGetList ({ id }) {
    return this.itemService.getList(id)
  }

  // @Get('/api/v2/:id/filter/:filter')
  // @Bind(Param())
  // apiGetFiltered ({ id, filter }) {
  //   return this.itemService.getSpace(id)
  // }

  // @Get('/api/v2/:id/filter/:filter')
  // @Bind(Param())
  // apiGetFiltered ({ id, filter }) {
  //   return this.itemService.getSpace(id)
  // }

  // @Get('/api/v2/:id/filter/allocations/physical')
  // @Bind(Param())
  // apiGetFiltered ({ id, filter }) {
  //   return this.itemService.getSpace(id)
  // }

  @Get('/api/v2/:id/filter/allocation/temporal')
  @Bind(Param())
  apiGetFilteredByAllocationsTemporal ({ id }) {
    return this.itemService.getItemsFilteredByAllocationsTemporal(id)
  }

  @Get('/api/v2/:id/filter/user/:userId')
  @Bind(Param())
  apiGetFilteredByUserId ({ id, userId }) {
    return this.itemService.getItemsFilteredByUserId(id, userId)
  }

  @Get('/api/v2/:id/filter/item')
  @Bind(Param())
  apiGetFilteredByItems ({ id }) {
    return this.itemService.getItemsFilteredByItems(id)
  }

  @Get('/api/v2/:id/render/json')
  @Bind(Param())
  apiGetRenderedJson ({ id }) {
    return  this.itemService.getRenderedJson(id)
  }

  /// Stechlin Custom

  @Get('/api/v2/:id/fullTree')
  @Bind(Param())
  apiGetFullTree ({ id }) {
    return this.itemService.getFullTree(id)
  }

  @Post('api/v2/:id/fetch')
  @Bind(Body(), Param())
  apiPostFetch (body, params) {
    return this.itemService.postFetch(params.id, { parentId: body?.parentId })
  }
}