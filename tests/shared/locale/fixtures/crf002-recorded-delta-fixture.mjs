export const CRF_002_PATCH = String.raw`
diff --git a/localization/corpus/registry.json b/localization/corpus/registry.json
index 8ed4b52..f36a2c4 100644
--- a/localization/corpus/registry.json
+++ b/localization/corpus/registry.json
@@ -298,11 +298,11 @@
     }
   },
   "summary": {
-    "translationUnits": 545,
-    "sourceOccurrences": 768,
+    "translationUnits": 555,
+    "sourceOccurrences": 778,
     "mergedDuplicateRows": 223,
-    "russianDrafts": 544,
-    "uzbekDrafts": 544,
+    "russianDrafts": 554,
+    "uzbekDrafts": 554,
     "draftStatus": "Draft",
     "englishPolicy": "Immutable source",
     "reviewProtocol": "Russian product owner + Uzbek native reviewer"
@@ -29943,6 +29943,1046 @@
         "legacyReviewStatus": "Pending",
         "ownerTasks": ["FE-026"]
       }
+    },
+    {
+      "id": "MLUX-C0544",
+      "namespace": "cart",
+      "key": "completeMockPayment",
+      "english": "Complete mock payment",
+      "sourceRevision": "sha256:09cb0bb54c00d7d4494dfef4c8d89bc69520357fc9537e5878a74fbfde3617cc",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0772",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite payment primary action"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Завершить тестовый платёж",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Завершить тестовый платёж",
+              "nextCandidate": "Завершить тестовый платёж",
+              "sourceRevision": "sha256:09cb0bb54c00d7d4494dfef4c8d89bc69520357fc9537e5878a74fbfde3617cc",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:09cb0bb54c00d7d4494dfef4c8d89bc69520357fc9537e5878a74fbfde3617cc",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "Sinov to‘lovini yakunlash",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Sinov to‘lovini yakunlash",
+              "nextCandidate": "Sinov to‘lovini yakunlash",
+              "sourceRevision": "sha256:09cb0bb54c00d7d4494dfef4c8d89bc69520357fc9537e5878a74fbfde3617cc",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:09cb0bb54c00d7d4494dfef4c8d89bc69520357fc9537e5878a74fbfde3617cc",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0545",
+      "namespace": "cart",
+      "key": "simulatePaymentFailure",
+      "english": "Simulate payment failure",
+      "sourceRevision": "sha256:a2629db4ee9850c74ac50c6efbb5ef831325603e0935e926da6691bed54c3ae9",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0773",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite per-course failure action"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Сымитировать ошибку платежа",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Сымитировать ошибку платежа",
+              "nextCandidate": "Сымитировать ошибку платежа",
+              "sourceRevision": "sha256:a2629db4ee9850c74ac50c6efbb5ef831325603e0935e926da6691bed54c3ae9",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:a2629db4ee9850c74ac50c6efbb5ef831325603e0935e926da6691bed54c3ae9",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "To‘lov xatosini taqlid qilish",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "To‘lov xatosini taqlid qilish",
+              "nextCandidate": "To‘lov xatosini taqlid qilish",
+              "sourceRevision": "sha256:a2629db4ee9850c74ac50c6efbb5ef831325603e0935e926da6691bed54c3ae9",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:a2629db4ee9850c74ac50c6efbb5ef831325603e0935e926da6691bed54c3ae9",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0546",
+      "namespace": "cart",
+      "key": "paymentCompleted",
+      "english": "Payment completed",
+      "sourceRevision": "sha256:341f9db29cc82f8c81656e9cab144a75d4fdf170d94c32e018823fd712cc7d9c",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0774",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite proven active notice"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Платёж завершён",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Платёж завершён",
+              "nextCandidate": "Платёж завершён",
+              "sourceRevision": "sha256:341f9db29cc82f8c81656e9cab144a75d4fdf170d94c32e018823fd712cc7d9c",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:341f9db29cc82f8c81656e9cab144a75d4fdf170d94c32e018823fd712cc7d9c",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "To‘lov yakunlandi",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "To‘lov yakunlandi",
+              "nextCandidate": "To‘lov yakunlandi",
+              "sourceRevision": "sha256:341f9db29cc82f8c81656e9cab144a75d4fdf170d94c32e018823fd712cc7d9c",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:341f9db29cc82f8c81656e9cab144a75d4fdf170d94c32e018823fd712cc7d9c",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0547",
+      "namespace": "cart",
+      "key": "learningIsNowAvailable",
+      "english": "Learning is now available.",
+      "sourceRevision": "sha256:592a4bbcbe19c074eedb746e500a1282dbe8dff53556435af6284cdc4a16e1d9",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0775",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite proven active notice"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Обучение теперь доступно.",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Обучение теперь доступно.",
+              "nextCandidate": "Обучение теперь доступно.",
+              "sourceRevision": "sha256:592a4bbcbe19c074eedb746e500a1282dbe8dff53556435af6284cdc4a16e1d9",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:592a4bbcbe19c074eedb746e500a1282dbe8dff53556435af6284cdc4a16e1d9",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "Ta’lim endi mavjud.",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Ta’lim endi mavjud.",
+              "nextCandidate": "Ta’lim endi mavjud.",
+              "sourceRevision": "sha256:592a4bbcbe19c074eedb746e500a1282dbe8dff53556435af6284cdc4a16e1d9",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:592a4bbcbe19c074eedb746e500a1282dbe8dff53556435af6284cdc4a16e1d9",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0548",
+      "namespace": "cart",
+      "key": "paymentFailed",
+      "english": "Payment failed",
+      "sourceRevision": "sha256:ca4400281375cd65b0bad0eac93515adb67d8612905eb2716970d7483d1790eb",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0776",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite restored payment notice"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Платёж не прошёл",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Платёж не прошёл",
+              "nextCandidate": "Платёж не прошёл",
+              "sourceRevision": "sha256:ca4400281375cd65b0bad0eac93515adb67d8612905eb2716970d7483d1790eb",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:ca4400281375cd65b0bad0eac93515adb67d8612905eb2716970d7483d1790eb",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "To‘lov amalga oshmadi",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "To‘lov amalga oshmadi",
+              "nextCandidate": "To‘lov amalga oshmadi",
+              "sourceRevision": "sha256:ca4400281375cd65b0bad0eac93515adb67d8612905eb2716970d7483d1790eb",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:ca4400281375cd65b0bad0eac93515adb67d8612905eb2716970d7483d1790eb",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0549",
+      "namespace": "cart",
+      "key": "courseReturnedToCart",
+      "english": "The course was returned to your cart.",
+      "sourceRevision": "sha256:574153006f3ce18c0bc220822e8750527d10038ba645678ba0d13ad984b40f07",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0777",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite restored payment notice"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Курс возвращён в вашу корзину.",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Курс возвращён в вашу корзину.",
+              "nextCandidate": "Курс возвращён в вашу корзину.",
+              "sourceRevision": "sha256:574153006f3ce18c0bc220822e8750527d10038ba645678ba0d13ad984b40f07",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:574153006f3ce18c0bc220822e8750527d10038ba645678ba0d13ad984b40f07",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "Kurs savatingizga qaytarildi.",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Kurs savatingizga qaytarildi.",
+              "nextCandidate": "Kurs savatingizga qaytarildi.",
+              "sourceRevision": "sha256:574153006f3ce18c0bc220822e8750527d10038ba645678ba0d13ad984b40f07",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:574153006f3ce18c0bc220822e8750527d10038ba645678ba0d13ad984b40f07",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0550",
+      "namespace": "cart",
+      "key": "retryMockPayment",
+      "english": "Retry mock payment",
+      "sourceRevision": "sha256:1551c65453cc03a7b64c603907b86711e2a62676e9f23d1fd6759b0363532415",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0778",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite restored payment retry action"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Повторить тестовый платёж",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Повторить тестовый платёж",
+              "nextCandidate": "Повторить тестовый платёж",
+              "sourceRevision": "sha256:1551c65453cc03a7b64c603907b86711e2a62676e9f23d1fd6759b0363532415",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:1551c65453cc03a7b64c603907b86711e2a62676e9f23d1fd6759b0363532415",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "Sinov to‘lovini qayta urinib ko‘rish",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Sinov to‘lovini qayta urinib ko‘rish",
+              "nextCandidate": "Sinov to‘lovini qayta urinib ko‘rish",
+              "sourceRevision": "sha256:1551c65453cc03a7b64c603907b86711e2a62676e9f23d1fd6759b0363532415",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:1551c65453cc03a7b64c603907b86711e2a62676e9f23d1fd6759b0363532415",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0551",
+      "namespace": "cart",
+      "key": "resumePaymentCheck",
+      "english": "Check pending payment",
+      "sourceRevision": "sha256:e6dc499de46efac23f3fabedd1030105e8436211601c6a2d643ccc2614e11df1",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0779",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite explicit recovery action"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Проверить ожидающий платёж",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Проверить ожидающий платёж",
+              "nextCandidate": "Проверить ожидающий платёж",
+              "sourceRevision": "sha256:e6dc499de46efac23f3fabedd1030105e8436211601c6a2d643ccc2614e11df1",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:e6dc499de46efac23f3fabedd1030105e8436211601c6a2d643ccc2614e11df1",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "Kutilayotgan to‘lovni tekshirish",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Kutilayotgan to‘lovni tekshirish",
+              "nextCandidate": "Kutilayotgan to‘lovni tekshirish",
+              "sourceRevision": "sha256:e6dc499de46efac23f3fabedd1030105e8436211601c6a2d643ccc2614e11df1",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:e6dc499de46efac23f3fabedd1030105e8436211601c6a2d643ccc2614e11df1",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0552",
+      "namespace": "cart",
+      "key": "paymentResultNeedsChecking",
+      "english": "Payment result needs checking",
+      "sourceRevision": "sha256:dfde09869cf5d2e6f9c11896dfb571f3708fe269f48fee472f639535719d603d",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0780",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite integrity-unknown notice"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Нужно проверить результат платежа",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Нужно проверить результат платежа",
+              "nextCandidate": "Нужно проверить результат платежа",
+              "sourceRevision": "sha256:dfde09869cf5d2e6f9c11896dfb571f3708fe269f48fee472f639535719d603d",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:dfde09869cf5d2e6f9c11896dfb571f3708fe269f48fee472f639535719d603d",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "To‘lov natijasini tekshirish kerak",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "To‘lov natijasini tekshirish kerak",
+              "nextCandidate": "To‘lov natijasini tekshirish kerak",
+              "sourceRevision": "sha256:dfde09869cf5d2e6f9c11896dfb571f3708fe269f48fee472f639535719d603d",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:dfde09869cf5d2e6f9c11896dfb571f3708fe269f48fee472f639535719d603d",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
+    },
+    {
+      "id": "MLUX-C0553",
+      "namespace": "cart",
+      "key": "doNotStartAnotherPayment",
+      "english": "We could not safely confirm every payment result. Do not start another payment.",
+      "sourceRevision": "sha256:f655579a57f06c0d3b58a569866b951a5e2de0137f67471d800421943e67ec57",
+      "unitLifecycle": "active",
+      "occurrences": [
+        {
+          "id": "MLUX-O0781",
+          "context": "src/pages/cart-page/CartPage.tsx — Cart composite integrity-unknown notice"
+        }
+      ],
+      "placeholdersByLocale": {
+        "en": [],
+        "ru": [],
+        "uz": []
+      },
+      "renderingContract": null,
+      "pluralForms": null,
+      "locales": {
+        "ru": {
+          "candidate": "Не удалось безопасно подтвердить все результаты платежа. Не начинайте новый платёж.",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:33:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Не удалось безопасно подтвердить все результаты платежа. Не начинайте новый платёж.",
+              "nextCandidate": "Не удалось безопасно подтвердить все результаты платежа. Не начинайте новый платёж.",
+              "sourceRevision": "sha256:f655579a57f06c0d3b58a569866b951a5e2de0137f67471d800421943e67ec57",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["ru"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:33:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:f655579a57f06c0d3b58a569866b951a5e2de0137f67471d800421943e67ec57",
+          "approvalAuthority": null
+        },
+        "uz": {
+          "candidate": "Har bir to‘lov natijasini xavfsiz tasdiqlab bo‘lmadi. Yangi to‘lovni boshlamang.",
+          "status": "review_requested",
+          "reviewerId": null,
+          "verdict": null,
+          "requestedAt": "2026-08-30T03:34:00.000Z",
+          "reviewedAt": null,
+          "approvalRecordedAt": null,
+          "history": [
+            {
+              "type": "transition",
+              "from": "draft",
+              "to": "review_requested",
+              "previousCandidate": "Har bir to‘lov natijasini xavfsiz tasdiqlab bo‘lmadi. Yangi to‘lovni boshlamang.",
+              "nextCandidate": "Har bir to‘lov natijasini xavfsiz tasdiqlab bo‘lmadi. Yangi to‘lovni boshlamang.",
+              "sourceRevision": "sha256:f655579a57f06c0d3b58a569866b951a5e2de0137f67471d800421943e67ec57",
+              "reviewRequest": {
+                "taskId": "CRF-002",
+                "locales": ["uz"],
+                "unitIds": [
+                  "MLUX-C0544",
+                  "MLUX-C0545",
+                  "MLUX-C0546",
+                  "MLUX-C0547",
+                  "MLUX-C0548",
+                  "MLUX-C0549",
+                  "MLUX-C0550",
+                  "MLUX-C0551",
+                  "MLUX-C0552",
+                  "MLUX-C0553"
+                ],
+                "requestedAt": "2026-08-30T03:34:00.000Z"
+              }
+            }
+          ],
+          "sourceRevision": "sha256:f655579a57f06c0d3b58a569866b951a5e2de0137f67471d800421943e67ec57",
+          "approvalAuthority": null
+        }
+      },
+      "migrationProvenance": {
+        "legacyResourceStatus": "Draft",
+        "legacyReviewStatus": "Pending",
+        "ownerTasks": ["CRF-002"]
+      }
     }
   ],
   "consumerGrammar": {
@@ -29970,13 +31010,13 @@
         "sourcePath": "pages/cart-page/CartPage.tsx",
         "functionName": "CartRecoveryAction",
         "bindingName": "t",
-        "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+        "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
       },
       {
         "sourcePath": "pages/cart-page/CartPage.tsx",
         "functionName": "mutationStatusMessage",
         "bindingName": "t",
-        "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+        "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
       },
       {
         "sourcePath": "pages/course-detail-page/CourseActionPanel.tsx",
@@ -30105,35 +31145,35 @@
             "functionName": "CartPage",
             "argument": "initialLoadFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "loadFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "removeFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "clearFailure.messageKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "clearFailure.messageKey",
             "occurrence": 2,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           }
         ]
       },
@@ -30155,28 +31195,28 @@
             "functionName": "CartPage",
             "argument": "initialLoadFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "loadFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "removeFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           },
           {
             "sourcePath": "pages/cart-page/CartPage.tsx",
             "functionName": "CartPage",
             "argument": "clearFailure.titleKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           }
         ]
       },
@@ -30204,7 +31244,7 @@
             "functionName": "CartPage",
             "argument": "returnTarget.labelKey",
             "occurrence": 1,
-            "sourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            "sourceFingerprint": "sha256:938ca5323ed433de91af3d361a627c5a1559bf3129f2fa04b0578272263ec3c8"
           }
         ]
       },
@@ -30671,6 +31711,68 @@
         "hookName": "useMemo",
         "sourceFingerprint": "sha256:02bff34271831eefaabac86fc6a4fa1baf42608057205e198c6e11a69454ef5c"
       }
+    ],
+    "reconciliations": [
+      {
+        "request": {
+          "taskId": "CRF-002",
+          "sources": [
+            {
+              "sourcePath": "pages/cart-page/CartPage.tsx",
+              "expectedSourceFingerprint": "sha256:8ea0b407f242c4fbf8cb88a2c5fa979457d4c8f9ec90f98974d00e078683af4d"
+            }
+          ],
+          "obsolete": []
+        },
+        "requestDigest": "sha256:4be81b963669a36476cb3cb717b042ab74aa126cc7db0328898cb03d796ba62e",
+        "sources": [
+          {
+            "sourcePath": "pages/cart-page/CartPage.tsx",
+            "sourceFingerprint": "sha256:1be1c92c6eb003d27749c6c3d8f03f342cf9400d8c880bbd62440ed8ab4c7464",
+            "entryCount": 12
+          }
+        ]
+      },
+      {
+        "request": {
+          "taskId": "CRF-002",
+          "sources": [
+            {
+              "sourcePath": "pages/cart-page/CartPage.tsx",
+              "expectedSourceFingerprint": "sha256:1be1c92c6eb003d27749c6c3d8f03f342cf9400d8c880bbd62440ed8ab4c7464"
+            }
+          ],
+          "obsolete": []
+        },
+        "requestDigest": "sha256:4ca4d53d8df917f39ba2b489395dc7a9b810e2eacf6386365dbfd50af87b6d4d",
+        "sources": [
+          {
+            "sourcePath": "pages/cart-page/CartPage.tsx",
+            "sourceFingerprint": "sha256:71d863870e302b87534e364af9d2190414b5c458027f2f20e7dc07d97ec37d8c",
+            "entryCount": 12
+          }
+        ]
+      },
+      {
+        "request": {
+          "taskId": "CRF-002",
+          "sources": [
+            {
+              "sourcePath": "pages/cart-page/CartPage.tsx",
+              "expectedSourceFingerprint": "sha256:71d863870e302b87534e364af9d2190414b5c458027f2f20e7dc07d97ec37d8c"
+            }
+          ],
+          "obsolete": []
+        },
+        "requestDigest": "sha256:77dfb2fab5ea6c3d306c368fc1757eeff77b35d1e503b58344b7679dd16e19d6",
+        "sources": [
+          {
+            "sourcePath": "pages/cart-page/CartPage.tsx",
+            "sourceFingerprint": "sha256:ca13f06613d8768ec89197600aac518cf6a72ae9ab423b5a0e381d6a865a19e8",
+            "entryCount": 12
+          }
+        ]
+      }
     ]
   }
 }
diff --git a/src/shared/locale/generated-resources.ts b/src/shared/locale/generated-resources.ts
index 6b8a72c..3a13262 100644
--- a/src/shared/locale/generated-resources.ts
+++ b/src/shared/locale/generated-resources.ts
@@ -357,7 +357,17 @@ export const GENERATED_LOCALE_RESOURCES = {
       "cartChangedLatestCouldNotLoad": "Your cart changed, but the latest cart could not be loaded. Refresh to see the current cart.",
       "cartLoadFailed": "We could not load your cart",
       "unableToUpdateCart": "Unable to update cart",
-      "clear": "Clear"
+      "clear": "Clear",
+      "completeMockPayment": "Complete mock payment",
+      "simulatePaymentFailure": "Simulate payment failure",
+      "paymentCompleted": "Payment completed",
+      "learningIsNowAvailable": "Learning is now available.",
+      "paymentFailed": "Payment failed",
+      "courseReturnedToCart": "The course was returned to your cart.",
+      "retryMockPayment": "Retry mock payment",
+      "resumePaymentCheck": "Check pending payment",
+      "paymentResultNeedsChecking": "Payment result needs checking",
+      "doNotStartAnotherPayment": "We could not safely confirm every payment result. Do not start another payment."
     },
     "catalog": {
       "courseResultsUpdated": "Course results updated.",
@@ -944,7 +954,17 @@ export const GENERATED_LOCALE_RESOURCES = {
       "cartChangedLatestCouldNotLoad": "Корзина изменилась, но не удалось загрузить последние данные. Обновите страницу, чтобы увидеть текущую корзину.",
       "cartLoadFailed": "Не удалось загрузить корзину",
       "unableToUpdateCart": "Не удалось обновить корзину",
-      "clear": "Очистить"
+      "clear": "Очистить",
+      "completeMockPayment": "Завершить тестовый платёж",
+      "simulatePaymentFailure": "Сымитировать ошибку платежа",
+      "paymentCompleted": "Платёж завершён",
+      "learningIsNowAvailable": "Обучение теперь доступно.",
+      "paymentFailed": "Платёж не прошёл",
+      "courseReturnedToCart": "Курс возвращён в вашу корзину.",
+      "retryMockPayment": "Повторить тестовый платёж",
+      "resumePaymentCheck": "Проверить ожидающий платёж",
+      "paymentResultNeedsChecking": "Нужно проверить результат платежа",
+      "doNotStartAnotherPayment": "Не удалось безопасно подтвердить все результаты платежа. Не начинайте новый платёж."
     },
     "catalog": {
       "courseResultsUpdated": "Результаты поиска курсов обновлены.",
@@ -1535,7 +1555,17 @@ export const GENERATED_LOCALE_RESOURCES = {
       "cartChangedLatestCouldNotLoad": "Savatingiz o‘zgardi, ammo yangilangan savatni yuklab bo‘lmadi. Joriy savatni ko‘rish uchun sahifani yangilang.",
       "cartLoadFailed": "Savatni yuklab bo‘lmadi",
       "unableToUpdateCart": "Savatni yangilab bo‘lmadi",
-      "clear": "Tozalash"
+      "clear": "Tozalash",
+      "completeMockPayment": "Sinov to‘lovini yakunlash",
+      "simulatePaymentFailure": "To‘lov xatosini taqlid qilish",
+      "paymentCompleted": "To‘lov yakunlandi",
+      "learningIsNowAvailable": "Ta’lim endi mavjud.",
+      "paymentFailed": "To‘lov amalga oshmadi",
+      "courseReturnedToCart": "Kurs savatingizga qaytarildi.",
+      "retryMockPayment": "Sinov to‘lovini qayta urinib ko‘rish",
+      "resumePaymentCheck": "Kutilayotgan to‘lovni tekshirish",
+      "paymentResultNeedsChecking": "To‘lov natijasini tekshirish kerak",
+      "doNotStartAnotherPayment": "Har bir to‘lov natijasini xavfsiz tasdiqlab bo‘lmadi. Yangi to‘lovni boshlamang."
     },
     "catalog": {
       "courseResultsUpdated": "Kurs natijalari yangilandi.",
`;
