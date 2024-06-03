import { Dependencies, Injectable, Logger } from '@nestjs/common'
import { createClient as createMatrixClient } from 'matrix-js-sdk'
import { ConfigService } from '@nestjs/config'
import * as _ from 'lodash'
import { HttpService } from '@nestjs/axios'
import Handlebars from 'handlebars'
import fs from 'fs'
import { join } from 'path'

@Injectable()
@Dependencies(ConfigService, HttpService)
export class LegacyInterpreter {
  constructor (configService, httpService, matrixClient) {
    this.configService = configService
    this.httpService = httpService

    this.matrixClient = matrixClient

    this.legacyIds = []
    this.contents = []
  }

  async convertLegacySpace (stateEvents, spaceId, rawSpaces) {
    const metaEvent = _.find(stateEvents, { type: 'dev.medienhaus.meta' })
    if (!metaEvent) return
    const nameEvent = _.find(stateEvents, { type: 'm.room.name' })
    if (!nameEvent) return

    const joinRulesEvent = _.find(stateEvents, { type: 'm.room.join_rules' })

    const spaceName = nameEvent.content.name

    if (spaceName?.toLowerCase() === 'events'.toLowerCase()) return // get rid of the events as they are not imporant and create chaos for the languages

    // patching type to type/template

    let type

    const createEvent = _.find(stateEvents, { type: 'm.room.create' })
    const createdTimestamp = createEvent?.origin_server_ts

    const legacyTemplate = metaEvent?.content?.type
    if (this.configService.get('attributable.spaceTypes.context').some((f) => f === legacyTemplate)) {
      type = 'context'
    } else if (this.configService.get('attributable.spaceTypes.item').some((f) => f === legacyTemplate)) {
      type = 'item'
    } else if (this.configService.get('attributable.spaceTypes.content').some((f) => f === legacyTemplate)) {
      type = 'content'
    }
    if (!type) return

    const template = legacyTemplate

    if (template.toLowerCase().includes('event'.toLowerCase())) return
    if (template.toLowerCase() === 'location'.toLowerCase()) {
      return
    } // get rid of location as content type. could be potentially end up in allocation but not motivated to code that for now.

    const parents = []
    _.forEach(rawSpaces, (space) => {
      const children = _.filter(
        space.stateEvents,
        (event) => event.type === 'm.space.child'
      )

      _.forEach(children, (child) => {
        if (child?.state_key === spaceId) {
          if (Object.keys(child?.content).length !== 0) {
            parents.push({ name: space.name, room_id: space.room_id })
          }
        }
      })
    })
    rawSpaces[spaceId].parentIds = parents

    let published
    let topicEn
    let topicDe
    let authorNames

    const members = []

    const children = []

    let languageSpaces

    let joinedMembers = {}
    if (!rawSpaces[spaceId].joinedMembers) {
      joinedMembers = await this.matrixClient
        .getJoinedRoomMembers(spaceId)
        .catch((e) => {
          Logger.log("can't get room members:/t" + spaceId)
        })
      rawSpaces[spaceId].joinedMembers = joinedMembers
      await new Promise((r) => setTimeout(r, 1))
    } else {
      joinedMembers = rawSpaces[spaceId].joinedMembers
    }

    const users = _.find(stateEvents, { type: 'm.room.power_levels' })?.content
      ?.users
    const authors = _.map(joinedMembers?.joined, (member, memberId) =>
      _.some(
        users,
        (userData, userId) =>
          userId === memberId &&
        userData >= 50 &&
        memberId !== this.configService.get('matrix.user_id')
      )
        ? {
            id: memberId,
            name: joinedMembers?.joined[memberId]?.display_name,
            avatar: joinedMembers?.joined[memberId]?.avatar_url
              ? this.matrixClient.mxcUrlToHttp(
                joinedMembers?.joined[memberId]?.avatar_url
              )
              : ''
          }
        : ''
    )

    if (metaEvent?.content?.credit?.length > 0) {
      metaEvent?.content?.credit.forEach((credit) => {
        let tempId = '' + this.configService.get('matrix.user_id')
        tempId = tempId.split(':')[0]
        tempId = '@donotuse-' + this.makeid(15) + ':' + tempId

        authors.push({
          id: tempId,
          name: credit
        })
      })
    }

    let descriptions = languageSpaces?.map((lang) => {
      return { id: lang?.room_id, name: lang?.name, topic: lang?.topic }
    })

    const ownTopic = _.find(stateEvents, { type: 'm.room.topic' })?.content
      ?.topic // get topic from the space itself additionally to the topice from the language spaces

    if (ownTopic) {
      if (!descriptions) {
        // no langage space topcis found, this means that it has no language spaces
        if (ownTopic) {
          // if a topic in the space itself exists add it as default as the only one
          descriptions = [{ name: 'default', topic: ownTopic }]
        }
      } else {
        // if langage spaces exists lets check if an space topic exists as well and lets concat it to the existings ones as default
        descriptions.push({ name: 'default', topic: ownTopic })
      }
    }

    if (
      template !== 'lang' &&
      !this.configService
        .get('attributable.spaceTypes.content')
        .some((f) => f === template)
    ) {
      const potentialChildren = stateEvents
        .filter((event) => event.type === 'm.space.child')
        .map((child) => child.state_key)
        .map((id) => {
          const r = _.find(rawSpaces, (rawSpace) => rawSpace.room_id === id)
          return r
        })

      _.forEach(potentialChildren, (child) => {
        if (_.find(child?.stateEvents, { type: 'dev.medienhaus.meta' })) {
          children.push(child.room_id)
        }
      })

      if (
        this.configService
          .get('attributable.spaceTypes.item')
          .some((f) => f === template) &&
        (metaEvent.content.published
          ? metaEvent.content.published === 'public'
          : joinRulesEvent && joinRulesEvent.content.join_rule === 'public')
      ) {
        published = 'public'

        const languageSpaceIds = stateEvents
          .filter((event) => event.type === 'm.space.child')
          .map((child) => child.state_key)
        if (!languageSpaceIds) {
          return
        }
        languageSpaces = languageSpaceIds.map((languageSpace) => {
          const langSpace = _.find(
            rawSpaces,
            (room) => room.room_id === languageSpace
          )

          if (!langSpace) return

          if (langSpace.name.toLowerCase().includes('event'.toLowerCase())) return

          if (langSpace?.name && langSpace?.topic) {
            descriptions.push({
              name: langSpace?.name?.toUpperCase(),
              topic: langSpace?.topic
            })
          }

          return langSpace
        })
        if (!languageSpaces) {
          return
        }

        // fetch descriptions
        const en = languageSpaces.filter((room) => room?.name === 'en')
        topicEn = en[0] ? en[0].topic : ''
        const de = languageSpaces.filter((room) => room?.name === 'de')
        topicDe = de[0] ? de[0].topic : ''
        // fetch authors aka. collaborators
        authorNames = []
        if (joinedMembers) {
          for (const [key, value] of Object.entries(joinedMembers?.joined)) {
            authorNames.push(value.display_name)
          }
        }
      } else {
        if (
          !this.configService
            .get('attributable.spaceTypes.context')
            .some((f) => f === template)
        ) {
          published = 'draft'
        } else {
        }
      }
    } else {
      return
    }

    const avatar = _.find(stateEvents, { type: 'm.room.avatar' })

    if (metaEvent?.content?.deleted) return

    this.legacyIds.push(spaceId)
    return {
      space: {
        name: spaceName,
        template,
        topicEn,
        created: createdTimestamp,
        type,
        topicDe,
        languages: languageSpaces?.map((lang) => lang?.name),
        descriptions,
        parents,
        authors,
        published,
        children,
        allocation: {
          physical: [],
          temporal: []
        },
        tags: [],
        thumbnail: avatar?.content.url
          ? this.matrixClient.mxcUrlToHttp(
            avatar?.content.url,
            800,
            800,
            'crop'
          )
          : '',
        thumbnail_full_size: avatar?.content.url
          ? this.matrixClient.mxcUrlToHttp(avatar?.content.url)
          : ''
      },
      rawSpaces
    }
  }

  async get (id, language = 'en') {
    if (!this.items[id]) {
      return null
    }

    if (this.legacyInterpreter.isLegacy(id)) {
      return this.legacyInterpreter.get(id, language)
    }

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
      formattedContent: Object.keys(contentBlocks)
        .map((index) => contentBlocks[index].formatted_content)
        .join('')
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
    const spaceSummary = await matrixClient.getRoomHierarchy(
      projectSpaceId,
      1000,
      1000
    )

    if (spaceSummary?.rooms.length === 1) {
      // no language blocks detected get messages directly from timeline of space

      const lastMessage = (
        await this.httpService.axiosRef(
          this.configService.get('matrix.homeserver_base_url') +
            `/_matrix/client/r0/rooms/${projectSpaceId}/messages`,
          {
            method: 'GET',
            headers: {
              Authorization:
                'Bearer ' + this.configService.get('matrix.access_token')
            },
            params: {
              // @TODO Skip deleted messages
              limit: 1,
              dir: 'b',
              // Only consider m.room.message events
              filter: JSON.stringify({ types: ['m.room.message'] })
            }
          }
        )
      ).data.chunk[0]

      const content = lastMessage?.content?.body
        ? lastMessage?.content?.body
        : ''
      return {
        0: {
          type: 'text',
          content,
          formatted_content: `<div>${content}</div>`
        }
      }
    }

    spaceSummary.rooms.map((languageSpace) => {
      if (languageSpace.room_id === projectSpaceId) return
      if (languageSpace.name.toLowerCase().includes('event'.toLowerCase())) return
      languageSpaces[languageSpace.name] = languageSpace.room_id
    })

    if (!languageSpaces[language]) return

    // Get the actual content block rooms for the given language
    const contentRooms = await matrixClient.getRoomHierarchy(
      languageSpaces[language],
      1000,
      1000
    )

    await Promise.all(
      contentRooms.rooms.map(async (contentRoom) => {
        // Skip the language space itself
        if (contentRoom.room_id === languageSpaces[language]) return

        const cached = this.contents.find(
          ({ id }) => id === contentRoom.room_id
        )

        if (cached) {
          result[contentRoom.name.substring(0, contentRoom.name.indexOf('_'))] =
            {
              template: cached.template,
              content: cached.content,
              formatted_content: cached.formatted_content
            }
        } else {
          // Get the last message of the current content room
          const lastMessage = (
            await this.httpService.axiosRef(
              this.configService.get('matrix.homeserver_base_url') +
                `/_matrix/client/r0/rooms/${contentRoom.room_id}/messages`,
              {
                method: 'GET',
                headers: {
                  Authorization:
                    'Bearer ' + this.configService.get('matrix.access_token')
                },
                params: {
                  // @TODO Skip deleted messages
                  limit: 1,
                  dir: 'b',
                  // Only consider m.room.message events
                  filter: JSON.stringify({ types: ['m.room.message'] })
                }
              }
            )
          ).data.chunk[0]

          if (!lastMessage) return

          const template = contentRoom.name.substring(
            contentRoom.name.indexOf('_') + 1
          )
          const content = (() => {
            switch (template) {
              case 'audio':
              case 'file':
              case 'image':
                return matrixClient.mxcUrlToHttp(lastMessage.content.url)
              default:
                return lastMessage.content.body
            }
          })()
          const formattedContent = (() => {
            switch (template) {
              // For text, ul and ol we just return whatever's stored in the Matrix event's formatted_body
              case 'heading':
                if (lastMessage?.content?.body?.includes('### ')) {
                  const normalizedContent =
                    lastMessage?.content?.body.split('### ')[1]
                  return Handlebars.compile(
                    fs.readFileSync(
                      join(
                        __dirname,
                        '..',
                        'views',
                        'contentBlocks',
                        'heading.hbs'
                      ),
                      'utf8'
                    )
                  )({
                    normalizedContent,
                    matrixEventContent: lastMessage.content
                  })
                }
                break
              case 'text':
              case 'ul':
              case 'ol':
                return lastMessage.content.formatted_body
              // For all other types we render the HTML using the corresponding Handlebars template in /views/contentBlocks
              default:
                if (!this.configService.get('attributable.spaceTypes.content').some((f) => f === template)) {
                  return ''
                }
                return Handlebars.compile(
                  fs.readFileSync(
                    join(
                      __dirname,
                      '..',
                      'views',
                      'contentBlocks',
                      `${template}.hbs`
                    ),
                    'utf8'
                  )
                )({
                  content,
                  matrixEventContent: lastMessage.content
                })
            }
          })()
          const cachedRoom = {
            id: contentRoom.room_id,
            parent: projectSpaceId,
            name: contentRoom.name,
            template,
            content,
            formatted_content: formattedContent
          }
          this.contents.push(cachedRoom)
          // Append this content block's data to our result set
          result[contentRoom.name.substring(0, contentRoom.name.indexOf('_'))] =
            {
              template,
              content,
              formatted_content: formattedContent
            }
        }
      })
    )

    return result
  }

  isLegacy (id) {
    return this.legacyIds.some((l) => l === id)
  }

  clear () {
    this.contents = []
    this.legacyIds = []
  }

  makeid (length) {
    // origin: https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    let result = ''
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    let counter = 0
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
      counter += 1
    }
    return result
  }
}
