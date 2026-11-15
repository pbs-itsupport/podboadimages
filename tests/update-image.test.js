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

const images = {
    pool: ["https://example.com/first.gif", "https://example.com/second.gif", "https://example.com/third.gif"],
    holidays: { "01-01": "https://example.com/holiday.gif", "01-16": "Stavv Bday" },
    error: { imageUrl: "https://example.com/error.gif" }
};

test("consecutive work hours select consecutive pool entries and wrap around", () => {
    const data = { ...images, holidays: {} };
    const picks = [6, 7, 8, 9].map(hour =>
        findCurrentImage(data, new Date(`1970-01-05T${hour + 5}:00:00Z`)));
    assert.deepEqual(picks, [
        { url: "https://example.com/first.gif", alt: "Rotating image" },
        { url: "https://example.com/second.gif", alt: "Rotating image" },
        { url: "https://example.com/third.gif", alt: "Rotating image" },
        { url: "https://example.com/first.gif", alt: "Rotating image" }
    ]);
});

test("reruns within one work hour keep the same image", () => {
    assert.deepEqual(findCurrentImage(images, new Date("2026-01-05T12:00:00Z")),
        findCurrentImage(images, new Date("2026-01-05T12:59:59Z")));
});

for (const [description, start, end] of [
    ["winter Friday to Monday", "2026-01-09T23:00:00Z", "2026-01-12T11:00:00Z"],
    ["summer Friday to Monday", "2026-07-10T22:00:00Z", "2026-07-13T10:00:00Z"],
    ["spring DST weekend", "2026-03-06T23:00:00Z", "2026-03-09T10:00:00Z"],
    ["autumn DST weekend", "2026-10-30T22:00:00Z", "2026-11-02T11:00:00Z"]
]) {
    test(`${description} advances exactly one pool entry`, () => {
        const pool = Array.from({ length: 24 }, (_, i) => `https://example.com/${i}.gif`);
        const data = { pool };
        const fridayIndex = pool.indexOf(findCurrentImage(data, new Date(start)).url);
        assert.equal(findCurrentImage(data, new Date(end)).url, pool[(fridayIndex + 1) % 24]);
    });
}

for (const [description, date, offset] of [
    ["EST", "2026-01-05", "-05:00"],
    ["EDT", "2026-07-06", "-04:00"]
]) {
    test(`extra runs reuse workday boundary images in ${description}`, () => {
        for (const [extra, boundary] of [["05", "06"], ["19", "18"]]) {
            assert.deepEqual(findCurrentImage(images, new Date(`${date}T${extra}:00:00${offset}`)),
                findCurrentImage(images, new Date(`${date}T${boundary}:00:00${offset}`)));
        }
    });
}

test("all weekend hours reuse Friday's final slot", () => {
    const friday = findCurrentImage(images, new Date("2026-07-10T22:00:00Z"));
    for (const day of [11, 12]) {
        for (let hour = 0; hour < 24; hour++) {
            assert.deepEqual(findCurrentImage(images,
                new Date(`2026-07-${day}T${String(hour).padStart(2, "0")}:00:00-04:00`)), friday);
        }
    }
});

for (const size of [13, 24]) {
    test(`consecutive work slots reach every entry in a pool of ${size}`, () => {
        const pool = Array.from({ length: size }, (_, i) => `https://example.com/${i}.gif`);
        const picks = [];
        for (const day of [5, 6]) {
            for (let hour = 6; hour <= 18; hour++) {
                picks.push(findCurrentImage({ pool },
                    new Date(`1970-01-0${day}T${String(hour).padStart(2, "0")}:00:00-05:00`)).url);
            }
        }
        assert.deepEqual(picks.slice(0, size), pool);
        assert.equal(new Set(picks).size, size);
    });
}

test("holiday URL overrides rotation for the entire New York calendar day", () => {
    for (const date of ["2026-01-01T05:00:00Z", "2026-01-02T04:59:59Z"]) {
        assert.deepEqual(findCurrentImage(images, new Date(date)), {
            url: "https://example.com/holiday.gif", alt: "Holiday image for 01-01"
        });
    }
    assert.equal(findCurrentImage(images, new Date("2026-01-02T05:00:00Z")).alt, "Rotating image");
});

test("text-label holiday falls through to rotation", () => {
    const now = new Date("2026-01-16T15:00:00Z");
    assert.deepEqual(findCurrentImage(images, now), findCurrentImage({ pool: images.pool }, now));
    assert.equal(findCurrentImage(images, now).alt, "Rotating image");
});

test("empty pool uses the error image", () => {
    assert.deepEqual(findCurrentImage({ ...images, pool: [] }, new Date("2026-01-05T15:00:00Z")), {
        url: "https://example.com/error.gif", alt: "Fallback image"
    });
});

test("missing or empty pool without an error image returns null", () => {
    const now = new Date("2026-01-05T15:00:00Z");
    assert.equal(findCurrentImage({}, now), null);
    assert.equal(findCurrentImage({ pool: [] }, now), null);
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
