# Close numbers (build step, harden)

## node scripts/check-system.mjs --no-self-test --left (exit 0)
```
left: 646 allowlisted finding(s) in 151 file(s): trap/native-control 352, rule/arbitrary-value 110, rule/palette-use 104, rule/raw-value 33, rule/unregistered-ui 11, trap/button-div 7, rule/component-override 6, trap/loading-label-swap 6, rule/token-parity 6, trap/link-as-button 4, trap/motion-transition-all 4, rule/inline-px 1, trap/touch-autofocus 1, trap/overlay-conditional-render 1
left	app/(app)/_dashboard/category-panel.tsx	trap/native-control	1
left	app/(app)/_dashboard/dashboard-content.tsx	rule/arbitrary-value	1
left	app/(app)/_dashboard/dashboard-content.tsx	trap/link-as-button	1
left	app/(app)/_dashboard/sales-panel.tsx	rule/arbitrary-value	1
left	app/(app)/_dashboard/top-customers.tsx	rule/arbitrary-value	2
left	app/(app)/_dashboard/top-customers.tsx	trap/native-control	1
left	app/(app)/analytics/analytics-ui.tsx	trap/native-control	1
left	app/(app)/analytics/credit-tab.tsx	rule/arbitrary-value	1
left	app/(app)/analytics/customers-tab.tsx	rule/arbitrary-value	2
left	app/(app)/analytics/explore-ask.tsx	rule/arbitrary-value	1
left	app/(app)/analytics/explore-ask.tsx	trap/native-control	5
left	app/(app)/analytics/explore-build.tsx	trap/native-control	8
left	app/(app)/analytics/explore-shared.tsx	rule/arbitrary-value	2
left	app/(app)/analytics/explore-shared.tsx	trap/native-control	2
left	app/(app)/analytics/explore-simulate.tsx	trap/native-control	5
left	app/(app)/analytics/inventory-tab.tsx	rule/arbitrary-value	1
left	app/(app)/analytics/page.tsx	rule/arbitrary-value	3
left	app/(app)/analytics/page.tsx	trap/native-control	1
left	app/(app)/analytics/products-tab.tsx	rule/arbitrary-value	1
left	app/(app)/analytics/sales-tab.tsx	rule/arbitrary-value	3
left	app/(app)/analytics/sales-tab.tsx	trap/native-control	1
left	app/(app)/analytics/suppliers-tab.tsx	rule/arbitrary-value	1
left	app/(app)/audit/audit-drawer.tsx	rule/arbitrary-value	2
left	app/(app)/audit/page.tsx	trap/native-control	1
left	app/(app)/credits/page.tsx	rule/arbitrary-value	1
left	app/(app)/credits/page.tsx	trap/native-control	1
left	app/(app)/customers/customer-credit-tab.tsx	trap/link-as-button	1
left	app/(app)/customers/customer-form.tsx	trap/native-control	6
left	app/(app)/customers/customer-import-modal.tsx	rule/arbitrary-value	1
left	app/(app)/customers/customer-import-modal.tsx	trap/native-control	4
left	app/(app)/customers/customer-import-summary.tsx	rule/arbitrary-value	1
left	app/(app)/customers/customer-import-summary.tsx	trap/native-control	2
left	app/(app)/customers/customer-interactions-tab.tsx	trap/link-as-button	1
left	app/(app)/customers/customer-more-filters.tsx	trap/native-control	2
left	app/(app)/customers/customer-overview-tab.tsx	trap/native-control	1
left	app/(app)/customers/page.tsx	trap/native-control	2
left	app/(app)/engagement/churn.tsx	rule/component-override	3
left	app/(app)/engagement/churn.tsx	trap/native-control	2
left	app/(app)/engagement/compensation-drawer.tsx	trap/native-control	1
left	app/(app)/engagement/compensation-form.tsx	trap/native-control	4
left	app/(app)/engagement/enquiry-drawer.tsx	trap/loading-label-swap	1
left	app/(app)/engagement/enquiry-drawer.tsx	trap/native-control	2
left	app/(app)/engagement/enquiry-form.tsx	trap/native-control	3
left	app/(app)/engagement/enquiry-table.tsx	trap/native-control	1
left	app/(app)/engagement/feedback-drawer.tsx	trap/loading-label-swap	1
left	app/(app)/engagement/feedback-drawer.tsx	trap/native-control	4
left	app/(app)/engagement/feedback-form.tsx	trap/native-control	2
left	app/(app)/engagement/feedback-table.tsx	trap/native-control	1
left	app/(app)/engagement/interaction-insights.tsx	rule/inline-px	1
left	app/(app)/engagement/interactions.tsx	trap/native-control	3
left	app/(app)/engagement/page.tsx	trap/native-control	1
left	app/(app)/inventory/forms/adjust-form.tsx	trap/native-control	2
left	app/(app)/inventory/forms/batch-update-form.tsx	trap/native-control	3
left	app/(app)/inventory/forms/create-sku-form.tsx	trap/native-control	9
left	app/(app)/inventory/forms/edit-sku-form.tsx	trap/native-control	8
left	app/(app)/inventory/forms/purchase-form.tsx	trap/native-control	6
left	app/(app)/inventory/forms/request-form.tsx	trap/native-control	2
left	app/(app)/inventory/forms/transfer-form.tsx	trap/native-control	2
left	app/(app)/inventory/inventory-import-modal.tsx	rule/arbitrary-value	2
left	app/(app)/inventory/inventory-import-modal.tsx	trap/native-control	4
left	app/(app)/inventory/movements-tab.tsx	trap/native-control	1
left	app/(app)/inventory/page.tsx	rule/arbitrary-value	1
left	app/(app)/inventory/page.tsx	trap/native-control	2
left	app/(app)/inventory/product-drawer-panels.tsx	rule/arbitrary-value	2
left	app/(app)/inventory/product-drawer-panels.tsx	rule/palette-use	2
left	app/(app)/inventory/product-drawer-panels.tsx	rule/raw-value	2
left	app/(app)/inventory/product-drawer.tsx	trap/loading-label-swap	1
left	app/(app)/inventory/product-drawer.tsx	trap/native-control	6
left	app/(app)/inventory/requests-tab.tsx	trap/native-control	2
left	app/(app)/inventory/sales-trends.tsx	trap/native-control	2
left	app/(app)/inventory/stock-summary.tsx	trap/native-control	1
left	app/(app)/inventory/stock-tab.tsx	trap/native-control	2
left	app/(app)/jobs/[id]/page.tsx	trap/loading-label-swap	1
left	app/(app)/jobs/[id]/page.tsx	trap/native-control	1
left	app/(app)/kitchen/board.tsx	rule/arbitrary-value	1
left	app/(app)/kitchen/board.tsx	trap/native-control	7
left	app/(app)/kitchen/ingredients.tsx	rule/arbitrary-value	1
left	app/(app)/kitchen/ingredients.tsx	trap/native-control	10
left	app/(app)/kitchen/job-form-sections.tsx	rule/arbitrary-value	5
left	app/(app)/kitchen/job-form-sections.tsx	trap/native-control	28
left	app/(app)/kitchen/job-form.tsx	trap/native-control	3
left	app/(app)/kitchen/job-panel-tabs.tsx	rule/arbitrary-value	2
left	app/(app)/kitchen/job-panel-tabs.tsx	trap/native-control	5
left	app/(app)/kitchen/job-panel.tsx	trap/native-control	2
left	app/(app)/kitchen/kitchen-ui.tsx	trap/native-control	3
left	app/(app)/kitchen/page.tsx	trap/native-control	2
left	app/(app)/kitchen/recipes.tsx	rule/arbitrary-value	1
left	app/(app)/kitchen/recipes.tsx	trap/native-control	9
left	app/(app)/kitchen/settings.tsx	rule/arbitrary-value	1
left	app/(app)/kitchen/settings.tsx	trap/native-control	14
left	app/(app)/kitchen/yield-guide.tsx	rule/arbitrary-value	1
left	app/(app)/kitchen/yield-guide.tsx	trap/native-control	1
left	app/(app)/pos/overview.tsx	trap/native-control	1
left	app/(app)/pos/page.tsx	trap/native-control	1
left	app/(app)/pos/tills.tsx	trap/native-control	1
left	app/(app)/sales/add-sale-modal.tsx	trap/native-control	15
left	app/(app)/sales/page.tsx	rule/arbitrary-value	2
left	app/(app)/sales/page.tsx	trap/native-control	3
left	app/(app)/sales/product-combobox.tsx	trap/native-control	2
left	app/(app)/sales/sale-detail-panel.tsx	trap/native-control	2
left	app/(app)/sales/sale-detail-tabs.tsx	rule/arbitrary-value	1
left	app/(app)/sales/sale-detail-tabs.tsx	trap/native-control	13
left	app/(app)/sales/sale-receipt.ts	rule/raw-value	4
left	app/(app)/sales/sales-filter-bar.tsx	trap/native-control	1
left	app/(app)/sales/sales-import-modal.tsx	rule/arbitrary-value	4
left	app/(app)/sales/sales-import-modal.tsx	trap/native-control	5
left	app/(app)/settings/location-form-sheet.tsx	trap/native-control	4
left	app/(app)/settings/locations-section.tsx	trap/native-control	2
left	app/(app)/settings/page.tsx	rule/arbitrary-value	2
left	app/(app)/settings/password-section.tsx	rule/arbitrary-value	1
left	app/(app)/settings/password-section.tsx	rule/palette-use	1
left	app/(app)/settings/password-section.tsx	trap/loading-label-swap	1
left	app/(app)/settings/password-section.tsx	trap/motion-transition-all	1
left	app/(app)/settings/password-section.tsx	trap/native-control	5
left	app/(app)/settings/profile-section.tsx	trap/native-control	5
left	app/(app)/settings/role-form-sheet.tsx	trap/native-control	1
left	app/(app)/settings/roles-matrix.tsx	trap/native-control	2
left	app/(app)/settings/roles-section.tsx	trap/native-control	1
left	app/(app)/settings/settings-nav.tsx	trap/link-as-button	1
left	app/(app)/settings/sheet-select.tsx	trap/native-control	1
left	app/(app)/settings/user-form-sheet.tsx	trap/native-control	4
left	app/(app)/settings/users-section.tsx	trap/native-control	2
left	app/(app)/suppliers/issue-form.tsx	trap/native-control	3
left	app/(app)/suppliers/page.tsx	trap/native-control	4
left	app/(app)/suppliers/star-rating.tsx	trap/native-control	1
left	app/(app)/suppliers/supplier-details-tab.tsx	rule/arbitrary-value	1
left	app/(app)/suppliers/supplier-details-tab.tsx	trap/native-control	1
left	app/(app)/suppliers/supplier-form.tsx	trap/native-control	11
left	app/(app)/suppliers/supplier-issues-tab.tsx	trap/loading-label-swap	1
left	app/(app)/suppliers/supplier-issues-tab.tsx	trap/native-control	3
left	app/(app)/suppliers/supplier-issues-tab.tsx	trap/touch-autofocus	1
left	app/(app)/suppliers/supplier-purchases-tab.tsx	trap/native-control	1
left	app/(app)/suppliers/top-suppliers.tsx	trap/native-control	1
left	app/forgot-password/page.tsx	trap/native-control	1
left	app/globals.css	rule/raw-value	2
left	app/globals.css	rule/token-parity	6
left	app/kitchen-quote/[id]/page.tsx	rule/palette-use	14
left	app/kitchen-quote/[id]/page.tsx	trap/native-control	1
left	app/login/page.tsx	trap/native-control	2
left	app/reset-password/reset-password-form.tsx	trap/native-control	2
left	components/analytics-compare-tab.tsx	rule/arbitrary-value	9
left	components/analytics-compare-tab.tsx	trap/native-control	8
left	components/app/calendar.tsx	rule/arbitrary-value	3
left	components/app/data-table.tsx	trap/button-div	5
left	components/app/date-field.tsx	rule/arbitrary-value	2
left	components/app/filter-bar.tsx	rule/arbitrary-value	2
left	components/app/filter-bar.tsx	trap/overlay-conditional-render	1
left	components/app/kpi-strip.tsx	rule/arbitrary-value	1
left	components/app/page-header.tsx	rule/arbitrary-value	1
left	components/app/period-select.tsx	rule/arbitrary-value	1
left	components/app/segmented.tsx	rule/arbitrary-value	1
left	components/brand/brand-mark.tsx	rule/arbitrary-value	1
left	components/brand/brand-mark.tsx	rule/palette-use	1
left	components/brand/brand-mark.tsx	rule/raw-value	1
left	components/confirm-preview-modal.tsx	rule/arbitrary-value	1
left	components/confirm-preview-modal.tsx	trap/native-control	2
left	components/credits/credit-forms.tsx	trap/native-control	4
left	components/credits/credit-item-card.tsx	trap/native-control	4
left	components/credits/customer-credit-sheet.tsx	trap/native-control	1
left	components/hub-scope-filter.tsx	rule/arbitrary-value	2
left	components/hub-scope-filter.tsx	trap/native-control	2
left	components/insight-button.tsx	trap/button-div	1
left	components/insight-button.tsx	trap/native-control	2
left	components/kitchen-analytics-tab.tsx	rule/arbitrary-value	1
left	components/layout/sidebar.tsx	rule/arbitrary-value	6
left	components/layout/sidebar.tsx	rule/component-override	1
left	components/layout/sidebar.tsx	trap/button-div	1
left	components/layout/sidebar.tsx	trap/native-control	4
left	components/pos-payment-settings.tsx	trap/native-control	1
left	components/product-image-editor.tsx	trap/native-control	5
left	components/searchable-customer-select.tsx	trap/native-control	3
left	components/sku-multi-select.tsx	rule/arbitrary-value	2
left	components/sku-multi-select.tsx	trap/native-control	5
left	components/submit-button.tsx	rule/palette-use	1
left	components/submit-button.tsx	trap/native-control	1
left	components/till-registration.tsx	rule/arbitrary-value	1
left	components/ui/badge.tsx	rule/arbitrary-value	1
left	components/ui/badge.tsx	rule/unregistered-ui	1
left	components/ui/badge.tsx	trap/motion-transition-all	1
left	components/ui/button.tsx	rule/arbitrary-value	5
left	components/ui/button.tsx	trap/motion-transition-all	1
left	components/ui/card.tsx	rule/arbitrary-value	2
left	components/ui/card.tsx	rule/unregistered-ui	1
left	components/ui/dialog.tsx	rule/arbitrary-value	1
left	components/ui/dialog.tsx	rule/unregistered-ui	1
left	components/ui/input.tsx	rule/unregistered-ui	1
left	components/ui/label.tsx	rule/unregistered-ui	1
left	components/ui/loading-skeletons.tsx	rule/arbitrary-value	2
left	components/ui/metric-value.tsx	rule/unregistered-ui	1
left	components/ui/select.tsx	rule/arbitrary-value	1
left	components/ui/separator.tsx	rule/unregistered-ui	1
left	components/ui/sheet.tsx	rule/arbitrary-value	8
left	components/ui/sheet.tsx	rule/unregistered-ui	1
left	components/ui/sonner.tsx	rule/unregistered-ui	1
left	components/ui/switch.tsx	rule/palette-use	1
left	components/ui/table.tsx	rule/unregistered-ui	1
left	components/ui/tabs.tsx	rule/arbitrary-value	4
left	components/ui/tabs.tsx	rule/unregistered-ui	1
left	components/ui/tabs.tsx	trap/motion-transition-all	1
left	docs/system/examples/empty-state/filtered.tsx	trap/native-control	1
left	docs/system/examples/empty-state/first-run.tsx	trap/native-control	1
left	docs/system/examples/empty-state/in-data-table.tsx	trap/native-control	1
left	docs/system/examples/skeleton/avatar-and-cards.tsx	rule/component-override	2
left	lib/kitchen-types.ts	rule/palette-use	48
left	lib/mock-api/data.ts	rule/raw-value	2
left	lib/mock-api/handler.ts	rule/raw-value	2
left	lib/product-categories.ts	rule/raw-value	20
left	lib/settings-helpers.ts	rule/palette-use	36
check-system: 362 file(s) under /Users/jephaletan/Projects/Fudfarmer/fudfarmer-crm-next/.claude/worktrees/new-branch-from-update-71db62, 0 failing, 646 allowlisted
The check cannot see:
  - Rendered contrast, including non-text contrast of borders, focus rings and checkbox edges. Measure it in a browser
  - Behavior: what a click, Enter or Escape does, focus order and focus return, and whether Cancel submits
  - Layout at each viewport, overflow at 390px and touch target sizes
  - Visual overrides on components the registry does not list, and overrides built at runtime: cn() branches, spread props, a class name held in a variable
  - A loading state shown some other way than a label ternary on the button, such as a label read from a variable
  - Class names and values built at runtime, such as template strings, cn() branches or fontSize: size / 2.5
  - bg-white and text-black when the theme defines no role for their job, their opacity forms such as bg-black/50, and CSS keywords such as white in var() fallbacks
  - Files outside the include folders, and ui files missing from the drift list (they are scanned, but no hash guards them)
  - Whether a token's role comment still matches how the token is used
  - Rules the generated rules page marks review, or enforces only through their own Check: clause
  - Motion that is only measured: exit slower than enter, frequent-surface motion, linear easing, press delay, input lag and jank. Easing set in script or through a variable, and hover reveals written as Tailwind classes (v4 guards hover: itself, v3 does not)
  - Whether a pressed style covers the control whose tap highlight was removed: any pressed style in the repo passes trap/touch-tap-highlight
```

## Montage
skipped (dev server on :3456 not listening this session: curl http://localhost:3456/audit -> 000), so no before/after captures and no montage.

## Specs
13 spec(s) checked, 0 failure(s)

## Storybook index
252 entries {"Foundations":7,"App kit":169,"Primitives":76}
