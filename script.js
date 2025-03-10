let imagesData = {};

async function loadImages() {
  try {
    const response = await fetch("images.json");
    if (!response.ok) {
      throw new Error("Failed to load images.json");
    }
    imagesData = await response.json();
    updateImage();
  } catch (error) {
    console.error("Error loading images:", error);
    showError("Unable to load image data.");
  }
}

function getNewYorkTime() {
  const now = new Date();
  const options = { timeZone: "America/New_York", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(now);
  const day = parts.find(part => part.type === "weekday").value;
  const hour = parts.find(part => part.type === "hour").value.padStart(2, "0");
  const minute = parts.find(part => part.type === "minute").value.padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const dayOfMonth = now.getDate().toString().padStart(2, "0");

  return { day, time: `${hour}${minute}`, date: `${month}-${dayOfMonth}` };
}

function findClosestImage(day, time, date) {
  const holidayImageUrl = imagesData.holidays?.[date];
  if (holidayImageUrl) {
    return holidayImageUrl;
  }

  const dayImages = imagesData[day];
  if (!dayImages) return null;

  const sortedTimes = Object.keys(dayImages).sort();
  let closestTime = null;

  for (const currentTime of sortedTimes) {
    if (time >= currentTime) {
      closestTime = currentTime;
    } else {
      break;
    }
  }

  return closestTime ? dayImages[closestTime] : null;
}

function updateImage() {
  const { day, time, date } = getNewYorkTime();

  const holidayImageUrl = imagesData.holidays?.[date];
  if (holidayImageUrl) {
    displayImage(holidayImageUrl, `Holiday image for ${date}`);
    return;
  }

  const imageUrl = findClosestImage(day, time, date);
  if (imageUrl) {
    displayImage(imageUrl, `Image for ${day}`);
  } else {
    showError("No image available for the current time.");
  }
}

function displayImage(url, altText) {
  const imgElement = document.getElementById("displayedImage");
  const errorMessage = document.getElementById("errorMessage");

  imgElement.src = url;
  imgElement.alt = altText;
  imgElement.style.display = "block";
  errorMessage.style.display = "none";
}

function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

setInterval(updateImage, 60000);
window.onload = loadImages;