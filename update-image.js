const fs = require("fs");
const path = require("path");

function getNewYorkTime(now) {
    const options = {
        timeZone: "America/New_York",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(now);

    const day = parts.find(part => part.type === "weekday").value;
    const hour = parts.find(part => part.type === "hour").value.padStart(2, "0");
    const minute = parts.find(part => part.type === "minute").value.padStart(2, "0");

    const monthFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "2-digit",
        day: "2-digit"
    });
    const dateParts = monthFormatter.formatToParts(now);
    const month = dateParts.find(part => part.type === "month").value;
    const dayOfMonth = dateParts.find(part => part.type === "day").value;

    return { day, time: `${hour}${minute}`, date: `${month}-${dayOfMonth}` };
}

function getWorkSlot(now) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", hourCycle: "h23"
    }).formatToParts(now);
    const value = type => Number(parts.find(part => part.type === type).value);
    const calendarDate = Date.UTC(value("year"), value("month") - 1, value("day"));
    // Monday 1970-01-05 is slot zero; weekends reuse Friday's final slot.
    const days = Math.floor((calendarDate - Date.UTC(1970, 0, 5)) / 86400000);
    const weeks = Math.floor(days / 7);
    const weekday = days - weeks * 7;
    const weekdaysSinceEpoch = weeks * 5 + Math.min(weekday, 4);
    const hourSlot = weekday >= 5 ? 12 : Math.max(0, Math.min(value("hour") - 6, 12));
    return weekdaysSinceEpoch * 13 + hourSlot;
}

function findCurrentImage(imagesData, now) {
    const { date } = getNewYorkTime(now);
    const holidayEntry = imagesData.holidays?.[date];
    if (holidayEntry?.startsWith("http")) {
        return { url: holidayEntry, alt: `Holiday image for ${date}` };
    }

    if (imagesData.pool?.length) {
        const slot = getWorkSlot(now);
        const index = ((slot % imagesData.pool.length) + imagesData.pool.length) % imagesData.pool.length;
        return { url: imagesData.pool[index], alt: "Rotating image" };
    }

    if (imagesData.error?.imageUrl) {
        return { url: imagesData.error.imageUrl, alt: "Fallback image" };
    }

    return null;
}

function generateHtml(imageResult) {
    const imgTag = imageResult
        ? `<img id="displayedImage" src="${imageResult.url}" alt="${imageResult.alt}">`
        : "<p id=\"errorMessage\" class=\"error\">No image available for the current time.</p>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynamic Image Display</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="imageContainer">
    ${imgTag}
  </div>
</body>
</html>
`;
}

function main() {
    const imagesPath = path.join(__dirname, "images.json");
    const indexPath = path.join(__dirname, "index.html");

    const imagesData = JSON.parse(fs.readFileSync(imagesPath, "utf-8"));
    const now = new Date();
    const { day, time, date } = getNewYorkTime(now);

    console.log(`Current NY time: ${day} ${time}, date: ${date}`);

    const imageResult = findCurrentImage(imagesData, now);

    if (imageResult) {
        console.log(`Selected image: ${imageResult.url}`);
    } else {
        console.log("No image found for current time.");
    }

    const html = generateHtml(imageResult);
    fs.writeFileSync(indexPath, html, "utf-8");
    console.log("index.html updated successfully.");
}

module.exports = { getNewYorkTime, findCurrentImage, generateHtml };

if (require.main === module) {
    main();
}
