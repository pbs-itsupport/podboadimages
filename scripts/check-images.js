const fs = require("node:fs");
const path = require("node:path");

function checkImages(json) {
    const data = JSON.parse(json);
    const knownKeys = ["pool", "holidays", "error"];
    const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const isHttpsUrl = value => {
        if (typeof value !== "string" || !value.startsWith("https://") || /[\s'"<>]/u.test(value)) {
            return false;
        }
        try {
            return new URL(value).protocol === "https:";
        } catch {
            return false;
        }
    };
    const requireValid = (condition, message) => {
        if (!condition) throw new Error(message);
    };

    requireValid(isObject(data), "Root must be an object");
    for (const key of Object.keys(data)) {
        requireValid(knownKeys.includes(key), `Unknown top-level key: ${key}`);
    }
    requireValid(isObject(data.error) && isHttpsUrl(data.error.imageUrl), "error.imageUrl must be an https URL without quotes, angle brackets or whitespace");

    requireValid(Array.isArray(data.pool), "pool must be an array");
    for (const url of data.pool) {
        requireValid(isHttpsUrl(url), "pool entries must be https URLs without quotes, angle brackets or whitespace");
    }
    requireValid(new Set(data.pool).size === data.pool.length, "pool must not contain duplicate URLs");

    if (Object.hasOwn(data, "holidays")) {
        requireValid(isObject(data.holidays), "holidays must be an object");
        for (const [date, value] of Object.entries(data.holidays)) {
            const [month, day] = date.split("-").map(Number);
            const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            requireValid(date.length === 5 && /^\d{2}-\d{2}$/.test(date) && day >= 1 && day <= daysInMonth[month - 1], `holidays.${date} must be a valid MM-DD date`);
            const isLabel = typeof value === "string" && value.trim().length > 0 &&
                !/[<>\p{Cc}]/u.test(value) && !/^(?:http|[a-z][a-z\d+.-]*:|\/\/)/i.test(value.trim());
            requireValid(isHttpsUrl(value) || isLabel, `holidays.${date} must be an https URL or a plain text label`);
        }
    }
}

module.exports = { checkImages };

if (require.main === module) {
    try {
        checkImages(fs.readFileSync(path.join(__dirname, "../images.json"), "utf8"));
        console.log("images.json is valid.");
    } catch (error) {
        console.error(`Invalid images.json: ${error.message}`);
        process.exitCode = 1;
    }
}
