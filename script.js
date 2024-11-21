// Показать лоадер
function showLoader(total) {
  const loader = document.getElementById("loader");
  const progressText = document.getElementById("progressText");
  const inputFile = document.getElementById("fileInput");
  const processBtn = document.getElementById("processBtn");

  if (!loader || !progressText) {
    console.warn("Не найден элемент лоадера или текста прогресса в DOM.");
    return;
  }

  loader.style.display = "flex";
  inputFile.style.display = "none";
  processBtn.style.display = "none";
  progressText.textContent = `Обработано: 0 / ${total}`;
}

// Обновить лоадер
function updateLoader(processed, total) {
  const progressText = document.getElementById("progressText");
  if (!progressText) {
    console.warn("Не найден элемент текста прогресса в DOM.");
    return;
  }
  progressText.textContent = `Обработано: ${processed} / ${total}`;
}

// Скрыть лоадер
function hideLoader() {
  const loader = document.getElementById("loader");
  const inputFile = document.getElementById("fileInput");
  const processBtn = document.getElementById("processBtn");
  if (!loader) {
    console.warn("Не найден элемент лоадера в DOM.");
    return;
  }
  inputFile.display = "block";
  processBtn.style.display = "block";
  loader.style.display = "none";
}

// Обработка адресов
async function processAddresses(dataRows) {
  const finalResults = [];
  let processedCount = 0;

  for (const row of dataRows) {
    const jsonRow = {
      "№ п/п": row[0],
      "Адрес здания": row[1],
      "Округ": row[2],
      "Район": row[3],
      "Серия проекта": row[4],
      "Год постройки": row[5],
      "Кол-во этажей": row[6],
      "Полезная площадь (кв.м)": row[7],
      "Строительный объем (куб.м)": row[8],
      "УК": "",
      "processed": false,
    };

    const result = await searchCompany(jsonRow["Адрес здания"]);
    if (result) {
      jsonRow["УК"] = result;
      jsonRow["processed"] = true;
    }

    finalResults.push(jsonRow);
    processedCount++;
    updateLoader(processedCount, dataRows.length);
  }

  return finalResults;
}

// Функция поиска УК через контентный скрипт
async function searchCompany(address) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        console.error("Не найдена открытая вкладка.");
        resolve("Не найдена открытая вкладка");
        return;
      }

      const activeTab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ["content.js"],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Ошибка инжектирования скрипта в страницу:", chrome.runtime.lastError.message);
            resolve("Для этого адреса УК не определена");
            return;
          }

          chrome.tabs.sendMessage(
            activeTab.id,
            { action: "searchAddress", address },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Ошибка отправки запроса:", chrome.runtime.lastError.message);
                resolve("Для этого адреса УК не определена");
              } else if (!response || !response.result) {
                resolve("Для этого адреса УК не определена");
              } else {
                resolve(response.result);
              }
            }
          );
        }
      );
    });
  });
}

// Конвертация данных в CSV с BOM
function convertToCSV(data) {
  if (!data || !data.length) {
    return "";
  }

  const headers = Object.keys(data[0]); // Заголовки CSV из ключей первого объекта
  const rows = data.map((row) =>
    headers
      .map((header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`) // Экранируем кавычки
      .join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n"); // Используем \n для корректного разделения строк
  const bom = "\uFEFF"; // BOM для поддержки кириллицы в Excel
  return bom + csvContent;
}


document.getElementById("processBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) {
    alert("Пожалуйста, выберите файл.");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (event) => {
    const csvText = event.target.result;
    const rows = csvText
      .split("\n")
      .map((row) => row.split(";")) // Используем ";" как разделитель входного CSV
      .filter((row) => row.length > 1 && row.some((cell) => cell.trim() !== ""));

    if (rows.length < 2) {
      alert("CSV файл пустой или содержит только заголовки.");
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log("Извлеченные из файла строки:", dataRows);

    if (dataRows.length === 0) {
      alert("Нет данных для обработки.");
      return;
    }

    showLoader(dataRows.length);

    const finalResults = await processAddresses(dataRows);

    console.log("Итоговые результаты:", finalResults);

    hideLoader();

    const csvData = convertToCSV(finalResults);

    const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = "Список адресов с управляющими компаниями.csv";
    document.body.appendChild(csvLink); // Добавляем ссылку в DOM для клика
    csvLink.click();
    document.body.removeChild(csvLink); // Удаляем ссылку после скачивания
    URL.revokeObjectURL(csvUrl);
  };

  reader.readAsText(file, "UTF-8");
});


