import { Bind, Controller, Dependencies, Get, Post, Body, Req, Param, NotFoundException, HttpException, HttpStatus } from '@nestjs/common'
import { AppService } from './app.service'

import _ from 'lodash'

import { RestrainService } from './restrain.service'
import { ConfigService } from '@nestjs/config'
@Controller()
@Dependencies(AppService, 'ITEM_PROVIDER', RestrainService, ConfigService)
export class ApiV2Controller {
  constructor (appService, itemService, retraintService, configService) {
    this.appService = appService
    this.itemService = itemService
    this.retraintService = retraintService
    this.configService = configService
  }

  @Get('/api/v2')
  apiV2 () {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getApiConfig()
  }

  @Get('/api/v2/:id')
  @Bind(Param())
  apiV2Get ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    const ret = this.itemService.getAbstract(id)
    if (!ret) throw new NotFoundException()
    return ret
  }

  @Get('/api/v2/:id/path')
  @Bind(Param())
  apiV2GetPath ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getPath(id)
  }

  @Get('/api/v2/:id/pathlist')
  @Bind(Param())
  apiV2GetPathList ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getPathList(id)
  }

  @Get('/api/v2/:id/tree')
  @Bind(Param())
  apiGetTree ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getTree(id)
  }

  @Get('/api/v2/:id/tree/filter/type/context')
  @Bind(Param())
  apiGetTreeFiltedByContext ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getTreeFiltedByContext(id)
  }

  @Get('/api/v2/:id/list')
  @Bind(Param())
  apiGetList ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getList(id)
  }

  @Get('/api/v2/:id/list/filter/allocation/temporal')
  @Bind(Param())
  apiGetFilteredByAllocationsTemporal ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getItemsFilteredByAllocationsTemporal(id)
  }

  @Get('/api/v2/:id/list/filter/user/:userId')
  @Bind(Param())
  apiGetFilteredByUserId ({ id, userId }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getItemsFilteredByUserId(id, userId)
  }

  @Get('/api/v2/:id/list/filter/type/item')
  @Bind(Param())
  apiGetFilteredByItems ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getItemsFilteredByItems(id)
  }

  @Get('/api/v2/:id/detailedList/filter/type/item')
  @Bind(Param())
  apiGetDetailedListFilteredByItems ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getDetailedItemsFilteredByItems(id)
  }

  @Post('/api/v2/:id/detailedList/filter/type/item')
  @Bind(Body(), Param())
  apiPostDetailedListFilteredByItems (body, { id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getDetailedItemsFilteredByItems(id, body?.depth)
  }

  @Get('/api/v2/:id/render/json')
  @Bind(Param())
  apiGetRenderedJson ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getRenderedJson(id)
  }

  /// Stechlin Custom

  @Get('/api/v2/:id/fullTree')
  @Bind(Param())
  apiGetFullTree ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getFullTree(id)
  }

  @Get('/api/v2/:id/fullList')
  @Bind(Param())
  apiGetFullList ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getFullList(id)
  }

  @Get('/api/v2/:id/fullList/filter/type/item')
  @Bind(Param())
  apiGetItemsOfFullListFilteredByItems ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getItemsOfFullListFilteredByItems(id)
  }

  @Get('/api/v2/:id/render/d3')
  @Bind(Param())
  apiGetAbstractAsD3 ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getD3Abstract(id)
  }

  @Get('/api/v2/:id/render/d3/fulltree')
  @Bind(Param())
  apiGetAbstractAsD3Fulltree ({ id }) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getD3FullTree(id)
  }

  @Post('api/v2/:id/fetch')
  @Bind(Body(), Param())
  apiPostFetch (body, params) {
    if (this.configService.get('interfaces.rest_v2') !== true) throw new HttpException('rest api v2 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.postFetch(params.id, { parentId: body?.parentId })
  }

  @Get('/dev/rawSpaces')
  @Bind(Param())
  apiGetRawSpaces () {
    if (this.configService.get('interfaces.dev') !== true) throw new HttpException('rest api dev not enabled', HttpStatus.NOT_FOUND)
    return this.itemService._allRawSpaces
  }

  @Get('/dev/allSpaces')
  @Bind(Param())
  apiGetAllSpaces () {
    if (this.configService.get('interfaces.dev') !== true) throw new HttpException('rest api dev not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.allSpaces
  }

  @Get('/dev/items')
  @Bind(Param())
  apiGetAllItems () {
    if (this.configService.get('interfaces.dev') !== true) throw new HttpException('rest api dev not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.items
  }

  @Get('/dev/users')
  @Bind(Param())
  apiGetAllUsers () {
    if (this.configService.get('interfaces.dev') !== true) throw new HttpException('rest api dev not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.users
  }

  @Get('/dev/structure')
  @Bind(Param())
  apiGetStructure () {
    if (this.configService.get('interfaces.dev') !== true) throw new HttpException('rest api dev not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.structure
  }
}
