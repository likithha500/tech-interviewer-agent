import { executeCode } from "./lib/code-runner";

async function main() {
    const result = await executeCode(
        "javascript",
        `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const n = Number(input);
console.log(n * 2);`,
        [
            {
                input: "5",
                expected_output: "10",
            },
            {
                input: "10",
                expected_output: "20",
            },
        ]
    );

    console.log(JSON.stringify(result, null, 2));
}

main();
