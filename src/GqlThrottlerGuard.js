import { Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse (context) {
    if (context.getType() === 'http') {
      const ctx = context.switchToHttp()
      return { req: ctx.getRequest(), res: ctx.getResponse() }
    }

    const gqlCtx = GqlExecutionContext.create(context)
    const ctx = gqlCtx.getContext()
    return { req: ctx.req, res: ctx.res }
  }
}
