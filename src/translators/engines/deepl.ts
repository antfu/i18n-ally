import axios from 'axios'
import qs from 'qs'

import TranslateEngine, { TranslateOptions, TranslateResult } from './base'
import { Log } from '~/utils'
import { Config } from '~/core'

interface DeepLUsage {
  character_count: number
  character_limit: number
}

interface DeepLTranslate {
  detected_source_language: string
  text: string
}

interface DeepLTranslateRes {
  translations: DeepLTranslate[]
}

const deepl = axios.create({})

deepl.interceptors.request.use((req) => {
  req.baseURL = Config.deeplUseFreeApiEntry
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2'

  req.params = {
    auth_key: Config.deeplApiKey,
  }

  if (req.method === 'POST' || req.method === 'post') {
    req.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    // @see https://www.deepl.com/docs-api/translating-text/request/
    // Source language: no 5 character ISO 3166 language codes, those
    // need to be cut off at 2 characters
    if (req.data.source_lang && req.data.source_lang.length > 2)
      req.data.source_lang = req.data.source_lang.slice(0, 2)
    // Target language: certain exceptions to the above, but the rest
    // has to be 2 characters as well
    const longSupportedLocales = ['EN-GB', 'EN-US', 'PT-PT', 'PT-BR']
    if (req.data.target_lang && !longSupportedLocales.includes(req.data.target_lang.toUpperCase()))
      req.data.target_lang = req.data.target_lang.slice(0, 2)
    // lower-case, upper-case both work, so left as is.
    req.data = qs.stringify(req.data)
  }

  log(true, req)

  return req
})

deepl.interceptors.response.use((res) => {
  log(true, res)

  return res
})

function log(inspector: boolean, ...args: any[]): void {
  if (Config.deeplLog) {
    if (inspector) console.log('[DeepL]\n', ...args)
    else Log.raw(...args)
  }
}

async function usage(): Promise<DeepLUsage> {
  try {
    return await deepl.get('/usage').then(({ data }) => data)
  }
  catch (err) {
    log(false, err)

    throw err
  }
}

class DeepL extends TranslateEngine {
  async translate(options: TranslateOptions) {
    try {
      const res: DeepLTranslateRes = await deepl({
        method: 'POST',
        url: '/translate',
        data: {
          text: options.text,
          source_lang: options.from || undefined,
          target_lang: options.to,
        },
      }).then(({ data }) => data)

      return this.transform(res.translations, options)
    }
    catch (err) {
      log(false, err)

      throw err
    }
  }

  transform(res: DeepLTranslate[], options: TranslateOptions): TranslateResult {
    const r: TranslateResult = {
      text: options.text,
      to: options.to || 'auto',
      from: options.from || 'auto',
      response: res,
      linkToResult: '',
    }

    try {
      const result: string[] = []

      res.forEach((tran: DeepLTranslate) => result.push(tran.text))

      r.result = result
    }
    catch (err) {}

    if (!r.detailed && !r.result) r.error = new Error('No result')

    log(false, `DEEPL TRANSLATE!! ${JSON.stringify(r.result)}, from ${options.from} to ${options.to}`)

    return r
  }
}

export default DeepL

export {
  usage,
}
