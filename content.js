chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "searchAddress") {
    const address = message.address;
    const searchInput = document.querySelector(".manageSearch__input");

    if (!searchInput) {
      sendResponse({ result: "Поле ввода для поиска не найдено." });
      return;
    }

    // Вводим адрес в поле поиска
    searchInput.focus();
    searchInput.value = address;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));

    const hintsContainer = document.querySelector(".manageSearch__hints");
    if (!hintsContainer) {
      sendResponse({ result: "Элемент manageSearch__hints не найден." });
      return;
    }

    // Таймер на случай, если результат не появится
    const timeout = setTimeout(() => {
      observer.disconnect();
      sendResponse({ result: "Для этого адреса УК не определена." });
    }, 5000);

    const observer = new MutationObserver((mutationsList, observer) => {
      const hintItem = hintsContainer.querySelector(".manageSearch__hintDataTitle_address");

      if (hintItem) {
        const resultText = hintItem.textContent.trim();
        clearTimeout(timeout); // Очищаем таймер
        observer.disconnect(); // Останавливаем наблюдение
        sendResponse({ result: resultText });
      }
    });

    observer.observe(hintsContainer, { childList: true, subtree: true });

    // Указываем, что ответ будет отправлен позже
    return true;
  }
});
