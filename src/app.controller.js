import { Bind, Controller, Dependencies, Get, NotFoundException, HttpException, HttpStatus, Param } from '@nestjs/common'
import { AppService } from './app.service'
import { ConfigService } from '@nestjs/config'

@Controller()
@Dependencies(AppService, 'ITEM_PROVIDER', ConfigService)
export class AppController {
  constructor (appService, itemService, configService) {
    this.appService = appService
    this.itemService = itemService
    this.configService = configService
  }

  @Get('/api/v1/getSpace/:id')
  @Bind(Param())
  apiGetSpace ({ id }) {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getSpace(id)
  }

  @Get('/api/v1/all')
  apiGetAll () {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getAll()
  }

  @Get('/api/v1/allSpaces')
  apiGetAllSpaces () {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService._getAllSpaces()
  }

  @Get('/api/v1/allWithLocation')
  apiGetAllWithLocation () {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getAllItemsWithLocation()
  }

  @Get('/api/v1/structure')
  apiGetStructure () {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getStructure({
      filter: ['structure-root',
        'structure-element',
        'context']
    })
  }

  @Get('/api/v1/structureAll')
  apiGetStructureAll () {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getStructure()
  }

  @Get('/api/v1/structureAll')
  apiGetStructureContexts () {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    return this.itemService.getStructureContexts()
  }

  @Get('/api/v1/struct/:id/branch')
  @Bind(Param())
  apiGetBranchById ({ id }) {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    const branch = this.itemService.findId({ id }, this.apiGetStructure(), false)
    if (!branch) throw new NotFoundException()
    return branch
  }

  @Get('/api/v1/struct/:id/flatBranch')
  @Bind(Param())
  apiGetFlatBranchById ({ id }) {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    const branch = this.itemService.findId({ id }, this.apiGetStructure(), true)
    if (!branch) throw new NotFoundException()
    return branch
  }

  @Get('/api/v1/struct/:id/projects')
  @Bind(Param())
  apiGetProjectsByLevel ({ id }) {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    const projects = this.itemService.getProjectsByLevel({ id }, this.apiGetStructure(), true)
    if (!projects) throw new NotFoundException()
    return projects
  }

  @Get('/api/v1/struct/:id/projects/withChildLevels')
  @Bind(Param())
  apiGetProjectsByLevelWithChildLevel ({ id }) {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    const projects = this.itemService.getProjectsByLevel({ id }, this.apiGetStructure(), false)
    if (!projects) throw new NotFoundException()
    return projects
  }

  @Get('/api/v1/:id')
  @Bind(Param())
  async apiGetSingle ({ id }) {
    if (this.configService.get('interfaces.rest_v1') !== true) throw new HttpException('rest api v1 not enabled', HttpStatus.NOT_FOUND)
    const project = await this.itemService.get(id)
    if (!project) throw new NotFoundException()
    return project
  }

  customError (res) {
    res.status(HttpStatus.NOT_FOUND)
    return res.render('de/error.hbs', {})
  }

  customErrorEN (res) {
    res.status(HttpStatus.NOT_FOUND)
    return res.render('en/error.hbs', {})
  }
}
