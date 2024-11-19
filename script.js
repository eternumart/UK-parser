document.getElementById("processBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) {
    alert("Please select a file.");
    return;
  }

  const file = fileInput.files[0];
  const arrayBuffer = await file.arrayBuffer();

  // Обработка docx файла с помощью Mammoth
  mammoth
    .extractRawText({ arrayBuffer: arrayBuffer })
    .then((result) => {
      const rows = result.value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      console.log("Extracted rows:", rows);

      const tableStartIndex = rows.findIndex((row) => /^\d+\b/.test(row));
      if (tableStartIndex === -1) {
        alert("Table not found in the document.");
        return;
      }

      const tableRows = rows.slice(tableStartIndex);
      console.log("Extracted table rows:", tableRows);

      const validTableRows = parseTableRows(tableRows);

      if (!validTableRows.length) {
        alert("No valid rows found in the document.");
        return;
      }

      console.log("Filtered table rows:", validTableRows);

      showLoader(validTableRows.length);

      processAddresses(validTableRows).then((finalResults) => {
        console.log("Final results:", finalResults);

        hideLoader();

        const jsonBlob = new Blob([JSON.stringify(finalResults, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(jsonBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "result.json";
        a.click();
        URL.revokeObjectURL(url);
      });
    })
    .catch((err) => {
      console.error("Error processing DOCX:", err);
      alert("Failed to process the file.");
    });
});

function parseTableRows(rows) {
  const validTableRows = [];
  let currentRow = [];

  for (const row of rows) {
    const columns = row.split(/\s{2,}|\t/).filter((cell) => cell);

    if (columns.length === 9) {
      validTableRows.push(columns);
    } else if (columns.length > 0) {
      currentRow = currentRow.concat(columns);
      if (currentRow.length === 9) {
        validTableRows.push(currentRow);
        currentRow = [];
      }
    }
  }

  if (currentRow.length === 9) {
    validTableRows.push(currentRow);
  }

  // Проверяем, чтобы каждая строка имела 9 колонок
  return validTableRows.filter((row) => row.length === 9);
}

function showLoader(totalCount) {
  const loader = document.getElementById("loader");
  loader.style.display = "block";
  const progressText = document.getElementById("progressText");
  progressText.textContent = `Обработано: 0 / ${totalCount}`;
}

function updateLoader(processedCount, totalCount) {
  const progressText = document.getElementById("progressText");
  progressText.textContent = `Обработано: ${processedCount} / ${totalCount}`;
}

function hideLoader() {
  const loader = document.getElementById("loader");
  loader.style.display = "none";
}

async function processAddresses(dataRows) {
  const results = [];
  const processedAddresses = new Set();

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
      "processed": false
    };

    const addressToCheck = jsonRow["Адрес здания"];

    while (!jsonRow["processed"]) {
      if (processedAddresses.has(addressToCheck)) {
        console.log(`Skipping already processed address: ${addressToCheck}`);
        break;
      }

      const company = await searchCompany(addressToCheck);

      if (company && company !== "No results" && company !== "Already processed" && company !== "Not found") {
        jsonRow["УК"] = company;
        jsonRow["processed"] = true;
        processedAddresses.add(addressToCheck); // Помечаем адрес как обработанный
      } else if (company === "No results") {
        console.warn(`No results for address: ${addressToCheck}`);
        break; // Прекращаем попытки, если результатов нет
      } else {
        console.log(`Retrying for address: ${addressToCheck}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Задержка перед повтором
      }
    }

    if (jsonRow["processed"]) {
      results.push(jsonRow);
    }

    updateLoader(results.length, dataRows.length);
  }

  return results;
}



function searchCompany(address) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("No active tabs found.");
        resolve(null);
        return;
      }

      const activeTab = tabs[0];

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ["content.js"]
        },
        () => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: "searchAddress", address },
            (response) => {
              if (!response || !response.result || response.result === "Already processed" || response.result === "Not found") {
                resolve(null);
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

