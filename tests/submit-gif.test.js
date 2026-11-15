const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseIssueForm } = require("../scripts/submit-gif");

test("parse the fields GitHub issue forms produce", () => {
    assert.deepEqual(parseIssueForm(`### GIF URL

https://example.com/party.gif

### Type

Birthday / occasion

### Date MM-DD

02-29

### Name / occasion

Sam's birthday`), {
        url: "https://example.com/party.gif",
        type: "Birthday / occasion",
        date: "02-29",
        name: "Sam's birthday"
    });
});

test("parse CRLF, surrounding whitespace and unanswered fields", () => {
    assert.deepEqual(parseIssueForm("### GIF URL\r\n\r\n  https://example.com/a.gif  \r\n\r\n### Type\r\n\r\nAdd to rotation\r\n\r\n### Date MM-DD\r\n\r\n_No response_\r\n\r\n### Name / occasion\r\n\r\n_No response_\r\n"), {
        url: "https://example.com/a.gif", type: "Add to rotation", date: "", name: ""
    });
    assert.deepEqual(parseIssueForm(""), { url: "", type: "", date: "", name: "" });
});

const { applySubmission } = require("../scripts/submit-gif");
const { checkImages } = require("../scripts/check-images");
const images = { pool: ["https://example.com/old.gif"], holidays: { "01-16": "Birthday" }, error: { imageUrl: "https://example.com/error.gif" } };
const rotation = { url: "https://example.com/new.gif", type: "Add to rotation", date: "", name: "Party" };

test("append to rotation without changing the input, preserving the schema", () => {
    const before = JSON.stringify(images);
    const result = applySubmission(images, rotation);
    assert.equal(result.ok, true);
    assert.deepEqual(result.imagesData.pool, ["https://example.com/old.gif", "https://example.com/new.gif"]);
    assert.equal(JSON.stringify(images), before);
    assert.match(result.message, /rotation pool/);
    assert.match(result.message, /Party/);
    assert.doesNotThrow(() => checkImages(JSON.stringify(result.imagesData)));
});

for (const url of ["", "not-a-url", "https://", "https://[bad]/a.gif", "http://example.com/a.gif", "ftp://example.com/a.gif", "https://example.com/a.svg", "https://example.com/a.gif/", "https://example.com/a?image=a.gif", "https://example.com/a\"b.gif", "https://example.com/a'b.gif", "https://example.com/<a.gif", "https://example.com/>a.gif", "https://example.com/a\\b.gif", "https://example.com/a b.gif", "https://example.com/a\nb.gif", "https://example.com/a\tb.gif", " https://example.com/a.gif", "https:example.com/a.gif"]) {
    test(`reject unsafe or non-image URL ${JSON.stringify(url)}`, () => {
        const result = applySubmission(images, { ...rotation, url });
        assert.equal(result.ok, false);
        assert.match(result.message, /URL/);
    });
}

for (const extension of ["gif", "WEBP", "png", "JPG", "jpeg"]) {
    test(`accept https ${extension} with a query and fragment`, () => {
        const result = applySubmission(images, { ...rotation, url: `https://example.com/new.${extension}?width=100#image` });
        assert.equal(result.ok, true);
        assert.doesNotThrow(() => checkImages(JSON.stringify(result.imagesData)));
    });
}

test("reject duplicate pool entries", () => {
    assert.match(applySubmission(images, { ...rotation, url: images.pool[0] }).message, /already/);
    assert.equal(applySubmission(images, { ...rotation, url: images.pool[0] }).ok, false);
});

test("allow entry 200, then reject a full pool", () => {
    const full = { ...images, pool: Array.from({ length: 199 }, (_, i) => `https://example.com/${i}.gif`) };
    const added = applySubmission(full, rotation);
    assert.equal(added.ok, true);
    assert.equal(added.imagesData.pool.length, 200);
    const rejected = applySubmission(added.imagesData, { ...rotation, url: "https://example.com/another.gif" });
    assert.equal(rejected.ok, false);
    assert.match(rejected.message, /200/);
});

test("reject unknown or missing submission type", () => {
    for (const type of ["", "Something else"]) {
        assert.equal(applySubmission(images, { ...rotation, type }).ok, false);
    }
});

for (const date of ["03-05", "01-16", "02-29"]) {
    test(`add an occasion on ${date}, replacing a text label if present`, () => {
        const result = applySubmission(images, { ...rotation, type: "Birthday / occasion", date });
        assert.equal(result.ok, true);
        assert.equal(result.imagesData.holidays[date], rotation.url);
        assert.deepEqual(result.imagesData.pool, images.pool);
        assert.equal(images.holidays["01-16"], "Birthday");
        assert.match(result.message, new RegExp(date));
        assert.doesNotThrow(() => checkImages(JSON.stringify(result.imagesData)));
    });
}

test("create holidays when the optional map is absent", () => {
    const withoutHolidays = { ...images };
    delete withoutHolidays.holidays;
    const result = applySubmission(withoutHolidays, { ...rotation, type: "Birthday / occasion", date: "12-31" });
    assert.equal(result.ok, true);
    assert.equal(result.imagesData.holidays["12-31"], rotation.url);
    assert.doesNotThrow(() => checkImages(JSON.stringify(result.imagesData)));
});

test("reject a date already occupied by a GIF, naming the date", () => {
    const occupied = { ...images, holidays: { "01-16": images.pool[0] } };
    const result = applySubmission(occupied, { ...rotation, type: "Birthday / occasion", date: "01-16" });
    assert.equal(result.ok, false);
    assert.match(result.message, /01-16.*already/);
    assert.equal(occupied.holidays["01-16"], images.pool[0]);
});

for (const date of ["13-01", "02-30", "2-5", "00-01", "01-00", "04-31", "", "01-01\n"]) {
    test(`reject invalid occasion date ${JSON.stringify(date)}`, () => {
        const result = applySubmission(images, { ...rotation, type: "Birthday / occasion", date });
        assert.equal(result.ok, false);
        assert.match(result.message, /MM-DD/);
    });
}

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("CLI reads the issue body from env, writes formatted JSON, and rejects without writing", t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "submit-gif-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, "images.json");
    fs.writeFileSync(file, JSON.stringify(images));
    const run = body => spawnSync(process.execPath, [path.join(__dirname, "../scripts/submit-gif.js"), file], {
        env: { ...process.env, ISSUE_BODY: body }, encoding: "utf8"
    });
    const body = "### GIF URL\n\nhttps://example.com/party.gif\n\n### Type\n\nAdd to rotation\n\n### Name / occasion\n\n$(touch should-never-execute); `whoami`";
    const published = run(body);
    assert.equal(published.status, 0, published.stderr);
    assert.match(published.stdout, /next work-hour update/);
    const output = fs.readFileSync(file, "utf8");
    assert.equal(output, JSON.stringify(JSON.parse(output), null, 2) + "\n");
    assert.doesNotThrow(() => checkImages(output));
    assert.equal(JSON.parse(output).pool.at(-1), "https://example.com/party.gif");
    const duplicate = run(body);
    assert.equal(duplicate.status, 2);
    assert.match(duplicate.stdout, /already/);
    assert.equal(fs.readFileSync(file, "utf8"), output);
    const malformed = run(body.replace("party.gif", "a\\b.gif"));
    assert.equal(malformed.status, 2);
    assert.match(malformed.stdout, /URL/);
    assert.equal(fs.readFileSync(file, "utf8"), output);
});
