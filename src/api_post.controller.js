import { Bind, Controller, Dependencies, Delete, Post, Body, Param, NotFoundException } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
@Dependencies(AppService, 'ITEM_PROVIDER')
export class ApiPostController {
  constructor (appService, itemService) {
    this.appService = appService
    this.itemService = itemService
  }

  // POST ROUTES

  @Post('api/v2/:id/fetch')
  @Bind(Body(), Param())
  async apiPostFetch (body, params) {
    if (!this.itemService.configService.get('interfaces.post')) throw new NotFoundException()
    const ret = await this.itemService.postFetch(params.id, { parentId: body?.parentId, depth: body?.depth, max: body?.max })
    if (!ret) throw new NotFoundException()
    return ret
  }

  @Delete('api/v2/:id/fetch')
  @Bind(Body(), Param())
  async apiDeleteFetch (body, params) {
    if (!this.itemService.configService.get('interfaces.post')) throw new NotFoundException()
    const ret = await this.itemService.deleteFetch(params.id, { parentIds: body?.parentIds, purge: body?.purge })
    if (!ret) throw new NotFoundException()
    return ret
  }
}
