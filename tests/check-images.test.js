const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { checkImages } = require("../scripts/check-images");

const valid = {
    pool: ["https://example.com/morning.gif", "https://example.com/night.gif"],
    holidays: { "02-29": "https://example.com/leap.gif", "01-16": "Stavv Bday" },
    error: { imageUrl: "https://example.com/error.gif" }
};

test("accepts the repository images.json", () => {
    assert.doesNotThrow(() => checkImages(fs.readFileSync(path.join(__dirname, "../images.json"), "utf8")));
});

test("accepts a pool, leap day and plain text holidays", () => {
    assert.doesNotThrow(() => checkImages(JSON.stringify(valid)));
});

test("rejects invalid JSON", () => {
    assert.throws(() => checkImages("{\"Monday\":"), SyntaxError);
});

for (const [description, value] of [
    ["null root", null],
    ["array root", []],
    ["unknown top-level key", { ...valid, Mon: {} }],
    ["missing error image", {}],
    ["null error", { error: null }],
    ["empty error", { error: {} }],
    ["missing pool", { holidays: valid.holidays, error: valid.error }],
    ["object pool", { ...valid, pool: {} }],
    ["null pool", { ...valid, pool: null }],
    ["duplicate pool URL", { ...valid, pool: [valid.pool[0], valid.pool[0]] }],
    ["null holidays", { ...valid, holidays: null }],
    ["array holidays", { ...valid, holidays: [] }]
]) {
    test(`rejects ${description}`, () => {
        assert.throws(() => checkImages(JSON.stringify(value)));
    });
}

test("accepts an empty pool for fallback", () => {
    assert.doesNotThrow(() => checkImages(JSON.stringify({ ...valid, pool: [] })));
});

for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    test(`rejects old weekday key ${day}`, () => {
        assert.throws(() => checkImages(JSON.stringify({ ...valid, [day]: { "0900": valid.pool[0] } })));
    });
}

for (const date of ["1-01", "00-01", "13-01", "02-30", "04-31", "12-00", "12-32", "01-01\n"]) {
    test(`rejects invalid holiday date ${JSON.stringify(date)}`, () => {
        assert.throws(() => checkImages(JSON.stringify({ ...valid, holidays: { [date]: "Birthday" } })));
    });
}

for (const url of [
    "http://example.com/a.gif", "ftp://example.com/a.gif", "https://", "https:example.com/a.gif",
    "https://example.com/a b.gif", "https://example.com/a\nb.gif", "https://example.com/a\"b.gif",
    "https://example.com/a'b.gif", "https://example.com/<a>.gif", "https://example.com/>.gif", "https://[bad]/a.gif",
    "", null, 42
]) {
    test(`rejects invalid pool and fallback URL ${JSON.stringify(url)}`, () => {
        assert.throws(() => checkImages(JSON.stringify({ ...valid, pool: [url] })));
        assert.throws(() => checkImages(JSON.stringify({ ...valid, error: { imageUrl: url } })));
    });
    test(`rejects invalid holiday URL or label ${JSON.stringify(url)}`, () => {
        assert.throws(() => checkImages(JSON.stringify({ ...valid, holidays: { "01-01": url } })));
    });
}

for (const label of ["   ", "<b>Birthday</b>", "Birthday\nParty", "//example.com/a.gif"]) {
    test(`rejects non-plain holiday label ${JSON.stringify(label)}`, () => {
        assert.throws(() => checkImages(JSON.stringify({ ...valid, holidays: { "01-01": label } })));
    });
}
