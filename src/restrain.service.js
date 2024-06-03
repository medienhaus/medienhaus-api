import { ConfigService } from '@nestjs/config'
import { Dependencies, Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'

@Injectable()
@Dependencies(ConfigService, HttpService)
export class RestrainService {
  constructor (configService, httpService) {
    this.ids = []
    this.configService = configService
    this.httpService = httpService

    const restrainTimeoutMinutes = this.configService.get('limits.restrainTimeout')
    const restrainTimeoutMilliseconds = restrainTimeoutMinutes * 60 * 1000 // convert minutes to milliseconds

    setInterval(() => {
      this.ids = []
      console.log('ids cleared')
    }, restrainTimeoutMilliseconds)
  }

  async restrainId (id) {
    if (this.ids.some(item => item.id === id)) {
      throw new HttpException('ID already restrained', HttpStatus.CONFLICT)
    } else {
      const url = 'http://localhost:' + (process.env.API_PORT ? process.env.API_PORT : 3009) + '/api/v2/' + id
      const d = await this.httpService.axiosRef(url)
      this.ids.push({ restrain: { timestamp: Date.now() }, ...d.data })
      return { message: 'id restrained' }
    }
  }

  removeId (id) {
    if (this.ids.some(item => item.id === id)) {
      this.ids = this.ids.filter(item => item.id !== id)
      return { message: 'id removed' }
    } else {
      return { message: 'id not found' }
    }
  }

  checkId (id) {
    return this.ids.some(item => item.id === id)
  }

  getIds () {
    return this.ids
  }

  getIdsAsStringArray () {
    return this.ids.map(item => item.id)
  }

  getTimeout () {
    return this.configService.get('limits.restrainTimeout')
  }
}
