import { Bind, Controller, Dependencies, Post, Body, Param, Delete, NotFoundException, HttpException, HttpStatus, Get } from '@nestjs/common'
import { RestrainService } from './restrain.service'

@Controller()
@Dependencies(RestrainService)
export class ApiRestrainController {
  constructor (restrainService) {
    this.restrainService = restrainService
  }

  // RESTRAIN ROUTES

  @Get('api/v3/restrain')
  apiRestrainList () {
    return this.restrainService.getIds()
  }

  @Post('api/v3/restrain/:id')
  @Bind(Param())
  async apiRestrainPost (params) {
    const id = params.id
    if (!id) throw new HttpException('id not found', HttpStatus.NOT_FOUND)
    return this.restrainService.restrainId(id)
  }

  @Get('api/v3/restrain/timeout')
  apiRestrainTimeout () {
    return this.restrainService.getTimeout()
  }

  @Delete('api/v3/restrain/:id')
  @Bind(Param())
  apiRestrainDelete (params) {
    const id = params.id
    if (!id) throw new HttpException('id not found', HttpStatus.NOT_FOUND)
    return this.restrainService.removeId(id)
  }

  @Get('api/v3/restrain/test')
  apiRestrainTest () {
    return { message: 'test' }
  }
}
