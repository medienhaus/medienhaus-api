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

    this.allSpaces = {}
    this._allRawSpaces = {}

    // Initializing custom caching arrays specifically for the graphql data interface.
    // All of this chaos needs to get rid of in the rewrite of this api
    this.servers = []
    this.users = []
    this.contents = []

    this.initiallyFetched = false

    this.matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })
  }

  @Interval(30 * 60 * 1000) // Call this every 30 minutes
  async fetch () {
    const configService = this.configService
    const httpService = this.httpService

    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    if (!this.configService.get('fetch.autoFetch') && this.initiallyFetched) return

    Logger.log('Fetching items...')

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
        await new Promise(r => setTimeout(r, 100))

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

    function generateStructure (spaces, spaceId, structure, lastId) {
      const space = _.find(spaces, { room_id: spaceId })
      if (space) {
        const children = {}
        space?.children_state.forEach(childrenState => {
          let ret
          if (childrenState.state_key !== lastId) {
            ret = generateStructure(spaces, childrenState.state_key, structure, spaceId)
          }

          if (ret) {
            if (_.find(_.find(spaces, space => space.room_id === ret.room_id).stateEvents, { type: 'dev.medienhaus.meta' })) {
              children[ret.room_id] = ret
            }
          }
        })
        const metaEvent = _.find(space.stateEvents, { type: 'dev.medienhaus.meta' })
        // if (filter.some(f => f === metaEvent?.content?.type)) { return { name: space.name, room_id: space.room_id, type: metaEvent?.content?.type, children: children } }
        return { name: space.name, room_id: space.room_id, id: space.room_id, type: metaEvent?.content?.type, template: metaEvent?.content?.template, children }
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
      const tagEvent = _.find(stateEvents, { type: 'dev.medienhaus.tags' })
      const joinRulesEvent = _.find(stateEvents, { type: 'm.room.join_rules' })

      const parent = {}
      const parents = []

      _.forEach(rawSpaces, space => {
        const children = (_.filter(space.stateEvents, event => event.type === 'm.space.child'))

        _.forEach(children, child => {
          if (child?.state_key === spaceId) {
            parents.push({ name: space.name, room_id: space.room_id })
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

      let languageSpaces

      const joinedMembers = await matrixClient.getJoinedRoomMembers(spaceId).catch((e) => { console.log(spaceId) })
      const users = _.find(stateEvents, { type: 'm.room.power_levels' })?.content?.users
      const authors = _.map(joinedMembers?.joined, (member, memberId) => _.some(users, (userData, userId) => userId === memberId && userData >= 50 && memberId !== configService.get('matrix.user_id'))
        ? {
            id: memberId,
            name: joinedMembers?.joined[memberId]?.display_name,
            avatar: joinedMembers?.joined[memberId]?.avatar_url ? matrixClient.mxcUrlToHttp(joinedMembers?.joined[memberId]?.avatar_url) : ''
          }
        : '')

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
          languageSpaces = languageSpaceIds.map(languageSpace => {
            return _.find(rawSpaces, room => room.room_id === languageSpace)
          })
          if (!languageSpaces) {
            // console.log('bing')
            return
          }
          // fetch descriptions
          const en = languageSpaces.filter(room => room?.name === 'en')
          topicEn = en[0] ? en[0].topic : ''
          const de = languageSpaces.filter(room => room?.name === 'de')
          topicDe = de[0] ? de[0].topic : ''
          // fetch authors aka. collaborators
          authorNames = []
          if (joinedMembers) {
            for (const [key, value] of Object.entries(joinedMembers?.joined)) {
              authorNames.push(value.display_name)
            }
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

      const thumbnailMxc = typeof avatar?.content?.url === 'object' ? avatar?.content?.url?.content_uri : avatar?.content?.url

      if (metaEvent?.content?.deleted) return
      return {
        name: spaceName,
        template: metaEvent?.content?.template,
        topicEn,
        type: metaEvent?.content?.type,
        topicDe,
        languages: languageSpaces?.map(lang => lang.name),
        descriptions: languageSpaces?.map(lang => { return { id: lang?.room_id, name: lang?.name, topic: lang?.topic } }),
        parent: parent.name,
        parentSpaceId: parent.room_id,
        parents,
        authors,
        published,
        children,
        allocation: { physical: allocationEvent?.content?.physical, temporal: allocationEvent?.content?.temporal },
        tags: tagEvent?.content?.tags,
        thumbnail: thumbnailMxc ? matrixClient.mxcUrlToHttp(thumbnailMxc, 800, 800, 'scale') : '',
        thumbnail_full_size: thumbnailMxc ? matrixClient.mxcUrlToHttp(thumbnailMxc) : ''
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
    this.contents = []

    // console.log(_.find(this._allRawSpaces,space => space.room_id === '!klLhNzPtFJxaLFQJKB:stechlin-institut.ruralmindshift.org'))

    const filtedObjects = _.filter(this.allSpaces, space => space.type === 'item').map(space => { return { [space.id]: space } })

    filtedObjects.forEach(ele => {
      this.items[Object.keys(ele)[0]] = ele[Object.keys(ele)[0]]
    })

    Logger.log(`Found ${Object.keys(this.items).length} items`)

    // new for graphQL functionality
    _.forEach(this.allSpaces, space => {
      // fill users
      _.forEach(space?.authors, author => {
        if (!this.users.find(({ id }) => id === author.id)) {
          if (author.id) {
            this.users.push({ id: author.id, name: author.name, thumbnail: author?.avatar, thumbnail_full_size: author?.avatar })
          }
        }
      })

      // fill servers
      const spaceUrl = space.id.split(':')[1]
      if (!this.servers.find(({ url }) => url === spaceUrl)) {
      //  this.servers.push({ url: spaceUrl, users: [], context: [], item: [], content: [] })
        this.servers.push({ url: spaceUrl })
      }
    })

    if (!this.initiallyFetched) this.initiallyFetched = true
  }

  applyFilterToStructure (structure_, filter, ret) {
    Object.entries(structure_).forEach(([key, content]) => {
      if (filter.some(f => f === content?.template)) {
        Object.entries(content.children).forEach(([key2, content2]) => {
          structure_[key].children[key2] = this.applyFilterToStructure({ [key2]: content2 }, filter)[key2]
        })
      } else {
        delete structure_[key]
      }
    })
    return structure_
  }

  getStructure (options) {
    // console.log(this.structure)
    if (options?.filter) {
      const dummyCopy = JSON.parse(JSON.stringify({ [Object.keys(this.structure)[0]]: { ...Object.values(this.structure)[0] } })) // ugly hack af to get a copy of the object. JS is such garbage.
      return JSON.parse(JSON.stringify(this.applyFilterToStructure(dummyCopy, options.filter))) // apping parsing/stringify to getting rid of weird undefined object
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
        ret = { [parent.id]: { id: parent.id, name: parent.name, child: { [id]: { id, name: content.name } } } }
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

    console.log(this.items[id])
    if (this.items[id].content) return this.items[id]
    const { content, formattedContent } = await this.getContent(id, language)
    return { ...this.items[id], content, formatted_content: formattedContent }
  }

  async getContent (projectSpaceId, language) {
    // const cachedContent = this.contents.find((cache) => cache.id === projectSpaceId && cache.language === language)
    // if (cachedContent) return cachedContent.content

    const contentBlocks = await this.getContentBlocks(projectSpaceId, language)
    // this.contents.push({ id: projectSpaceId, language, content: contentBlocks })
    if (!contentBlocks) return

    const ret = {
      content: contentBlocks,
      formattedContent: Object.keys(contentBlocks).map(index => contentBlocks[index].formatted_content).join('')
    }

    this.items[projectSpaceId].content = ret.content
    this.items[projectSpaceId].formattedContent = ret.formattedContent

    return ret
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
    const spaceSummary = await matrixClient.getRoomHierarchy(projectSpaceId, 1000, 1000)

    if (spaceSummary?.rooms.length === 1) {
      // no language blocks detected get messages directly from timeline of space

      const lastMessage = (await this.httpService.axiosRef(this.configService.get('matrix.homeserver_base_url') + `/_matrix/client/r0/rooms/${projectSpaceId}/messages`, {
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

      const content = lastMessage?.content?.body ? lastMessage?.content?.body : ''
      return { 0: { type: 'text', content, formatted_content: `<div>${content}</div>` } }
    }

    spaceSummary.rooms.map(languageSpace => {
      if (languageSpace.room_id === projectSpaceId) return
      languageSpaces[languageSpace.name] = languageSpace.room_id
    })

    if (!languageSpaces[language]) return

    // Get the actual content block rooms for the given language
    const contentRooms = await matrixClient.getRoomHierarchy(languageSpaces[language], 1000, 1000)

    // console.log(contentRooms)
    await Promise.all(contentRooms.rooms.map(async (contentRoom) => {
      // Skip the language space itself
      if (contentRoom.room_id === languageSpaces[language]) return

      const cached = this.contents.find(({ id }) => id === contentRoom.room_id)

      if (cached) {
        result[contentRoom.name.substring(0, contentRoom.name.indexOf('_'))] = {
          template: cached.template,
          content: cached.content,
          formatted_content: cached.formatted_content
        }
      } else {
      // console.log(this.configService.get('matrix.homeserver_base_url') + `/_matrix/client/r0/rooms/${contentRoom.room_id}/messages`)
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

        const template = contentRoom.name.substring(contentRoom.name.indexOf('_') + 1)
        const content = (() => {
          switch (template) {
            case 'audio':
            case 'file':
            case 'image':
              return matrixClient.mxcUrlToHttp(lastMessage.content.url)
            default: return lastMessage.content.body
          }
        })()
        const formattedContent = (() => {
          switch (template) {
          // For text, ul and ol we just return whatever's stored in the Matrix event's formatted_body
            case 'text':
            case 'ul':
            case 'ol':
              return lastMessage.content.formatted_body
              // For all other types we render the HTML using the corresponding Handlebars template in /views/contentBlocks
            default: return Handlebars.compile(fs.readFileSync(join(__dirname, '..', 'views', 'contentBlocks', `${template}.hbs`), 'utf8'))({
              content,
              matrixEventContent: lastMessage.content
            })
          }
        })()
        const cachedRoom = { id: contentRoom.room_id, parent: projectSpaceId, name: contentRoom.name, template, content, formatted_content: formattedContent }
        this.contents.push(cachedRoom)
        // Append this content block's data to our result set
        result[contentRoom.name.substring(0, contentRoom.name.indexOf('_'))] = {
          template,
          content,
          formatted_content: formattedContent
        }
      }
    }
    ))

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

  getAbstractUser (userId) {
    const userAbstract = {
      id: userId,
      type: 'user',
      template: '',
      context: [],
      content: [],
      item: []
    }
    const userSpaces = this._findSpacesByUser(userId)
    if (!userSpaces.length > 0) {
      return userAbstract
    }

    userSpaces.forEach(space => {
      const abstract = {
        id: space.id,
        name: space.name,
        type: space.type,
        template: space.template,
        thumbnail: space.thumbnail ? space.thumbnail : undefined,
        thumbnail_full_size: space.thumbnail_full_size ? space.thumbnail_full_size : undefined,
        parents: space.parents
      }
      switch (abstract.type) {
        case 'item':
          userAbstract.item.push(abstract)
          break
        case 'context':
          userAbstract.context.push(abstract)
          break
        case 'content':
          userAbstract.content.push(abstract)
          break
        default:
          break
      }
    })
    const userData = this._extractUserInformationsFromSpace(userId, userSpaces[0])

    userAbstract.name = userData.name ? userData.name : ''
    userAbstract.thumbnail = userData.avatar ? userData.avatar : ''
    userAbstract.thumbnail_full_size = userData.avatar ? userData.avatar : ''

    return userAbstract
  }

  _findSpacesByUser (userId) {
    return _.filter(this.allSpaces, (space) => {
      if (_.find(space?.authors, (author) => { return author.id === userId })) {
        return space
      }
    })
  }

  _extractUserInformationsFromSpace (userId, space) {
    return _.find(space?.authors, { id: userId })
  }

  getAbstract (id) {
    if (id?.charAt(0) === '@') return this.getAbstractUser(id) // check if the requested Id is a user instead of a room

    const space = this._findSpace(id)
    if (!space) return

    const rawSpace = _.find(this._allRawSpaces, { room_id: id })
    const parentIds = []
    if (space?.parents.length > 0) {
      space.parents.forEach(parent => {
        if (!(parentIds.indexOf(parent.room_id) > -1)) {
          parentIds.push(parent.room_id)
        }
      })
    }

    return {
      id,
      allocation: space?.allocation,
      type: space?.type,
      name: space?.name,
      template: space?.template,
      thumbnail: space?.thumbnail,
      thumbnail_full_size: space?.thumbnail_full_size,
      tags: space?.tags,
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
      parents: parentIds,
      localDepth: this.getPathList(id)?.length,
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
    // return this._findSubTree(this.getStructure({
    //   filter: this.configService.get('attributable.matrix.context')
    // })[this.configService.get('matrix.root_context_space_id')], id)
    // return this._findSubTree(this.getStructure({
    //   filter: this.configService.get('attributable.spaceTypes.context')
    // })[this.configService.get('matrix.root_context_space_id')], id)

    return this._findSubTree(this.getStructure({
      filter: [...this.configService.get('attributable.spaceTypes.context'), ...this.configService.get('attributable.spaceTypes.item')]
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
    if (structure.id === id) {
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

    if (structure.id === id) {
      return { name: structure.name, id: structure.room_id, room_id: structure.room_id, template: structure.template }
    } else {
      _.forEach(structure?.children, child => {
        const ret = this._findPath(child, id, trace)
        if (ret) {
          if (ret.name) {
            re = { [child.id]: { name: child.name, id: child.id, room_id: child.room_id, type: child?.type, template: child.template } }
          } else {
            re = { [child.id]: { name: child.name, id: child.id, room_id: child.room_id, type: child?.type, template: child.template, children: ret } }
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
      type: space?.type,
      allocation: space?.allocation,
      thumbnail: space?.thumbnail,
      description: {
        default: space?.topicEn,
        EN: space?.topicEn,
        DE: space?.topicDe
      }
    }
  }

  /// Stechlin Custom

  getFullTree (id) {
    const basicTree = this.getTree(id)

    return this._extendTreeData(basicTree, {})
  }

  async _extendTreeData (structure, ret) {
    ret = this.getAbstract(structure.id)
    if (!ret) {
      ret = {}
    }
    ret.children = {}
    if (ret.type !== 'item') {
      await Promise.all(_.map(structure?.children, async (child) => {
        ret.children[child.id] = await this._extendTreeData(child, ret)
      }))
    } else {
      // console.log(this.getContent(ret.id, 'en'))
      // ret.render = await this.getContent(ret.id, 'en') // commented out dont know why this is there
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
    const list = [...this.getItemsFilteredByItems(id)]
    const candidates = _.filter(list, item => this.getAbstract(item.id)?.allocation?.temporal)
    return _.map(candidates, ele => { ele.allocation = this.getAbstract(ele.id).allocation; return ele })
  }

  getItemsFilteredByUserId (id, userId) {
    const list = this.getItemsFilteredByItems(id)
    return _.filter(list, item => this.getAbstract(item.id)?.origin?.authors.some(usr => usr.id === userId))
  }

  async getRenderedJson (id) {
    const abstract = this.getAbstract(id)
    const languages = {}

    for await (const [i, language] of this.items[id]?.languages.entries()) {
      languages[language.toUpperCase()] = await this.getContent(id, language)
    }

    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    return { abstract: { name: abstract?.name, thumbnail: abstract?.thumbnail, thumbnail_full_size: abstract?.thumbnail_full_size, description: abstract?.description }, languages }
  }

  getTreeFiltedByContext (id) {
    return this._findSubTree(this.getStructure({
      filter: this.configService.get('attributable.spaceTypes.context')
    })[this.configService.get('matrix.root_context_space_id')], id)
  }

  getPathList (id) {
    const path = this.getPath(id)
    if (!path) return []
    const firstEntry = { ...Object.values(path)[0] }
    delete firstEntry.children
    return this._getPathListFlatter(Object.values(path)[0], [firstEntry], Object.keys(path)[0])
  }

  _getPathListFlatter (pathSection, list, parentId) {
    _.forEach(pathSection?.children, (child, childId) => {
      const ele = { ...child }
      delete ele.children
      ele.parent = parentId
      list.push(ele)
      list = this._getPathListFlatter(child, list, childId)
    })
    return list
  }

  // Stechlin 2023

  async getFullList (id) {
    const fullTree = await this.getFullTree(id)

    const ids = []
    return _.map(this._getEntries(fullTree, []), (entry) => {
      if (!ids.includes(entry.id)) {
        ids.push(entry.id)
        return entry
      }
    })
  }

  _getEntries (level, entries) {
    _.forEach(level?.item, item => {
      entries.push(item)
    })
    _.forEach(level?.context, context => {
      entries.push(context)
    })

    _.forEach(level?.children, child => {
      entries = this._getEntries(child, entries)
    })

    return entries
  }

  async getItemsOfFullListFilteredByItems (id) {
    const fullList = await this.getFullList(id)

    const items = _.filter(fullList, { type: 'item' })

    return _.filter(items, item => this.configService.get('attributable.spaceTypes.item').some(f => f === item.template))
  }

  /// ////// GRAPHQL

  _findSpacesByUserId (userId) {
    return _.filter(this.allSpaces, (space) => {
      if (_.find(space.authors, { id: userId })) {
        return space
      }
    })
  }

  getServer (serverUrl) {
    const server = _.find(this.servers, ({ url }) => url === serverUrl)
    if (server) {
      server.users = _.filter(this.users, ({ id }) => id.split(':')[1] === server.url)
    }
    return server
  }

  getUser (userId) {
    const user = _.find(this.users, ({ id }) => id === userId)
    if (user) {
      user.server = this.getServer(user.id.split(':')[1])
      const userSpaces = this._findSpacesByUserId(userId)
      user.item = _.filter(userSpaces, { type: 'item' })
      user.context = _.filter(userSpaces, { type: 'context' })
      user.content = _.filter(userSpaces, { type: 'content' })
    }
    return user
  }

  getSpaces (template, type) {
    let spaces = []
    if (type && ((type === 'item') || (type === 'content') || (type === 'context'))) {
      spaces = _.map(this.allSpaces, (space) => {
        if (space?.type === type) {
          return space
        }
      })
    }

    if (template) {
      if (!(spaces?.length > 0)) {
        spaces = _.map(this.allSpaces, (space) => space)
      }
      const allowedTemplates = [...this.configService.get('attributable.spaceTypes.item'), ...this.configService.get('attributable.spaceTypes.content'), ...this.configService.get('attributable.spaceTypes.context')]
      spaces = _.filter(spaces, space => {
        if (space?.template === template && allowedTemplates.some(f => f === space?.template)) {
          return space
        }
      })
    }

    if (!template && !type && !spaces?.length > 0) { // if not template and not type defined just get the raw information. it is done this way to pevent to cyle to many times through the full array
      spaces = _.map(this.allSpaces, (space) => space)
    }

    return _.compact(spaces)
  }

  // converting to type orientated schema from graphql. This is such a mess, rewrite highly needed!
  convertSpaces (spaces) {
    return _.map(spaces, space => {
      return this.convertSpace(space?.id, space)
    })
  }

  convertSpace (id, space) {
    if (!space) space = this._findSpace(id)
    if (!space) {
      return
    }
    const types = this._abstractTypes(this._sortChildren(space.children))

    space.item = types.item
    space.context = types.context
    space.content = types.content


    return {
      id: space?.id,
      name: space?.name,
      type: space?.type,
      template: space?.template,
      item: _.map(space?.item, item => this.convertSpace(item.id)),
      context: _.map(space?.context, context => this.convertSpace(context.id)),
      content: _.map(space?.content, content => this.convertSpace(content.id)),
      description: space?.descriptions?.map(desc => this.convertDescription(desc?.id, desc)),
      thumbnail: space?.thumbnail,
      thumbnail_full_size: space?.thumbnail_full_size,
      parents: _.map(space?.parents, parent => this.convertSpace(this._findSpace(parent?.room_id))),
      origin: this.convertOrigin(id, { application: [], server: [], authors: space?.authors }) // still contains placeholder which needs to be fixed in the future
    }
  }

  convertOrigin (id, origin) {
    const ret = {
      application: [{ name: '' }], // needs to be implemented in the future, is not cached from the dev.medienhaus.meta event so far
      server: _.map(origin.authors, author => this.getServer(author?.id?.split(':')[1])),
      authors: _.map(origin.authors, author => this.getUser(author?.id))
    }

    return ret
  }

  convertDescription (id, description) {
    const ret = {
      language: description.name?.toUpperCase(),
      content: description?.topic
    }
    return ret
  }

  convertAllocation (id, allocation) {

  }

  convertApplication (id, application) {

  }

  // CUSTOM ROUTE FOR D3

  getD3Abstract (id) {
    const space = this._findSpace(id)
    return {
      name: space.name,
      id: space.id,
      type: space.type,
      template: space.template,
      children: _.map(space?.children, child => {
        const childSpaceAbstract = this._findSpace(child)
        return { name: childSpaceAbstract.name, type: childSpaceAbstract.type, template: childSpaceAbstract.template, id: child }
      })
    }
  }

  getD3FullTree (id) {
    const space = this._findSpace(id)
    if (!space) return

    const children = _.compact(_.map(space?.children, child => this.getD3FullTree(child))).filter(v => v !== null)

    const ret = {
      name: space?.name,
      id: space?.id,
      type: space?.type,
      template: space?.template,
      value: 100
    }

    if (children?.length > 0) {
      ret.children = children
    }

    return ret
  }

  /// //// POST

  async postFetch (id, options) {
    return await this._updatedId(id, options)
  }

  async deleteFetch (id, options) {
    const spaceAbstract = this.getAbstract(id)
    const spaceRaw = this._allRawSpaces[id]
    const spaceItems = this.items[id]
    const spaceAllSpaces = this.allSpaces[id]

    if (!spaceRaw || !spaceAbstract || !spaceAllSpaces) {
      return
    }

    // TODO: adding auth function

    // checking if space is already removed at parents via synapse
    const liveParents = await this._getChildrenOfParents(options?.parentIds)
    if (!liveParents) return { status: 'matrix parent not found' }
    if (liveParents?.error) return { status: '' + liveParents.error + ' not found in matrix' } //  custom error response for specific room id
    const deleted = _.map(liveParents, parent => {
      return parent.some(room => room === id)
    })
    if (deleted.some(p => p)) {
      return { status: 'not in matrix deleted' }
    }

    // modify parents
    const parents = this._getParentsOfId(id)
    // and stateEvents of parents
    parents.forEach(parent => {
      // check if purge from all parent or just specific ones
      if (!options?.purge) {
        if (!options?.parentIds.some(p => p === parent)) { // if parent is not included in parentIds from the call then this will not be deleted
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
        this._allRawSpaces[parent]?.children_state.forEach((childStateEvent, i) => {
          if (childStateEvent.state_key === id) {
            this._allRawSpaces[parent].children_state.splice(i, 1)
          }
        })
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
    this._findAndDeleatInStrucutre(id, Object.values(this.structure)[0], [Object.keys(this.structure)[0]], options)

    if (options?.purge) {
      // purge objects of given id
      if (this._allRawSpaces[id]) delete this._allRawSpaces[id]
      if (this.items[id]) delete this.items[id]
      if (this.allSpaces[id]) delete this.allSpaces[id]
      return { status: 'purged' }
    } else { // if not purged then modifing the parentes keys of the given id object which it got deleted from
      if (this._allRawSpaces[id]) {
        _.remove(this._allRawSpaces[id]?.parents, p => options?.parentIds.some(pI => p.room_id === pI))
      }

      if (this.allSpaces[id]) {
        _.remove(this.allSpaces[id]?.parents, p => options?.parentIds.some(pI => p.room_id === pI))
      }

      if (this.items[id]) {
        _.remove(this.items[id]?.parents, p => options?.parentIds.some(pI => p.room_id === pI))
      }
    }

    return { status: 'deleted' }
  }

  async _getChildrenOfParents (parentIds) {
    const parents = {}
    for await (const [i, parent] of parentIds.entries()) {
      const matrixReq = await this.matrixClient.getRoomHierarchy(parent, this.configService.get('fetch.max'), 1).catch(e => {})
      if (!matrixReq) return { error: parent }
      const children = _.map(_.filter(matrixReq?.rooms, room => parent !== room.room_id), room => room.room_id)
      parents[parent] = children
    }
    return parents
  }

  _findAndDeleatInStrucutre (id, structure, path, options) {
    _.forEach(structure?.children, child => {
      const tmpPath = [...path]
      tmpPath.push(child.id)
      this._findAndDeleatInStrucutre(id, child, tmpPath, options)
    })

    if (structure.id === id) {
      let pathWay = ''
      path.forEach((p, i) => {
        pathWay += "['" + p + "']" + (i < path.length - 1 ? '.children' : '') // yes I know this is fucking ugly as hell I am also hating myself for this at least a bit
      })
      if (options?.purge) { // if purge then delete if in any way
        _.unset(this.structure, pathWay)
      } else {
        if (path.length > 0 && options?.parentIds.some(p => p === path[path.length - 2])) { // checks if the found path is part of the partentIds before deleting otherwise will skip
          _.unset(this.structure, pathWay) // this deletes the key
        }
      }
    }
  }

  async _updatedId (id, options) {
    const space = this._findSpace(id)
    if (space && !options.parentId) {
      return await this._applyUpdate(id, options)
    } else {
      return await this._applyUpdate(options?.parentId, options)
    }
  }

  async _applyUpdate (id, options) {
    const startTime = Date.now()
    const max = options.max ? options.max : this.configService.get('fetch.max')
    const depth = options.depth ? options.depth : this.configService.get('fetch.depth')

    const idsToApplyFullStaeUpdate = []

    const allSpaces = await this.getAllSpacesInitial(id, { max, depth, noLog: true })
    _.forEach(allSpaces, (spaceContent, spaceId) => {
      idsToApplyFullStaeUpdate.push(spaceId)
      const abstract = this.getAbstract(spaceId)
      if (abstract?.parents) idsToApplyFullStaeUpdate.concat(abstract?.parents)
    })
    console.log(idsToApplyFullStaeUpdate)

    console.log('Fetched ' + (Date.now() - startTime))
    _.forEach(allSpaces, ele => {
      this._allRawSpaces[ele.room_id] = ele
    })
    console.log('Fetched after ' + (Date.now() - startTime))
    const generatedStrucute = this.generateStructure(this._allRawSpaces, this.configService.get('matrix.root_context_space_id'), {})
    const structure = {}
    structure[generatedStrucute.room_id] = generatedStrucute
    console.log('Struct ' + (Date.now() - startTime))
    this.allSpaces = await this.generateAllSpaces(this._allRawSpaces, { noLog: true }, idsToApplyFullStaeUpdate)
    console.log('Spaces generated ' + (Date.now() - startTime))
    this.structure = structure

    const filtedObjects = _.filter(this.allSpaces, space => space.type === 'item').map(space => { return { [space.id]: space } })

    filtedObjects.forEach(ele => {
      this.items[Object.keys(ele)[0]] = ele[Object.keys(ele)[0]]
    })
    console.log('End ' + (Date.now() - startTime))
    return this.getAbstract(id)
  }
}
