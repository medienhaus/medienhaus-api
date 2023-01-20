import {GraphQLModule} from 'type-graphql';
import { 
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull
} from 'graphql'

// @ObjectType()
// export class SpaceType {
//   @Field(() => ID)
//   id: GraphQLString;
//   @Field()
//   name: GraphQLString;
// }


const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  description: 'Root Query',
  fields: () => ({
    book: {
      type: BookType,
      description: 'A Single Book',
      args: {
        id: { type: GraphQLInt }
      },
      resolve: (parent, args) => books.find(book => book.id === args.id)
    },
  })
})