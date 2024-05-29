import { Bind, Controller, Dependencies, Post, Body, Param, Delete, NotFoundException, HttpException, HttpStatus, Get } from '@nestjs/common'
import { RestrainService } from './restrain.service'

import { ConfigService } from '@nestjs/config'
@Controller()
@Dependencies(RestrainService, ConfigService)
export class ApiRestrainController {
  constructor (restrainService, configService) {
    this.restrainService = restrainService
    this.configService = configService
  }

  // RESTRAIN ROUTES

  @Get('api/v3/restrain')
  apiRestrainList () {
    console.log(this.configService.get('interfaces.restrain'))
    if (this.configService.get('interfaces.restrain') !== true) throw new HttpException('restrain not enabled', HttpStatus.NOT_FOUND)
    return this.restrainService.getIds()
  }

  @Post('api/v3/restrain/:id')
  @Bind(Param())
  async apiRestrainPost (params) {
    if (this.configService.get('interfaces.restrain') !== true) throw new HttpException('restrain not enabled', HttpStatus.NOT_FOUND)
    const id = params.id
    if (!id) throw new HttpException('id not found', HttpStatus.NOT_FOUND)
    return this.restrainService.restrainId(id)
  }

  @Get('api/v3/restrain/timeout')
  apiRestrainTimeout () {
    if (this.configService.get('interfaces.restrain') !== true) throw new HttpException('restrain not enabled', HttpStatus.NOT_FOUND)
    return this.restrainService.getTimeout()
  }

  @Delete('api/v3/restrain/:id')
  @Bind(Param())
  apiRestrainDelete (params) {
    if (this.configService.get('interfaces.restrain') !== true) throw new HttpException('restrain not enabled', HttpStatus.NOT_FOUND)
    const id = params.id
    if (!id) throw new HttpException('id not found', HttpStatus.NOT_FOUND)
    return this.restrainService.removeId(id)
  }

  @Get('api/v3/restrain/test')
  apiRestrainTest () {
    if (this.configService.get('interfaces.restrain') !== true) throw new HttpException('restrain not enabled', HttpStatus.NOT_FOUND)
    return { message: 'test' }
  }
}
