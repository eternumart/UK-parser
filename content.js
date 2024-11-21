chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "searchAddress") {
    const address = message.address;

    if (!window.processedAddresses) {
      window.processedAddresses = new Set();
    }

    // Проверяем, был ли адрес уже обработан
    if (window.processedAddresses.has(address)) {
      console.log("Этот адрес уже обработан:", address);
      sendResponse({ result: "Уже обработан" });
      return;
    }

    console.log("Получен адрес для поиска:", address);

    simulateSearch(address, (result) => {
      const validResult = result && /^[а-яА-ЯёЁ\s\d"'\-()]+$/.test(result);

      if (validResult) {
        window.processedAddresses.add(address); // Помечаем как обработанный только при валидном результате
      }

      sendResponse({
        result: validResult ? result : "Для этого адреса УК не определена",
      });
    });

    return true; // Указываем, что ответ будет асинхронным
  }
});

// Добавляем стиль для подсветки
const style = `<style>.resultHighlight {background-color: yellow; transition: background-color 0.25s ease-in-out;}</style>`;
document.head.insertAdjacentHTML("beforeend", style);

function simulateSearch(address, callback) {
  setTimeout(() => {
    const searchInput = document.querySelector(".manageSearch__input");
    if (!searchInput) {
      console.error("Поисковая строка не найдена");
      callback("Поисковая строка не найдена");
      return;
    }

    searchInput.value = address;
    searchInput.dispatchEvent(new Event("input"));

    const searchButton = document.querySelector(".manageSearch__btn");
    if (!searchButton) {
      console.error("Кнопка поиска не найдена");
      callback("Кнопка поиска не найдена");
      return;
    }
    searchButton.click();

    const hintsElement = document.querySelector(".manageSearch__hints");
    if (!hintsElement) {
      console.warn("Для этого адреса УК не определена:", address);
      callback("Для этого адреса УК не определена");
      return;
    }

    const resultElement = hintsElement.querySelector(
      ".manageSearch__hintDataTitle_address"
    );
    if (resultElement) {
      resultElement.classList.add("resultHighlight"); // Подсвечиваем элемент
      setTimeout(() => {
        resultElement.classList.remove("resultHighlight"); // Убираем подсветку
      }, 300); // Подсветка держится 0.3 секунды
    }

    const result = resultElement ? resultElement.textContent.trim() : null;

    if (!result) {
      console.warn("Для этого адреса УК не определена:", address);
      callback("Для этого адреса УК не определена");
      return;
    }

    console.log("Управляющая компания для адреса:", address, "-", result);
    callback(result);
  }, 3500);
}
