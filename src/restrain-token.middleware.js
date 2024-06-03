import { UnauthorizedException, Dependencies, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
@Dependencies(ConfigService)
class RestrainTokenMiddleware {
  constructor (configService) {
    this.configService = configService
  }

  use (req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    const validTokens = this.configService.get('access.restrain.tokens')

    if (!token || !validTokens.includes(token)) {
      throw new UnauthorizedException()
    }

    next()
  }
}

export default RestrainTokenMiddleware
