import axios from 'axios'
import TranslateEngine, { TranslateOptions, TranslateResult } from './base'
import { Config } from '~/core'

export default class GoogleTranslate extends TranslateEngine {
  link = 'https://translate.google.com'
  apiRoot = 'https://translate.googleapis.com'
  apiRootIfUserSuppliedKey = 'https://translation.googleapis.com'

  async translate(options: TranslateOptions) {
    const {
      from = 'auto',
      to = 'auto',
    } = options

    const key = Config.googleApiKey

    const { data } = await axios({
      method: 'GET',
      url: key
        ? `${this.apiRootIfUserSuppliedKey}/language/translate/v2?key=${key}&q=${encodeURI(options.text)}&source=${from}&target=${to}&alt=json`
        : `${this.apiRoot}/translate_a/single?client=gtx&sl=${from}&tl=${to}&hl=zh-CN&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon&q=${encodeURI(options.text)}`,
    })

    return this.transform(data, options, !!key)
  }

  transform(response: any, options: TranslateOptions, apiKeySuppliedByUser: boolean): TranslateResult {
    const {
      text,
      to = 'auto',
    } = options

    const r: TranslateResult = {
      text,
      to,
      from: response.src,
      response,
      linkToResult: `${this.link}/#auto/${to}/${text}`,
    }

    if (apiKeySuppliedByUser) {
      try {
        const result: string[] = []
        response.data.translations.forEach((v: any) => {
          result.push(v.translatedText)
        })
        r.result = result
      }
      catch (e) {}
    }

    else {
      // 尝试获取详细释义
      try {
        const detailed: string[] = []
        response.dict.forEach((v: any) => {
          detailed.push(`${v.pos}：${(v.terms.slice(0, 3) || []).join(',')}`)
        })
        r.detailed = detailed
      }
      catch (e) {}

      // 尝试取得翻译结果
      try {
        const result: string[] = []
        response.sentences.forEach((v: any) => {
          result.push(v.trans)
        })
        r.result = result
      }
      catch (e) {}
    }

    if (!r.detailed && !r.result)
      r.error = new Error('No result')

    return r
  }
}
