import { Field, Int, ObjectTyp,Resolver,Query,Args,ObjectType } from '@nestjs/graphql';
import { Bind, Dependencies } from '@nestjs/common'
import { AppService } from './app.service'


@Resolver()
@Dependencies(AppService)
export class ItemResolver {
  constructor (appService) {
    this.appService = appService
  }

  @Query(type => String,{ name: `dummy`})
  @Bind(Args('id'))
  async testQuery(id) {
    console.log(id)
    return "test";
  }


  // @Query(returns => Author)
  // async basicTest() {
  //   const b = {id:"b1",name:"some book", pages: 100, year: 100}
  //   const a = {id:"a",name:"b", books:[b]}
  //   console.log(a)
  //   return a;
  // }

}   



@ObjectType()
export class Author {

 @Field(type => String,{ description: `This a an author id`, type: String, nullable: true})
 id

 @Field(type => String,{ description: `This a an author name`, type: String})
 name

 @Field(type => Number,{ description: `This a an author age`, type: Number, nullable:true})
 age

 @Field(type => [Book],{ description: `This a an author bookslist`, type: [Book], nullable:true})
 books
 

}


@ObjectType()
export class Book {

 @Field(type => String,{ description: `This a an author id`, type: String, nullable: true})
 id

 @Field(type => String,{ description: `This a an author name`, type: String})
 name

 @Field(type => Number,{ description: `This a an author age`, type: Number, nullable:true})
 pages
 

}


// const SpaceType = new GraphQLObjectType({
//     name: 'Space',
//     description: 'This represents a space',
//     fields: () => ({
//       id: { type: GraphQLNonNull(GraphQLString) },
//       name: { type: GraphQLNonNull(GraphQLString) }
//     })
//   })



// @Query(returns => Number)

// async configA() {
  
//   return 1234;
// }