import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// This immutable tree is the complete CRF-001 reconciliation target, not a
// projection of the caller's working tree.
export const CRF_001_FULL_TARGET_COMMIT = '8fc38f5c9ecd0ed4fac14a92450a94a8eb96da13';

export const RECORDED_BASE_REQUEST = Object.freeze({
  base: {
    commit: '3aa975e4bdb8571942e736acb78e2acadec74ed7',
    registryBlob: '2fd9c3750d345f106d2dd55abf02647f3e6ef863',
    generatedBlob: '617d55ac2de0f31a96a839036d9b3f61c1829c7b',
    registryPath: 'localization/corpus/registry.json',
    generatedPath: 'src/shared/locale/generated-resources.ts',
  },
  revisionRequest: {
    taskId: 'CRF-001',
    revisions: [
      {
        id: 'MLUX-C0109',
        expectedSourceRevision:
          'sha256:a714d33a9bec5baf279a64903e8634998e6515631189f1ac7355f85388ff9e80',
        namespace: 'cart',
        key: 'mockCheckoutWasAcceptedPaymentIs',
        english:
          'Mock checkout was accepted. Payment is pending; learning access is not available yet.',
        occurrences: [
          { id: 'MLUX-O0128', context: 'src/pages/cart-page/CartPage.tsx:177 — Page: cart-page' },
        ],
        placeholdersByLocale: { en: [], ru: [], uz: [] },
        renderingContract: null,
        pluralForms: null,
        ru: 'Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.',
        uz: 'Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.',
      },
      {
        id: 'MLUX-C0386',
        expectedSourceRevision:
          'sha256:3611bb4167e4712e365f552104c42d832e0906420affebb8e8500e3ec60b0950',
        namespace: 'cart',
        key: 'checkoutStatusUncertain',
        english:
          'Your cart still cannot prove whether checkout partially completed. Do not start another checkout action.',
        occurrences: [
          { id: 'MLUX-O0550', context: 'src/pages/cart-page/CartPage.tsx:212 — Page: cart-page' },
        ],
        placeholdersByLocale: { en: [], ru: [], uz: [] },
        renderingContract: null,
        pluralForms: null,
        ru: 'Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.',
        uz: 'Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.',
      },
      {
        id: 'MLUX-C0119',
        expectedSourceRevision:
          'sha256:9051e62ac54a4a68fe868356266301e4f38d73a57261c742d8b6087b27307e5b',
        namespace: 'cart',
        key: 'yourEnrollmentChangedCheckMyLearning',
        english:
          'Your enrollment changed. Checkout cannot confirm a payment result or learning access.',
        occurrences: [
          { id: 'MLUX-O0140', context: 'src/pages/cart-page/CartPage.tsx:252 — Page: cart-page' },
        ],
        placeholdersByLocale: { en: [], ru: [], uz: [] },
        renderingContract: null,
        pluralForms: null,
        ru: 'Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.',
        uz: 'Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.',
      },
      {
        id: 'MLUX-C0416',
        expectedSourceRevision:
          'sha256:117c9e9eaeaa68953cd60db275ec1128e35b0faf8ca86be216e3bf31686fbe0a',
        namespace: 'learning',
        key: 'mockPaymentAwaitingCompletion',
        english: 'Payment is pending. Learning remains locked until your enrollment is active.',
        occurrences: [
          {
            id: 'MLUX-O0588',
            context:
              'src/pages/learning-detail-page/LearningDetailPage.tsx:316 — Page: learning-detail-page',
          },
        ],
        placeholdersByLocale: { en: [], ru: [], uz: [] },
        renderingContract: null,
        pluralForms: null,
        ru: 'Платёж ожидает обработки. Обучение останется заблокированным, пока ваша запись не станет активной.',
        uz: 'To‘lov kutilmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.',
      },
    ],
  },
  reconcileRequest: {
    taskId: 'CRF-001',
    sources: [
      {
        sourcePath: 'pages/cart-page/CartPage.tsx',
        expectedSourceFingerprint:
          'sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58',
      },
      {
        sourcePath: 'pages/learning-list-page/LearningListPage.tsx',
        expectedSourceFingerprint:
          'sha256:d87d03af782f2f55ba5b53db270ec96a2345edb0a736c4a90ab2a5195126bfd1',
      },
      {
        sourcePath: 'pages/learning-detail-page/LearningDetailPage.tsx',
        expectedSourceFingerprint:
          'sha256:7e040b801018f216dada95d07da6840dabd63b321ee3e81a510f295bf57c48ca',
      },
    ],
    obsolete: [
      {
        kind: 'translatorWrapper',
        sourcePath: 'pages/learning-list-page/LearningListPage.tsx',
        functionName: 'enrollmentStatusLabel',
        bindingName: 't',
      },
    ],
  },
});

const ACCOUNT_MENU_RUNTIME_PATCH = String.raw`diff --git src/app/layouts/AccountMenu.tsx src/app/layouts/AccountMenu.tsx
index 3b662ab..83abf5e 100644
--- src/app/layouts/AccountMenu.tsx
+++ src/app/layouts/AccountMenu.tsx
@@ -42 +42 @@ export function AccountMenu({ user, showLanguage = false }: AccountMenuProps) {
-  const { locale, setLocale } = useLocale();
+  const { clearStoredLocale, locale, setLocale } = useLocale();
@@ -237,6 +237,7 @@ export function AccountMenu({ user, showLanguage = false }: AccountMenuProps) {
                 type="button"
                 onClick={() => {
+                  clearStoredLocale();
                   clearSession();
                   navigate('/');
                 }}
`;

export function reverseUnifiedPatch(source, patch) {
  const sourceLines = source.split('\n');
  const normalizedPatchLine = (line) =>
    line.replace(/sha256:[a-f0-9]{64}/g, 'sha256:<source-fingerprint>');
  const hunks = patch
    .split('\n@@ ')
    .slice(1)
    .map((section) => {
      const lines = section.split('\n');
      const header = lines.shift();
      const match = header.match(/^-(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (!match) throw new Error('test fixture contains an invalid unified-diff hunk');
      const next = [];
      const previous = [];
      for (const line of lines) {
        if (line.startsWith(' ')) {
          next.push(line.slice(1));
          previous.push(line.slice(1));
        } else if (line.startsWith('+')) next.push(line.slice(1));
        else if (line.startsWith('-')) previous.push(line.slice(1));
      }
      return { next, previous, position: Number(match[2]) - 1 };
    });
  for (const hunk of hunks.reverse()) {
    const normalizedNext = hunk.next.map(normalizedPatchLine);
    const matchingPositions = [];
    const matchesAt = (position) =>
      position >= 0 &&
      position <= sourceLines.length - normalizedNext.length &&
      normalizedPatchLine(sourceLines[position]) === normalizedNext[0] &&
      normalizedNext.every(
        (line, index) => normalizedPatchLine(sourceLines[position + index]) === line,
      );
    if (matchesAt(hunk.position)) matchingPositions.push(hunk.position);
    else {
      const exactText = hunk.next.join('\n');
      const joinedSource = sourceLines.join('\n');
      const exactOffset = joinedSource.indexOf(exactText);
      if (exactOffset >= 0 && (exactOffset === 0 || joinedSource[exactOffset - 1] === '\n'))
        matchingPositions.push(joinedSource.slice(0, exactOffset).split('\n').length - 1);
    }
    const position = matchingPositions.sort(
      (left, right) => Math.abs(left - hunk.position) - Math.abs(right - hunk.position),
    )[0];
    if (position === undefined)
      throw new Error(
        `test fixture cannot reconstruct the recorded base from the checked-in artifact near line ${hunk.position + 1}`,
      );
    sourceLines.splice(position, hunk.next.length, ...hunk.previous);
  }
  return sourceLines.join('\n');
}

export function recordedBaseAccountMenuSource(source) {
  return reverseUnifiedPatch(source, ACCOUNT_MENU_RUNTIME_PATCH);
}

export async function writeRecordedBaseArtifacts({ registryBaselinePath, generatedBaselinePath }) {
  const readRecordedArtifact = async (path) => {
    const { stdout } = await execFileAsync('git', [
      'show',
      `${RECORDED_BASE_REQUEST.base.commit}:${path}`,
    ]);
    return stdout;
  };
  const [registryBeforeCrf001, outputBeforeCrf001] = await Promise.all([
    readRecordedArtifact(RECORDED_BASE_REQUEST.base.registryPath),
    readRecordedArtifact(RECORDED_BASE_REQUEST.base.generatedPath),
  ]);
  await Promise.all([
    writeFile(registryBaselinePath, registryBeforeCrf001, 'utf8'),
    writeFile(generatedBaselinePath, outputBeforeCrf001, 'utf8'),
  ]);
}
