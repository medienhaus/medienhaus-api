import { Dependencies, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as _ from 'lodash'
import { HttpService } from '@nestjs/axios'
import { ItemService } from './item.service.js'

@Injectable()
@Dependencies(ConfigService, HttpService, ItemService)
export class PostService {
  constructor (configService, httpService, matrixClient, items, strucutre, allSpaces, _allRawSpaces) {
    this.configService = configService
    this.httpService = httpService
    this.matrixClient = matrixClient

    this.items = items
    this.structure = strucutre

    this.allSpaces = allSpaces
    this._allRawSpaces = _allRawSpaces
  }

  _getParentsOfId (id) {
    const idSpace = this.allSpaces[id]

    if (!idSpace || !idSpace?.parents || !idSpace?.parents.length > 0) return

    return idSpace?.parents.map((parent) => parent.room_id)
  }

  async postFetch (id, options) {
    return await this._updatedId(id, options)
  }

  async deleteFetch (id, options) {
    const spaceAbstract = this.getAbstract(id)
    const spaceRaw = this._allRawSpaces[id]
    const spaceItems = this.items[id]
    const spaceAllSpaces = this.allSpaces[id]
    delete this.graphQlCache[id]

    if (!spaceRaw || !spaceAbstract || !spaceAllSpaces) {
      return
    }

    // TODO: adding auth function

    // checking if space is already removed at parents via synapse
    const liveParents = await this._getChildrenOfParents(options?.parentIds)
    if (!liveParents) return { status: 'matrix parent not found' }
    if (liveParents?.error) {
      return { status: '' + liveParents.error + ' not found in matrix' }
    } //  custom error response for specific room id
    const deleted = _.map(liveParents, (parent) => {
      return parent.some((room) => room === id)
    })
    if (deleted.some((p) => p)) {
      return { status: 'not in matrix deleted' }
    }

    // modify parents
    const parents = this._getParentsOfId(id)
    // and stateEvents of parents
    parents?.forEach((parent) => {
      // check if purge from all parent or just specific ones
      if (!options?.purge) {
        if (!options?.parentIds.some((p) => p === parent)) {
          // if parent is not included in parentIds from the call then this will not be deleted
          return
        }
      }
      //   stateEvents of parents of RawSpaces
      if (this._allRawSpaces[parent]) {
        this._allRawSpaces[parent]?.stateEvents.forEach((stateEvent, i) => {
          if (stateEvent.state_key === id) {
            this._allRawSpaces[parent].stateEvents.splice(i, 1)
          }
        })
        //  modify children_state of RawSpaces
        this._allRawSpaces[parent]?.children_state.forEach(
          (childStateEvent, i) => {
            if (childStateEvent.state_key === id) {
              this._allRawSpaces[parent].children_state.splice(i, 1)
            }
          }
        )
      }

      // modify children key of AllSpaces
      if (this.allSpaces[parent]) {
        this.allSpaces[parent]?.children.forEach((child, i) => {
          if (child === id) {
            this.allSpaces[parent]?.children.splice(i, 1)
          }
        })
      }
      // modify childre key of items
      if (this.items[parent]) {
        this.items[parent]?.children.forEach((child, i) => {
          if (child === id) {
            this.items[parent]?.children.splice(i, 1)
          }
        })
      }
    })

    // modify children
    // -> can be skipped since no entry point to deliver the children of the given id anymore

    // modify tree
    this._findAndDeleatInStrucutre(
      id,
      Object.values(this.structure)[0],
      [Object.keys(this.structure)[0]],
      options
    )

    if (options?.purge) {
      // purge objects of given id
      if (this._allRawSpaces[id]) delete this._allRawSpaces[id]
      if (this.items[id]) delete this.items[id]
      if (this.allSpaces[id]) delete this.allSpaces[id]
      return { status: 'purged' }
    } else {
      // if not purged then modifing the parentes keys of the given id object which it got deleted from
      if (this._allRawSpaces[id]) {
        _.remove(this._allRawSpaces[id]?.parents, (p) =>
          options?.parentIds.some((pI) => p.room_id === pI)
        )
      }

      if (this.allSpaces[id]) {
        _.remove(this.allSpaces[id]?.parents, (p) =>
          options?.parentIds.some((pI) => p.room_id === pI)
        )
      }

      if (this.items[id]) {
        _.remove(this.items[id]?.parents, (p) =>
          options?.parentIds.some((pI) => p.room_id === pI)
        )
      }
    }

    return { status: 'deleted' }
  }

  async _getChildrenOfParents (parentIds) {
    const parents = {}
    for await (const [i, parent] of parentIds?.entries()) {
      const matrixReq = await this.matrixClient
        .getRoomHierarchy(parent, this.configService.get('fetch.max'), 1)
        .catch((e) => {})
      if (!matrixReq) return { error: parent }
      const children = _.map(
        _.filter(matrixReq?.rooms, (room) => parent !== room.room_id),
        (room) => room.room_id
      )
      parents[parent] = children
    }
    return parents
  }

  _findAndDeleatInStrucutre (id, structure, path, options) {
    _.forEach(structure?.children, (child) => {
      const tmpPath = [...path]
      tmpPath.push(child.id)
      this._findAndDeleatInStrucutre(id, child, tmpPath, options)
    })

    if (structure.id === id) {
      let pathWay = ''
      path.forEach((p, i) => {
        pathWay += "['" + p + "']" + (i < path.length - 1 ? '.children' : '') // yes I know this is fucking ugly as hell I am also hating myself for this at least a bit
      })
      if (options?.purge) {
        // if purge then delete if in any way
        _.unset(this.structure, pathWay)
      } else {
        if (
          path.length > 0 &&
          options?.parentIds.some((p) => p === path[path.length - 2])
        ) {
          // checks if the found path is part of the partentIds before deleting otherwise will skip
          _.unset(this.structure, pathWay) // this deletes the key
        }
      }
    }
  }

  async _updatedId (id, options) {
    const space = this._findSpace(id)
    delete this.graphQlCache[id]
    if (space && !options.parentId) {
      return await this._applyUpdate(id, options)
    } else {
      return await this._applyUpdate(options?.parentId, options)
    }
  }

  async _applyUpdate (id, options) {
    const startTime = Date.now()
    const max = options.max ? options.max : this.configService.get('fetch.max')
    const depth = options.depth
      ? options.depth
      : this.configService.get('fetch.depth')

    const idsToApplyFullStaeUpdate = []

    const allSpaces = await this.getAllSpaces(id, { max, depth, noLog: true })
    _.forEach(allSpaces, (spaceContent, spaceId) => {
      idsToApplyFullStaeUpdate.push(spaceId)
      const abstract = this.getAbstract(spaceId)
      if (abstract?.parents) idsToApplyFullStaeUpdate.concat(abstract?.parents)
    })

    console.log('Fetched ' + (Date.now() - startTime))
    _.forEach(allSpaces, (ele) => {
      this._allRawSpaces[ele.room_id] = ele
    })
    console.log('Fetched after ' + (Date.now() - startTime))
    const generatedStrucute = this.generateStructure(
      this._allRawSpaces,
      this.configService.get('matrix.root_context_space_id'),
      {}
    )
    const structure = {}
    structure[generatedStrucute.room_id] = generatedStrucute
    console.log('Struct ' + (Date.now() - startTime))
    this.allSpaces = await this.generateAllSpaces(
      this._allRawSpaces,
      { noLog: true },
      idsToApplyFullStaeUpdate
    )
    console.log('Spaces generated ' + (Date.now() - startTime))
    this.structure = structure

    const filtedObjects = _.filter(
      this.allSpaces,
      (space) => space.type === 'item'
    ).map((space) => {
      return { [space.id]: space }
    })

    filtedObjects.forEach((ele) => {
      this.items[Object.keys(ele)[0]] = ele[Object.keys(ele)[0]]
    })
    console.log('End ' + (Date.now() - startTime))
    return this.getAbstract(id)
  }
}
