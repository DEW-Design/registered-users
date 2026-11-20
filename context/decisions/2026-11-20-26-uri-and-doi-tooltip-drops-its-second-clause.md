# 2026-11-20 - URI and DOI tooltip drops its second clause

- **Nov 20 2026: the tooltip on the dataset upload's URI / DOI number reads "Enter an existing identifier if known."** It read "Enter an existing identifier if known; otherwise, a unique ID will be generated." The designer, with a screenshot: "can we remove the last sentence?", then, after the first reading removed the wrong half: "I meant keep the quoted text." The clause that stays is the one quoted; "otherwise, a unique ID will be generated" goes.
  - **Changed.** One string in `_shared/dataset-upload/dataset-identifiers.tsx`. The Permit number field has no such tooltip.
  - **Verified live** (registered user, Adelaide Hills upload form): focusing the field's help icon shows "Enter an existing identifier if known."; zero console errors. `tsc` and `check:contracts` clean. Not committed.
