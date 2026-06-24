const fs = require("fs");
const path = require("path");

function getNewYorkTime() {
    const now = new Date();
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

function findCurrentImage(imagesData, day, time, date) {
    // Check holidays first
    const holidayEntry = imagesData.holidays?.[date];
    if (holidayEntry) {
        // Some holiday entries are just text labels (e.g. "Stavv Bday"), not URLs
        if (holidayEntry.startsWith("http")) {
            return { url: holidayEntry, alt: `Holiday image for ${date}` };
        }
        // For text-only holidays (birthdays etc.), fall through to regular schedule
        // or use error fallback if no schedule matches
    }

    // Check weekday schedule
    const dayImages = imagesData[day];
    if (dayImages) {
        const sortedTimes = Object.keys(dayImages).sort();
        let closestTime = null;

        for (const currentTime of sortedTimes) {
            if (time >= currentTime) {
                closestTime = currentTime;
            } else {
                break;
            }
        }

        if (closestTime) {
            return { url: dayImages[closestTime], alt: `Image for ${day}` };
        }
    }

    // Fallback to error image
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
    const { day, time, date } = getNewYorkTime();

    console.log(`Current NY time: ${day} ${time}, date: ${date}`);

    const imageResult = findCurrentImage(imagesData, day, time, date);

    if (imageResult) {
        console.log(`Selected image: ${imageResult.url}`);
    } else {
        console.log("No image found for current time.");
    }

    const html = generateHtml(imageResult);
    fs.writeFileSync(indexPath, html, "utf-8");
    console.log("index.html updated successfully.");
}

main();
