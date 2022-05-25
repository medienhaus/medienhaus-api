import { Dependencies, Injectable, Logger } from '@nestjs/common'
import { createClient as createMatrixClient } from 'matrix-js-sdk'
import { ConfigService } from '@nestjs/config'
import * as _ from 'lodash'
import { Interval } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import Handlebars from 'handlebars'
import fs from 'fs'
import { join } from 'path'
import moment from 'moment'
import { template } from 'lodash'

@Injectable()
@Dependencies(ConfigService, HttpService)
export class ItemService {
  constructor (configService, httpService) {
    this.configService = configService
    this.httpService = httpService
    this.items = {}
    this.structure = {}

    this.structure = {}
    this.allSpaces = {}
    this._allRawSpaces = {}
  }

  @Interval(30 * 60 * 1000) // Call this every 30 minutes
  async fetch () {
    Logger.log('Fetching items...')

    const configService = this.configService
    const httpService = this.httpService

    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    let batchCounter = 0

    async function getBatch (spaceId, options, batch, hirachy) {
      batchCounter++
      Logger.log('batch:\t' + batchCounter)
      // console.log(await matrixClient.getRoomHierarchy("!YCztLjuiNnMHWFPUVP:stechlin-institut.ruralmindshift.org", options.max, options.depth))
      const hierarchyBatch = batch ? await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth, false, batch) : await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth)
      //! hierarchyBatch.next_batch ? hirachy :
      hirachy.push(...hierarchyBatch.rooms)
      if (!hierarchyBatch?.next_batch) {
        return hirachy
      } else {
        const getMoreRooms = await getBatch(spaceId, options, hierarchyBatch?.next_batch, hirachy)
      //  console.log(getMoreRooms)
      }
      return hirachy
    }

    async function getAllSpaces (spaceId, options) {
      //  let hierarchy = {}

      // const hierarchy = await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth)

      const hierarchy = {}

      hierarchy.rooms = await getBatch(spaceId, options, false, [])

      //  const batch1 = await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth, false)

      //  console.log(batch1.next_batch)

      //  const batch2 =  await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth, false, batch1.next_batch)

      //  console.log(batch2)

      //    console.log(newHirachy)
      const ret = {}

      hierarchy?.rooms.forEach(space => {
        ret[space.room_id] = space
      })
      Logger.log(Object.keys(ret).length)
      for await (const [i, space] of hierarchy?.rooms.entries()) {
        // await Promise.all(hierarchy?.rooms.map(async (space) => {

        const stateEvents = await matrixClient.roomState(space?.room_id).catch((e) => { console.log(space?.room_id) })
        if (stateEvents?.some(state => state.type === 'dev.medienhaus.meta')) {
          ret[space?.room_id].stateEvents = stateEvents
        }
        await new Promise(r => setTimeout(r, 1))
        Logger.log('get stateEvents:\t' + i + '/' + hierarchy?.rooms.length)
      // }))
      }
      return ret
    }

    function generateStructure (spaces, spaceId, structure) {
      const space = _.find(spaces, { room_id: spaceId })
      if (space) {
        const children = {}
        space?.children_state.forEach(childrenState => {
          const ret = generateStructure(spaces, childrenState.state_key, structure)
          if (ret) {
            if (_.find(_.find(spaces, space => space.room_id === ret.room_id).stateEvents, { type: 'dev.medienhaus.meta' })) {
              children[ret.room_id] = ret
            }
          }
        })
        const metaEvent = _.find(space.stateEvents, { type: 'dev.medienhaus.meta' })
        // if (filter.some(f => f === metaEvent?.content?.type)) { return { name: space.name, room_id: space.room_id, type: metaEvent?.content?.type, children: children } }
        return { name: space.name, room_id: space.room_id, id: space.room_id, type: metaEvent?.content?.type, template: metaEvent?.content?.template, children: children }
      }
    }

    async function generateAllSpaces (rawSpaces) {
      const ret = {}

      // await Promise.all(_.map(rawSpaces, async (space,i) => {
      for await (const [i, s] of Object.keys(rawSpaces).entries()) {
        const space = rawSpaces[s]
        const extendedData = await getStateData(space.stateEvents, space.room_id, rawSpaces)
        if (extendedData) {
          ret[space.room_id] = { id: space.room_id, ...extendedData }
        }
        await new Promise(r => setTimeout(r, 10))
        Logger.log('get members:\t' + i + '/' + Object.keys(rawSpaces).length)
        //  }))
      }

      return ret
    }

    async function getStateData (stateEvents, spaceId, rawSpaces) {
      const metaEvent = _.find(stateEvents, { type: 'dev.medienhaus.meta' })
      //   if (!metaEvent) console.log(spaceId)
      if (!metaEvent) return
      const nameEvent = _.find(stateEvents, { type: 'm.room.name' })
      if (!nameEvent) return
      const allocationEvent = _.find(stateEvents, { type: 'dev.medienhaus.allocation' })
      const joinRulesEvent = _.find(stateEvents, { type: 'm.room.join_rules' })

      const parent = {}

      _.forEach(rawSpaces, space => {
        const children = (_.filter(space.stateEvents, event => event.type === 'm.space.child'))

        _.forEach(children, child => {
          if (child?.state_key === spaceId) {
            parent.name = space.name
            parent.room_id = space.room_id
          }
        })
      })

      let published
      let topicEn
      let topicDe
      let authorNames
      const authors = []

      let type

      const members = []

      const children = []

      const joinedMembers = await matrixClient.getJoinedRoomMembers(spaceId).catch((e) => { console.log(spaceId) })

      for (const [key, value] of Object.entries(joinedMembers?.joined)) {
        members.push({ id: key, name: value.display_name })
        authors.push({ id: key, name: value.display_name })
      }

      if (metaEvent?.content?.template !== 'lang' && !(configService.get('attributable.spaceTypes.content').some(f => f === metaEvent?.content?.template))) {
        const potentialChildren = stateEvents.filter(event => event.type === 'm.space.child').map(child => child.state_key).map(id => {
          const r = _.find(rawSpaces, rawSpace => rawSpace.room_id === id)
          return r
        }
        )

        _.forEach(potentialChildren, child => {
          if (_.find(child?.stateEvents, { type: 'dev.medienhaus.meta' })) {
            children.push(child.room_id)
          //  console.log(child.room_id)
          }
        })

        if (
          configService.get('attributable.spaceTypes.item').some(f => f === metaEvent?.content?.template) &&
        (metaEvent.content.published ? metaEvent.content.published === 'public' : (joinRulesEvent && joinRulesEvent.content.join_rule === 'public'))
        ) {
          published = 'public'

          const languageSpaceIds = (stateEvents.filter(event => event.type === 'm.space.child').map(child => child.state_key))
          if (!languageSpaceIds) {
          //  console.log('bing')
            return
          }
          const languageSpaces = languageSpaceIds.map(languageSpace => {
            return _.find(rawSpaces, room => room.room_id === languageSpace)
          })
          if (!languageSpaces) {
            // console.log('bing')
            return
          }
          // fetch descriptions
          const en = languageSpaces.filter(room => room?.name === 'en')
          topicEn = en[0].topic || undefined
          const de = languageSpaces.filter(room => room?.name === 'de')
          topicDe = de[0]?.topic || undefined
          // fetch authors aka. collaborators
          authorNames = []

          for (const [key, value] of Object.entries(joinedMembers?.joined)) {
            authorNames.push(value.display_name)
          }
        } else {
          if (!configService.get('attributable.spaceTypes.context').some(f => f === metaEvent?.content?.template)) {
            published = 'draft'
          } else {
            // const potentialChildren = stateEvents.filter(event => event.type === 'm.space.child').map(child => child.state_key).map(id => {
            //   const r = _.find(rawSpaces, rawSpace => rawSpace.room_id === id)
            //   return r
            // }
            // )

            // _.forEach(potentialChildren, child => {
            //   if (_.find(child?.stateEvents, { type: 'dev.medienhaus.meta' })) {
            //     children.push(child.room_id)
            //   //  console.log(child.room_id)
            //   }
            // })
          }
        }
      } else {
        return
      }

      const spaceName = nameEvent.content.name

      const avatar = _.find(stateEvents, { type: 'm.room.avatar' })

      if (metaEvent?.content?.deleted) return
      return {
        name: spaceName,
        template: metaEvent?.content?.template,
        topicEn: topicEn,
        type: metaEvent?.content?.type,
        topicDe: topicDe,
        parent: parent.name,
        parentSpaceId: parent.room_id,
        authors: authors,
        members: members,
        published: published,
        children: children,
        allocation: { physical: allocationEvent?.content?.physical, temporal: allocationEvent?.content?.temporal },
        thumbnail: avatar?.content.url ? matrixClient.mxcUrlToHttp(avatar?.content.url, 800, 800, 'scale') : '',
        thumbnail_full_size: avatar?.content.url ? matrixClient.mxcUrlToHttp(avatar?.content.url) : ''
      }
    }

    const allSpaces = await getAllSpaces(this.configService.get('matrix.root_context_space_id'), { max: this.configService.get('fetch.max'), depth: this.configService.get('fetch.depth') })
    Logger.log(`Found ${Object.keys(allSpaces).length} spaces`)
    const generatedStrucute = generateStructure(allSpaces, this.configService.get('matrix.root_context_space_id'), {})
    const structure = {}
    structure[generatedStrucute.room_id] = generatedStrucute
    this._allRawSpaces = allSpaces
    this.allSpaces = await generateAllSpaces(allSpaces)
    this.structure = structure

    // console.log(_.find(this._allRawSpaces,space => space.room_id === '!klLhNzPtFJxaLFQJKB:stechlin-institut.ruralmindshift.org'))

    const filtedObjects = _.filter(this.allSpaces, space => space.type === 'item').map(space => { return { [space.id]: space } })

    filtedObjects.forEach(ele => {
      this.items[Object.keys(ele)[0]] = ele[Object.keys(ele)[0]]
    })

    Logger.log(`Found ${Object.keys(this.items).length} items`)
  }

  applyFilterToStructure (structure, filter, ret) {
    Object.entries(structure).forEach(([key, content]) => {
      if (filter.some(f => f === content?.template)) {
        Object.entries(content.children).forEach(([key2, content2]) => {
          structure[key].children[key2] = this.applyFilterToStructure({ [key2]: content2 }, filter)[key2]
        })
      } else {
        delete structure[key]
      }
    })
    return structure
  }

  getStructure (options) {
    if (options?.filter) {
      // console.log(options)
      // return this.applyFilterToStructure(this.structure, options.filter)
      return JSON.parse(JSON.stringify(this.applyFilterToStructure(this.structure, options.filter))) // apping parsing/stringify to getting rid of weird undefined object
    } else {
      return this.structure
    }
  }

  getAllSpaces () {
    return this.allSpaces
  }

  getAll () {
    return this.items
  }

  getStructureElementById (id, tree) {
    return this.getStructureElementByIdFunction(id.id, tree)
  }

  getSpace (id) {
    return _.find(this.allSpaces, space => space.id === id)
  }

  getAllItemsWithLocation () {
    const ret = {}
    Object.entries(this.getAll()).forEach(([key, content]) => {
      if (content?.locations) {
        ret[key] = content
      }
    })
    return ret
  }

  getStructureElementByIdFunction (id, tree) {
    let ret
    Object.entries(tree).forEach(([key, content]) => {
      if (key === id) {
        ret = content
      } else {
        if (content.children && Object.keys(content.children).length > 0) {
          Object.entries(content.children).forEach(([childKey, childContent]) => {
            const res = this.getStructureElementByIdFunction(id, { [childKey]: childContent })
            if (res) {
              ret = res
            }
          })
        }
      }
    })
    return ret
  }

  getStrucureElementByIdFilteredOutEmptyOnes (level, tree) {
    const ret = { ...level }
    if (Object.keys(ret.children).length === 0) {
      delete ret.children
      return ret
    }
    Object.entries(level.children).forEach(([key, content]) => {
      const projects = this.getProjectsByLevel({ id: key }, tree, false)
      if (Object.keys(projects).length === 0) {
        delete ret.children[key]
      }
    })
    return ret
  }

  getByContextSpaceIds (contextSpaceIds) {
    return _.filter(this.items, content => contextSpaceIds.includes(content.parentSpaceId))
  }

  // Return all student projects that happen at a given location
  getByLocation (lat, lng) {
    return _.filter(this.items, (project) =>
      _.some(project.events, (event) =>
        _.some(event, (eventProperty) =>
          eventProperty.name === 'location' && _.some(eventProperty.content, (content) =>
            _.startsWith(content, `${lat}, ${lng}-`)
          )
        )
      )
    )
  }

  findId (mainId, tree, flat) {
    let ret
    Object.entries(tree).forEach(([key, content]) => {
      const branch = this.searchLevel(mainId.id, { [key]: content }, {})
      if (flat) {
        const flatTree = this.flattenTree({ treeSection: branch, flattened: [] })
        if (flatTree && flatTree.flattened) {
          ret = flatTree.flattened
        }
      } else {
        ret = branch
      }
    })
    return ret
  }

  flattenTree (data) {
    Object.entries(data.treeSection).forEach(([key, content]) => {
      const tmp = { id: content.id, name: content.name }
      data.flattened.push(tmp)
      data.treeSection = content.child
      if (data.treeSection) {
        this.flattenTree(data)
      }
    })
    return data
  }

  searchLevel (id, level, parent) {
    let ret
    Object.entries(level).forEach(([key, content]) => {
      if (key === id) {
        ret = { [parent.id]: { id: parent.id, name: parent.name, child: { [id]: { id: id, name: content.name } } } }
      } else {
        if (content.children && Object.keys(content.children).length > 0) {
          Object.entries(content.children).forEach(([childK, childC]) => {
            const r = this.searchLevel(id, { [childK]: childC }, { id: key, name: content.name })
            if (r) {
              if (parent.id && Object.keys(parent.id).length > 0) {
                ret = { [parent.id]: { id: parent.id, name: parent.name, child: r } }
              } else {
                ret = r
              }
            }
          })
        }
      }
    })
    return (ret)
  }

  getProjectsByLevel (levelId, tree, onlyCurrentLevel) {
    let matchingProjects = {}
    if (onlyCurrentLevel) {
      Object.entries(this.items).forEach(([key, content]) => {
        if (content.parentSpaceId === levelId.id) {
          //   console.log(content.parentSpaceId)
          matchingProjects[key] = content
        }
      })
    } else {
      matchingProjects = { ...this.collectingProjectsFromCollectedChildren(levelId, tree) }
    }
    return matchingProjects
  }

  collectingProjectsFromCollectedChildren (entryId, tree) {
    const matchingProjects = {}
    Object.entries(tree).forEach(([key, content]) => {
      const collectedChildren = this.searchLevelforAllChildren(entryId.id, { [key]: content })
      if (!collectedChildren) {
      //  console.log(key)
        // return
      }
      Object.entries(collectedChildren).forEach(([childrenKey, childrenContent]) => {
        Object.entries(this.getAll()).forEach(([projectKey, projectContent]) => {
          if (projectContent.parentSpaceId === childrenKey) {
            matchingProjects[projectKey] = projectContent
          }
        })
      })
    })
    return matchingProjects
  }

  searchLevelforAllChildren (id, level) {
    let ret
    //  console.log(id)
    Object.entries(level).forEach(([key, content]) => {
      if (!content) {
        return key
      }
      if (key === id) {
        const foundChildrenInTreeSection = this.collectingChildrenFromEntryPoint(content, {})
        ret = { ...foundChildrenInTreeSection }
      } else {
        // console.log(key + '\t' + content)
        if (content.children && Object.keys(content.children).length > 0) {
          Object.entries(content.children).forEach(([childK, childC]) => {
            const res = this.searchLevelforAllChildren(id, { [childK]: childC })
            if (res)ret = res
          })
        }
      }
    })
    return (ret)
  }

  collectingChildrenFromEntryPoint (treeSection, foundChildren) {
    foundChildren[treeSection.id] = { id: treeSection.id, name: treeSection.name }
    if (treeSection.children && Object.keys(treeSection.children).length > 0) {
      Object.entries(treeSection.children).forEach(([key, content]) => {
        const dataFromNewLevel = this.collectingChildrenFromEntryPoint(content, foundChildren)
        foundChildren = { ...foundChildren, ...dataFromNewLevel }
      })
    }
    return foundChildren
  }

  async get (id, language = 'en') {
    if (!this.items[id]) {
      return null
    }
    const { content, formattedContent } = await this.getContent(id, language)
    return { ...this.items[id], content, formatted_content: formattedContent }
  }

  async getContent (projectSpaceId, language) {
    const contentBlocks = await this.getContentBlocks(projectSpaceId, language)
    if (!contentBlocks) return
    return {
      content: contentBlocks,
      formattedContent: Object.keys(contentBlocks).map(index => contentBlocks[index].formatted_content).join('')
    }
  }

  async getContentBlocks (projectSpaceId, language) {
    const result = {}
    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    // Get the spaces for the available languages
    const languageSpaces = {}
    const spaceSummary = await matrixClient.getRoomHierarchy(projectSpaceId, 100, 100)

    spaceSummary.rooms.map(languageSpace => {
      if (languageSpace.room_id === projectSpaceId) return
      languageSpaces[languageSpace.name] = languageSpace.room_id
    })

    if (!languageSpaces[language]) return

    // Get the actual content block rooms for the given language
    const contentRooms = await matrixClient.getRoomHierarchy(languageSpaces[language], 100, 100)

    // console.log(contentRooms)
    await Promise.all(contentRooms.rooms.map(async (contentRoom) => {
      // Skip the language space itself
      if (contentRoom.room_id === languageSpaces[language]) return

      // Get the last message of the current content room
      const lastMessage = (await this.httpService.axiosRef(this.configService.get('matrix.homeserver_base_url') + `/_matrix/client/r0/rooms/${contentRoom.room_id}/messages`, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + this.configService.get('matrix.access_token') },
        params: {
          // @TODO Skip deleted messages
          limit: 1,
          dir: 'b',
          // Only consider m.room.message events
          filter: JSON.stringify({ types: ['m.room.message'] })
        }
      })).data.chunk[0]

      if (!lastMessage) return

      const type = contentRoom.name.substring(contentRoom.name.indexOf('_') + 1)
      const content = (() => {
        switch (type) {
          case 'audio':
          case 'image':
            return matrixClient.mxcUrlToHttp(lastMessage.content.url)
          default: return lastMessage.content.body
        }
      })()
      const formattedContent = (() => {
        switch (type) {
          // For text, ul and ol we just return whatever's stored in the Matrix event's formatted_body
          case 'text':
          case 'ul':
          case 'ol':
            return lastMessage.content.formatted_body
          // For all other types we render the HTML using the corresponding Handlebars template in /views/contentBlocks
          default: return Handlebars.compile(fs.readFileSync(join(__dirname, '..', 'views', 'contentBlocks', `${type}.hbs`), 'utf8'))({
            content,
            matrixEventContent: lastMessage.content
          })
        }
      })()

      // Append this content block's data to our result set
      result[contentRoom.name.substring(0, contentRoom.name.indexOf('_'))] = {
        type,
        content,
        formatted_content: formattedContent
      }
    }))

    return result
  }

  /// /// API V2

  getApiConfig () {
    return {
      rootId: Object.keys(this.getStructure())[0],
      ...this.configService.get('application'),
      ...this.configService.get('fetch'),
      ...this.configService.get('attributable')

    }
  }

  getAbstract (id) {
    const space = this._findSpace(id)
    if (!space) return

    const rawSpace = _.find(this._allRawSpaces, { room_id: id })
    const parents = []
    if (space?.parentSpaceId) {
      parents.push(space?.parentSpaceId)
    }

    console.log(space.children)

    return {
      id: id,
      allocation: space?.allocation,
      type: space?.type,
      name: space?.name,
      template: space?.template,
      thumbnail: space?.thumbnail,
      thumbnail_full_size: space?.thumbnail_full_size,
      origin: {
        applications: [],
        server: [space.id.split(':')[1]],
        authors: space.authors,
        members: space.members
      },
      description: {
        default: _.find(rawSpace.stateEvents, (event) => event.type === 'm.room.topic')?.content?.topic,
        EN: space?.topicEn,
        DE: space?.topicDe
      },
      parents: parents,
      localDepth: 'todo',
      ...this._abstractTypes(this._sortChildren(space.children)) // seems to return the wrong spaces, fixing later
    }
  }

  getPath (id) {
    // console.log(this._findPath(this.structure[this.configService.get('matrix.root_context_space_id')], id, {}))

    const path = this._findPath(Object.values(this.structure)[0], id, {})

    if (path) {
      const parent = { ...Object.values(this.structure)[0] }
      delete parent.children

      return { [Object.keys(this.structure)[0]]: { ...parent, children: path } }
    }
  }

  getTree (id) {
    return this._findSubTree(this.getStructure({
      filter: this.configService.get('attributable.matrix.context')
    })[this.configService.get('matrix.root_context_space_id')], id)
  }

  getList (id) {
    return this._generateList(this.getTree(id), [])
  }

  _generateList (structure, list) {
    if (structure.type && structure.template && !list.some(f => f.id === structure.id)) {
      // list.push({ [structure.room_id]: { name: structure.name, room_id: structure.room_id, template: structure.template, type: structure.type } })
      list.push({ name: structure.name, room_id: structure.room_id, id: structure.room_id, template: structure.template, type: structure.type })
    }

    _.forEach(structure?.children, child => {
      list.concat(this._generateList(child, list))
    })
    return list
  }

  _findSubTree (structure, id, tmp) {
    let re
    if (tmp) {
      return tmp
    }
    if (structure.room_id === id) {
      return structure
    } else {
      _.forEach(structure?.children, child => {
        const ret = this._findSubTree(child, id, tmp)
        re = ret
        if (ret) {
          tmp = ret
          return ret
        }
      })
    }

    return re
  }

  _findPath (structure, id, trace) {
    let re

    if (structure.room_id === id) {
      return { name: structure.name, id: structure.room_id, room_id: structure.room_id, template: structure.template }
    } else {
      _.forEach(structure?.children, child => {
        const ret = this._findPath(child, id, trace)
        if (ret) {
          if (ret.name) {
            re = { [child.room_id]: { name: child.name, room_id: child.room_id, type: child?.type, template: child.template } }
          } else {
            re = { [child.room_id]: { name: child.name, room_id: child.room_id, type: child?.type, template: child.template, children: ret } }
          }
        }

        // if (ret) {
        //   console.log({ [child.room_id]: { name: child.name, room_id: child.room_id, type: child?.type, template: child.template, children: ret } })
        //   //  console.log({ [structure.room_id]: { name: structure.name, room_id: structure.room_id, type: structure.type, children: ret } })
        //   return { [child.room_id]: { name: child.name, room_id: child.room_id, type: child?.type, template: child.template, children: ret } }
        // }
      })
    }
    // if(!re) {console.log(re)}
    // console.log(re)
    // if (re && Object.values(re)[0]?.children) {
    //   return re
    // }

    return re
  }

  _findSpace (id) {
    return this._findSpaceBy(id, 'id')
  }

  _findSpaceBy (id, key) {
    return _.find(this.allSpaces, { [key]: id })
  }

  _sortChildren (children) {
    // console.log(children)
    const types = {}
    _.forEach(this.configService.get('attributable.spaceTypes'), (typeContent, typeKey) => {
      types[typeKey] = []
    })
    // children.forEach(child => {
    //   const space = this._findSpaceBy(child, 'parentSpaceId')
    //   if (space?.wrapper) {
    //     wrappers[space.wrapper].push(space)
    //   }
    // })
    children.forEach(child => {
      const space = this._findSpaceBy(child, 'id')
      if (space?.type) {
        types[space.type].push(space)
      }
    })

    return types
  }

  _abstractTypes (types) {
    const ret = {}
    _.forEach(types, (type, key) => {
      ret[key] = []
      _.forEach(type, typeElement => {
        ret[key].push(this._abstractSpace(typeElement))
      })
    })
    return ret
  }

  _abstractSpace (space) {
    return {
      id: space.id,
      name: space?.name,
      template: space?.template,
      type: space?.type
    }
  }

  /// Stechlin Custom

  getFullTree (id) {
    const basicTree = this.getTree(id)

    return this._extendTreeData(basicTree, {})
  }

  async _extendTreeData (structure, ret) {
    ret = this.getAbstract(structure.id)
    ret.children = {}
    if (ret.type !== 'item') {
      await Promise.all(_.map(structure?.children, async (child) => {
        ret.children[child.id] = await this._extendTreeData(child, ret)
      }))
    } else {
      // console.log(this.getContent(ret.id, 'en'))
      ret.render = await this.getContent(ret.id, 'en')
    }

    return ret
  }

  /// ////// RUNDGANG 22

  getItemsFilteredByItems (id) {
    const list = this.getList(id)
    const items = _.filter(list, item => item.type === 'item')

    return _.filter(items, item => this.configService.get('attributable.spaceTypes.item').some(f => f === item.template))
  }

  getItemsFilteredByAllocationsTemporal (id) {
    const list = this.getItemsFilteredByItems(id)
    return _.filter(list, item => this.getAbstract(item.id)?.allocation?.temporal)
  }

  getItemsFilteredByUserId (id, userId) {
    const list = this.getItemsFilteredByItems(id)
    return _.filter(list, item => this.getAbstract(item.id)?.origin?.members.some(usr => usr.id === userId))
  }

  async getRenderedJson (id) {
    const contentEN = await this.getContent(id, 'en')
    const contentDE = await this.getContent(id, 'de')
    const abstract = this.getAbstract(id)
    const languages = {}
    if (contentEN) languages.EN = contentEN
    if (contentDE) languages.DE = contentDE

    return { abstract: { name: abstract?.name, thumbnail: abstract?.thumbnail, thumbnail_full_size: abstract?.thumbnail_full_size, description: abstract?.description }, languages: languages }
  }

  /// //// POST

  async postFetch (id, options) {
    this._updatedId(id, options)
  }

  _updatedId (id, options) {
    const space = this._findSpace(id)
    // console.log(space)
    // return this._allRawSpaces[id]
    // console.log(this.fetch().getBatch())
    // return await this.fetch().getBatch(id, { max: 100, depth: 10 }, false, [])
    if (space) {
      return this._applyUpdate(id, space)
    } else {
      // console.log('222')
    }
  }

  async _applyUpdate (id, oldSpace) {
    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    if (!oldSpace) oldSpace = this._findSpace(id)
    const oldRawSpace = _.find(this._allRawSpaces, { room_id: id })
    const oldTree = this._findSubTree(this.getStructure()[this.configService.get('matrix.root_context_space_id')], id)

    const newSpace = await this._getBatch(id, { max: 100, depth: 1 }, false, [], matrixClient)

    const stateEvents = await matrixClient.roomState(id).catch(() => {})
    const extendedData = await this._getStateData(stateEvents, id, rawSpaces)
    // console.log(extendedData)

    // console.log(newSpace)
  }

  async _getBatch (spaceId, options, batch, hirachy, matrixClient) {
    // console.log(await matrixClient.getRoomHierarchy("!YCztLjuiNnMHWFPUVP:stechlin-institut.ruralmindshift.org", options.max, options.depth))
    const hierarchyBatch = batch ? await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth, false, batch) : await matrixClient.getRoomHierarchy(spaceId, options.max, options.depth)
    //! hierarchyBatch.next_batch ? hirachy :
    hirachy.push(...hierarchyBatch.rooms)
    if (!hierarchyBatch?.next_batch) {
      return hirachy
    } else {
      const getMoreRooms = await this._getBatch(spaceId, options, hierarchyBatch?.next_batch, hirachy)
      //  console.log(getMoreRooms)
    }
    return hirachy
  }

  async _getStateData (stateEvents, spaceId, rawSpaces, matrixClient) {
    const metaEvent = _.find(stateEvents, { type: 'dev.medienhaus.meta' })
    //   if (!metaEvent) console.log(spaceId)
    if (!metaEvent) return
    const nameEvent = _.find(stateEvents, { type: 'm.room.name' })
    if (!nameEvent) return
    const allocationEvent = _.find(stateEvents, { type: 'dev.medienhaus.allocation' })
    const joinRulesEvent = _.find(stateEvents, { type: 'm.room.join_rules' })

    const parent = {}

    _.forEach(rawSpaces, space => {
      const children = (_.filter(space.stateEvents, event => event.type === 'm.space.child'))

      _.forEach(children, child => {
        if (child?.state_key === spaceId) {
          parent.name = space.name
          parent.room_id = space.room_id
        }
      })
    })

    let published
    let topicEn
    let topicDe
    let authorNames
    let type
    const members = []

    const children = []

    const joinedMembers = await matrixClient.getJoinedRoomMembers(spaceId).catch(() => {})

    for (const [key, value] of Object.entries(joinedMembers?.joined)) {
      members.push({ id: key, name: value.display_name })
    }

    if (this.configService.get('attributable.spaceTypes.item').some(f => f === metaEvent?.content?.template)) {
      type = 'item'
    } else if (this.configService.get('attributable.spaceTypes.context').some(f => f === metaEvent?.content?.template)) {
      type = 'context'
    }

    if (metaEvent?.content?.type !== 'lang' && !(this.configService.get('attributable.spaceTypes.content').some(f => f === metaEvent?.content?.template))) {
      if (
        this.configService.get('attributable.spaceTypes.item').some(f => f === metaEvent?.content?.template) &&
      (metaEvent.content.published ? metaEvent.content.published === 'public' : (joinRulesEvent && joinRulesEvent.content.join_rule === 'public'))
      ) {
        published = 'public'

        const languageSpaceIds = (stateEvents.filter(event => event.type === 'm.space.child').map(child => child.state_key))

        const languageSpaces = languageSpaceIds.map(languageSpace => {
          return _.find(rawSpaces, room => room.room_id === languageSpace)
        })

        // fetch descriptions
        const en = languageSpaces.filter(room => room.name === 'en')
        topicEn = en[0].topic || undefined
        const de = languageSpaces.filter(room => room.name === 'de')
        topicDe = de[0].topic || undefined
        // fetch authors aka. collaborators
        authorNames = []

        for (const [key, value] of Object.entries(joinedMembers?.joined)) {
          authorNames.push(value.display_name)
        }
      } else {
        if (!this.configService.get('attributable.spaceTypes.context').some(f => f === metaEvent?.content?.template)) {
          published = 'draft'
        } else {
          const potentialChildren = stateEvents.filter(event => event.type === 'm.space.child').map(child => child.state_key).map(id => {
            const r = _.find(rawSpaces, rawSpace => rawSpace.room_id === id)
            return r
          }
          )

          _.forEach(potentialChildren, child => {
            if (_.find(child?.stateEvents, { type: 'dev.medienhaus.meta' })) {
              children.push(child.room_id)
            }
          })
        }
      }
    } else {
      return
    }

    const spaceName = nameEvent.content.name

    const avatar = _.find(stateEvents, { type: 'm.room.avatar' })

    if (metaEvent?.content?.deleted) return
    return {
      name: spaceName,
      template: metaEvent?.content?.template,
      topicEn: topicEn,
      type: type,
      topicDe: topicDe,
      parent: parent.name,
      parentSpaceId: parent.room_id,
      authors: authorNames,
      members: members,
      published: published,
      children: children,
      allocation: { physical: allocationEvent?.content?.physical },
      thumbnail: avatar?.content.url ? matrixClient.mxcUrlToHttp(avatar?.content.url, 800, 800, 'scale') : '',
      thumbnail_full_size: avatar?.content.url ? matrixClient.mxcUrlToHttp(avatar?.content.url) : ''
    }
  }
}
