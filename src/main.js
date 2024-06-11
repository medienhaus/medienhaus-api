import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { join } from 'path'
import hbs from 'hbs'
import moment from 'moment'
import { Logger } from '@nestjs/common'

async function bootstrap () {
  const app = await NestFactory.create(AppModule)

  app.useStaticAssets(join(__dirname, '..', 'public'))
  app.setBaseViewsDir(join(__dirname, '..', 'views'))
  hbs.registerPartials(join(__dirname, '..', 'views'))
  hbs.registerHelper('greaterThan', function (length, index, options) {
    if (length > 1 && index < length - 1) {
      return options.fn(this)
    }
    return options.inverse(this)
  })
  hbs.registerHelper('formatDateEnglish', function (a) {
    return moment(a).isValid() ? moment(a).format('dddd, LL') : a
  })
  hbs.registerHelper('formatDateGerman', function (a) {
    return moment(a).isValid() ? moment(a).locale('de').format('dddd, LL') : a
  })
  app.setViewEngine('hbs')
  if (process.env.GLOBAL_URL_PREFIX) {
    Logger.debug('Setting global prefix to ' + process.env.GLOBAL_URL_PREFIX)
    app.setGlobalPrefix(process.env.GLOBAL_URL_PREFIX)
  }
  app.enableCors()
  if (process.env.API_PORT) {
    await app.listen(process.env.API_PORT)
  } else {
    await app.listen(3009)
  }
}
bootstrap()
