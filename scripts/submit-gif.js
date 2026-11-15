const fs = require("node:fs");
const path = require("node:path");
const { checkImages } = require("./check-images");

function parseIssueForm(body) {
    const fields = {};
    const labels = { "GIF URL": "url", Type: "type", "Date MM-DD": "date", "Name / occasion": "name" };
    const sections = body.replace(/\r\n/g, "\n").split(/^###\s+/m);
    for (const section of sections.slice(1)) {
        const newline = section.indexOf("\n");
        const key = labels[section.slice(0, newline).trim()];
        if (!Object.hasOwn(labels, section.slice(0, newline).trim())) continue;
        const value = section.slice(newline + 1).trim();
        fields[key] = value === "_No response_" ? "" : value;
    }
    return { url: "", type: "", date: "", name: "", ...fields };
}

function applySubmission(imagesData, submission) {
    const { url, type } = submission;
    const invalidUrl = { ok: false, message: "GIF URL must be an https URL ending in .gif, .webp, .png, .jpg or .jpeg, without quotes, angle brackets, backslashes or whitespace." };
    if (typeof url !== "string" || /[\s'"<>\\]/u.test(url) || !url.startsWith("https://")) return invalidUrl;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" || !/\.(gif|webp|png|jpe?g)$/i.test(parsed.pathname)) return invalidUrl;
    } catch {
        return invalidUrl;
    }
    let result;
    let destination;
    if (type === "Add to rotation") {
        if (imagesData.pool.includes(url)) return { ok: false, message: "This GIF is already in the rotation pool." };
        if (imagesData.pool.length >= 200) return { ok: false, message: "The rotation pool is full (200 GIFs). Ask a maintainer to remove one first." };
        result = { ...imagesData, pool: [...imagesData.pool, url] };
        destination = "the rotation pool";
    } else if (type === "Birthday / occasion") {
        const { date } = submission;
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const [month, day] = typeof date === "string" ? date.split("-").map(Number) : [];
        if (typeof date !== "string" || date.length !== 5 || !/^\d{2}-\d{2}$/.test(date) || !(day >= 1 && day <= daysInMonth[month - 1])) {
            return { ok: false, message: "Use a real date in MM-DD format (for example, 02-29)." };
        }
        const existing = imagesData.holidays?.[date];
        if (typeof existing === "string" && /^http/i.test(existing)) {
            return { ok: false, message: `${date} already has a GIF. Ask a maintainer to change it.` };
        }
        result = { ...imagesData, holidays: { ...imagesData.holidays, [date]: url } };
        destination = `the occasion date ${date}`;
    } else {
        return { ok: false, message: "Choose Add to rotation or Birthday / occasion." };
    }
    const context = submission.name ? ` (${JSON.stringify(submission.name)})` : "";
    return { ok: true, imagesData: result, message: `Added to ${destination}${context}. It shows up on the TVs at the next work-hour update.` };
}

module.exports = { parseIssueForm, applySubmission };

if (require.main === module) {
    try {
        const imagesPath = process.argv[2] || path.join(__dirname, "../images.json");
        const json = fs.readFileSync(imagesPath, "utf8");
        checkImages(json);
        const result = applySubmission(JSON.parse(json), parseIssueForm(process.env.ISSUE_BODY || ""));
        if (result.ok) {
            const output = JSON.stringify(result.imagesData, null, 2) + "\n";
            checkImages(output);
            fs.writeFileSync(imagesPath, output);
        } else {
            // Distinguish validation failures from operational errors for the workflow.
            process.exitCode = 2;
        }
        console.log(result.message);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
