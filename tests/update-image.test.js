const test = require("node:test");
const assert = require("node:assert/strict");
const { generateHtml, findCurrentImage, getNewYorkTime } = require("../update-image");

test("image HTML matches the exact TV format, including its trailing newline", () => {
    assert.equal(generateHtml({ url: "https://example.com/image.gif", alt: "Image for Monday" }), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynamic Image Display</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="imageContainer">
    <img id="displayedImage" src="https://example.com/image.gif" alt="Image for Monday">
  </div>
</body>
</html>
`);
});

test("null HTML matches the exact TV format, including its trailing newline", () => {
    assert.equal(generateHtml(null), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynamic Image Display</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="imageContainer">
    <p id="errorMessage" class="error">No image available for the current time.</p>
  </div>
</body>
</html>
`);
});

const schedule = {
    Monday: {
        "1500": "https://example.com/late.gif",
        "0900": "https://example.com/morning.gif",
        "1100": "https://example.com/noon.gif"
    },
    holidays: { "01-01": "https://example.com/holiday.gif", "01-16": "Stavv Bday" },
    error: { imageUrl: "https://example.com/error.gif" }
};

for (const [description, time, url, alt] of [
    ["before the first slot", "0859", "https://example.com/error.gif", "Fallback image"],
    ["at the first slot", "0900", "https://example.com/morning.gif", "Image for Monday"],
    ["at a later slot", "1100", "https://example.com/noon.gif", "Image for Monday"],
    ["between unsorted slots", "1200", "https://example.com/noon.gif", "Image for Monday"],
    ["after the last slot", "2359", "https://example.com/late.gif", "Image for Monday"]
]) {
    test(`selects the correct image ${description}`, () => {
        assert.deepEqual(findCurrentImage(schedule, "Monday", time, "01-02"), { url, alt });
    });
}

test("holiday URL overrides the weekday schedule", () => {
    assert.deepEqual(findCurrentImage(schedule, "Monday", "1200", "01-01"), {
        url: "https://example.com/holiday.gif", alt: "Holiday image for 01-01"
    });
});

test("text holiday falls through to the weekday schedule", () => {
    assert.deepEqual(findCurrentImage(schedule, "Monday", "1200", "01-16"), {
        url: "https://example.com/noon.gif", alt: "Image for Monday"
    });
});

test("missing weekday schedule uses the error image", () => {
    assert.deepEqual(findCurrentImage(schedule, "Sunday", "1200", "01-16"), {
        url: "https://example.com/error.gif", alt: "Fallback image"
    });
});

test("no schedule or error image returns null", () => {
    assert.equal(findCurrentImage({}, "Monday", "1200", "01-02"), null);
});

for (const [date, expected] of [
    ["2026-01-05T02:30:00Z", { day: "Sunday", time: "2130", date: "01-04" }],
    ["2026-07-06T16:30:00Z", { day: "Monday", time: "1230", date: "07-06" }],
    ["2026-03-08T06:59:00Z", { day: "Sunday", time: "0159", date: "03-08" }],
    ["2026-03-08T07:00:00Z", { day: "Sunday", time: "0300", date: "03-08" }],
    ["2026-11-01T05:30:00Z", { day: "Sunday", time: "0130", date: "11-01" }],
    ["2026-11-01T06:30:00Z", { day: "Sunday", time: "0130", date: "11-01" }]
]) {
    test(`converts ${date} to New York day, time and date`, () => {
        assert.deepEqual(getNewYorkTime(new Date(date)), expected);
    });
}
