import { ConfigService } from '@nestjs/config'
import { Dependencies, Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'

@Injectable()
@Dependencies(ConfigService, HttpService)
export class RestrainService {
  constructor (configService, httpService) {
    this.ids = ['some id']
    this.configService = configService

    const restrainTimeoutMinutes = this.configService.get('limits.restrainTimeout')
    const restrainTimeoutMilliseconds = restrainTimeoutMinutes * 60 * 1000 // convert minutes to milliseconds

    setInterval(() => {
      this.ids = []
      console.log('ids cleared')
    }, restrainTimeoutMilliseconds)
  }

  restrainId (id) {

  }

  getIds () {
    return this.ids
  }

  someTest () {
    return this.configService.get('interfaces')
  }
}
