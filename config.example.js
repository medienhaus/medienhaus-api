/* eslint-disable import/no-anonymous-default-export */
export default () => ({
  matrix: {
    homeserver_base_url: 'https://matrix.org',
    user_id: '@username:matrix.org',
    access_token: 'syt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    root_context_space_id: '!xxxxxxxxxxxxxxxxxx:matrix.org'
  },
  fetch: {
    depth: 500,
    max: 10000,
    interval: 60,
    autoFetch: true,
    dump: false,
    initalyLoad: true,
    noLog: true
  },
  interfaces: {
    rest_v1: true,
    rest_v2: true,
    graphql: true,
    graphql_playground: true,
    post: true
  },
  application: {
    name: 'medienhaus',
    api_name: 'medienhaus-api',
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
        'project',
        'event'
      ],
      context: [
        'context',
        'class',
        'faculty',
        'centre'
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
