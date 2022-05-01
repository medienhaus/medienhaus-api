import { Bind, Controller, Dependencies, Get, NotFoundException, HttpException, HttpStatus, Param  } from '@nestjs/common'
import { AppService } from './app.service'

import _ from 'lodash'

@Controller()
@Dependencies(AppService, 'ITEM_PROVIDER')
export class AppController {
  constructor (appService, itemService) {
    this.appService = appService
    this.itemService = itemService
  }





  @Get('/api/v1/getSpace/:id')
  @Bind(Param())
  apiGetSpace ({ id }) {
    return this.itemService.getSpace(id)
  }

  @Get('/api/v1/all')
  apiGetAll () {
    return this.itemService.getAll()
  }

  @Get('/api/v1/allSpaces')
  apiGetAllSpaces () {
    return this.itemService.getAllSpaces()
  }

  @Get('/api/v1/allWithLocation')
  apiGetAllWithLocation () {
    return this.itemService.getAllItemsWithLocation()
  }

  @Get('/api/v1/structure')
  apiGetStructure () {
    return this.itemService.getStructure({
      filter: ['structure-root',
        'structure-element',
        'context']
    })
  }

  @Get('/api/v1/structureAll')
  apiGetStructureAll () {
    return this.itemService.getStructure()
  }

  @Get('/api/v1/structureAll')
  apiGetStructureContexts () {
    return this.itemService.getStructureContexts()
  }

  @Get('/api/v1/struct/:id/branch')
  @Bind(Param())
  apiGetBranchById ({ id }) {
    const branch = this.itemService.findId({ id }, this.apiGetStructure(), false)
    if (!branch) throw new NotFoundException()
    return branch
  }

  @Get('/api/v1/struct/:id/flatBranch')
  @Bind(Param())
  apiGetFlatBranchById ({ id }) {
    const branch = this.itemService.findId({ id }, this.apiGetStructure(), true)
    if (!branch) throw new NotFoundException()
    return branch
  }

  @Get('/api/v1/struct/:id/projects')
  @Bind(Param())
  apiGetProjectsByLevel ({ id }) {
    const projects = this.itemService.getProjectsByLevel({ id }, this.apiGetStructure(), true)
    if (!projects) throw new NotFoundException()
    return projects
  }

  @Get('/api/v1/struct/:id/projects/withChildLevels')
  @Bind(Param())
  apiGetProjectsByLevelWithChildLevel ({ id }) {
    const projects = this.itemService.getProjectsByLevel({ id }, this.apiGetStructure(), false)
    if (!projects) throw new NotFoundException()
    return projects
  }

  @Get('/api/v1/:id')
  @Bind(Param())
  async apiGetSingle ({ id }) {
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
