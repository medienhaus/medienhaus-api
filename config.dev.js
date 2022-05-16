/* eslint-disable import/no-anonymous-default-export */
export default () => ({
  matrix: {
    homeserver_base_url: 'https://dev.medienhaus.udk-berlin.de',
    user_id: '@rundgang22-dummy-4:dev.medienhaus.udk-berlin.de',
    access_token: 'syt_cnVuZGdhbmcyMi1kdW1teS00_vlELIPvnvzgxovZfxcqH_210yhO',
    root_context_space_id: '!yGwpTLQiIMoyuhGggS:dev.medienhaus.udk-berlin.de'
  },
  fetch: {
    depth: 500,
    max: 10000
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
        'structure-root',
        'Universität',
        'Fakultät',
        'Institut',
        'Studiengang',
        'Entwurfsbereich',
        'location-university',
        'location-building',
        'location-level',
        'location-room'
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
