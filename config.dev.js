/* eslint-disable import/no-anonymous-default-export */
export default () => ({
  matrix: {
    homeserver_base_url: 'https://dev.medienhaus.udk-berlin.de',
    user_id: '@rundgang22-bot:dev.medienhaus.udk-berlin.de',
    access_token: 'syt_cnVuZGdhbmcyMi1ib3Q_PtmCSjVkRrRjqTRigPgP_4VfUr1',
    root_context_space_id: '!RjkxcBlidmPgaIlbwN:dev.medienhaus.udk-berlin.de'
  },
  fetch: {
    depth: 10,
    max: 100
  },
  application: {
    name: 'rundgang22',
    api_name: 'rundgang22-api',
    standards: [
      {
        name: 'dev.medienhaus.meta',
        version: '1.1'
      },
      {
        name: 'dev.medienhaus.allocation',
        version: '0.1'
      },
      {
        name: 'dev.medienhaus.order',
        version: '0.1'
      }
    ]
  },
  attributable: {
    spaceTypes: {
      item: [
        'item',
        'studentproject',
        'content'
      ],
      context: [
        'context',
        'class',
        'course',
        'institution',
        'structure',
        'structure-element',
        'structure-root'
      ],
      content: [
        'lang',
        'headline',
        'text',
        'ul',
        'ol',
        'quote'
      ]
    }
  }
})
