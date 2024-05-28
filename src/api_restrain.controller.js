import { Bind, Controller, Dependencies, Post, Body, Param, NotFoundException, HttpException, HttpStatus, Get } from '@nestjs/common'
import { RestrainService } from './restrain.service'

@Controller()
@Dependencies(RestrainService)
export class ApiRestrainController {
  constructor (restrainService) {
    this.restrainService = restrainService
  }

  // RESTRAIN ROUTES

  @Post('api/v3/restrain/:id')
  @Bind(Param())
  async apiRestrainPost (params) {
    console.log(params)
    return
    // if (!this.itemService.configService.get('interfaces.post')) throw new NotFoundException()
    // const ret = await this.itemService.postFetch(params.id, { parentId: body?.parentId, depth: body?.depth, max: body?.max })
    // let ret
    // if (!ret) throw new NotFoundException()
    const id = params.id
    if (!id) throw new HttpException('id not found', HttpStatus.NOT_FOUND)
    return this.restrainService.restrainId(id)
  }

  @Get('api/v3/restrain')
  apiRestrainList () {
    // if (!this.itemService.configService.get('interfaces.post')) throw new NotFoundException()
    // const ret = await this.itemService.deleteFetch(params.id, { parentIds: body?.parentIds, purge: body?.purge })
    // let ret
    // if (!ret) throw new NotFoundException()
    return this.restrainService.getIds()
  }

  @Get('api/v3/restrain/test')
  apiRestrainTest () {
    // if (!this.itemService.configService.get('interfaces.post')) throw new NotFoundException()
    // const ret = await this.itemService.deleteFetch(params.id, { parentIds: body?.parentIds, purge: body?.purge })
    // let ret
    // if (!ret) throw new NotFoundException()
    return this.restrainService.someTest()
  }
}
