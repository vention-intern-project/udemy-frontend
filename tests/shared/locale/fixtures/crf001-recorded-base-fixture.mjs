import { readFile, writeFile } from 'node:fs/promises';

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
              'src/pages/learning-detail-page/LearningDetailPage.tsx:437 — Page: learning-detail-page',
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

const REGISTRY_PATCH = String.raw`diff --git localization/corpus/registry.json localization/corpus/registry.json
index 2fd9c37..fe21d57 100644
--- localization/corpus/registry.json
+++ localization/corpus/registry.json
@@ -6382,13 +6382,13 @@
       "id": "MLUX-C0109",
       "namespace": "cart",
       "key": "mockCheckoutWasAcceptedPaymentIs",
-      "english": "Mock checkout was accepted. Payment is pending; continue in My Learning.",
-      "sourceRevision": "sha256:a714d33a9bec5baf279a64903e8634998e6515631189f1ac7355f85388ff9e80",
+      "english": "Mock checkout was accepted. Payment is pending; learning access is not available yet.",
+      "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e",
       "unitLifecycle": "active",
       "occurrences": [
         {
           "id": "MLUX-O0128",
-          "context": "src/pages/cart-page/CartPage.tsx:122 — Page: cart-page"
+          "context": "src/pages/cart-page/CartPage.tsx:177 — Page: cart-page"
         }
       ],
       "placeholdersByLocale": {
@@ -6400,34 +6400,86 @@
       "pluralForms": null,
       "locales": {
         "ru": {
-          "candidate": "Тестовое оформление принято. Платёж ожидает обработки; продолжите в разделе «Моё обучение».",
-          "status": "draft",
+          "candidate": "Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:a714d33a9bec5baf279a64903e8634998e6515631189f1ac7355f85388ff9e80",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:a714d33a9bec5baf279a64903e8634998e6515631189f1ac7355f85388ff9e80",
+              "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Тестовое оформление принято. Платёж ожидает обработки; продолжите в разделе «Моё обучение».",
+              "nextCandidate": "Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.",
+              "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.",
+              "nextCandidate": "Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.",
+              "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e",
           "approvalAuthority": null
         },
         "uz": {
-          "candidate": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; “Ta’limim” bo‘limida davom eting.",
-          "status": "draft",
+          "candidate": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:a714d33a9bec5baf279a64903e8634998e6515631189f1ac7355f85388ff9e80",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:a714d33a9bec5baf279a64903e8634998e6515631189f1ac7355f85388ff9e80",
+              "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; “Ta’limim” bo‘limida davom eting.",
+              "nextCandidate": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.",
+              "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.",
+              "nextCandidate": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.",
+              "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:07c45ff48b52c75df1b1fe2032b9c40893a6b219237ce69232931d8bad45111e",
           "approvalAuthority": null
         }
       },
       "migrationProvenance": {
         "legacyResourceStatus": "Draft",
         "legacyReviewStatus": "Pending",
-        "ownerTasks": ["MLUX-004"]
+        "ownerTasks": ["MLUX-004", "CRF-001"]
       }
     },
     {
@@ -6930,13 +6982,13 @@
       "id": "MLUX-C0119",
       "namespace": "cart",
       "key": "yourEnrollmentChangedCheckMyLearning",
-      "english": "Your enrollment changed. Check My Learning before taking another action.",
-      "sourceRevision": "sha256:9051e62ac54a4a68fe868356266301e4f38d73a57261c742d8b6087b27307e5b",
+      "english": "Your enrollment changed. Checkout cannot confirm a payment result or learning access.",
+      "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b",
       "unitLifecycle": "active",
       "occurrences": [
         {
           "id": "MLUX-O0140",
-          "context": "src/pages/cart-page/CartPage.tsx:161 — Page: cart-page"
+          "context": "src/pages/cart-page/CartPage.tsx:252 — Page: cart-page"
         }
       ],
       "placeholdersByLocale": {
@@ -6948,34 +7000,86 @@
       "pluralForms": null,
       "locales": {
         "ru": {
-          "candidate": "Статус записи изменился. Перед следующим действием проверьте раздел «Моё обучение».",
-          "status": "draft",
+          "candidate": "Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:9051e62ac54a4a68fe868356266301e4f38d73a57261c742d8b6087b27307e5b",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:9051e62ac54a4a68fe868356266301e4f38d73a57261c742d8b6087b27307e5b",
+              "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Статус записи изменился. Перед следующим действием проверьте раздел «Моё обучение».",
+              "nextCandidate": "Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.",
+              "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.",
+              "nextCandidate": "Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.",
+              "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b",
           "approvalAuthority": null
         },
         "uz": {
-          "candidate": "Yozilish holati o‘zgardi. Keyingi amaldan oldin “Ta’limim” bo‘limini tekshiring.",
-          "status": "draft",
+          "candidate": "Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:9051e62ac54a4a68fe868356266301e4f38d73a57261c742d8b6087b27307e5b",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:9051e62ac54a4a68fe868356266301e4f38d73a57261c742d8b6087b27307e5b",
+              "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Yozilish holati o‘zgardi. Keyingi amaldan oldin “Ta’limim” bo‘limini tekshiring.",
+              "nextCandidate": "Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.",
+              "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.",
+              "nextCandidate": "Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.",
+              "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:ca6f3d6250f74cf35ed55400d93d6ceae222bc2f0cdfa4a4b96530534c940f4b",
           "approvalAuthority": null
         }
       },
       "migrationProvenance": {
         "legacyResourceStatus": "Draft",
         "legacyReviewStatus": "Pending",
-        "ownerTasks": ["MLUX-004"]
+        "ownerTasks": ["MLUX-004", "CRF-001"]
       }
     },
     {
@@ -21406,13 +21510,13 @@
       "id": "MLUX-C0386",
       "namespace": "cart",
       "key": "checkoutStatusUncertain",
-      "english": "Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.",
-      "sourceRevision": "sha256:3611bb4167e4712e365f552104c42d832e0906420affebb8e8500e3ec60b0950",
+      "english": "Your cart still cannot prove whether checkout partially completed. Do not start another checkout action.",
+      "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6",
       "unitLifecycle": "active",
       "occurrences": [
         {
           "id": "MLUX-O0550",
-          "context": "src/pages/cart-page/CartPage.tsx:165 — DRAFT-20 residual context"
+          "context": "src/pages/cart-page/CartPage.tsx:212 — Page: cart-page"
         }
       ],
       "placeholdersByLocale": {
@@ -21424,34 +21528,86 @@
       "pluralForms": null,
       "locales": {
         "ru": {
-          "candidate": "Корзина пока не может подтвердить, завершилась ли оплата частично. Перед новой оплатой проверьте «Моё обучение».",
-          "status": "draft",
+          "candidate": "Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:3611bb4167e4712e365f552104c42d832e0906420affebb8e8500e3ec60b0950",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:3611bb4167e4712e365f552104c42d832e0906420affebb8e8500e3ec60b0950",
+              "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Корзина пока не может подтвердить, завершилась ли оплата частично. Перед новой оплатой проверьте «Моё обучение».",
+              "nextCandidate": "Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.",
+              "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.",
+              "nextCandidate": "Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.",
+              "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6",
           "approvalAuthority": null
         },
         "uz": {
-          "candidate": "Savat to‘lov qisman yakunlanganini hozircha tasdiqlay olmaydi. Yana to‘lov qilishdan oldin «Ta’limim»ni tekshiring.",
-          "status": "draft",
+          "candidate": "Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:3611bb4167e4712e365f552104c42d832e0906420affebb8e8500e3ec60b0950",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:3611bb4167e4712e365f552104c42d832e0906420affebb8e8500e3ec60b0950",
+              "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Savat to‘lov qisman yakunlanganini hozircha tasdiqlay olmaydi. Yana to‘lov qilishdan oldin «Ta’limim»ni tekshiring.",
+              "nextCandidate": "Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.",
+              "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.",
+              "nextCandidate": "Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.",
+              "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:51045f7331a4644c6213113261ffad68a757cda053a51e07549af32945b834e6",
           "approvalAuthority": null
         }
       },
       "migrationProvenance": {
         "legacyResourceStatus": "Draft",
         "legacyReviewStatus": "Pending",
-        "ownerTasks": ["MLUX-004"]
+        "ownerTasks": ["MLUX-004", "CRF-001"]
       }
     },
     {
@@ -23007,13 +23163,13 @@
       "id": "MLUX-C0416",
       "namespace": "learning",
       "key": "mockPaymentAwaitingCompletion",
-      "english": "Mock payment is awaiting completion. Learning remains locked until your enrollment is active.",
-      "sourceRevision": "sha256:117c9e9eaeaa68953cd60db275ec1128e35b0faf8ca86be216e3bf31686fbe0a",
+      "english": "Payment is pending. Learning remains locked until your enrollment is active.",
+      "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3",
       "unitLifecycle": "active",
       "occurrences": [
         {
           "id": "MLUX-O0588",
-          "context": "src/pages/learning-detail-page/LearningDetailPage.tsx:437 — DRAFT-20 residual context"
+          "context": "src/pages/learning-detail-page/LearningDetailPage.tsx:316 — Page: learning-detail-page"
         }
       ],
       "placeholdersByLocale": {
@@ -23025,34 +23181,96 @@
       "pluralForms": null,
       "locales": {
         "ru": {
-          "candidate": "Тестовая оплата ожидает завершения. Обучение останется заблокированным, пока запись не станет активной.",
-          "status": "draft",
+          "candidate": "Платёж ожидает обработки. Обучение останется заблокированным, пока ваша запись не станет активной.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:117c9e9eaeaa68953cd60db275ec1128e35b0faf8ca86be216e3bf31686fbe0a",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:117c9e9eaeaa68953cd60db275ec1128e35b0faf8ca86be216e3bf31686fbe0a",
+              "sourceRevision": "sha256:6a16b21b4ee13125fbdd66e2a51e413601c333859b3690403a8b99e59115ffd2"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Тестовая оплата ожидает завершения. Обучение останется заблокированным, пока запись не станет активной.",
+              "nextCandidate": "Платёж ожидает обработки. Обучение останется заблокированным, пока ваша запись не станет активной.",
+              "sourceRevision": "sha256:6a16b21b4ee13125fbdd66e2a51e413601c333859b3690403a8b99e59115ffd2"
+            },
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:6a16b21b4ee13125fbdd66e2a51e413601c333859b3690403a8b99e59115ffd2",
+              "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Платёж ожидает обработки. Обучение останется заблокированным, пока ваша запись не станет активной.",
+              "nextCandidate": "Платёж ожидает обработки. Обучение останется заблокированным, пока ваша запись не станет активной.",
+              "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3",
           "approvalAuthority": null
         },
         "uz": {
-          "candidate": "Sinov to‘lovi yakunlanishini kutmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
-          "status": "draft",
+          "candidate": "To‘lov kutilmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
+          "status": "review_requested",
           "reviewerId": null,
           "verdict": null,
-          "requestedAt": null,
+          "requestedAt": "2026-08-29T02:47:35.169Z",
           "reviewedAt": null,
           "approvalRecordedAt": null,
-          "history": [],
-          "sourceRevision": "sha256:117c9e9eaeaa68953cd60db275ec1128e35b0faf8ca86be216e3bf31686fbe0a",
+          "history": [
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:117c9e9eaeaa68953cd60db275ec1128e35b0faf8ca86be216e3bf31686fbe0a",
+              "sourceRevision": "sha256:6a16b21b4ee13125fbdd66e2a51e413601c333859b3690403a8b99e59115ffd2"
+            },
+            {
+              "type": "draft_reset",
+              "previousCandidate": "Sinov to‘lovi yakunlanishini kutmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
+              "nextCandidate": "To‘lov kutilmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
+              "sourceRevision": "sha256:6a16b21b4ee13125fbdd66e2a51e413601c333859b3690403a8b99e59115ffd2"
+            },
+            {
+              "type": "source_revision",
+              "previousSourceRevision": "sha256:6a16b21b4ee13125fbdd66e2a51e413601c333859b3690403a8b99e59115ffd2",
+              "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3"
+            },
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "To‘lov kutilmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
+              "nextCandidate": "To‘lov kutilmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
+              "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3",
+              "reviewRequest": {
+                "taskId": "CRF-001",
+                "locales": ["ru", "uz"],
+                "unitIds": ["MLUX-C0109", "MLUX-C0119", "MLUX-C0386", "MLUX-C0416"],
+                "requestedAt": "2026-08-29T02:47:35.169Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:5707abb85441c9b8c2ec4524087ab6c0ec4deb47f48f4ee6bf9c117a65a694c3",
           "approvalAuthority": null
         }
       },
       "migrationProvenance": {
         "legacyResourceStatus": "Draft",
         "legacyReviewStatus": "Pending",
-        "ownerTasks": ["MLUX-004"]
+        "ownerTasks": ["MLUX-004", "CRF-001"]
       }
     },
     {
@@ -29752,13 +29970,13 @@
         "sourcePath": "pages/cart-page/CartPage.tsx",
         "functionName": "CartRecoveryAction",
         "bindingName": "t",
-        "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+        "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
       },
       {
         "sourcePath": "pages/cart-page/CartPage.tsx",
         "functionName": "mutationStatusMessage",
         "bindingName": "t",
-        "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+        "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
       },
       {
         "sourcePath": "pages/course-detail-page/CourseActionPanel.tsx",
@@ -29796,12 +30014,6 @@
         "bindingName": "t",
         "sourceFingerprint": "sha256:749923dbddbf6fba6f412d0c3ba296295ad3fdab067b9ca62c8f4019206c20b6"
       },
-      {
-        "sourcePath": "pages/learning-list-page/LearningListPage.tsx",
-        "functionName": "enrollmentStatusLabel",
-        "bindingName": "t",
-        "sourceFingerprint": "sha256:d87d03af782f2f55ba5b53db270ec96a2345edb0a736c4a90ab2a5195126bfd1"
-      },
       {
         "sourcePath": "widgets/course-chat/CourseChatPanel.tsx",
         "functionName": "AssistantResponseError",
@@ -29893,35 +30105,35 @@
             "functionName": "CartPage",
             "argument": "initialLoadFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "loadFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "removeFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "clearFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "clearFailure.messageKey",
             "occurrence": 2,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           }
         ]
       },
@@ -29943,28 +30155,28 @@
             "functionName": "CartPage",
             "argument": "initialLoadFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "loadFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "removeFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "clearFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           }
         ]
       },
@@ -29992,7 +30204,7 @@
             "functionName": "CartPage",
             "argument": "returnTarget.labelKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:76ee1a75e2b7c2eed6e2c76c6bfccd8a0a228f65cd09d83a52541848e6befa58"
+            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
           }
         ]
       },
@@ -30297,14 +30509,14 @@
             "functionName": "LearningListPage",
             "argument": "failure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:d87d03af782f2f55ba5b53db270ec96a2345edb0a736c4a90ab2a5195126bfd1"
+            "sourceFingerprint": "sha256:8ebde6f65eb583569e1d0db37651996aa6ba1d80fcf305bde618c820b27a9b1a"
           },
           {
             "sourcePath": "pages/learning-detail-page/LearningDetailPage.tsx",
             "functionName": "LearningDetailPage",
             "argument": "failure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:7e040b801018f216dada95d07da6840dabd63b321ee3e81a510f295bf57c48ca"
+            "sourceFingerprint": "sha256:60a247589d0c16ab2ade819a42fcdbca524947323ae65f099fb53ca8df9c3954"
           }
         ]
       },
@@ -30317,21 +30529,21 @@
             "functionName": "LearningListPage",
             "argument": "failure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:d87d03af782f2f55ba5b53db270ec96a2345edb0a736c4a90ab2a5195126bfd1"
+            "sourceFingerprint": "sha256:8ebde6f65eb583569e1d0db37651996aa6ba1d80fcf305bde618c820b27a9b1a"
           },
           {
             "sourcePath": "pages/learning-detail-page/LearningDetailPage.tsx",
             "functionName": "LearningDetailPage",
             "argument": "failure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:7e040b801018f216dada95d07da6840dabd63b321ee3e81a510f295bf57c48ca"
+            "sourceFingerprint": "sha256:60a247589d0c16ab2ade819a42fcdbca524947323ae65f099fb53ca8df9c3954"
           },
           {
             "sourcePath": "pages/learning-detail-page/LearningDetailPage.tsx",
             "functionName": "LearningDetailPage",
             "argument": "failure.titleKey",
             "occurrence": 2,
-            "sourceFingerprint": "sha256:7e040b801018f216dada95d07da6840dabd63b321ee3e81a510f295bf57c48ca"
+            "sourceFingerprint": "sha256:60a247589d0c16ab2ade819a42fcdbca524947323ae65f099fb53ca8df9c3954"
           }
         ]
       },
@@ -30344,7 +30556,7 @@
             "functionName": "LearningDetailPage",
             "argument": "workspace.feedback.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:7e040b801018f216dada95d07da6840dabd63b321ee3e81a510f295bf57c48ca"
+            "sourceFingerprint": "sha256:60a247589d0c16ab2ade819a42fcdbca524947323ae65f099fb53ca8df9c3954"
           }
         ]
       },
`;
const GENERATED_PATCH = String.raw`diff --git src/shared/locale/generated-resources.ts src/shared/locale/generated-resources.ts
index 617d55a..6b8a72c 100644
--- src/shared/locale/generated-resources.ts
+++ src/shared/locale/generated-resources.ts
@@ -232,7 +232,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "signInBeforePaymentStatus": "Sign in again before checking payment status.",
       "paymentActionUnavailable": "This payment action is not available for the current account.",
       "mockPaymentUnavailable": "Mock payment is currently unavailable. Check enrollment status later.",
-      "mockPaymentAwaitingCompletion": "Mock payment is awaiting completion. Learning remains locked until your enrollment is active.",
+      "mockPaymentAwaitingCompletion": "Payment is pending. Learning remains locked until your enrollment is active.",
       "checkPaymentStatus": "Check payment status",
       "completeMockPayment": "Complete mock payment",
       "simulateMockPaymentFailure": "Simulate mock payment failure",
@@ -309,7 +309,7 @@ export const GENERATED_LOCALE_RESOURCES = {
     },
     "cart": {
       "checkoutAccepted": "Checkout accepted",
-      "mockCheckoutWasAcceptedPaymentIs": "Mock checkout was accepted. Payment is pending; continue in My Learning.",
+      "mockCheckoutWasAcceptedPaymentIs": "Mock checkout was accepted. Payment is pending; learning access is not available yet.",
       "checkMyLearning": "Check My Learning",
       "checkoutStatusNeedsChecking": "Checkout status needs checking",
       "weCouldNotConfirmCheckoutCheck": "We could not confirm checkout. Check the cart status for updated guidance.",
@@ -319,7 +319,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "checkoutUnavailable": "Checkout unavailable",
       "thisCheckoutIsNotAvailableFor": "This checkout is not available for the current account.",
       "enrollmentChanged": "Enrollment changed",
-      "yourEnrollmentChangedCheckMyLearning": "Your enrollment changed. Check My Learning before taking another action.",
+      "yourEnrollmentChangedCheckMyLearning": "Your enrollment changed. Checkout cannot confirm a payment result or learning access.",
       "cartChanged": "Cart changed",
       "yourCartIsNoLongerReady": "Your cart is no longer ready for this checkout. Refresh it before trying again.",
       "checkoutIsCurrentlyUnavailableTryAgain": "Checkout is currently unavailable. Try again later.",
@@ -337,7 +337,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "clearingCart": "Clearing cart...",
       "browseCourses": "Browse courses",
       "checkCheckoutStatus": "Check checkout status",
-      "checkoutStatusUncertain": "Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.",
+      "checkoutStatusUncertain": "Your cart still cannot prove whether checkout partially completed. Do not start another checkout action.",
       "refreshCart": "Refresh cart",
       "courseLowercase": "course",
       "courseLabel": "Course",
@@ -817,7 +817,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "signInBeforePaymentStatus": "Войдите снова перед проверкой статуса оплаты.",
       "paymentActionUnavailable": "Это действие с оплатой недоступно для текущего аккаунта.",
       "mockPaymentUnavailable": "Тестовая оплата сейчас недоступна. Проверьте статус записи позже.",
-      "mockPaymentAwaitingCompletion": "Тестовая оплата ожидает завершения. Обучение останется заблокированным, пока запись не станет активной.",
+      "mockPaymentAwaitingCompletion": "Платёж ожидает обработки. Обучение останется заблокированным, пока ваша запись не станет активной.",
       "checkPaymentStatus": "Проверить статус оплаты",
       "completeMockPayment": "Завершить тестовую оплату",
       "simulateMockPaymentFailure": "Сымитировать сбой тестовой оплаты",
@@ -896,7 +896,7 @@ export const GENERATED_LOCALE_RESOURCES = {
     },
     "cart": {
       "checkoutAccepted": "Оформление принято",
-      "mockCheckoutWasAcceptedPaymentIs": "Тестовое оформление принято. Платёж ожидает обработки; продолжите в разделе «Моё обучение».",
+      "mockCheckoutWasAcceptedPaymentIs": "Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.",
       "checkMyLearning": "Проверить «Моё обучение»",
       "checkoutStatusNeedsChecking": "Нужно проверить статус оформления",
       "weCouldNotConfirmCheckoutCheck": "Не удалось подтвердить оформление. Проверьте статус корзины для получения актуальных инструкций.",
@@ -906,7 +906,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "checkoutUnavailable": "Оформление недоступно",
       "thisCheckoutIsNotAvailableFor": "Оформление недоступно для текущего аккаунта.",
       "enrollmentChanged": "Запись на курс изменилась",
-      "yourEnrollmentChangedCheckMyLearning": "Статус записи изменился. Перед следующим действием проверьте раздел «Моё обучение».",
+      "yourEnrollmentChangedCheckMyLearning": "Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.",
       "cartChanged": "Корзина изменилась",
       "yourCartIsNoLongerReady": "Корзина больше не готова к оформлению. Обновите её перед повторной попыткой.",
       "checkoutIsCurrentlyUnavailableTryAgain": "Оформление сейчас недоступно. Повторите попытку позже.",
@@ -924,7 +924,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "clearingCart": "Очистка корзины...",
       "browseCourses": "Смотреть курсы",
       "checkCheckoutStatus": "Проверить статус оплаты",
-      "checkoutStatusUncertain": "Корзина пока не может подтвердить, завершилась ли оплата частично. Перед новой оплатой проверьте «Моё обучение».",
+      "checkoutStatusUncertain": "Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.",
       "refreshCart": "Обновить корзину",
       "courseLowercase": "курс",
       "courseLabel": "Курс",
@@ -1410,7 +1410,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "signInBeforePaymentStatus": "To‘lov holatini tekshirishdan oldin yana kiring.",
       "paymentActionUnavailable": "Bu to‘lov amali joriy akkaunt uchun mavjud emas.",
       "mockPaymentUnavailable": "Sinov to‘lovi hozir mavjud emas. Ro‘yxatdan o‘tish holatini keyinroq tekshiring.",
-      "mockPaymentAwaitingCompletion": "Sinov to‘lovi yakunlanishini kutmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
+      "mockPaymentAwaitingCompletion": "To‘lov kutilmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.",
       "checkPaymentStatus": "To‘lov holatini tekshirish",
       "completeMockPayment": "Sinov to‘lovini yakunlash",
       "simulateMockPaymentFailure": "Sinov to‘lovi xatosini taqlid qilish",
@@ -1487,7 +1487,7 @@ export const GENERATED_LOCALE_RESOURCES = {
     },
     "cart": {
       "checkoutAccepted": "Buyurtma qabul qilindi",
-      "mockCheckoutWasAcceptedPaymentIs": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; “Ta’limim” bo‘limida davom eting.",
+      "mockCheckoutWasAcceptedPaymentIs": "Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.",
       "checkMyLearning": "“Ta’limim”ni tekshirish",
       "checkoutStatusNeedsChecking": "Buyurtma holatini tekshirish kerak",
       "weCouldNotConfirmCheckoutCheck": "Buyurtmani tasdiqlab bo‘lmadi. Yangilangan ko‘rsatmalar uchun savat holatini tekshiring.",
@@ -1497,7 +1497,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "checkoutUnavailable": "Buyurtma berish imkonsiz",
       "thisCheckoutIsNotAvailableFor": "Joriy akkaunt uchun buyurtma berish mavjud emas.",
       "enrollmentChanged": "Kursga yozilish holati o‘zgardi",
-      "yourEnrollmentChangedCheckMyLearning": "Yozilish holati o‘zgardi. Keyingi amaldan oldin “Ta’limim” bo‘limini tekshiring.",
+      "yourEnrollmentChangedCheckMyLearning": "Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.",
       "cartChanged": "Savat o‘zgardi",
       "yourCartIsNoLongerReady": "Savat bu buyurtma uchun tayyor emas. Qayta urinishdan oldin uni yangilang.",
       "checkoutIsCurrentlyUnavailableTryAgain": "Buyurtma berish hozircha mavjud emas. Keyinroq qayta urinib ko‘ring.",
@@ -1515,7 +1515,7 @@ export const GENERATED_LOCALE_RESOURCES = {
       "clearingCart": "Savat tozalanmoqda...",
       "browseCourses": "Kurslarni ko‘rish",
       "checkCheckoutStatus": "To‘lov holatini tekshirish",
-      "checkoutStatusUncertain": "Savat to‘lov qisman yakunlanganini hozircha tasdiqlay olmaydi. Yana to‘lov qilishdan oldin «Ta’limim»ni tekshiring.",
+      "checkoutStatusUncertain": "Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.",
       "refreshCart": "Savatni yangilash",
       "courseLowercase": "kurs",
       "courseLabel": "Kurs",
`;

function reverseUnifiedPatch(source, patch) {
  const sourceLines = source.split('\n');
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
    const actual = sourceLines.slice(hunk.position, hunk.position + hunk.next.length);
    if (actual.join('\n') !== hunk.next.join('\n'))
      throw new Error(
        'test fixture cannot reconstruct the recorded base from the checked-in artifact',
      );
    sourceLines.splice(hunk.position, hunk.next.length, ...hunk.previous);
  }
  return sourceLines.join('\n');
}

export async function writeRecordedBaseArtifacts({ registryBaselinePath, generatedBaselinePath }) {
  const [currentRegistry, currentOutput] = await Promise.all([
    readFile('localization/corpus/registry.json', 'utf8'),
    readFile('src/shared/locale/generated-resources.ts', 'utf8'),
  ]);
  await Promise.all([
    writeFile(registryBaselinePath, reverseUnifiedPatch(currentRegistry, REGISTRY_PATCH), 'utf8'),
    writeFile(generatedBaselinePath, reverseUnifiedPatch(currentOutput, GENERATED_PATCH), 'utf8'),
  ]);
}
