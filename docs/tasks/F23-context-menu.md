# F23 — Context menu “Comment on this page”

**Status:** done  
**PRD:** F23

## Behavior

Right-click on a page → “Comment on this page” → opens the side panel on that tab’s URL.

## Constraints

`contextMenus` permission. Still **no** content script and no page DOM. Skip `chrome:`, `about:`, extension pages.

## Done when

The menu item opens the same panel as the toolbar button, on the clicked tab.
