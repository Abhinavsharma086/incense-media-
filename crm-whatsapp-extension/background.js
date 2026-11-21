// Incense Media CRM - Single Window WhatsApp Tab Controller
// Ensures that clicking WhatsApp for any lead reuses the existing WhatsApp Web / WhatsApp Business tab

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only process top-level frame navigations (frameId === 0)
  if (details.frameId !== 0) return;

  const urlStr = details.url || '';
  const isWhatsAppNav =
    urlStr.includes('web.whatsapp.com/send') ||
    urlStr.includes('api.whatsapp.com/send') ||
    urlStr.includes('wa.me/');

  if (!isWhatsAppNav) return;

  try {
    // Parse phone and text
    let targetPhone = '';
    let targetText = '';

    if (urlStr.includes('wa.me/')) {
      const match = urlStr.match(/wa\.me\/([0-9]+)/);
      if (match) targetPhone = match[1];
      const urlObj = new URL(urlStr);
      targetText = urlObj.searchParams.get('text') || '';
    } else {
      const urlObj = new URL(urlStr);
      targetPhone = (urlObj.searchParams.get('phone') || '').replace(/[^0-9]/g, '');
      targetText = urlObj.searchParams.get('text') || '';
    }

    if (!targetPhone) return;

    const directUrl = `https://web.whatsapp.com/send?phone=${targetPhone}${
      targetText ? `&text=${encodeURIComponent(targetText)}` : ''
    }`;

    // Find all tabs currently open with WhatsApp Web or WhatsApp Business
    const allTabs = await chrome.tabs.query({});
    const waTabs = allTabs.filter(
      (t) =>
        t.url &&
        (t.url.includes('web.whatsapp.com') || t.url.includes('business.whatsapp.com'))
    );

    // Filter out the newly triggering navigation tab
    const existingWaTabs = waTabs.filter((t) => t.id !== details.tabId);

    if (existingWaTabs.length > 0) {
      // Pick the primary existing tab
      const primaryWaTab = existingWaTabs[0];

      console.log(
        `[Incense CRM Extension] Reusing existing WhatsApp tab (id: ${primaryWaTab.id}) for phone: ${targetPhone}`
      );

      // 1. Update the existing tab to the new conversation
      await chrome.tabs.update(primaryWaTab.id, {
        url: directUrl,
        active: true,
      });

      // 2. Bring that tab's window to focus
      if (primaryWaTab.windowId) {
        await chrome.windows.update(primaryWaTab.windowId, { focused: true });
      }

      // 3. Close the redundant newly-opened tab
      try {
        await chrome.tabs.remove(details.tabId);
      } catch (_) {}

      // 4. Also clean up any extra redundant WhatsApp tabs if user accumulated them
      if (existingWaTabs.length > 1) {
        for (let i = 1; i < existingWaTabs.length; i++) {
          try {
            await chrome.tabs.remove(existingWaTabs[i].id);
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.error('[Incense CRM Extension] Error routing WhatsApp tab:', err);
  }
});
