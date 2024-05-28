import { ConfigService } from '@nestjs/config'
import { Dependencies, Injectable } from '@nestjs/common'
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
    if (this.ids.includes(id)) {
      return { message: 'id already restrained' }
    } else {
      this.ids.push(id)
      return { message: 'id restrained' }
    }
  }

  removeId (id) {
    if (this.ids.includes(id)) {
      this.ids = this.ids.filter((i) => i !== id)
      return { message: 'id removed' }
    } else {
      return { message: 'id not found' }
    }
  }

  getIds () {
    return this.ids
  }

  getTimeout () {
    return this.configService.get('limits.restrainTimeout')
  }
}
