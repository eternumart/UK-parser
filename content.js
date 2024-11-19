chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "searchAddress") {
    const address = message.address;

    if (!window.processedAddresses) {
      window.processedAddresses = new Set();
    }

    // Проверяем, был ли адрес уже обработан
    if (window.processedAddresses.has(address)) {
      console.log("Address already processed:", address);
      sendResponse({ result: "Already processed" });
      return;
    }

    console.log("Received address to search:", address);

    simulateSearch(address, (result) => {
      const validResult = result && /^[а-яА-ЯёЁ\s\d"'\-()]+$/.test(result);

      if (validResult) {
        window.processedAddresses.add(address); // Помечаем как обработанный только при валидном результате
      }

      sendResponse({ result: validResult ? result : "Not found" });
    });

    return true; // Указываем, что ответ будет асинхронным
  }
});

function simulateSearch(address, callback) {
  const searchInput = document.querySelector(".manageSearch__input");
  if (!searchInput) {
    console.error("Search input not found");
    callback("Search input not found");
    return;
  }

  searchInput.value = address;
  searchInput.dispatchEvent(new Event("input"));

  const searchButton = document.querySelector(".manageSearch__btn");
  if (!searchButton) {
    console.error("Search button not found");
    callback("Search button not found");
    return;
  }
  searchButton.click();

  setTimeout(() => {
    const hintsElement = document.querySelector(".manageSearch__hints");
    if (!hintsElement) {
      console.warn("Hints container not found. No results for address:", address);
      callback("No results");
      return;
    }

    const resultElement = hintsElement.querySelector(".manageSearch__hintDataTitle_address");
    const result = resultElement ? resultElement.textContent.trim() : null;

    console.log("Search result for address:", address, "is", result || "No result found");
    callback(result || "No result found");
  }, 2000);
}
