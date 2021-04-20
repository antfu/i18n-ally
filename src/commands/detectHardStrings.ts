import { commands, window } from 'vscode'
import { ExtensionModule } from '~/modules'
import { Global } from '~/core'
import { Commands } from '~/commands'
import { DetectionResult, trimDetection } from '~/extraction'
import i18n from '~/i18n'

export async function DetectHardStrings() {
  const editor = window.activeTextEditor
  const doc = editor?.document

  if (!doc || !editor)
    return

  const frameworks = Global.getExtractionFrameworksByLang(doc.languageId)

  if (!frameworks.length) {
    window.showWarningMessage(i18n.t('refactor.extracting_not_support_for_lang'), doc.languageId)
    return
  }

  const result: DetectionResult[] = []

  for (const framework of frameworks) {
    const temp = (framework.detectHardStrings?.(doc) || [])
      .filter(Boolean)
      .map(trimDetection)
      .filter(Boolean)
      .map(i => ({
        ...i,
        document: doc,
        editor,
      })) as DetectionResult[]

    if (temp.length)
      result.push(...temp)
  }

  return result
}

const m: ExtensionModule = () => {
  return [
    commands.registerCommand(Commands.detect_hard_strings, DetectHardStrings),
  ]
}

export default m
