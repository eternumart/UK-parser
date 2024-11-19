chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadJSON") {
    const blob = new Blob([JSON.stringify(message.data, null, 2)], { type: "application/json" });
    const fileReader = new FileReader();

    // Преобразуем Blob в data URL
    fileReader.onload = function () {
      const dataUrl = fileReader.result;

      chrome.downloads.download({
        url: dataUrl,
        filename: "result.json",
        conflictAction: "overwrite"
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError.message);
        } else {
          console.log("Download initiated successfully.");
        }
      });
    };

    // Читаем Blob как data URL
    fileReader.readAsDataURL(blob);
  }
});
